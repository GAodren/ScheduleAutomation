import { supabase } from './supabase';
import type { DepartmentId, StaffRole, ExpertiseLevel, ContractType } from '../types';

export interface DbMembre {
  id: string;
  name: string;
  department: DepartmentId;
  role: StaffRole;
  max_hours: number;
  sort_order: number;
  expertise: ExpertiseLevel;
  contract_type: ContractType;
  polyvalent: boolean;
  covers_midi: number;
  covers_soir: number;
  rest_days: number[];
  unavailable_dates: string[];
}

export async function fetchAllMembres(): Promise<DbMembre[]> {
  const { data, error } = await supabase
    .from('membres')
    .select('*')
    .order('department')
    .order('sort_order');
  if (error) throw error;
  // Fill defaults for potentially missing columns (backward compat with existing DB)
  return (data ?? []).map(m => ({
    expertise: 'intermediaire' as ExpertiseLevel,
    contract_type: 'cdi' as ContractType,
    polyvalent: false,
    covers_midi: 30,
    covers_soir: 25,
    rest_days: [],
    unavailable_dates: [],
    ...m,
  }));
}

export async function insertMembre(
  name: string,
  department: DepartmentId,
  role: StaffRole,
  maxHours: number,
  extras?: {
    expertise?: ExpertiseLevel;
    contract_type?: ContractType;
    polyvalent?: boolean;
    covers_midi?: number;
    covers_soir?: number;
    rest_days?: number[];
  }
): Promise<DbMembre> {
  const { data: existing } = await supabase
    .from('membres')
    .select('sort_order')
    .eq('department', department)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const row: Record<string, unknown> = {
    name,
    department,
    role,
    max_hours: maxHours,
    sort_order: nextOrder,
  };

  // Add optional fields if provided
  if (extras) {
    if (extras.expertise) row.expertise = extras.expertise;
    if (extras.contract_type) row.contract_type = extras.contract_type;
    if (extras.polyvalent !== undefined) row.polyvalent = extras.polyvalent;
    if (extras.covers_midi !== undefined) row.covers_midi = extras.covers_midi;
    if (extras.covers_soir !== undefined) row.covers_soir = extras.covers_soir;
    if (extras.rest_days) row.rest_days = extras.rest_days;
  }

  const { data, error } = await supabase
    .from('membres')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMembre(
  id: string,
  updates: Partial<Pick<DbMembre, 'name' | 'role' | 'max_hours' | 'expertise' | 'contract_type' | 'polyvalent' | 'covers_midi' | 'covers_soir' | 'rest_days' | 'unavailable_dates'>>
): Promise<void> {
  const { error } = await supabase.from('membres').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteMembre(id: string): Promise<void> {
  const { error } = await supabase.from('membres').delete().eq('id', id);
  if (error) throw error;
}
