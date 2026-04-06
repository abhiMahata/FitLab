/**
 * formSessionUtils.ts
 * Saves AI Form Checker session results for tracking improvement over time.
 */

export interface FormSession {
  id: string;
  date: string;           // YYYY-MM-DD
  timestamp: number;
  exercise: string;       // exercise label
  correctReps: number;
  incorrectReps: number;
  accuracy: number;       // 0-100
  durationSeconds: number;
}

const SESSIONS_KEY = "fitlab-form-sessions";
const MAX_SESSIONS = 50;

export function loadFormSessions(): FormSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch { return []; }
}

export function saveFormSession(session: Omit<FormSession, "id" | "date" | "timestamp">): FormSession {
  const full: FormSession = {
    ...session,
    id: `${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now(),
  };
  const sessions = loadFormSessions();
  sessions.unshift(full);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  return full;
}

/** Get sessions for a specific exercise */
export function getSessionsByExercise(exercise: string): FormSession[] {
  return loadFormSessions().filter((s) => s.exercise === exercise);
}

/** Get best accuracy per exercise */
export function getBestAccuracy(): Record<string, number> {
  const sessions = loadFormSessions();
  const best: Record<string, number> = {};
  for (const s of sessions) {
    if (!best[s.exercise] || s.accuracy > best[s.exercise]) {
      best[s.exercise] = s.accuracy;
    }
  }
  return best;
}
