/**
 * badgeUtils.ts
 * Achievement badge system — checks various milestones and awards badges.
 * All data sourced from localStorage, no backend needed.
 */

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string; // ISO date
}

interface BadgeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  check: () => boolean;
}

// ─── Badge definitions ────────────────────────────────────────────────

const BADGE_DEFS: BadgeDef[] = [
  {
    id: "first-burn",
    name: "First Burn",
    emoji: "🔥",
    description: "Complete your first workout",
    check: () => {
      try {
        const logs = JSON.parse(localStorage.getItem("fitlab-workout-logs") || "[]");
        return logs.length > 0;
      } catch { return false; }
    },
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    emoji: "📅",
    description: "Complete 7 workouts total",
    check: () => {
      try {
        const logs = JSON.parse(localStorage.getItem("fitlab-workout-logs") || "[]");
        return logs.length >= 7;
      } catch { return false; }
    },
  },
  {
    id: "hydration-king",
    name: "Hydration King",
    emoji: "💧",
    description: "Hit your water goal (3L) in a single day",
    check: () => {
      const today = new Date().toISOString().slice(0, 10);
      const saved = localStorage.getItem(`fitlab-water-${today}`);
      return saved ? Number(saved) >= 3000 : false;
    },
  },
  {
    id: "meal-planner",
    name: "Meal Planner",
    emoji: "🍎",
    description: "Log at least one meal in the calorie tracker",
    check: () => {
      try {
        const raw = localStorage.getItem("fitlab-calorie-data");
        if (!raw) return false;
        const data = JSON.parse(raw);
        return Object.values(data).some((day: any) => day?.entries?.length > 0);
      } catch { return false; }
    },
  },
  {
    id: "sleep-master",
    name: "Sleep Master",
    emoji: "🌙",
    description: "Log 3 sleep sessions",
    check: () => {
      try {
        const entries = JSON.parse(localStorage.getItem("fitlab-sleep-entries") || "[]");
        return entries.length >= 3;
      } catch { return false; }
    },
  },
  {
    id: "morning-brain",
    name: "Morning Brain",
    emoji: "🧮",
    description: "Dismiss the smart alarm by solving a puzzle",
    check: () => {
      // Tracked separately when alarm is dismissed
      return localStorage.getItem("fitlab-alarm-dismissed") === "true";
    },
  },
  {
    id: "ai-initiate",
    name: "AI Initiate",
    emoji: "🤖",
    description: "Use the AI Form Checker for the first time",
    check: () => {
      try {
        const sessions = JSON.parse(localStorage.getItem("fitlab-form-sessions") || "[]");
        return sessions.length > 0;
      } catch { return false; }
    },
  },
  {
    id: "perfect-form",
    name: "Perfect Form",
    emoji: "🎯",
    description: "Get 90%+ accuracy on the AI Form Checker",
    check: () => {
      try {
        const sessions = JSON.parse(localStorage.getItem("fitlab-form-sessions") || "[]");
        return sessions.some((s: any) => s.accuracy >= 90);
      } catch { return false; }
    },
  },
  {
    id: "streak-3",
    name: "On Fire",
    emoji: "🔥",
    description: "Reach a 3-day activity streak",
    check: () => {
      try {
        const data = JSON.parse(localStorage.getItem("fitlab-streak-data") || "{}");
        return (data.longestStreak || 0) >= 3;
      } catch { return false; }
    },
  },
  {
    id: "streak-7",
    name: "Unstoppable",
    emoji: "⚡",
    description: "Reach a 7-day activity streak",
    check: () => {
      try {
        const data = JSON.parse(localStorage.getItem("fitlab-streak-data") || "{}");
        return (data.longestStreak || 0) >= 7;
      } catch { return false; }
    },
  },
  {
    id: "roster-builder",
    name: "Roster Builder",
    emoji: "🏗️",
    description: "Add exercises to 3 different days",
    check: () => {
      try {
        const roster = JSON.parse(localStorage.getItem("fitlab-weekly-roster") || "{}");
        const activeDays = Object.values(roster).filter((d: any) => d?.exercises?.length > 0).length;
        return activeDays >= 3;
      } catch { return false; }
    },
  },
  {
    id: "heavy-lifter",
    name: "Heavy Lifter",
    emoji: "🏋️",
    description: "Set a weight of 50kg+ on any exercise",
    check: () => {
      try {
        const roster = JSON.parse(localStorage.getItem("fitlab-weekly-roster") || "{}");
        return Object.values(roster).some((d: any) =>
          d?.exercises?.some((e: any) => (e.weight || 0) >= 50)
        );
      } catch { return false; }
    },
  },
];

// ─── Core logic ───────────────────────────────────────────────────────

const BADGES_KEY = "fitlab-badges";

function loadUnlocked(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(BADGES_KEY) || "{}");
  } catch { return {}; }
}

function saveUnlocked(data: Record<string, string>) {
  localStorage.setItem(BADGES_KEY, JSON.stringify(data));
}

/**
 * Check all badges and return the full list with unlocked status.
 * Automatically persists newly unlocked badges.
 */
export function checkBadges(): Badge[] {
  const unlocked = loadUnlocked();
  let changed = false;

  const badges: Badge[] = BADGE_DEFS.map((def) => {
    // Already unlocked
    if (unlocked[def.id]) {
      return {
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        unlocked: true,
        unlockedAt: unlocked[def.id],
      };
    }

    // Check if newly unlocked
    if (def.check()) {
      const now = new Date().toISOString();
      unlocked[def.id] = now;
      changed = true;
      return {
        id: def.id,
        name: def.name,
        emoji: def.emoji,
        description: def.description,
        unlocked: true,
        unlockedAt: now,
      };
    }

    return {
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      description: def.description,
      unlocked: false,
    };
  });

  if (changed) saveUnlocked(unlocked);
  return badges;
}

/** Get counts for display */
export function getBadgeSummary(): { total: number; unlocked: number } {
  const badges = checkBadges();
  return {
    total: badges.length,
    unlocked: badges.filter((b) => b.unlocked).length,
  };
}

/**
 * Check for NEWLY unlocked badges (ones that just became unlocked).
 * Returns only the fresh unlocks — use this for toast notifications.
 */
export function checkForNewBadges(): Badge[] {
  const prevUnlocked = loadUnlocked();
  const prevIds = new Set(Object.keys(prevUnlocked));

  // Run full check (this persists any new unlocks)
  const allBadges = checkBadges();

  // Return only badges that weren't in the previous set
  return allBadges.filter((b) => b.unlocked && !prevIds.has(b.id));
}
