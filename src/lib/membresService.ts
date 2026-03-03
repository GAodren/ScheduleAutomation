import { supabase } from './supabase';
import type { DepartmentId, StaffRole } from '../types';

export interface DbMembre {
  id: string;
  name: string;
  department: DepartmentId;
  role: StaffRole;
  max_hours: number;
  sort_order: number;
}

export async function fetchAllMembres(): Promise<DbMembre[]> {
  const { data, error } = await supabase
    .from('membres')
    .select('*')
    .order('department')
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function insertMembre(
  name: string,
  department: DepartmentId,
  role: StaffRole,
  maxHours: number
): Promise<DbMembre> {
  const { data: existing } = await supabase
    .from('membres')
    .select('sort_order')
    .eq('department', department)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from('membres')
    .insert({ name, department, role, max_hours: maxHours, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMembre(
  id: string,
  updates: Partial<Pick<DbMembre, 'name' | 'role' | 'max_hours'>>
): Promise<void> {
  const { error } = await supabase.from('membres').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteMembre(id: string): Promise<void> {
  const { error } = await supabase.from('membres').delete().eq('id', id);
  if (error) throw error;
}
