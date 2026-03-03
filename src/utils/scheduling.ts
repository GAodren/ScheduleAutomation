import type { StaffConfig, ShiftPatterns, WeekSchedule, PersonSchedule, DayShift, DepartmentId } from '../types';
import { DAYS, SHIFT_PATTERNS } from '../data/defaults';

function toDecimal(timeStr: string): number {
  let h = 0, m = 0;
  const time = timeStr.replace(':', 'h');
  if (time.includes('h')) {
    const bits = time.split('h');
    h = parseInt(bits[0]) || 0;
    m = parseInt(bits[1]) || 0;
  } else {
    h = parseInt(time) || 0;
  }
  return h + (m / 60);
}

export function calculateDuration(shiftStr: string): number {
  if (!shiftStr || shiftStr.toUpperCase().includes('REPOS')) return 0;

  // Strip any HTML tags (from formatDisplay)
  const cleanText = shiftStr.replace(/<[^>]*>/g, '');
  const parts = cleanText.toLowerCase().split('-').map(p => p.trim());
  if (parts.length !== 2) return 0;

  const start = toDecimal(parts[0]);
  let end = toDecimal(parts[1]);
  if (end < start) end += 24;
  return Math.max(0, end - start);
}

export function calculateWeeklyTotal(days: DayShift[]): number {
  let total = 0;
  days.forEach(day => {
    total += calculateDuration(day.midi);
    total += calculateDuration(day.soir);
  });
  return Math.round(total * 100) / 100;
}

export function generateScheduleForWeek(staffConfig: StaffConfig, shiftPatterns: ShiftPatterns): WeekSchedule {
  const week: Partial<WeekSchedule> = {};

  (Object.keys(staffConfig) as DepartmentId[]).forEach(dept => {
    week[dept] = staffConfig[dept].map(p => {
      const days: DayShift[] = DAYS.map(() => {
        if (Math.random() > 0.8) return { midi: 'REPOS', soir: 'REPOS' };
        const opts = shiftPatterns[p.role === 'adjoint' ? 'salle' : dept] || shiftPatterns['salle'];
        const pick = opts[Math.floor(Math.random() * opts.length)];
        return { midi: pick.m, soir: pick.s };
      });

      const person: PersonSchedule = {
        ...p,
        days,
        hours: calculateWeeklyTotal(days),
      };
      return person;
    });
  });

  return week as WeekSchedule;
}

export function generateNewCycleData(staffConfig: StaffConfig): Record<1 | 2, WeekSchedule> {
  return {
    1: generateScheduleForWeek(staffConfig, SHIFT_PATTERNS),
    2: generateScheduleForWeek(staffConfig, SHIFT_PATTERNS),
  };
}
