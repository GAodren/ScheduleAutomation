import type { StaffConfig, ShiftPatterns, DepartmentDisplayConfig, DepartmentId } from '../types';

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

export const DEFAULT_STAFF_CONFIG: StaffConfig = {
  encadrement: [
    { id: 'Sophie', role: 'gerant', maxHours: 35 },
    { id: 'Jean-Marc', role: 'gerant', maxHours: 35 },
  ],
  salle: [
    { id: 'Bouquet Alexis', role: 'adjoint', maxHours: 39 },
    { id: 'Treuillard Déborah', role: 'adjoint', maxHours: 35 },
    { id: 'Akbari Ibrahim', role: 'adjoint', maxHours: 35 },
    { id: 'Moura Ana', role: 'standard', maxHours: 24 },
    { id: 'Picquet Zélie', role: 'standard', maxHours: 15 },
    { id: 'Legrand Naomie', role: 'standard', maxHours: 20 },
    { id: 'Arab Romaissa', role: 'standard', maxHours: 12 },
    { id: 'Rahmouni Cenne', role: 'standard', maxHours: 35 },
  ],
  cuisine: [
    { id: 'Kebe Mahamadou', role: 'standard', maxHours: 35 },
    { id: 'Nazari Mojtaba', role: 'standard', maxHours: 35 },
    { id: 'Faieq Hussain', role: 'standard', maxHours: 35 },
    { id: 'Gory Mahamadou', role: 'standard', maxHours: 35 },
    { id: 'Khan Sidra', role: 'standard', maxHours: 25 },
    { id: 'Daniel Corentin', role: 'standard', maxHours: 35 },
  ],
};

export const DEPARTMENT_CONFIGS: DepartmentDisplayConfig[] = [
  { id: 'encadrement', label: '👔 Gérant', colorClass: 'bg-gerant', nameCellClass: 'name-cell-gerant' },
  { id: 'salle', label: '🍽️ Salle', colorClass: 'bg-salle', nameCellClass: 'name-cell-salle' },
  { id: 'cuisine', label: '👨‍🍳 Cuisine', colorClass: 'bg-cuisine', nameCellClass: 'name-cell-cuisine' },
];

export const DEPARTMENT_IDS: DepartmentId[] = ['encadrement', 'salle', 'cuisine'];
