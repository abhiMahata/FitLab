interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayActive: boolean;
}

const STREAK_KEY = "fitlab-streak-data";
const WATER_GOAL = 3000; // ml — matches Dashboard

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}


function hasWaterActivity(dateKey: string): boolean {
  const saved = localStorage.getItem(`fitlab-water-${dateKey}`);
  return saved ? Number(saved) > 0 : false;
}

function hasCalorieActivity(dateKey: string): boolean {
  try {
    const raw = localStorage.getItem("fitlab-calorie-data");
    if (!raw) return false;
    const data = JSON.parse(raw);
    // Convert date to day name
    const d = new Date(dateKey + "T12:00:00");
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[d.getDay()];
    return data[dayName]?.entries?.length > 0;
  } catch {
    return false;
  }
}

function hasWorkoutActivity(dateKey: string): boolean {
  try {
    const raw = localStorage.getItem("fitlab-workout-logs");
    if (!raw) return false;
    const logs = JSON.parse(raw);
    return logs.some((log: { date: string }) => log.date === dateKey);
  } catch {
    return false;
  }
}

function hasSleepActivity(dateKey: string): boolean {
  try {
    const raw = localStorage.getItem("fitlab-sleep-entries");
    if (!raw) return false;
    const entries = JSON.parse(raw);
    return entries.some((entry: { date: string }) => entry.date === dateKey);
  } catch {
    return false;
  }
}

/** Check if the user was active on a given date */
function wasActiveOn(dateKey: string): boolean {
  return (
    hasWaterActivity(dateKey) ||
    hasCalorieActivity(dateKey) ||
    hasWorkoutActivity(dateKey) ||
    hasSleepActivity(dateKey)
  );
}


function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: "",
    todayActive: false,
  };
}

function saveStreakData(data: StreakData): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
}

/**
 * Calculate and update the current streak.
 * Call this on every Dashboard render.
 */
export function getStreak(): StreakData {
  const data = loadStreakData();
  const today = getToday();
  const yesterday = getYesterday();

  const activeToday = wasActiveOn(today);
  const activeYesterday = wasActiveOn(yesterday);

  // Case 1: Already processed today and nothing changed
  if (data.lastActiveDate === today) {
    // Recheck if today's activity status changed
    if (activeToday && !data.todayActive) {
      // Became active today — increment streak if it wasn't counted
      data.todayActive = true;
      data.currentStreak = data.currentStreak + 1;
      data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
      saveStreakData(data);
    }
    return data;
  }

  // Case 2: Last active was yesterday — streak continues
  if (data.lastActiveDate === yesterday) {
    if (activeToday) {
      data.currentStreak += 1;
      data.todayActive = true;
    } else {
      // Yesterday was active, today not yet — streak is alive but waiting
      data.todayActive = false;
    }
    data.lastActiveDate = today;
    data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
    saveStreakData(data);
    return data;
  }

  // Case 3: Last active was before yesterday — streak broke
  if (activeToday) {
    data.currentStreak = 1;
    data.todayActive = true;
  } else {
    data.currentStreak = 0;
    data.todayActive = false;
  }
  data.lastActiveDate = today;
  data.longestStreak = Math.max(data.longestStreak, data.currentStreak);
  saveStreakData(data);
  return data;
}

/**
 * Get the streak display count.
 * Shows current streak if today is active,
 * or yesterday's streak if today is not yet active but streak is alive.
 */
export function getStreakDisplay(): {
  count: number;
  isActive: boolean;
  longestStreak: number;
  message: string;
} {
  const data = getStreak();

  const isActive = data.todayActive;
  const count = data.currentStreak;
  const longestStreak = data.longestStreak;

  let message = "";
  if (count === 0) {
    message = "Start your streak today!";
  } else if (count < 3) {
    message = "Keep it going!";
  } else if (count < 7) {
    message = "You're on fire!";
  } else if (count < 14) {
    message = "Unstoppable!";
  } else if (count < 30) {
    message = "Beast mode! 🦾";
  } else {
    message = "LEGENDARY! 👑";
  }

  return { count, isActive, longestStreak, message };
}
