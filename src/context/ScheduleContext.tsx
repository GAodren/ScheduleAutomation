import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  StaffConfig,
  ScheduleData,
  WeekNumber,
  PageId,
  DepartmentId,
  WeekSchedule,
} from '../types';
import { DEFAULT_STAFF_CONFIG } from '../data/defaults';
import { generateNewCycleData, calculateWeeklyTotal } from '../utils/scheduling';

// --- State ---

interface ScheduleState {
  staffConfig: StaffConfig;
  scheduleData: ScheduleData;
  currentWeek: WeekNumber;
  currentPage: PageId;
}

const EMPTY_WEEK: WeekSchedule = { encadrement: [], salle: [], cuisine: [] };

const initialState: ScheduleState = {
  staffConfig: DEFAULT_STAFF_CONFIG,
  scheduleData: { 1: EMPTY_WEEK, 2: EMPTY_WEEK },
  currentWeek: 1,
  currentPage: 'planning',
};

// --- Actions ---

type Action =
  | { type: 'SET_WEEK'; week: WeekNumber }
  | { type: 'SWITCH_PAGE'; page: PageId }
  | { type: 'GENERATE_NEW_CYCLE' }
  | { type: 'UPDATE_SHIFT'; week: WeekNumber; dept: DepartmentId; personIndex: number; dayIndex: number; part: 'midi' | 'soir'; value: string }
  | { type: 'ADD_STAFF'; name: string; dept: DepartmentId; maxHours: number }
  | { type: 'REMOVE_STAFF'; dept: DepartmentId; index: number }
  | { type: 'UPDATE_STAFF_LIMIT'; dept: DepartmentId; index: number; maxHours: number }
  | { type: 'EDIT_STAFF_NAME'; dept: DepartmentId; index: number; newName: string }
  | { type: 'TOGGLE_ADJOINT'; dept: DepartmentId; index: number };

function reducer(state: ScheduleState, action: Action): ScheduleState {
  switch (action.type) {
    case 'SET_WEEK':
      return { ...state, currentWeek: action.week };

    case 'SWITCH_PAGE':
      return { ...state, currentPage: action.page };

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
      const { name, dept, maxHours } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = [
        ...newConfig[dept],
        { id: name, maxHours, role: dept === 'encadrement' ? 'gerant' : '' },
      ];
      const newData = generateNewCycleData(newConfig);
      return { ...state, staffConfig: newConfig, scheduleData: newData };
    }

    case 'REMOVE_STAFF': {
      const { dept, index } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].filter((_, i) => i !== index);
      const newData = generateNewCycleData(newConfig);
      return { ...state, staffConfig: newConfig, scheduleData: newData };
    }

    case 'UPDATE_STAFF_LIMIT': {
      const { dept, index, maxHours } = action;
      const newConfig = { ...state.staffConfig };
      newConfig[dept] = newConfig[dept].map((p, i) =>
        i === index ? { ...p, maxHours } : p
      );
      // Also update in schedule data
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
      const { dept, index, newName } = action;
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
      return { ...state, staffConfig: newConfig, scheduleData: newScheduleData };
    }

    case 'TOGGLE_ADJOINT': {
      const { dept, index } = action;
      const person = state.staffConfig[dept][index];
      if (person.role === 'gerant') return state;

      const newRole = person.role === 'adjoint' ? '' : 'adjoint';
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
  generateNewCycle: () => void;
  updateShift: (week: WeekNumber, dept: DepartmentId, personIndex: number, dayIndex: number, part: 'midi' | 'soir', value: string) => void;
  addStaff: (name: string, dept: DepartmentId, maxHours: number) => void;
  removeStaff: (dept: DepartmentId, index: number) => void;
  updateStaffLimit: (dept: DepartmentId, index: number, maxHours: number) => void;
  editStaffName: (dept: DepartmentId, index: number, newName: string) => void;
  toggleAdjoint: (dept: DepartmentId, index: number) => void;
}

export const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Generate initial cycle on mount
  useEffect(() => {
    dispatch({ type: 'GENERATE_NEW_CYCLE' });
  }, []);

  const value: ScheduleContextValue = {
    state,
    setWeek: (week) => dispatch({ type: 'SET_WEEK', week }),
    switchPage: (page) => dispatch({ type: 'SWITCH_PAGE', page }),
    generateNewCycle: () => dispatch({ type: 'GENERATE_NEW_CYCLE' }),
    updateShift: (week, dept, personIndex, dayIndex, part, value) =>
      dispatch({ type: 'UPDATE_SHIFT', week, dept, personIndex, dayIndex, part, value }),
    addStaff: (name, dept, maxHours) => dispatch({ type: 'ADD_STAFF', name, dept, maxHours }),
    removeStaff: (dept, index) => dispatch({ type: 'REMOVE_STAFF', dept, index }),
    updateStaffLimit: (dept, index, maxHours) =>
      dispatch({ type: 'UPDATE_STAFF_LIMIT', dept, index, maxHours }),
    editStaffName: (dept, index, newName) =>
      dispatch({ type: 'EDIT_STAFF_NAME', dept, index, newName }),
    toggleAdjoint: (dept, index) => dispatch({ type: 'TOGGLE_ADJOINT', dept, index }),
  };

  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}
