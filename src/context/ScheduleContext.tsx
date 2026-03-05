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
  CoversData,
  LegalAlert,
  PlanningStatus,
  ExpertiseLevel,
  ContractType,
  StaffMember,
} from '../types';
import { DEFAULT_STAFF_CONFIG, DEPARTMENT_IDS, createEmptyCovers } from '../data/defaults';
import { generateNewCycleData, calculateWeeklyTotal, sortByRole, generateSmartCycleData } from '../utils/scheduling';
import { checkLegalRules } from '../utils/legalRules';
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
      expertise: m.expertise || 'intermediaire',
      contractType: m.contract_type || 'cdi',
      polyvalent: m.polyvalent || false,
      coversMidi: m.covers_midi || 30,
      coversSoir: m.covers_soir || 25,
      restDays: m.rest_days || [],
      unavailableDates: m.unavailable_dates || [],
    });
  });
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
  const membreById: Record<string, DbMembre> = {};
  dbMembres.forEach(m => { membreById[m.id] = m; });

  const planningsByMembre: Record<string, DbPlanning[]> = {};
  dbPlannings.forEach(p => {
    if (!planningsByMembre[p.membre_id]) planningsByMembre[p.membre_id] = [];
    planningsByMembre[p.membre_id].push(p);
  });

  const result: ScheduleData = {
    1: { encadrement: [], salle: [], cuisine: [] },
    2: { encadrement: [], salle: [], cuisine: [] },
  };

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
        expertise: m.expertise || 'intermediaire',
        contractType: m.contract_type || 'cdi',
        polyvalent: m.polyvalent || false,
        coversMidi: m.covers_midi || 30,
        coversSoir: m.covers_soir || 25,
        restDays: m.rest_days || [],
        unavailableDates: m.unavailable_dates || [],
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
            status: 'draft',
            year_week: '',
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
  coversData: CoversData;
  legalAlerts: LegalAlert[];
  planningStatus: PlanningStatus;
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
  coversData: createEmptyCovers(),
  legalAlerts: [],
  planningStatus: 'draft',
};

// --- Actions ---

type Action =
  | { type: 'SET_WEEK'; week: WeekNumber }
  | { type: 'SWITCH_PAGE'; page: PageId }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOAD_DATA'; staffConfig: StaffConfig; scheduleData: ScheduleData; membreIdMap: Record<string, string> }
  | { type: 'GENERATE_NEW_CYCLE' }
  | { type: 'GENERATE_SMART_CYCLE' }
  | { type: 'UPDATE_SHIFT'; week: WeekNumber; dept: DepartmentId; personIndex: number; dayIndex: number; part: 'midi' | 'soir'; value: string }
  | { type: 'ADD_STAFF'; name: string; dept: DepartmentId; maxHours: number; uuid: string; extras?: Partial<StaffMember> }
  | { type: 'REMOVE_STAFF'; dept: DepartmentId; index: number; membreName: string }
  | { type: 'UPDATE_STAFF_LIMIT'; dept: DepartmentId; index: number; maxHours: number }
  | { type: 'EDIT_STAFF_NAME'; dept: DepartmentId; index: number; newName: string; oldName: string; uuid: string }
  | { type: 'TOGGLE_ADJOINT'; dept: DepartmentId; index: number }
  | { type: 'UPDATE_COVERS'; week: WeekNumber; dayIndex: number; service: 'midi' | 'soir'; value: number }
  | { type: 'SET_LEGAL_ALERTS'; alerts: LegalAlert[] }
  | { type: 'UPDATE_STAFF_FIELD'; dept: DepartmentId; index: number; field: string; value: unknown }
  | { type: 'SET_PLANNING_STATUS'; status: PlanningStatus }
  | { type: 'SET_SCHEDULE_DATA'; scheduleData: ScheduleData };

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
      return { ...state, scheduleData: newData, planningStatus: 'draft' };
    }

    case 'GENERATE_SMART_CYCLE': {
      const newData = generateSmartCycleData(state.staffConfig, state.coversData);
      return { ...state, scheduleData: newData, planningStatus: 'draft' };
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
      const { name, dept, maxHours, uuid, extras } = action;
      const newConfig = { ...state.staffConfig };
      const newMember: StaffMember = {
        id: name,
        maxHours,
        role: (dept === 'encadrement' ? 'gerant' : 'standard') as StaffRole,
        expertise: extras?.expertise || 'intermediaire',
        contractType: extras?.contractType || 'cdi',
        polyvalent: extras?.polyvalent || false,
        coversMidi: extras?.coversMidi || 30,
        coversSoir: extras?.coversSoir || 25,
        restDays: extras?.restDays || [],
        unavailableDates: [],
      };
      newConfig[dept] = [...newConfig[dept], newMember];
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

    case 'UPDATE_COVERS': {
      const { week, dayIndex, service, value } = action;
      const newCovers = { ...state.coversData };
      const weekCovers = [...newCovers[week]];
      weekCovers[dayIndex] = { ...weekCovers[dayIndex], [service]: value };
      newCovers[week] = weekCovers;
      return { ...state, coversData: newCovers };
    }

    case 'SET_LEGAL_ALERTS':
      return { ...state, legalAlerts: action.alerts };

    case 'UPDATE_STAFF_FIELD': {
      const { dept, index, field, value } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      );
      // Also update in scheduleData
      const newScheduleData = { ...state.scheduleData };
      ([1, 2] as WeekNumber[]).forEach(w => {
        const weekData = { ...newScheduleData[w] };
        if (weekData[dept] && weekData[dept][index]) {
          const deptData = [...weekData[dept]];
          deptData[index] = { ...deptData[index], [field]: value };
          weekData[dept] = deptData;
        }
        newScheduleData[w] = weekData;
      });
      return { ...state, staffConfig: newConfig, scheduleData: newScheduleData };
    }

    case 'SET_PLANNING_STATUS':
      return { ...state, planningStatus: action.status };

    case 'SET_SCHEDULE_DATA':
      return { ...state, scheduleData: action.scheduleData };

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
  generateSmartCycle: () => void;
  updateShift: (week: WeekNumber, dept: DepartmentId, personIndex: number, dayIndex: number, part: 'midi' | 'soir', value: string) => void;
  addStaff: (name: string, dept: DepartmentId, maxHours: number, extras?: { expertise?: ExpertiseLevel; contractType?: ContractType; polyvalent?: boolean; coversMidi?: number; coversSoir?: number }) => Promise<void>;
  removeStaff: (dept: DepartmentId, index: number) => Promise<void>;
  updateStaffLimit: (dept: DepartmentId, index: number, maxHours: number) => Promise<void>;
  editStaffName: (dept: DepartmentId, index: number, newName: string) => Promise<void>;
  toggleAdjoint: (dept: DepartmentId, index: number) => Promise<void>;
  updateCovers: (week: WeekNumber, dayIndex: number, service: 'midi' | 'soir', value: number) => void;
  updateStaffField: (dept: DepartmentId, index: number, field: string, value: unknown) => Promise<void>;
  validatePlanning: () => void;
  startFinalEntry: () => void;
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
          dispatch({ type: 'SET_LOADING', isLoading: false });
          dispatch({ type: 'GENERATE_NEW_CYCLE' });
          return;
        }

        const staffConfig = dbMembresToStaffConfig(dbMembres);
        const membreIdMap = buildMembreIdMap(dbMembres);
        const dbPlannings = await fetchAllPlannings();

        let scheduleData: ScheduleData;
        if (dbPlannings.length === 0) {
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

  // --- Recompute legal alerts when schedule changes ---
  useEffect(() => {
    if (state.isLoading) return;
    const alerts = checkLegalRules(state.scheduleData);
    dispatch({ type: 'SET_LEGAL_ALERTS', alerts });
  }, [state.scheduleData, state.isLoading]);

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
    if (state.isLoading) return;
    if (Object.keys(state.membreIdMap).length === 0) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncScheduleToDb(state.scheduleData, state.membreIdMap);
    }, 500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state.scheduleData, state.membreIdMap, state.isLoading, syncScheduleToDb]);

  // --- DB field mapping for staff updates ---
  const FIELD_TO_DB: Record<string, string> = {
    expertise: 'expertise',
    contractType: 'contract_type',
    polyvalent: 'polyvalent',
    coversMidi: 'covers_midi',
    coversSoir: 'covers_soir',
    restDays: 'rest_days',
    unavailableDates: 'unavailable_dates',
  };

  // --- Action handlers ---

  const value: ScheduleContextValue = {
    state,
    setWeek: (week) => dispatch({ type: 'SET_WEEK', week }),
    switchPage: (page) => dispatch({ type: 'SWITCH_PAGE', page }),
    dismissError: () => dispatch({ type: 'SET_ERROR', error: null }),

    generateNewCycle: async () => {
      dispatch({ type: 'GENERATE_NEW_CYCLE' });
    },

    generateSmartCycle: () => {
      dispatch({ type: 'GENERATE_SMART_CYCLE' });
    },

    updateShift: (week, dept, personIndex, dayIndex, part, value) => {
      dispatch({ type: 'UPDATE_SHIFT', week, dept, personIndex, dayIndex, part, value });
    },

    addStaff: async (name, dept, maxHours, extras) => {
      try {
        const role: StaffRole = dept === 'encadrement' ? 'gerant' : 'standard';
        const dbMembre = await insertMembre(name, dept, role, maxHours, {
          expertise: extras?.expertise,
          contract_type: extras?.contractType,
          polyvalent: extras?.polyvalent,
          covers_midi: extras?.coversMidi,
          covers_soir: extras?.coversSoir,
        });
        dispatch({
          type: 'ADD_STAFF',
          name,
          dept,
          maxHours,
          uuid: dbMembre.id,
          extras: extras as Partial<StaffMember>,
        });
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

    updateCovers: (week, dayIndex, service, value) => {
      dispatch({ type: 'UPDATE_COVERS', week, dayIndex, service, value });
    },

    updateStaffField: async (dept, index, field, value) => {
      try {
        const membreName = state.staffConfig[dept][index].id;
        const uuid = state.membreIdMap[membreName];
        const dbField = FIELD_TO_DB[field];
        if (uuid && dbField) {
          await updateMembre(uuid, { [dbField]: value } as any);
        }
        dispatch({ type: 'UPDATE_STAFF_FIELD', dept, index, field, value });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },

    validatePlanning: () => {
      dispatch({ type: 'SET_PLANNING_STATUS', status: 'initial' });
    },

    startFinalEntry: () => {
      dispatch({ type: 'SET_PLANNING_STATUS', status: 'final' });
    },
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
