/**
 * fitlabBrain.ts
 *
 * FitLab's cross-feature adaptive intelligence layer.
 *
 * Reads data from ALL four features (Sleep, Calories, Workout, Form)
 * and provides typed advisories that each feature uses to dynamically
 * adapt its UI and recommendations.
 *
 * Design: Pure functions only — no React state. Each page calls
 * getFitLabContext() at render time and reacts to its advisories.
 */

import { getTodayLog } from "./exerciseLibrary";
import { getProfile, calculateTDEE, getWaterGoalMl } from "./userProfile";
import { getLocalDateString, getLocalDateOffset, getDayName } from "./utils";
import { loadFormSessions } from "./formSessionUtils";

// ─── Core Types ───────────────────────────────────────────────────────

export type AdvisoryLevel = "positive" | "warning" | "critical" | "info";

export interface Advisory {
  id: string;
  level: AdvisoryLevel;
  icon: string;
  title: string;
  message: string;
  /** Which feature panel should display this */
  targetFeature: "workout" | "sleep" | "calories" | "formchecker" | "all";
}

export interface SleepSnapshot {
  hasData: boolean;
  score: number;          // 0–100
  durationMin: number;
  quality: number;        // 1–5 stars
  trend: "improving" | "declining" | "stable";
  daysTracked: number;
}

export interface NutritionSnapshot {
  consumed: number;
  goal: number;
  surplusPct: number;     // positive = surplus, negative = deficit
  isHeavyMeal: boolean;   // consumed > 120% of goal
  isUnderfueled: boolean; // consumed < 60% of goal
  waterMl: number;
  waterGoalMl: number;
  waterPct: number;
}

export interface WorkoutSnapshot {
  didWorkoutToday: boolean;
  durationMin: number;
  isHeavySession: boolean;  // ≥40 min
  isLightSession: boolean;  // 1–20 min
  weeklySessionCount: number;
  avgFormAccuracy: number;  // from recent form sessions, 0–100
  isFormImproving: boolean;
}

export interface FitLabContext {
  sleep: SleepSnapshot;
  nutrition: NutritionSnapshot;
  workout: WorkoutSnapshot;
  /** Recommended intensity modifier: 0.6 = 60% of normal, 1.2 = 120% etc. */
  intensityModifier: number;
  /** Recommended calorie adjustment for today based on workout + sleep */
  recommendedCalorieAdjustment: number;
  /** All cross-feature advisories sorted by severity */
  advisories: Advisory[];
  /** Single-sentence headline for today's status */
  headline: string;
}

// ─── Data Readers ─────────────────────────────────────────────────────

interface SleepEntry {
  durationMin: number;
  quality: number;
  score: number;
  date: string;
}

function readSleep(): SleepSnapshot {
  try {
    const entries: SleepEntry[] = JSON.parse(
      localStorage.getItem("fitlab-sleep-entries") || "[]"
    );
    if (entries.length === 0) {
      return { hasData: false, score: 75, durationMin: 480, quality: 3, trend: "stable", daysTracked: 0 };
    }
    const today = getLocalDateString();
    const yesterday = getLocalDateOffset(-1);
    const latest = entries.find(e => e.date === today) || entries.find(e => e.date === yesterday) || entries[0];

    // Trend: compare most recent 3 vs previous 3
    const recent = entries.slice(0, 3);
    const older = entries.slice(3, 6);
    const recentAvg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((s, e) => s + e.score, 0) / older.length : recentAvg;
    const trend: SleepSnapshot["trend"] =
      recentAvg > olderAvg + 5 ? "improving" :
      recentAvg < olderAvg - 5 ? "declining" : "stable";

    return {
      hasData: true,
      score: latest.score,
      durationMin: latest.durationMin,
      quality: latest.quality,
      trend,
      daysTracked: entries.length,
    };
  } catch {
    return { hasData: false, score: 75, durationMin: 480, quality: 3, trend: "stable", daysTracked: 0 };
  }
}

function readNutrition(): NutritionSnapshot {
  const profile = getProfile();
  const goal = calculateTDEE(profile);
  const waterGoalMl = getWaterGoalMl(profile);
  const dateKey = getLocalDateString();
  const waterMl = Number(localStorage.getItem(`fitlab-water-${dateKey}`) || "0");

  try {
    const raw = localStorage.getItem("fitlab-calorie-data");
    const dayKey = getDayName();
    let consumed = 0;
    if (raw) {
      const data = JSON.parse(raw);
      const dayData = data[dayKey];
      if (dayData?.entries) {
        consumed = dayData.entries.reduce((s: number, e: { calories: number }) => s + e.calories, 0);
      }
    }
    const surplusPct = goal > 0 ? Math.round(((consumed - goal) / goal) * 100) : 0;
    return {
      consumed,
      goal,
      surplusPct,
      isHeavyMeal: consumed > goal * 1.20,
      isUnderfueled: consumed > 0 && consumed < goal * 0.60,
      waterMl,
      waterGoalMl,
      waterPct: Math.round((waterMl / waterGoalMl) * 100),
    };
  } catch {
    return {
      consumed: 0, goal, surplusPct: 0,
      isHeavyMeal: false, isUnderfueled: false,
      waterMl, waterGoalMl, waterPct: Math.round((waterMl / waterGoalMl) * 100),
    };
  }
}

function readWorkout(): WorkoutSnapshot {
  const todayLog = getTodayLog();
  const durationMin = todayLog ? Math.round(todayLog.durationSeconds / 60) : 0;

  // Weekly session count from last 7 days
  let weeklySessionCount = 0;
  try {
    const logs = JSON.parse(localStorage.getItem("fitlab-workout-logs") || "[]");
    const cutoff = Date.now() - 7 * 86400000;
    weeklySessionCount = logs.filter((l: { completedAt: number }) => l.completedAt > cutoff).length;
  } catch { /* noop */ }

  // Form accuracy from recent sessions
  let avgFormAccuracy = 0;
  let isFormImproving = false;
  try {
    const sessions = loadFormSessions().slice(0, 10);
    if (sessions.length > 0) {
      avgFormAccuracy = Math.round(sessions.reduce((s, e) => s + e.accuracy, 0) / sessions.length);
      if (sessions.length >= 4) {
        const recent = sessions.slice(0, 3).reduce((s, e) => s + e.accuracy, 0) / 3;
        const older = sessions.slice(3, 6).reduce((s, e) => s + e.accuracy, 0) / Math.min(3, sessions.slice(3, 6).length);
        isFormImproving = recent > older + 5;
      }
    }
  } catch { /* noop */ }

  return {
    didWorkoutToday: !!todayLog,
    durationMin,
    isHeavySession: durationMin >= 40,
    isLightSession: durationMin > 0 && durationMin <= 20,
    weeklySessionCount,
    avgFormAccuracy,
    isFormImproving,
  };
}

// ─── Advisory Generator ───────────────────────────────────────────────

function buildAdvisories(
  sleep: SleepSnapshot,
  nutrition: NutritionSnapshot,
  workout: WorkoutSnapshot
): Advisory[] {
  const advisories: Advisory[] = [];

  // ── Sleep → Workout ──────────────────────────────────────────────
  if (sleep.hasData && sleep.score < 55) {
    advisories.push({
      id: "sleep-poor-workout",
      level: "warning",
      icon: "😴",
      title: "Low Sleep Detected",
      message: `You only slept ${Math.round(sleep.durationMin / 60 * 10) / 10}h (score ${sleep.score}). Consider skipping heavy compounds — focus on lighter sets or mobility work today.`,
      targetFeature: "workout",
    });
    advisories.push({
      id: "sleep-poor-formchecker",
      level: "warning",
      icon: "⚠️",
      title: "Fatigue Warning",
      message: `Sleep score was ${sleep.score}/100 last night. Your reaction time and form control may be reduced. Take it easy and focus on technique over weight today.`,
      targetFeature: "formchecker",
    });
  } else if (sleep.hasData && sleep.score >= 85) {
    advisories.push({
      id: "sleep-great-workout",
      level: "positive",
      icon: "🚀",
      title: "Peak Recovery",
      message: `Excellent sleep (score ${sleep.score})! Your body is fully recovered. Today is a great day to push harder — try a PR or increase your working weight.`,
      targetFeature: "workout",
    });
    advisories.push({
      id: "sleep-great-formchecker",
      level: "positive",
      icon: "⚡",
      title: "Peak Form Day",
      message: `Sleep score ${sleep.score}/100 — you're primed for peak performance. Push your form limits today!`,
      targetFeature: "formchecker",
    });
  }

  // ── Sleep trend declining ─────────────────────────────────────────
  if (sleep.trend === "declining" && sleep.daysTracked >= 4) {
    advisories.push({
      id: "sleep-trend-down-workout",
      level: "warning",
      icon: "📉",
      title: "Sleep Declining",
      message: "Your sleep quality has been dropping. Consider deloading this week — reduce volume by 20% to avoid overtraining.",
      targetFeature: "workout",
    });
  }

  // ── Workout → Sleep ───────────────────────────────────────────────
  if (workout.isHeavySession) {
    advisories.push({
      id: "heavy-workout-sleep",
      level: "info",
      icon: "💪",
      title: "Recovery is Training",
      message: `You crushed a ${workout.durationMin}-min session today! Aim for 8–9h of sleep tonight — muscle is built during recovery, not during the workout.`,
      targetFeature: "sleep",
    });
  } else if (!workout.didWorkoutToday) {
    if (sleep.hasData && sleep.score >= 75) {
      advisories.push({
        id: "rest-day-good-sleep",
        level: "info",
        icon: "🛌",
        title: "Rest Day Synergy",
        message: "Good sleep on rest days is key for muscle protein synthesis. Tonight's quality sleep will pay dividends in tomorrow's session.",
        targetFeature: "sleep",
      });
    }
  }

  // ── Calories → Workout ────────────────────────────────────────────
  if (nutrition.isUnderfueled && !workout.didWorkoutToday && new Date().getHours() >= 10) {
    advisories.push({
      id: "low-cals-workout-warn",
      level: "warning",
      icon: "⛽",
      title: "Fuel Up Before Training",
      message: `You've only consumed ${nutrition.consumed} kcal (${100 + nutrition.surplusPct}% of goal). Eat before your workout — training in a large deficit increases muscle breakdown risk.`,
      targetFeature: "workout",
    });
  }

  if (nutrition.isHeavyMeal && !workout.didWorkoutToday) {
    advisories.push({
      id: "heavy-meal-workout",
      level: "info",
      icon: "🔥",
      title: "Extra Energy Available",
      message: `High calorie day (+${nutrition.surplusPct}% over goal). Great fuel for a high-intensity session — consider adding some cardio to your plan today.`,
      targetFeature: "workout",
    });
  }

  // ── Workout → Calories ────────────────────────────────────────────
  if (workout.isHeavySession && nutrition.surplusPct < -20) {
    advisories.push({
      id: "workout-low-calories",
      level: "critical",
      icon: "🚨",
      title: "Refuel Now!",
      message: `Heavy ${workout.durationMin}-min workout + low calorie intake is a red flag. You're in a significant deficit — eat a protein-rich meal within 30 minutes to protect your muscle gains.`,
      targetFeature: "calories",
    });
  } else if (workout.isHeavySession && nutrition.waterPct < 60) {
    advisories.push({
      id: "workout-low-water",
      level: "warning",
      icon: "💧",
      title: "Hydrate for Recovery",
      message: `${workout.durationMin}-min workout done! Your water intake is only at ${nutrition.waterPct}%. Drink at least 500ml now to support muscle recovery and reduce soreness.`,
      targetFeature: "calories",
    });
  }

  // ── Workout → Sleep ───────────────────────────────────────────────
  if (workout.isHeavySession && sleep.hasData && sleep.score < 65) {
    advisories.push({
      id: "heavy-workout-poor-sleep",
      level: "warning",
      icon: "🛑",
      title: "Recovery Priority Alert",
      message: `You trained hard despite poor sleep. Tonight, make sleep non-negotiable — aim for at least 8h and avoid screens 1h before bed.`,
      targetFeature: "sleep",
    });
  }

  // ── Form Accuracy → Workout ───────────────────────────────────────
  if (workout.avgFormAccuracy >= 80 && workout.isFormImproving) {
    advisories.push({
      id: "form-improving",
      level: "positive",
      icon: "🎯",
      title: "Form is Improving!",
      message: `Your average form accuracy is ${workout.avgFormAccuracy}% and trending up. Consider trying Pro mode in AI Form Checker for a more demanding challenge.`,
      targetFeature: "workout",
    });
  } else if (workout.avgFormAccuracy > 0 && workout.avgFormAccuracy < 60) {
    advisories.push({
      id: "form-needs-work",
      level: "info",
      icon: "🔍",
      title: "Focus on Form",
      message: `Your recent form accuracy averages ${workout.avgFormAccuracy}%. Before increasing weight, use the AI Form Checker to master the movement pattern.`,
      targetFeature: "workout",
    });
  }

  // Sort: critical → warning → info → positive
  const order: Record<AdvisoryLevel, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  advisories.sort((a, b) => order[a.level] - order[b.level]);
  return advisories;
}

// ─── Intensity Modifier ───────────────────────────────────────────────

function calcIntensityModifier(sleep: SleepSnapshot, nutrition: NutritionSnapshot): number {
  let modifier = 1.0;

  // Sleep adjustments
  if (sleep.hasData) {
    if (sleep.score >= 85) modifier += 0.15;
    else if (sleep.score >= 70) modifier += 0.05;
    else if (sleep.score < 55) modifier -= 0.25;
    else if (sleep.score < 65) modifier -= 0.10;
  }

  // Nutrition adjustments
  if (nutrition.isUnderfueled) modifier -= 0.15;
  if (nutrition.isHeavyMeal) modifier += 0.05;
  if (nutrition.waterPct < 40) modifier -= 0.10;

  return Math.max(0.5, Math.min(1.3, Math.round(modifier * 100) / 100));
}

// ─── Calorie Recommendation ───────────────────────────────────────────

function calcCalorieAdjustment(sleep: SleepSnapshot, workout: WorkoutSnapshot): number {
  let adj = 0;
  if (workout.isHeavySession) adj += Math.round(workout.durationMin * 7); // ~7 cal/min extra
  if (sleep.hasData && sleep.score < 60) adj += 100; // poor sleep increases cortisol, need more to compensate
  return adj;
}

// ─── Headline ─────────────────────────────────────────────────────────

function buildHeadline(
  sleep: SleepSnapshot,
  nutrition: NutritionSnapshot,
  workout: WorkoutSnapshot,
  modifier: number
): string {
  if (workout.didWorkoutToday && sleep.score >= 80 && nutrition.waterPct >= 70) {
    return "🏆 Exceptional day — sleep, fuel, and training all dialed in!";
  }
  if (!sleep.hasData) {
    if (workout.didWorkoutToday) return "💪 Workout done — log your sleep tonight for full syncing.";
    return "📊 Log your sleep and meals to unlock cross-feature insights.";
  }
  if (modifier >= 1.15) return "🚀 Optimal conditions — push hard today!";
  if (modifier <= 0.7) return "😴 Low energy day — focus on recovery, not performance.";
  if (workout.didWorkoutToday) return "✅ Workout complete — rest and refuel well.";
  if (sleep.score < 60) return "⚠️ Fatigue detected — consider a light or rest day.";
  return "💚 You're on track — keep the momentum going!";
}

// ─── Main Export ──────────────────────────────────────────────────────

/** Returns the full FitLab context. Call this at render time in each feature page. */
export function getFitLabContext(): FitLabContext {
  const sleep = readSleep();
  const nutrition = readNutrition();
  const workout = readWorkout();
  const intensityModifier = calcIntensityModifier(sleep, nutrition);
  const recommendedCalorieAdjustment = calcCalorieAdjustment(sleep, workout);
  const advisories = buildAdvisories(sleep, nutrition, workout);
  const headline = buildHeadline(sleep, nutrition, workout, intensityModifier);

  return {
    sleep,
    nutrition,
    workout,
    intensityModifier,
    recommendedCalorieAdjustment,
    advisories,
    headline,
  };
}

/** Convenience: get advisories for a specific feature only */
export function getAdvisoriesFor(
  feature: Advisory["targetFeature"]
): Advisory[] {
  const ctx = getFitLabContext();
  return ctx.advisories.filter(
    (a) => a.targetFeature === feature || a.targetFeature === "all"
  );
}

/** Convenience: get the intensity label for UI display */
export function getIntensityLabel(modifier: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (modifier >= 1.15) return { label: "Peak Performance", color: "text-primary", emoji: "🚀" };
  if (modifier >= 1.0) return { label: "Optimal", color: "text-primary", emoji: "✅" };
  if (modifier >= 0.85) return { label: "Normal", color: "text-foreground", emoji: "💪" };
  if (modifier >= 0.70) return { label: "Take It Easy", color: "text-fitlab-yellow", emoji: "😐" };
  return { label: "Recovery Day", color: "text-fitlab-orange", emoji: "😴" };
}
