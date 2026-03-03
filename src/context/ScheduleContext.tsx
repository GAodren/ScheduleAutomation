import { createContext, useReducer, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type {
  StaffConfig,
  ScheduleData,
  WeekNumber,
  PageId,
  DepartmentId,
  WeekSchedule,
  PersonSchedule,
  StaffRole,
} from '../types';
import { DEFAULT_STAFF_CONFIG, DEPARTMENT_IDS } from '../data/defaults';
import { generateNewCycleData, calculateWeeklyTotal, sortByRole } from '../utils/scheduling';
import { fetchAllMembres, insertMembre, updateMembre, deleteMembre, type DbMembre } from '../lib/membresService';
import { fetchAllPlannings, batchUpsertPlannings, type DbPlanning } from '../lib/planningsService';

// --- Conversion helpers ---

function dbMembresToStaffConfig(dbMembres: DbMembre[]): StaffConfig {
  const config: StaffConfig = { encadrement: [], salle: [], cuisine: [] };
  dbMembres.forEach(m => {
    config[m.department].push({
      id: m.name,
      role: m.role,
      maxHours: m.max_hours,
    });
  });
  // Sort each department: adjoints before standard
  config.encadrement = sortByRole(config.encadrement);
  config.salle = sortByRole(config.salle);
  config.cuisine = sortByRole(config.cuisine);
  return config;
}

function buildMembreIdMap(dbMembres: DbMembre[]): Record<string, string> {
  const map: Record<string, string> = {};
  dbMembres.forEach(m => { map[m.name] = m.id; });
  return map;
}

function dbPlanningsToScheduleData(
  dbPlannings: DbPlanning[],
  dbMembres: DbMembre[],
): ScheduleData {
  // Build lookup: uuid -> DbMembre
  const membreById: Record<string, DbMembre> = {};
  dbMembres.forEach(m => { membreById[m.id] = m; });

  // Group plannings by membre
  const planningsByMembre: Record<string, DbPlanning[]> = {};
  dbPlannings.forEach(p => {
    if (!planningsByMembre[p.membre_id]) planningsByMembre[p.membre_id] = [];
    planningsByMembre[p.membre_id].push(p);
  });

  const result: ScheduleData = {
    1: { encadrement: [], salle: [], cuisine: [] },
    2: { encadrement: [], salle: [], cuisine: [] },
  };

  // For each membre, build their PersonSchedule for each week
  dbMembres.forEach(m => {
    const memberPlannings = planningsByMembre[m.id] || [];

    ([1, 2] as WeekNumber[]).forEach(w => {
      const weekPlannings = memberPlannings.filter(p => p.week_number === w);
      const days = Array.from({ length: 7 }, (_, dayIdx) => {
        const dp = weekPlannings.find(p => p.day_index === dayIdx);
        return dp ? { midi: dp.midi, soir: dp.soir } : { midi: 'REPOS', soir: 'REPOS' };
      });

      const person: PersonSchedule = {
        id: m.name,
        role: m.role,
        maxHours: m.max_hours,
        days,
        hours: calculateWeeklyTotal(days),
      };

      result[w][m.department].push(person);
    });
  });

  return result;
}

function scheduleDataToDbRows(
  data: ScheduleData,
  membreIdMap: Record<string, string>,
): Omit<DbPlanning, 'id'>[] {
  const rows: Omit<DbPlanning, 'id'>[] = [];

  ([1, 2] as WeekNumber[]).forEach(w => {
    DEPARTMENT_IDS.forEach(dept => {
      const persons = data[w][dept] || [];
      persons.forEach(person => {
        const membreId = membreIdMap[person.id];
        if (!membreId) return;
        person.days.forEach((day, dayIdx) => {
          rows.push({
            membre_id: membreId,
            week_number: w,
            day_index: dayIdx,
            midi: day.midi,
            soir: day.soir,
          });
        });
      });
    });
  });

  return rows;
}

// --- State ---

interface ScheduleState {
  staffConfig: StaffConfig;
  scheduleData: ScheduleData;
  currentWeek: WeekNumber;
  currentPage: PageId;
  isLoading: boolean;
  error: string | null;
  membreIdMap: Record<string, string>;
}

const EMPTY_WEEK: WeekSchedule = { encadrement: [], salle: [], cuisine: [] };

const initialState: ScheduleState = {
  staffConfig: DEFAULT_STAFF_CONFIG,
  scheduleData: { 1: EMPTY_WEEK, 2: EMPTY_WEEK },
  currentWeek: 1,
  currentPage: 'planning',
  isLoading: true,
  error: null,
  membreIdMap: {},
};

// --- Actions ---

type Action =
  | { type: 'SET_WEEK'; week: WeekNumber }
  | { type: 'SWITCH_PAGE'; page: PageId }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOAD_DATA'; staffConfig: StaffConfig; scheduleData: ScheduleData; membreIdMap: Record<string, string> }
  | { type: 'GENERATE_NEW_CYCLE' }
  | { type: 'UPDATE_SHIFT'; week: WeekNumber; dept: DepartmentId; personIndex: number; dayIndex: number; part: 'midi' | 'soir'; value: string }
  | { type: 'ADD_STAFF'; name: string; dept: DepartmentId; maxHours: number; uuid: string }
  | { type: 'REMOVE_STAFF'; dept: DepartmentId; index: number; membreName: string }
  | { type: 'UPDATE_STAFF_LIMIT'; dept: DepartmentId; index: number; maxHours: number }
  | { type: 'EDIT_STAFF_NAME'; dept: DepartmentId; index: number; newName: string; oldName: string; uuid: string }
  | { type: 'TOGGLE_ADJOINT'; dept: DepartmentId; index: number };

function reducer(state: ScheduleState, action: Action): ScheduleState {
  switch (action.type) {
    case 'SET_WEEK':
      return { ...state, currentWeek: action.week };

    case 'SWITCH_PAGE':
      return { ...state, currentPage: action.page };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'LOAD_DATA':
      return {
        ...state,
        staffConfig: action.staffConfig,
        scheduleData: action.scheduleData,
        membreIdMap: action.membreIdMap,
        isLoading: false,
        error: null,
      };

    case 'GENERATE_NEW_CYCLE': {
      const newData = generateNewCycleData(state.staffConfig);
      return { ...state, scheduleData: newData };
    }

    case 'UPDATE_SHIFT': {
      const { week, dept, personIndex, dayIndex, part, value } = action;
      const newData = { ...state.scheduleData };
      const weekData = { ...newData[week] };
      const deptData = [...weekData[dept]];
      const person = { ...deptData[personIndex] };
      const days = [...person.days];
      days[dayIndex] = {
        ...days[dayIndex],
        [part]: value.toUpperCase() === 'REPOS' ? 'REPOS' : value,
      };
      person.days = days;
      person.hours = calculateWeeklyTotal(days);
      deptData[personIndex] = person;
      weekData[dept] = deptData;
      newData[week] = weekData;
      return { ...state, scheduleData: newData };
    }

    case 'ADD_STAFF': {
      const { name, dept, maxHours, uuid } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = [
        ...newConfig[dept],
        { id: name, maxHours, role: (dept === 'encadrement' ? 'gerant' : 'standard') as StaffRole },
      ];
      const newData = generateNewCycleData(newConfig);
      const newMap = { ...state.membreIdMap, [name]: uuid };
      return { ...state, staffConfig: newConfig, scheduleData: newData, membreIdMap: newMap };
    }

    case 'REMOVE_STAFF': {
      const { dept, index, membreName } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].filter((_, i) => i !== index);
      const newData = generateNewCycleData(newConfig);
      const newMap = { ...state.membreIdMap };
      delete newMap[membreName];
      return { ...state, staffConfig: newConfig, scheduleData: newData, membreIdMap: newMap };
    }

    case 'UPDATE_STAFF_LIMIT': {
      const { dept, index, maxHours } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].map((p, i) =>
        i === index ? { ...p, maxHours } : p
      );
      const newScheduleData = { ...state.scheduleData };
      ([1, 2] as WeekNumber[]).forEach(w => {
        const weekData = { ...newScheduleData[w] };
        if (weekData[dept] && weekData[dept][index]) {
          const deptData = [...weekData[dept]];
          deptData[index] = { ...deptData[index], maxHours };
          weekData[dept] = deptData;
        }
        newScheduleData[w] = weekData;
      });
      return { ...state, staffConfig: newConfig, scheduleData: newScheduleData };
    }

    case 'EDIT_STAFF_NAME': {
      const { dept, index, newName, oldName, uuid } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].map((p, i) =>
        i === index ? { ...p, id: newName } : p
      );
      const newScheduleData = { ...state.scheduleData };
      ([1, 2] as WeekNumber[]).forEach(w => {
        const weekData = { ...newScheduleData[w] };
        if (weekData[dept] && weekData[dept][index]) {
          const deptData = [...weekData[dept]];
          deptData[index] = { ...deptData[index], id: newName };
          weekData[dept] = deptData;
        }
        newScheduleData[w] = weekData;
      });
      // Update membreIdMap
      const newMap = { ...state.membreIdMap };
      delete newMap[oldName];
      newMap[newName] = uuid;
      return { ...state, staffConfig: newConfig, scheduleData: newScheduleData, membreIdMap: newMap };
    }

    case 'TOGGLE_ADJOINT': {
      const { dept, index } = action;
      const person = state.staffConfig[dept][index];
      if (person.role === 'gerant') return state;

      const newRole: StaffRole = person.role === 'adjoint' ? 'standard' : 'adjoint';
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].map((p, i) =>
        i === index ? { ...p, role: newRole } : p
      );
      const newScheduleData = { ...state.scheduleData };
      ([1, 2] as WeekNumber[]).forEach(w => {
        const weekData = { ...newScheduleData[w] };
        if (weekData[dept] && weekData[dept][index]) {
          const deptData = [...weekData[dept]];
          deptData[index] = { ...deptData[index], role: newRole };
          weekData[dept] = deptData;
        }
        newScheduleData[w] = weekData;
      });
      return { ...state, staffConfig: newConfig, scheduleData: newScheduleData };
    }

    default:
      return state;
  }
}

// --- Context ---

interface ScheduleContextValue {
  state: ScheduleState;
  setWeek: (week: WeekNumber) => void;
  switchPage: (page: PageId) => void;
  dismissError: () => void;
  generateNewCycle: () => Promise<void>;
  updateShift: (week: WeekNumber, dept: DepartmentId, personIndex: number, dayIndex: number, part: 'midi' | 'soir', value: string) => void;
  addStaff: (name: string, dept: DepartmentId, maxHours: number) => Promise<void>;
  removeStaff: (dept: DepartmentId, index: number) => Promise<void>;
  updateStaffLimit: (dept: DepartmentId, index: number, maxHours: number) => Promise<void>;
  editStaffName: (dept: DepartmentId, index: number, newName: string) => Promise<void>;
  toggleAdjoint: (dept: DepartmentId, index: number) => Promise<void>;
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const isInitialLoad = useRef(true);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Load data from Supabase on mount ---
  useEffect(() => {
    async function loadData() {
      try {
        const dbMembres = await fetchAllMembres();

        if (dbMembres.length === 0) {
          // No data in DB yet — use defaults and generate
          dispatch({ type: 'SET_LOADING', isLoading: false });
          dispatch({ type: 'GENERATE_NEW_CYCLE' });
          return;
        }

        const staffConfig = dbMembresToStaffConfig(dbMembres);
        const membreIdMap = buildMembreIdMap(dbMembres);
        const dbPlannings = await fetchAllPlannings();

        let scheduleData: ScheduleData;
        if (dbPlannings.length === 0) {
          // Membres exist but no plannings — generate and save
          scheduleData = generateNewCycleData(staffConfig);
          const rows = scheduleDataToDbRows(scheduleData, membreIdMap);
          await batchUpsertPlannings(rows);
        } else {
          scheduleData = dbPlanningsToScheduleData(dbPlannings, dbMembres);
        }

        dispatch({ type: 'LOAD_DATA', staffConfig, scheduleData, membreIdMap });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
        dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    }
    loadData();
  }, []);

  // --- Sync scheduleData to Supabase with debounce ---
  const syncScheduleToDb = useCallback(async (scheduleData: ScheduleData, membreIdMap: Record<string, string>) => {
    try {
      const rows = scheduleDataToDbRows(scheduleData, membreIdMap);
      if (rows.length > 0) {
        await batchUpsertPlannings(rows);
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    // Don't sync while loading
    if (state.isLoading) return;
    // Don't sync if no membreIdMap (no DB connection)
    if (Object.keys(state.membreIdMap).length === 0) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncScheduleToDb(state.scheduleData, state.membreIdMap);
    }, 500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state.scheduleData, state.membreIdMap, state.isLoading, syncScheduleToDb]);

  // --- Action handlers ---

  const value: ScheduleContextValue = {
    state,
    setWeek: (week) => dispatch({ type: 'SET_WEEK', week }),
    switchPage: (page) => dispatch({ type: 'SWITCH_PAGE', page }),
    dismissError: () => dispatch({ type: 'SET_ERROR', error: null }),

    generateNewCycle: async () => {
      dispatch({ type: 'GENERATE_NEW_CYCLE' });
      // Sync happens via the useEffect debounce
    },

    updateShift: (week, dept, personIndex, dayIndex, part, value) => {
      dispatch({ type: 'UPDATE_SHIFT', week, dept, personIndex, dayIndex, part, value });
      // Sync happens via the useEffect debounce
    },

    addStaff: async (name, dept, maxHours) => {
      try {
        const role: StaffRole = dept === 'encadrement' ? 'gerant' : 'standard';
        const dbMembre = await insertMembre(name, dept, role, maxHours);
        dispatch({ type: 'ADD_STAFF', name, dept, maxHours, uuid: dbMembre.id });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },

    removeStaff: async (dept, index) => {
      try {
        const membreName = state.staffConfig[dept][index].id;
        const uuid = state.membreIdMap[membreName];
        if (uuid) {
          await deleteMembre(uuid);
        }
        dispatch({ type: 'REMOVE_STAFF', dept, index, membreName });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },

    updateStaffLimit: async (dept, index, maxHours) => {
      try {
        const membreName = state.staffConfig[dept][index].id;
        const uuid = state.membreIdMap[membreName];
        if (uuid) {
          await updateMembre(uuid, { max_hours: maxHours });
        }
        dispatch({ type: 'UPDATE_STAFF_LIMIT', dept, index, maxHours });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },

    editStaffName: async (dept, index, newName) => {
      try {
        const oldName = state.staffConfig[dept][index].id;
        const uuid = state.membreIdMap[oldName];
        if (uuid) {
          await updateMembre(uuid, { name: newName });
        }
        dispatch({ type: 'EDIT_STAFF_NAME', dept, index, newName, oldName, uuid: uuid || '' });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },

    toggleAdjoint: async (dept, index) => {
      try {
        const person = state.staffConfig[dept][index];
        if (person.role === 'gerant') return;
        const newRole: StaffRole = person.role === 'adjoint' ? 'standard' : 'adjoint';
        const uuid = state.membreIdMap[person.id];
        if (uuid) {
          await updateMembre(uuid, { role: newRole });
        }
        dispatch({ type: 'TOGGLE_ADJOINT', dept, index });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
