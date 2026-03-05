import type {
  DepartmentId,
  WeekNumber,
  ScheduleData,
  PersonSchedule,
  DayShift,
  LegalAlert,
  LegalRuleId,
} from '../types';
import { calculateWeeklyTotal } from './scheduling';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Verifie si un shift est un repos */
export function isRepos(shiftStr: string): boolean {
  return !shiftStr || shiftStr.trim() === '' || shiftStr.toUpperCase().includes('REPOS');
}

/** Convertit un horaire en nombre decimal (ex: "09h30" -> 9.5) */
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

/** Extrait l'heure de debut d'un shift (ex: "09h30-14h30" -> 9.5) */
export function getShiftStartTime(shiftStr: string): number | null {
  if (isRepos(shiftStr)) return null;
  const cleanText = shiftStr.replace(/<[^>]*>/g, '');
  const parts = cleanText.toLowerCase().split('-').map(p => p.trim());
  if (parts.length !== 2) return null;
  return toDecimal(parts[0]);
}

/** Extrait l'heure de fin d'un shift (ex: "09h30-14h30" -> 14.5) */
export function getShiftEndTime(shiftStr: string): number | null {
  if (isRepos(shiftStr)) return null;
  const cleanText = shiftStr.replace(/<[^>]*>/g, '');
  const parts = cleanText.toLowerCase().split('-').map(p => p.trim());
  if (parts.length !== 2) return null;
  const start = toDecimal(parts[0]);
  let end = toDecimal(parts[1]);
  if (end < start) end += 24;
  return end;
}

// ---------------------------------------------------------------------------
// Fonctions utilitaires internes
// ---------------------------------------------------------------------------

/** Retourne l'heure de fin du dernier shift travaille dans la journee */
function getLastEndOfDay(day: DayShift): number | null {
  // Priorite au soir, sinon midi
  if (!isRepos(day.soir)) return getShiftEndTime(day.soir);
  if (!isRepos(day.midi)) return getShiftEndTime(day.midi);
  return null;
}

/** Retourne l'heure de debut du premier shift travaille dans la journee */
function getFirstStartOfDay(day: DayShift): number | null {
  // Priorite au midi, sinon soir
  if (!isRepos(day.midi)) return getShiftStartTime(day.midi);
  if (!isRepos(day.soir)) return getShiftStartTime(day.soir);
  return null;
}

// ---------------------------------------------------------------------------
// A. Repos Quotidien — 11h minimum entre fin dernier shift et debut suivant
// ---------------------------------------------------------------------------

export function checkReposQuotidien(
  person: PersonSchedule,
  dept: DepartmentId,
  week: WeekNumber,
  nextWeekFirstDay?: DayShift,
): LegalAlert[] {
  const alerts: LegalAlert[] = [];
  const days = person.days;

  // Verifier jours consecutifs au sein de la semaine
  for (let i = 0; i < days.length - 1; i++) {
    const endTime = getLastEndOfDay(days[i]);
    const startTime = getFirstStartOfDay(days[i + 1]);

    if (endTime === null || startTime === null) continue;

    // Calculer le repos entre les deux jours
    // endTime est l'heure de fin du jour N, startTime l'heure de debut du jour N+1
    // Le repos = (24 - endTime) + startTime
    const gap = (24 - endTime) + startTime;

    if (gap < 11) {
      alerts.push({
        ruleId: 'repos_quotidien' as LegalRuleId,
        severity: 'error',
        message: `Repos quotidien insuffisant pour ${person.id} : ${gap.toFixed(1)}h entre jour ${i + 1} et jour ${i + 2} (minimum 11h requis)`,
        personId: person.id,
        dept,
        week,
        dayIndex: i,
      });
    }
  }

  // Verifier la transition semaine 1 dimanche -> semaine 2 lundi
  if (nextWeekFirstDay) {
    const endTime = getLastEndOfDay(days[days.length - 1]);
    const startTime = getFirstStartOfDay(nextWeekFirstDay);

    if (endTime !== null && startTime !== null) {
      const gap = (24 - endTime) + startTime;
      if (gap < 11) {
        alerts.push({
          ruleId: 'repos_quotidien' as LegalRuleId,
          severity: 'error',
          message: `Repos quotidien insuffisant pour ${person.id} : ${gap.toFixed(1)}h entre dimanche (S${week}) et lundi (S${(week % 2) + 1 as WeekNumber}) (minimum 11h requis)`,
          personId: person.id,
          dept,
          week,
          dayIndex: 6,
        });
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// B. Repos Hebdomadaire — 2 jours de repos complets par semaine minimum
// ---------------------------------------------------------------------------

export function checkReposHebdo(
  person: PersonSchedule,
  dept: DepartmentId,
  week: WeekNumber,
): LegalAlert[] {
  const alerts: LegalAlert[] = [];

  const fullRestDays = person.days.filter(
    day => isRepos(day.midi) && isRepos(day.soir),
  ).length;

  if (fullRestDays < 2) {
    alerts.push({
      ruleId: 'repos_hebdo' as LegalRuleId,
      severity: 'error',
      message: `Repos hebdomadaire insuffisant pour ${person.id} : ${fullRestDays} jour(s) de repos complet (minimum 2 requis)`,
      personId: person.id,
      dept,
      week,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// C. Amplitude Journaliere — max 13h entre premiere arrivee et dernier depart
// ---------------------------------------------------------------------------

export function checkAmplitude(
  person: PersonSchedule,
  dept: DepartmentId,
  week: WeekNumber,
): LegalAlert[] {
  const alerts: LegalAlert[] = [];

  person.days.forEach((day, dayIndex) => {
    // Ne s'applique que si la personne travaille midi ET soir
    if (isRepos(day.midi) || isRepos(day.soir)) return;

    const startTime = getShiftStartTime(day.midi);
    const endTime = getShiftEndTime(day.soir);

    if (startTime === null || endTime === null) return;

    const amplitude = endTime - startTime;

    if (amplitude > 13) {
      alerts.push({
        ruleId: 'amplitude' as LegalRuleId,
        severity: 'error',
        message: `Amplitude journaliere excessive pour ${person.id} jour ${dayIndex + 1} : ${amplitude.toFixed(1)}h (maximum 13h autorise)`,
        personId: person.id,
        dept,
        week,
        dayIndex,
      });
    }
  });

  return alerts;
}

// ---------------------------------------------------------------------------
// D. Duree Max Hebdomadaire — max 48h, warning a 44h
// ---------------------------------------------------------------------------

export function checkMaxHebdo(
  person: PersonSchedule,
  dept: DepartmentId,
  week: WeekNumber,
): LegalAlert[] {
  const alerts: LegalAlert[] = [];

  const totalHours = calculateWeeklyTotal(person.days);

  if (totalHours > 48) {
    alerts.push({
      ruleId: 'max_48h' as LegalRuleId,
      severity: 'error',
      message: `Duree hebdomadaire excessive pour ${person.id} : ${totalHours.toFixed(1)}h (maximum 48h autorise)`,
      personId: person.id,
      dept,
      week,
    });
  } else if (totalHours > 44) {
    alerts.push({
      ruleId: 'max_48h' as LegalRuleId,
      severity: 'warning',
      message: `Duree hebdomadaire elevee pour ${person.id} : ${totalHours.toFixed(1)}h (limite de 48h proche)`,
      personId: person.id,
      dept,
      week,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Fonction principale — verifie toutes les regles sur l'ensemble du planning
// ---------------------------------------------------------------------------

export function checkLegalRules(scheduleData: ScheduleData): LegalAlert[] {
  const alerts: LegalAlert[] = [];
  const weeks: WeekNumber[] = [1, 2];
  const depts: DepartmentId[] = ['encadrement', 'salle', 'cuisine'];

  for (const week of weeks) {
    const weekSchedule = scheduleData[week];
    if (!weekSchedule) continue;

    for (const dept of depts) {
      const staff = weekSchedule[dept];
      if (!staff) continue;

      for (const person of staff) {
        // B. Repos hebdomadaire
        alerts.push(...checkReposHebdo(person, dept, week));

        // C. Amplitude journaliere
        alerts.push(...checkAmplitude(person, dept, week));

        // D. Duree max hebdomadaire
        alerts.push(...checkMaxHebdo(person, dept, week));

        // A. Repos quotidien (intra-semaine + transition S1->S2)
        let nextWeekFirstDay: DayShift | undefined;
        if (week === 1) {
          // Chercher la meme personne en semaine 2 pour verifier la transition
          const nextWeekStaff = scheduleData[2]?.[dept];
          if (nextWeekStaff) {
            const samePerson = nextWeekStaff.find(p => p.id === person.id);
            if (samePerson && samePerson.days.length > 0) {
              nextWeekFirstDay = samePerson.days[0];
            }
          }
        }
        alerts.push(...checkReposQuotidien(person, dept, week, nextWeekFirstDay));
      }
    }
  }

  return alerts;
}
