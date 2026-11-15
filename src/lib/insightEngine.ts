/**
 * insightEngine.ts
 * Cross-feature intelligence engine.
 * Reads data from ALL four features (workout, calories, sleep, water)
 * and generates contextual, actionable insights.
 */

import { getTodayLog, loadWorkoutLogs } from "./exerciseLibrary";
import { getProfile, calculateTDEE, getWaterGoalMl } from "./userProfile";
import { loadFormSessions } from "./formSessionUtils";
import { getLocalDateString, getLocalDateOffset, getDayName } from "./utils";

// ─── Types ────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  icon: string;       // emoji
  title: string;
  message: string;
  color: "green" | "blue" | "orange" | "purple" | "red";
  priority: number;    // lower = show first
}

// ─── Data readers ─────────────────────────────────────────────────────

function getTodayWaterMl(): number {
  const dateKey = getLocalDateString();
  const saved = localStorage.getItem(`fitlab-water-${dateKey}`);
  return saved ? Number(saved) : 0;
}

function getTodayCalories(): { consumed: number; goal: number } {
  const profile = getProfile();
  const goal = calculateTDEE(profile);
  try {
    const raw = localStorage.getItem("fitlab-calorie-data");
    if (!raw) return { consumed: 0, goal };
    const data = JSON.parse(raw);
    const dayKey = getDayName();
    const dayData = data[dayKey];
    if (!dayData?.entries) return { consumed: 0, goal };
    const consumed = dayData.entries.reduce((s: number, e: { calories: number }) => s + e.calories, 0);
    return { consumed, goal };
  } catch {
    return { consumed: 0, goal };
  }
}

interface SleepEntry {
  durationMin: number;
  quality: number;
  score: number;
  date: string;
}

function getLastNightSleep(): SleepEntry | null {
  try {
    const entries: SleepEntry[] = JSON.parse(localStorage.getItem("fitlab-sleep-entries") || "[]");
    if (entries.length === 0) return null;
    // Get today's or yesterday's entry (most recent)
    const today = getLocalDateString();
    const yesterday = getLocalDateOffset(-1);
    return entries.find(e => e.date === today) || entries.find(e => e.date === yesterday) || null;
  } catch {
    return null;
  }
}

function getSleepTrend(): { avgScore: number; trend: "up" | "down" | "stable"; count: number } {
  try {
    const entries: SleepEntry[] = JSON.parse(localStorage.getItem("fitlab-sleep-entries") || "[]");
    if (entries.length < 2) return { avgScore: 0, trend: "stable", count: entries.length };
    const recent = entries.slice(0, 3);
    const older = entries.slice(3, 7);
    const recentAvg = recent.reduce((s, e) => s + e.score, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((s, e) => s + e.score, 0) / older.length : recentAvg;
    const trend = recentAvg > olderAvg + 5 ? "up" : recentAvg < olderAvg - 5 ? "down" : "stable";
    return { avgScore: Math.round(recentAvg), trend, count: entries.length };
  } catch {
    return { avgScore: 0, trend: "stable", count: 0 };
  }
}

// ─── Insight generator ────────────────────────────────────────────────

export function generateInsights(): Insight[] {
  const insights: Insight[] = [];
  const profile = getProfile();

  // Gather all data
  const todayLog = getTodayLog();
  const waterMl = getTodayWaterMl();
  const waterGoal = profile ? getWaterGoalMl(profile) : 3000;
  const waterPct = Math.round((waterMl / waterGoal) * 100);
  const { consumed: caloriesConsumed, goal: calorieGoal } = getTodayCalories();
  const caloriePct = Math.round((caloriesConsumed / calorieGoal) * 100);
  const caloriesRemaining = Math.max(0, calorieGoal - caloriesConsumed);
  const lastSleep = getLastNightSleep();
  const sleepTrend = getSleepTrend();

  const workoutDurationMin = todayLog ? Math.round(todayLog.durationSeconds / 60) : 0;
  const workoutCalsBurned = workoutDurationMin * 5; // ~5 cal/min estimate
  const heavyWorkout = workoutDurationMin >= 30;

  // ── 1. Perfect day (all 3 pillars met) ──
  if (todayLog && waterPct >= 80 && caloriePct >= 60 && caloriePct <= 120) {
    insights.push({
      id: "perfect-day",
      icon: "✨",
      title: "Perfect Trifecta!",
      message: `Workout ✓ Hydration ${waterPct}% ✓ Nutrition on track ✓ — You're crushing it today!`,
      color: "green",
      priority: 1,
    });
  }

  // ── 2. Heavy workout + low water ──
  if (heavyWorkout && waterPct < 60) {
    insights.push({
      id: "workout-water",
      icon: "💧",
      title: "Hydrate After Training",
      message: `Great ${workoutDurationMin}min workout! You've only hit ${waterPct}% of your water goal. Drink at least 500ml extra to recover.`,
      color: "blue",
      priority: 2,
    });
  }

  // ── 3. Heavy workout + low calories ──
  if (heavyWorkout && caloriesRemaining > 500) {
    insights.push({
      id: "workout-calories",
      icon: "🔥",
      title: "Refuel Your Body",
      message: `You burned ~${workoutCalsBurned} cals in your workout. You still have ${caloriesRemaining.toLocaleString()} kcal remaining — don't skip meals!`,
      color: "orange",
      priority: 3,
    });
  }

  // ── 4. Poor sleep + workout planned ──
  if (lastSleep && lastSleep.durationMin < 360) {
    const sleepHours = Math.round(lastSleep.durationMin / 60 * 10) / 10;
    if (todayLog) {
      insights.push({
        id: "poor-sleep-worked-out",
        icon: "💪",
        title: "Tough But Strong",
        message: `Only ${sleepHours}h sleep but you still got your workout in. Recovery nutrition is extra important today.`,
        color: "purple",
        priority: 4,
      });
    } else {
      insights.push({
        id: "poor-sleep-no-workout",
        icon: "😴",
        title: "Low Sleep Alert",
        message: `Only ${sleepHours}h of sleep last night. Consider a lighter workout today and aim for 8h tonight.`,
        color: "orange",
        priority: 3,
      });
    }
  }

  // ── 5. Good sleep + workout completed ──
  if (lastSleep && lastSleep.score >= 75 && todayLog) {
    // Only add if we don't already have perfect-day
    if (!insights.find(i => i.id === "perfect-day")) {
      insights.push({
        id: "good-sleep-workout",
        icon: "🚀",
        title: "Sleep → Performance",
        message: `Score ${lastSleep.score} sleep translated to a solid ${workoutDurationMin}min workout. Keep this rhythm!`,
        color: "green",
        priority: 5,
      });
    }
  }

  // ── 6. Rest day + high calorie surplus ──
  if (!todayLog && caloriesConsumed > calorieGoal * 1.15 && caloriesConsumed > 0) {
    insights.push({
      id: "rest-day-surplus",
      icon: "⚖️",
      title: "Watch the Surplus",
      message: `Rest day but you've consumed ${caloriesConsumed.toLocaleString()} kcal (${caloriePct}% of goal). Keep it balanced.`,
      color: "orange",
      priority: 6,
    });
  }

  // ── 7. Very low water all day (after noon) ──
  const hour = new Date().getHours();
  if (hour >= 14 && waterPct < 40 && !insights.find(i => i.id === "workout-water")) {
    insights.push({
      id: "low-water",
      icon: "🚰",
      title: "Dehydration Warning",
      message: `It's ${hour > 12 ? hour - 12 : hour}PM and you've only had ${waterMl}ml. Dehydration hurts performance AND sleep quality.`,
      color: "red",
      priority: 2,
    });
  }

  // ── 8. Sleep score trending down ──
  if (sleepTrend.count >= 4 && sleepTrend.trend === "down") {
    insights.push({
      id: "sleep-trend-down",
      icon: "📉",
      title: "Sleep Quality Declining",
      message: `Your sleep score is trending down (avg ${sleepTrend.avgScore}). Prioritize rest tonight — try going to bed 30min earlier.`,
      color: "purple",
      priority: 4,
    });
  }

  // ── 9. Workout done but no food logged at all ──
  if (todayLog && caloriesConsumed === 0 && hour >= 10) {
    insights.push({
      id: "no-food-logged",
      icon: "🍽️",
      title: "Log Your Meals",
      message: `You completed a workout but haven't logged any food yet. Track your nutrition to see the full picture.`,
      color: "blue",
      priority: 7,
    });
  }

  // ── 10. Everything is zero — motivational nudge ──
  if (!todayLog && waterMl === 0 && caloriesConsumed === 0 && hour >= 8) {
    insights.push({
      id: "get-started",
      icon: "⚡",
      title: "Start Your Day Right",
      message: "Drink some water, log your breakfast, and check today's workout plan. Small steps compound!",
      color: "green",
      priority: 8,
    });
  }

  // ── 11. Form accuracy cross-feature ──
  try {
    const formSessions = loadFormSessions().slice(0, 6);
    if (formSessions.length >= 3) {
      const avgAccuracy = Math.round(formSessions.reduce((s, e) => s + e.accuracy, 0) / formSessions.length);
      const recentAvg = Math.round(formSessions.slice(0, 3).reduce((s, e) => s + e.accuracy, 0) / 3);
      const olderAvg = formSessions.length >= 4
        ? Math.round(formSessions.slice(3).reduce((s, e) => s + e.accuracy, 0) / formSessions.slice(3).length)
        : recentAvg;

      if (avgAccuracy >= 80 && recentAvg > olderAvg + 5) {
        insights.push({
          id: "form-improving",
          icon: "🎯",
          title: "Form is Getting Better!",
          message: `Your AI form accuracy is trending up (${avgAccuracy}% avg). Consider increasing weight or switching to Pro mode in AI Form Checker.`,
          color: "green",
          priority: 5,
        });
      } else if (avgAccuracy < 60 && todayLog) {
        insights.push({
          id: "form-needs-work",
          icon: "🔍",
          title: "Technique Before Weight",
          message: `Your recent form accuracy is ${avgAccuracy}%. Use AI Form Checker to refine technique before adding more load — it prevents injuries.`,
          color: "blue",
          priority: 6,
        });
      }
    }
  } catch { /* noop */ }

  // ── 12. Weekly workout frequency ──
  try {
    const logs = JSON.parse(localStorage.getItem("fitlab-workout-logs") || "[]");
    const cutoff = Date.now() - 7 * 86400000;
    const weeklyCount = logs.filter((l: { completedAt: number }) => l.completedAt > cutoff).length;
    if (weeklyCount >= 5) {
      insights.push({
        id: "high-frequency",
        icon: "🔥",
        title: "High Training Frequency",
        message: `${weeklyCount} sessions this week! Make sure you have at least 1-2 rest days to avoid overtraining and let your muscles recover.`,
        color: "orange",
        priority: 4,
      });
    }
  } catch { /* noop */ }

  // Sort by priority and return top 3
  insights.sort((a, b) => a.priority - b.priority);
  return insights.slice(0, 3);
}
