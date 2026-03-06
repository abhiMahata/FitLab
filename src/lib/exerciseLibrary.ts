/**
 * exerciseLibrary.ts
 * Comprehensive exercise catalog organized by muscle group.
 * Each exercise includes default sets/reps, an emoji icon, and a description.
 */

export interface Exercise {
    id: string;
    name: string;
    muscle: MuscleGroup;
    emoji: string;
    description: string;
    defaultSets: number;
    defaultReps: number;
}

export type MuscleGroup =
    | "Chest"
    | "Back"
    | "Shoulders"
    | "Legs"
    | "Arms"
    | "Core"
    | "Cardio";

export const MUSCLE_ICONS: Record<MuscleGroup, string> = {
    Chest: "🫁",
    Back: "🔙",
    Shoulders: "🏔️",
    Legs: "🦵",
    Arms: "💪",
    Core: "🎯",
    Cardio: "🏃",
};

export const MUSCLE_COLORS: Record<MuscleGroup, string> = {
    Chest: "bg-fitlab-orange/20 text-fitlab-orange",
    Back: "bg-fitlab-blue/20 text-fitlab-blue",
    Shoulders: "bg-primary/20 text-primary",
    Legs: "bg-fitlab-purple/20 text-fitlab-purple",
    Arms: "bg-destructive/20 text-destructive",
    Core: "bg-fitlab-yellow/20 text-fitlab-yellow",
    Cardio: "bg-primary/20 text-primary",
};

export const EXERCISES: Exercise[] = [
    // ─── Chest ──────────────────────────
    { id: "bench-press", name: "Bench Press", muscle: "Chest", emoji: "🏋️", description: "Flat barbell press for overall chest", defaultSets: 4, defaultReps: 10 },
    { id: "incline-bench", name: "Incline Bench Press", muscle: "Chest", emoji: "📐", description: "Targets upper chest fibers", defaultSets: 3, defaultReps: 10 },
    { id: "decline-bench", name: "Decline Bench Press", muscle: "Chest", emoji: "⬇️", description: "Focuses on lower chest", defaultSets: 3, defaultReps: 10 },
    { id: "dumbbell-flys", name: "Dumbbell Flys", muscle: "Chest", emoji: "🦅", description: "Stretch and squeeze for chest width", defaultSets: 3, defaultReps: 12 },
    { id: "cable-flys", name: "Cable Flys", muscle: "Chest", emoji: "🔗", description: "Constant tension chest isolation", defaultSets: 3, defaultReps: 15 },
    { id: "push-ups", name: "Push-Ups", muscle: "Chest", emoji: "🫸", description: "Classic bodyweight chest exercise", defaultSets: 3, defaultReps: 20 },
    { id: "chest-dips", name: "Chest Dips", muscle: "Chest", emoji: "⬇️", description: "Leaning forward dips for lower chest", defaultSets: 3, defaultReps: 12 },

    // ─── Back ───────────────────────────
    { id: "deadlift", name: "Deadlift", muscle: "Back", emoji: "🏗️", description: "Full posterior chain compound lift", defaultSets: 4, defaultReps: 6 },
    { id: "barbell-row", name: "Barbell Row", muscle: "Back", emoji: "🚣", description: "Bent-over row for back thickness", defaultSets: 4, defaultReps: 10 },
    { id: "pull-ups", name: "Pull-Ups", muscle: "Back", emoji: "🧗", description: "Wide grip for lat width", defaultSets: 3, defaultReps: 10 },
    { id: "lat-pulldown", name: "Lat Pulldown", muscle: "Back", emoji: "⬇️", description: "Machine-based lat targeting", defaultSets: 3, defaultReps: 12 },
    { id: "seated-row", name: "Seated Cable Row", muscle: "Back", emoji: "🔗", description: "Middle back and rhomboids", defaultSets: 3, defaultReps: 12 },
    { id: "t-bar-row", name: "T-Bar Row", muscle: "Back", emoji: "🔱", description: "Thick middle back development", defaultSets: 3, defaultReps: 10 },
    { id: "face-pulls", name: "Face Pulls", muscle: "Back", emoji: "🎯", description: "Rear delts and upper back health", defaultSets: 3, defaultReps: 15 },

    // ─── Shoulders ──────────────────────
    { id: "ohp", name: "Overhead Press", muscle: "Shoulders", emoji: "⬆️", description: "Standing barbell shoulder press", defaultSets: 4, defaultReps: 8 },
    { id: "lateral-raise", name: "Lateral Raises", muscle: "Shoulders", emoji: "🪶", description: "Side delt isolation for width", defaultSets: 4, defaultReps: 15 },
    { id: "front-raise", name: "Front Raises", muscle: "Shoulders", emoji: "🫴", description: "Front delt isolation", defaultSets: 3, defaultReps: 12 },
    { id: "rear-delt-fly", name: "Rear Delt Fly", muscle: "Shoulders", emoji: "🦅", description: "Reverse fly for rear delts", defaultSets: 3, defaultReps: 15 },
    { id: "arnold-press", name: "Arnold Press", muscle: "Shoulders", emoji: "🏆", description: "Rotating dumbbell press for all heads", defaultSets: 3, defaultReps: 10 },
    { id: "shrugs", name: "Barbell Shrugs", muscle: "Shoulders", emoji: "🤷", description: "Trap development", defaultSets: 3, defaultReps: 15 },

    // ─── Legs ───────────────────────────
    { id: "squat", name: "Barbell Squat", muscle: "Legs", emoji: "🏋️", description: "King of leg exercises", defaultSets: 4, defaultReps: 8 },
    { id: "leg-press", name: "Leg Press", muscle: "Legs", emoji: "🦿", description: "Machine-based quad focus", defaultSets: 4, defaultReps: 12 },
    { id: "lunges", name: "Walking Lunges", muscle: "Legs", emoji: "🚶", description: "Unilateral leg and glute work", defaultSets: 3, defaultReps: 12 },
    { id: "rdl", name: "Romanian Deadlift", muscle: "Legs", emoji: "🔻", description: "Hamstring and glute stretch", defaultSets: 3, defaultReps: 10 },
    { id: "leg-curl", name: "Leg Curl", muscle: "Legs", emoji: "🔄", description: "Hamstring isolation", defaultSets: 3, defaultReps: 12 },
    { id: "leg-extension", name: "Leg Extension", muscle: "Legs", emoji: "📏", description: "Quad isolation machine", defaultSets: 3, defaultReps: 15 },
    { id: "calf-raise", name: "Calf Raises", muscle: "Legs", emoji: "⬆️", description: "Standing or seated calf work", defaultSets: 4, defaultReps: 15 },
    { id: "hip-thrust", name: "Hip Thrust", muscle: "Legs", emoji: "🍑", description: "Glute activation and strength", defaultSets: 3, defaultReps: 12 },
    { id: "bulgarian-split", name: "Bulgarian Split Squat", muscle: "Legs", emoji: "🦵", description: "Single-leg quad dominant exercise", defaultSets: 3, defaultReps: 10 },

    // ─── Arms ───────────────────────────
    { id: "barbell-curl", name: "Barbell Curl", muscle: "Arms", emoji: "💪", description: "Classic bicep builder", defaultSets: 3, defaultReps: 12 },
    { id: "hammer-curl", name: "Hammer Curls", muscle: "Arms", emoji: "🔨", description: "Brachialis and forearm focus", defaultSets: 3, defaultReps: 12 },
    { id: "preacher-curl", name: "Preacher Curls", muscle: "Arms", emoji: "📖", description: "Strict bicep isolation", defaultSets: 3, defaultReps: 10 },
    { id: "tricep-pushdown", name: "Tricep Pushdown", muscle: "Arms", emoji: "⬇️", description: "Cable tricep isolation", defaultSets: 3, defaultReps: 15 },
    { id: "skullcrushers", name: "Skullcrushers", muscle: "Arms", emoji: "💀", description: "Lying tricep extension", defaultSets: 3, defaultReps: 12 },
    { id: "overhead-extension", name: "Overhead Extension", muscle: "Arms", emoji: "🙆", description: "Long head tricep stretch", defaultSets: 3, defaultReps: 12 },
    { id: "close-grip-bench", name: "Close Grip Bench", muscle: "Arms", emoji: "🤏", description: "Compound tricep builder", defaultSets: 3, defaultReps: 10 },
    { id: "wrist-curl", name: "Wrist Curls", muscle: "Arms", emoji: "✊", description: "Forearm strength", defaultSets: 3, defaultReps: 20 },

    // ─── Core ───────────────────────────
    { id: "plank", name: "Plank", muscle: "Core", emoji: "🧱", description: "Isometric core stabilizer", defaultSets: 3, defaultReps: 60 },
    { id: "crunches", name: "Crunches", muscle: "Core", emoji: "🔺", description: "Upper ab isolation", defaultSets: 3, defaultReps: 20 },
    { id: "russian-twist", name: "Russian Twists", muscle: "Core", emoji: "🌀", description: "Oblique rotation exercise", defaultSets: 3, defaultReps: 20 },
    { id: "leg-raise", name: "Hanging Leg Raises", muscle: "Core", emoji: "🦵", description: "Lower ab focus", defaultSets: 3, defaultReps: 15 },
    { id: "bicycle-crunch", name: "Bicycle Crunches", muscle: "Core", emoji: "🚴", description: "Dynamic oblique and ab work", defaultSets: 3, defaultReps: 20 },
    { id: "dead-bug", name: "Dead Bug", muscle: "Core", emoji: "🪲", description: "Anti-extension core exercise", defaultSets: 3, defaultReps: 12 },
    { id: "ab-wheel", name: "Ab Wheel Rollout", muscle: "Core", emoji: "🛞", description: "Advanced core strength", defaultSets: 3, defaultReps: 10 },

    // ─── Cardio ─────────────────────────
    { id: "running", name: "Running", muscle: "Cardio", emoji: "🏃", description: "Treadmill or outdoor jog", defaultSets: 1, defaultReps: 30 },
    { id: "cycling", name: "Cycling", muscle: "Cardio", emoji: "🚴", description: "Stationary or outdoor bike", defaultSets: 1, defaultReps: 30 },
    { id: "jump-rope", name: "Jump Rope", muscle: "Cardio", emoji: "🪢", description: "Full body cardio and coordination", defaultSets: 3, defaultReps: 60 },
    { id: "burpees", name: "Burpees", muscle: "Cardio", emoji: "🤸", description: "Full body explosive cardio", defaultSets: 3, defaultReps: 15 },
    { id: "mountain-climbers", name: "Mountain Climbers", muscle: "Cardio", emoji: "⛰️", description: "Core and cardio combined", defaultSets: 3, defaultReps: 30 },
    { id: "rowing", name: "Rowing", muscle: "Cardio", emoji: "🚣", description: "Full body low-impact cardio", defaultSets: 1, defaultReps: 20 },
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
    "Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Cardio",
];

export function getExerciseById(id: string): Exercise | undefined {
    return EXERCISES.find((e) => e.id === id);
}

export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
    return EXERCISES.filter((e) => e.muscle === muscle);
}

// ─── Roster & Workout Log types ──────────────────────────────────────

export interface RosterExercise {
    exerciseId: string;
    sets: number;
    reps: number;
    restSeconds: number;
}

export interface DayRoster {
    label: string;        // e.g. "Chest & Triceps"
    exercises: RosterExercise[];
}

export type WeeklyRoster = Record<string, DayRoster>;

export interface CompletedSet {
    setNumber: number;
    completed: boolean;
}

export interface WorkoutLog {
    id: string;
    date: string;
    day: string;
    exercises: { exerciseId: string; setsCompleted: number; totalSets: number }[];
    durationSeconds: number;
    completedAt: number;
}

export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// ─── Storage helpers ─────────────────────────────────────────────────

const ROSTER_KEY = "fitlab-weekly-roster";
const LOGS_KEY = "fitlab-workout-logs";

export function loadRoster(): WeeklyRoster {
    try {
        const saved = localStorage.getItem(ROSTER_KEY);
        if (saved) return JSON.parse(saved);
    } catch { }
    // Default empty roster
    const roster: WeeklyRoster = {};
    for (const day of DAYS_OF_WEEK) {
        roster[day] = { label: "", exercises: [] };
    }
    return roster;
}

export function saveRoster(roster: WeeklyRoster) {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
}

export function loadWorkoutLogs(): WorkoutLog[] {
    try {
        return JSON.parse(localStorage.getItem(LOGS_KEY) || "[]");
    } catch { return []; }
}

export function saveWorkoutLog(log: WorkoutLog) {
    const logs = loadWorkoutLogs();
    logs.unshift(log);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 60)));
}

export function getTodayLog(): WorkoutLog | null {
    const today = new Date().toISOString().slice(0, 10);
    return loadWorkoutLogs().find((l) => l.date === today) || null;
}
