import type {
  StaffConfig,
  ShiftPatterns,
  WeekSchedule,
  PersonSchedule,
  DayShift,
  DepartmentId,
  ShiftPattern,
  StaffRole,
  ExpertiseLevel,
  StaffMember,
  WeekCovers,
  WeekNumber,
  CoversData,
  ScheduleData,
} from '../types';
import { DAYS, SHIFT_PATTERNS } from '../data/defaults';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Sort expertise priority: expert first, then intermediaire, then novice */
const EXPERTISE_ORDER: Record<ExpertiseLevel, number> = { expert: 0, intermediaire: 1, novice: 2 };

function sortByPriority<T extends { role: StaffRole; expertise: ExpertiseLevel }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    if (roleDiff !== 0) return roleDiff;
    return EXPERTISE_ORDER[a.expertise] - EXPERTISE_ORDER[b.expertise];
  });
}

// ---------------------------------------------------------------------------
// Legacy schedule generation (no covers)
// ---------------------------------------------------------------------------

export function generateScheduleForWeek(staffConfig: StaffConfig, shiftPatterns: ShiftPatterns): WeekSchedule {
  const week: Partial<WeekSchedule> = {};

  (Object.keys(staffConfig) as DepartmentId[]).forEach(dept => {
    const sortedStaff = sortByRole(staffConfig[dept]);

    week[dept] = sortedStaff.map(p => {
      const opts = shiftPatterns[p.role === 'adjoint' ? 'salle' : dept] || shiftPatterns['salle'];

      const patternsWithDuration = opts.map(pat => ({
        pattern: pat,
        duration: patternDuration(pat),
      }));

      let budget = p.maxHours;
      const dayIndices = DAYS.map((_, i) => i);
      const shuffledIndices = shuffle(dayIndices);

      const days: DayShift[] = new Array(7);

      for (const idx of shuffledIndices) {
        const fitting = patternsWithDuration.filter(pd => pd.duration <= budget);

        if (fitting.length === 0) {
          days[idx] = { midi: 'REPOS', soir: 'REPOS' };
        } else {
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

// ---------------------------------------------------------------------------
// Smart-Staffing: covers-based scheduling algorithm
// ---------------------------------------------------------------------------

/** Determine how many staff a department needs for a given service based on covers */
function staffNeeded(covers: number, avgCoversPerPerson: number): number {
  if (covers <= 0) return 0;
  if (avgCoversPerPerson <= 0) return 0;
  return Math.ceil(covers / avgCoversPerPerson);
}

/** Compute average covers-per-person for a list of staff (midi or soir) */
function avgCovers(staff: StaffMember[], service: 'midi' | 'soir'): number {
  if (staff.length === 0) return 1; // fallback to avoid division by zero
  const total = staff.reduce((sum, s) => sum + (service === 'midi' ? s.coversMidi : s.coversSoir), 0);
  return total / staff.length || 1;
}

/** Check if a person is on a fixed rest day */
function isRestDay(person: StaffMember, dayIndex: number): boolean {
  return person.restDays.includes(dayIndex);
}

/** Pick the best-fitting shift pattern for a service need (midi-only, soir-only, or both) */
function pickPattern(
  patterns: ShiftPattern[],
  needMidi: boolean,
  needSoir: boolean,
  remainingBudget: number
): ShiftPattern | null {
  // Score patterns: prefer patterns that match the needed services
  const scored = patterns
    .map(pat => {
      const dur = patternDuration(pat);
      if (dur > remainingBudget) return null; // exceeds budget

      const hasMidi = pat.m.toUpperCase() !== 'REPOS';
      const hasSoir = pat.s.toUpperCase() !== 'REPOS';

      let score = 0;
      // Perfect match: both needed and both provided
      if (needMidi && needSoir && hasMidi && hasSoir) score = 4;
      // Partial match: only midi needed and pattern has only midi
      else if (needMidi && !needSoir && hasMidi && !hasSoir) score = 3;
      // Partial match: only soir needed and pattern has only soir
      else if (!needMidi && needSoir && !hasMidi && hasSoir) score = 3;
      // Acceptable: midi needed and pattern has midi (even if also has soir)
      else if (needMidi && hasMidi) score = 2;
      // Acceptable: soir needed and pattern has soir (even if also has midi)
      else if (needSoir && hasSoir) score = 2;
      // Pattern doesn't cover any needed service
      else score = 0;

      return { pattern: pat, duration: dur, score };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.score > 0);

  if (scored.length === 0) return null;

  // Sort by score desc, then by duration asc (preserve budget)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.duration - b.duration;
  });

  return scored[0].pattern;
}

/** Check if a shift has at least one expert or intermediaire */
function hasExperiencedStaff(
  assignedIds: Set<string>,
  allStaff: StaffMember[]
): boolean {
  for (const s of allStaff) {
    if (assignedIds.has(s.id) && (s.expertise === 'expert' || s.expertise === 'intermediaire')) {
      return true;
    }
  }
  return false;
}

interface AssignmentState {
  days: DayShift[];
  budget: number;
}

export function generateSmartSchedule(
  staffConfig: StaffConfig,
  shiftPatterns: ShiftPatterns,
  weekCovers: WeekCovers,
  _weekNumber: WeekNumber
): WeekSchedule {
  const deptIds: DepartmentId[] = ['encadrement', 'salle', 'cuisine'];
  const week: Partial<WeekSchedule> = {};

  // Track per-person state across the algorithm
  // Map: personId -> AssignmentState
  const stateMap = new Map<string, AssignmentState>();

  // Initialize all staff states
  for (const dept of deptIds) {
    for (const person of staffConfig[dept]) {
      stateMap.set(person.id, {
        days: Array.from({ length: 7 }, () => ({ midi: 'REPOS', soir: 'REPOS' })),
        budget: person.maxHours,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 1: For each department, for each day, assign staff based on covers
  // ---------------------------------------------------------------------------
  for (const dept of deptIds) {
    const deptStaff = staffConfig[dept];
    const patterns = shiftPatterns[dept] || shiftPatterns['salle'];
    const avgMidi = avgCovers(deptStaff, 'midi');
    const avgSoir = avgCovers(deptStaff, 'soir');

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayCovers = weekCovers[dayIdx] ?? { midi: 0, soir: 0 };
      const neededMidi = staffNeeded(dayCovers.midi, avgMidi);
      const neededSoir = staffNeeded(dayCovers.soir, avgSoir);

      if (neededMidi === 0 && neededSoir === 0) {
        // No covers => everyone rests this day (already set to REPOS)
        continue;
      }

      // Get available staff for this day, sorted by priority
      const available = sortByPriority(
        deptStaff.filter(p => {
          if (isRestDay(p, dayIdx)) return false;
          const state = stateMap.get(p.id)!;
          if (state.budget <= 0) return false;
          return true;
        })
      );

      // Track how many are assigned to midi and soir for this day
      let assignedMidi = 0;
      let assignedSoir = 0;
      const assignedMidiIds = new Set<string>();
      const assignedSoirIds = new Set<string>();

      for (const person of available) {
        const state = stateMap.get(person.id)!;

        // Determine which services still need staff
        const stillNeedMidi = assignedMidi < neededMidi && dayCovers.midi > 0;
        const stillNeedSoir = assignedSoir < neededSoir && dayCovers.soir > 0;

        if (!stillNeedMidi && !stillNeedSoir) break; // fully staffed

        const pattern = pickPattern(patterns, stillNeedMidi, stillNeedSoir, state.budget);
        if (!pattern) continue; // no fitting pattern

        state.days[dayIdx] = { midi: pattern.m, soir: pattern.s };
        state.budget -= patternDuration(pattern);

        const hasMidi = pattern.m.toUpperCase() !== 'REPOS';
        const hasSoir = pattern.s.toUpperCase() !== 'REPOS';

        if (hasMidi) {
          assignedMidi++;
          assignedMidiIds.add(person.id);
        }
        if (hasSoir) {
          assignedSoir++;
          assignedSoirIds.add(person.id);
        }
      }

      // ---------------------------------------------------------------------------
      // Phase 2: Expertise balancing check for this day/department
      // ---------------------------------------------------------------------------
      // Check midi shift has experienced staff
      if (assignedMidiIds.size > 0 && !hasExperiencedStaff(assignedMidiIds, deptStaff)) {
        // Try to swap a novice with an experienced person who is on REPOS
        const noviceOnMidi = deptStaff.find(
          p => assignedMidiIds.has(p.id) && p.expertise === 'novice'
        );
        const experiencedResting = deptStaff.find(p => {
          if (assignedMidiIds.has(p.id) || assignedSoirIds.has(p.id)) return false;
          if (isRestDay(p, dayIdx)) return false;
          if (p.expertise !== 'expert' && p.expertise !== 'intermediaire') return false;
          const st = stateMap.get(p.id)!;
          // Check if any midi pattern fits
          return patterns.some(
            pat => pat.m.toUpperCase() !== 'REPOS' && patternDuration(pat) <= st.budget
          );
        });

        if (noviceOnMidi && experiencedResting) {
          // Find a midi-covering pattern for the experienced person
          const expState = stateMap.get(experiencedResting.id)!;
          const swapPattern = pickPattern(patterns, true, false, expState.budget);
          if (swapPattern) {
            // Put novice to REPOS
            const novState = stateMap.get(noviceOnMidi.id)!;
            const noviceOldPattern = novState.days[dayIdx];
            const noviceDur = calculateDuration(noviceOldPattern.midi) + calculateDuration(noviceOldPattern.soir);
            novState.days[dayIdx] = { midi: 'REPOS', soir: 'REPOS' };
            novState.budget += noviceDur;

            // Assign experienced
            expState.days[dayIdx] = { midi: swapPattern.m, soir: swapPattern.s };
            expState.budget -= patternDuration(swapPattern);
          }
        }
      }

      // Check soir shift has experienced staff
      if (assignedSoirIds.size > 0 && !hasExperiencedStaff(assignedSoirIds, deptStaff)) {
        const noviceOnSoir = deptStaff.find(
          p => assignedSoirIds.has(p.id) && p.expertise === 'novice'
        );
        const experiencedResting = deptStaff.find(p => {
          if (assignedMidiIds.has(p.id) || assignedSoirIds.has(p.id)) return false;
          if (isRestDay(p, dayIdx)) return false;
          if (p.expertise !== 'expert' && p.expertise !== 'intermediaire') return false;
          const st = stateMap.get(p.id)!;
          return patterns.some(
            pat => pat.s.toUpperCase() !== 'REPOS' && patternDuration(pat) <= st.budget
          );
        });

        if (noviceOnSoir && experiencedResting) {
          const expState = stateMap.get(experiencedResting.id)!;
          const swapPattern = pickPattern(patterns, false, true, expState.budget);
          if (swapPattern) {
            const novState = stateMap.get(noviceOnSoir.id)!;
            const noviceOldPattern = novState.days[dayIdx];
            const noviceDur = calculateDuration(noviceOldPattern.midi) + calculateDuration(noviceOldPattern.soir);
            novState.days[dayIdx] = { midi: 'REPOS', soir: 'REPOS' };
            novState.budget += noviceDur;

            expState.days[dayIdx] = { midi: swapPattern.m, soir: swapPattern.s };
            expState.budget -= patternDuration(swapPattern);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Polyvalent cross-department fill
  // ---------------------------------------------------------------------------
  // Check each department for each day: if still short-staffed, look for
  // polyvalent members in OTHER departments who have remaining budget.
  for (const dept of deptIds) {
    const deptStaff = staffConfig[dept];
    const patterns = shiftPatterns[dept] || shiftPatterns['salle'];
    const avgMidi = avgCovers(deptStaff, 'midi');
    const avgSoir = avgCovers(deptStaff, 'soir');

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayCovers = weekCovers[dayIdx] ?? { midi: 0, soir: 0 };
      const neededMidi = staffNeeded(dayCovers.midi, avgMidi);
      const neededSoir = staffNeeded(dayCovers.soir, avgSoir);

      // Count currently assigned for this dept on this day
      let currentMidi = 0;
      let currentSoir = 0;
      for (const person of deptStaff) {
        const state = stateMap.get(person.id)!;
        const day = state.days[dayIdx];
        if (day.midi.toUpperCase() !== 'REPOS') currentMidi++;
        if (day.soir.toUpperCase() !== 'REPOS') currentSoir++;
      }

      const shortMidi = neededMidi - currentMidi;
      const shortSoir = neededSoir - currentSoir;

      if (shortMidi <= 0 && shortSoir <= 0) continue;

      // Find polyvalent staff from other departments
      const polyvalentCandidates: StaffMember[] = [];
      for (const otherDept of deptIds) {
        if (otherDept === dept) continue;
        for (const person of staffConfig[otherDept]) {
          if (!person.polyvalent) continue;
          if (isRestDay(person, dayIdx)) continue;
          const state = stateMap.get(person.id)!;
          // Only consider if they're on REPOS for this day (not already working)
          if (state.days[dayIdx].midi.toUpperCase() !== 'REPOS' || state.days[dayIdx].soir.toUpperCase() !== 'REPOS') continue;
          if (state.budget <= 0) continue;
          polyvalentCandidates.push(person);
        }
      }

      // Sort polyvalent candidates by priority
      const sorted = sortByPriority(polyvalentCandidates);

      let filledMidi = 0;
      let filledSoir = 0;

      for (const person of sorted) {
        const stillNeedMidi = filledMidi < shortMidi && dayCovers.midi > 0;
        const stillNeedSoir = filledSoir < shortSoir && dayCovers.soir > 0;
        if (!stillNeedMidi && !stillNeedSoir) break;

        const state = stateMap.get(person.id)!;
        const pattern = pickPattern(patterns, stillNeedMidi, stillNeedSoir, state.budget);
        if (!pattern) continue;

        state.days[dayIdx] = { midi: pattern.m, soir: pattern.s };
        state.budget -= patternDuration(pattern);

        if (pattern.m.toUpperCase() !== 'REPOS') filledMidi++;
        if (pattern.s.toUpperCase() !== 'REPOS') filledSoir++;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build output WeekSchedule
  // ---------------------------------------------------------------------------
  for (const dept of deptIds) {
    const sortedStaff = sortByRole(staffConfig[dept]);
    week[dept] = sortedStaff.map(person => {
      const state = stateMap.get(person.id)!;
      const ps: PersonSchedule = {
        ...person,
        days: state.days,
        hours: calculateWeeklyTotal(state.days),
      };
      return ps;
    });
  }

  return week as WeekSchedule;
}

// ---------------------------------------------------------------------------
// Smart cycle: generate both weeks using covers data
// ---------------------------------------------------------------------------

export function generateSmartCycleData(
  staffConfig: StaffConfig,
  coversData: CoversData
): ScheduleData {
  return {
    1: generateSmartSchedule(staffConfig, SHIFT_PATTERNS, coversData[1], 1),
    2: generateSmartSchedule(staffConfig, SHIFT_PATTERNS, coversData[2], 2),
  };
}
