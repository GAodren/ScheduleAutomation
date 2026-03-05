import { supabase } from './supabase';
import type { PlanningStatus } from '../types';

export interface DbPlanning {
  id: string;
  membre_id: string;
  week_number: number;
  day_index: number;
  midi: string;
  soir: string;
  status: PlanningStatus;
  year_week: string; // ex: "2026-W10"
}

export async function fetchAllPlannings(): Promise<DbPlanning[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('*')
    .order('week_number')
    .order('day_index');
  if (error) throw error;
  // Fill defaults for backward compat
  return (data ?? []).map(p => ({
    status: 'draft' as PlanningStatus,
    year_week: '',
    ...p,
  }));
}

export async function fetchPlanningsByStatus(status: PlanningStatus): Promise<DbPlanning[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('*')
    .eq('status', status)
    .order('year_week', { ascending: false })
    .order('week_number')
    .order('day_index');
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlanningsByYearWeek(yearWeek: string): Promise<DbPlanning[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('*')
    .eq('year_week', yearWeek)
    .order('week_number')
    .order('day_index');
  if (error) throw error;
  return data ?? [];
}

export async function upsertShift(
  membreId: string,
  weekNumber: number,
  dayIndex: number,
  midi: string,
  soir: string
): Promise<void> {
  const { error } = await supabase
    .from('plannings')
    .upsert(
      { membre_id: membreId, week_number: weekNumber, day_index: dayIndex, midi, soir },
      { onConflict: 'membre_id,week_number,day_index' }
    );
  if (error) throw error;
}

export async function batchUpsertPlannings(
  rows: Omit<DbPlanning, 'id'>[]
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('plannings')
    .upsert(rows, { onConflict: 'membre_id,week_number,day_index' });
  if (error) throw error;
}

export async function updatePlanningStatus(
  yearWeek: string,
  weekNumber: number,
  newStatus: PlanningStatus
): Promise<void> {
  const { error } = await supabase
    .from('plannings')
    .update({ status: newStatus })
    .eq('year_week', yearWeek)
    .eq('week_number', weekNumber);
  if (error) throw error;
}

export async function deletePlanningsForMembre(membreId: string): Promise<void> {
  const { error } = await supabase.from('plannings').delete().eq('membre_id', membreId);
  if (error) throw error;
}

// Recuperer les year_weeks distincts pour l'historique
export async function fetchDistinctYearWeeks(): Promise<string[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('year_week')
    .not('year_week', 'eq', '')
    .order('year_week', { ascending: false });
  if (error) throw error;
  const unique = [...new Set((data ?? []).map(d => d.year_week))];
  return unique;
}
