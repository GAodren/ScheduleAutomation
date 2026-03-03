export type DepartmentId = 'encadrement' | 'salle' | 'cuisine';

export type StaffRole = 'gerant' | 'adjoint' | '';

export type WeekNumber = 1 | 2;

export type PageId = 'planning' | 'config';

export interface StaffMember {
  id: string;
  role: StaffRole;
  maxHours: number;
}

export interface DayShift {
  midi: string;
  soir: string;
}

export interface ShiftPattern {
  m: string;
  s: string;
}

export interface PersonSchedule extends StaffMember {
  days: DayShift[];
  hours: number;
}

export type StaffConfig = Record<DepartmentId, StaffMember[]>;
export type ShiftPatterns = Record<DepartmentId, ShiftPattern[]>;
export type WeekSchedule = Record<DepartmentId, PersonSchedule[]>;
export type ScheduleData = Record<WeekNumber, WeekSchedule>;

export interface DepartmentDisplayConfig {
  id: DepartmentId;
  label: string;
  colorClass: string;
  nameCellClass: string;
}
