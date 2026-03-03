import { supabase } from './supabase';

export interface DbPlanning {
  id: string;
  membre_id: string;
  week_number: number;
  day_index: number;
  midi: string;
  soir: string;
}

export async function fetchAllPlannings(): Promise<DbPlanning[]> {
  const { data, error } = await supabase
    .from('plannings')
    .select('*')
    .order('week_number')
    .order('day_index');
  if (error) throw error;
  return data;
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

export async function deletePlanningsForMembre(membreId: string): Promise<void> {
  const { error } = await supabase.from('plannings').delete().eq('membre_id', membreId);
  if (error) throw error;
}
