import type { StaffConfig, ShiftPatterns, WeekSchedule, PersonSchedule, DayShift, DepartmentId, ShiftPattern, StaffRole } from '../types';
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

/** Calculate total hours for a shift pattern (midi + soir) */
function patternDuration(pattern: ShiftPattern): number {
  return calculateDuration(pattern.m) + calculateDuration(pattern.s);
}

/** Shuffle an array in place (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sort role priority: gerant first, then adjoint, then standard */
const ROLE_ORDER: Record<StaffRole, number> = { gerant: 0, adjoint: 1, standard: 2 };

export function sortByRole<T extends { role: StaffRole }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}

export function generateScheduleForWeek(staffConfig: StaffConfig, shiftPatterns: ShiftPatterns): WeekSchedule {
  const week: Partial<WeekSchedule> = {};

  (Object.keys(staffConfig) as DepartmentId[]).forEach(dept => {
    // Sort staff: adjoints before standard
    const sortedStaff = sortByRole(staffConfig[dept]);

    week[dept] = sortedStaff.map(p => {
      const opts = shiftPatterns[p.role === 'adjoint' ? 'salle' : dept] || shiftPatterns['salle'];

      // Pre-compute duration of each pattern
      const patternsWithDuration = opts.map(pat => ({
        pattern: pat,
        duration: patternDuration(pat),
      }));

      let budget = p.maxHours;
      const dayIndices = DAYS.map((_, i) => i);
      const shuffledIndices = shuffle(dayIndices);

      // Assign shifts in random day order to spread repos across the week
      const days: DayShift[] = new Array(7);

      for (const idx of shuffledIndices) {
        // Filter patterns that fit within remaining budget
        const fitting = patternsWithDuration.filter(pd => pd.duration <= budget);

        if (fitting.length === 0) {
          // No pattern fits — repos
          days[idx] = { midi: 'REPOS', soir: 'REPOS' };
        } else {
          // Pick a random fitting pattern
          const pick = fitting[Math.floor(Math.random() * fitting.length)];
          days[idx] = { midi: pick.pattern.m, soir: pick.pattern.s };
          budget -= pick.duration;
        }
      }

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
