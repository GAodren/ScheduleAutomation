export type DepartmentId = 'encadrement' | 'salle' | 'cuisine';

export type StaffRole = 'gerant' | 'adjoint' | 'standard';

export type ExpertiseLevel = 'novice' | 'intermediaire' | 'expert';

export type ContractType = 'cdi' | 'cdd' | 'extra';

export type PlanningStatus = 'draft' | 'initial' | 'final';

export type WeekNumber = 1 | 2;

export type PageId = 'planning' | 'config' | 'history';

export interface StaffMember {
  id: string;
  role: StaffRole;
  maxHours: number;
  expertise: ExpertiseLevel;
  contractType: ContractType;
  polyvalent: boolean;
  // Nombre de couverts gerables par service
  coversMidi: number;
  coversSoir: number;
  // Jours de repos fixes (0=Lundi ... 6=Dimanche)
  restDays: number[];
  // Periodes d'indisponibilite (dates ISO)
  unavailableDates: string[];
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

// Couverts prevus par jour et service
export interface DayCovers {
  midi: number;
  soir: number;
}

// Couverts pour les 2 semaines (7 jours chacune)
export type WeekCovers = DayCovers[];
export type CoversData = Record<WeekNumber, WeekCovers>;

// Alertes legales
export type LegalRuleId = 'repos_quotidien' | 'repos_hebdo' | 'amplitude' | 'max_48h';

export interface LegalAlert {
  ruleId: LegalRuleId;
  severity: 'warning' | 'error';
  message: string;
  personId: string;
  dept: DepartmentId;
  week: WeekNumber;
  dayIndex?: number; // jour concerne (optionnel)
}

// Lifecycle du planning
export interface PlanningMeta {
  weekNumber: WeekNumber;
  status: PlanningStatus;
  yearWeek: string; // ex: "2026-W10"
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
