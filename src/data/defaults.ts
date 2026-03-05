import type { StaffConfig, ShiftPatterns, DepartmentDisplayConfig, DepartmentId, CoversData, StaffMember, ExpertiseLevel, ContractType } from '../types';

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const SHIFT_PATTERNS: ShiftPatterns = {
  cuisine: [
    { m: '09h30-14h30', s: '18h-23h30' },
    { m: '11h-15h', s: 'REPOS' },
    { m: 'REPOS', s: '18h15-00h' },
  ],
  salle: [
    { m: '11h15-15h', s: '19h-00h' },
    { m: '12h-15h', s: 'REPOS' },
    { m: 'REPOS', s: '18h-00h' },
  ],
  encadrement: [
    { m: '09h45-15h', s: '18h15-22h' },
    { m: '11h-22h', s: 'REPOS' },
  ],
};

// Helper pour creer un StaffMember avec les valeurs par defaut
function makeStaff(
  id: string,
  role: StaffMember['role'],
  maxHours: number,
  opts?: Partial<Pick<StaffMember, 'expertise' | 'contractType' | 'polyvalent' | 'coversMidi' | 'coversSoir' | 'restDays'>>
): StaffMember {
  return {
    id,
    role,
    maxHours,
    expertise: opts?.expertise ?? 'intermediaire',
    contractType: opts?.contractType ?? 'cdi',
    polyvalent: opts?.polyvalent ?? false,
    coversMidi: opts?.coversMidi ?? 30,
    coversSoir: opts?.coversSoir ?? 25,
    restDays: opts?.restDays ?? [],
    unavailableDates: [],
  };
}

export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  encadrement: [
    makeStaff('Sophie', 'gerant', 35, { expertise: 'expert' }),
    makeStaff('Jean-Marc', 'gerant', 35, { expertise: 'expert' }),
  ],
  salle: [
    makeStaff('Bouquet Alexis', 'adjoint', 39, { expertise: 'expert' }),
    makeStaff('Treuillard Deborah', 'adjoint', 35, { expertise: 'intermediaire' }),
    makeStaff('Akbari Ibrahim', 'adjoint', 35, { expertise: 'intermediaire' }),
    makeStaff('Moura Ana', 'standard', 24, { expertise: 'novice', contractType: 'cdd' }),
    makeStaff('Picquet Zelie', 'standard', 15, { expertise: 'novice', contractType: 'cdd' }),
    makeStaff('Legrand Naomie', 'standard', 20, { expertise: 'intermediaire' }),
    makeStaff('Arab Romaissa', 'standard', 12, { expertise: 'novice', contractType: 'extra' }),
    makeStaff('Rahmouni Cenne', 'standard', 35, { expertise: 'intermediaire' }),
  ],
  cuisine: [
    makeStaff('Kebe Mahamadou', 'standard', 35, { expertise: 'intermediaire' }),
    makeStaff('Nazari Mojtaba', 'standard', 35, { expertise: 'expert' }),
    makeStaff('Faieq Hussain', 'standard', 35, { expertise: 'intermediaire' }),
    makeStaff('Gory Mahamadou', 'standard', 35, { expertise: 'novice' }),
    makeStaff('Khan Sidra', 'standard', 25, { expertise: 'novice', contractType: 'cdd' }),
    makeStaff('Daniel Corentin', 'standard', 35, { expertise: 'expert' }),
  ],
};

export const DEPARTMENT_CONFIGS: DepartmentDisplayConfig[] = [
  { id: 'encadrement', label: 'Gerant', colorClass: 'bg-gerant', nameCellClass: 'name-cell-gerant' },
  { id: 'salle', label: 'Salle', colorClass: 'bg-salle', nameCellClass: 'name-cell-salle' },
  { id: 'cuisine', label: 'Cuisine', colorClass: 'bg-cuisine', nameCellClass: 'name-cell-cuisine' },
];

export const DEPARTMENT_IDS: DepartmentId[] = ['encadrement', 'salle', 'cuisine'];

// Couverts par defaut (vides = 0 partout)
export function createEmptyCovers(): CoversData {
  const makeWeek = () => Array.from({ length: 7 }, () => ({ midi: 0, soir: 0 }));
  return { 1: makeWeek(), 2: makeWeek() };
}

export const EXPERTISE_LABELS: Record<ExpertiseLevel, string> = {
  novice: 'Novice',
  intermediaire: 'Intermediaire',
  expert: 'Expert',
};

export const CONTRACT_LABELS: Record<ContractType, string> = {
  cdi: 'CDI',
  cdd: 'CDD',
  extra: 'Extra',
};
