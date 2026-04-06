/**
 * workoutTemplates.ts
 * Pre-built weekly workout plans mapped to each fitness goal.
 * Uses exercise IDs from exerciseLibrary.ts.
 */

import type { WeeklyRoster, RosterExercise } from "./exerciseLibrary";
import type { Goal } from "./userProfile";

/** Helper to make a RosterExercise entry concisely */
function ex(exerciseId: string, sets = 3, reps = 10, weight = 0, restSeconds = 60): RosterExercise {
    return { exerciseId, sets, reps, weight, restSeconds };
}

// ─── BUILD MUSCLE — Push / Pull / Legs split ──────────────────────────

const BUILD_MUSCLE: WeeklyRoster = {
    Monday: {
        label: "Push (Chest / Shoulders / Triceps)",
        exercises: [
            ex("bench-press", 4, 10, 0, 90),
            ex("incline-bench", 3, 10, 0, 75),
            ex("lateral-raise", 4, 15, 0, 45),
            ex("tricep-pushdown", 3, 15, 0, 45),
            ex("push-ups", 3, 20, 0, 45),
        ],
    },
    Tuesday: {
        label: "Pull (Back / Biceps)",
        exercises: [
            ex("deadlift", 4, 6, 0, 120),
            ex("barbell-row", 4, 10, 0, 90),
            ex("pull-ups", 3, 10, 0, 75),
            ex("face-pulls", 3, 15, 0, 45),
            ex("barbell-curl", 3, 12, 0, 45),
        ],
    },
    Wednesday: {
        label: "Legs",
        exercises: [
            ex("squat", 4, 8, 0, 120),
            ex("leg-press", 4, 12, 0, 90),
            ex("rdl", 3, 10, 0, 90),
            ex("leg-extension", 3, 15, 0, 45),
            ex("calf-raise", 4, 15, 0, 45),
        ],
    },
    Thursday: {
        label: "Push (Shoulders / Chest / Triceps)",
        exercises: [
            ex("ohp", 4, 8, 0, 90),
            ex("dumbbell-flys", 3, 12, 0, 60),
            ex("arnold-press", 3, 10, 0, 75),
            ex("skullcrushers", 3, 12, 0, 60),
            ex("cable-flys", 3, 15, 0, 45),
        ],
    },
    Friday: {
        label: "Pull (Back / Biceps)",
        exercises: [
            ex("lat-pulldown", 3, 12, 0, 60),
            ex("seated-row", 3, 12, 0, 60),
            ex("t-bar-row", 3, 10, 0, 75),
            ex("hammer-curl", 3, 12, 0, 45),
            ex("face-pulls", 3, 15, 0, 45),
        ],
    },
    Saturday: {
        label: "Legs & Core",
        exercises: [
            ex("bulgarian-split", 3, 10, 0, 75),
            ex("hip-thrust", 3, 12, 0, 75),
            ex("lunges", 3, 12, 0, 60),
            ex("plank", 3, 60, 0, 30),
            ex("russian-twist", 3, 20, 0, 30),
        ],
    },
    Sunday: {
        label: "Rest Day",
        exercises: [],
    },
};

// ─── LOSE WEIGHT — Full Body + Cardio split ───────────────────────────

const LOSE_WEIGHT: WeeklyRoster = {
    Monday: {
        label: "Full Body Strength",
        exercises: [
            ex("squat", 3, 10, 0, 75),
            ex("bench-press", 3, 10, 0, 75),
            ex("barbell-row", 3, 10, 0, 75),
            ex("ohp", 3, 8, 0, 75),
            ex("plank", 3, 45, 0, 30),
        ],
    },
    Tuesday: {
        label: "Cardio & Core",
        exercises: [
            ex("running", 1, 30, 0, 0),
            ex("burpees", 3, 15, 0, 30),
            ex("mountain-climbers", 3, 30, 0, 30),
            ex("bicycle-crunch", 3, 20, 0, 30),
            ex("jump-rope", 3, 60, 0, 30),
        ],
    },
    Wednesday: {
        label: "Full Body Strength",
        exercises: [
            ex("deadlift", 3, 8, 0, 90),
            ex("incline-bench", 3, 10, 0, 75),
            ex("pull-ups", 3, 10, 0, 75),
            ex("lunges", 3, 12, 0, 60),
            ex("leg-raise", 3, 15, 0, 30),
        ],
    },
    Thursday: {
        label: "Active Recovery",
        exercises: [],
    },
    Friday: {
        label: "Full Body Strength",
        exercises: [
            ex("leg-press", 3, 12, 0, 75),
            ex("dumbbell-flys", 3, 12, 0, 60),
            ex("seated-row", 3, 12, 0, 60),
            ex("lateral-raise", 3, 15, 0, 45),
            ex("calf-raise", 3, 15, 0, 45),
        ],
    },
    Saturday: {
        label: "HIIT Cardio",
        exercises: [
            ex("burpees", 3, 15, 0, 30),
            ex("mountain-climbers", 3, 30, 0, 30),
            ex("jump-rope", 3, 60, 0, 30),
            ex("running", 1, 20, 0, 0),
            ex("rowing", 1, 15, 0, 0),
        ],
    },
    Sunday: {
        label: "Rest Day",
        exercises: [],
    },
};

// ─── KEEP FIT — Functional Training ───────────────────────────────────

const KEEP_FIT: WeeklyRoster = {
    Monday: {
        label: "Upper Body Functional",
        exercises: [
            ex("push-ups", 3, 20, 0, 45),
            ex("pull-ups", 3, 10, 0, 60),
            ex("ohp", 3, 10, 0, 60),
            ex("face-pulls", 3, 15, 0, 45),
            ex("plank", 3, 45, 0, 30),
        ],
    },
    Tuesday: {
        label: "Lower Body Functional",
        exercises: [
            ex("squat", 3, 12, 0, 75),
            ex("lunges", 3, 12, 0, 60),
            ex("calf-raise", 3, 15, 0, 30),
            ex("hip-thrust", 3, 12, 0, 60),
            ex("dead-bug", 3, 12, 0, 30),
        ],
    },
    Wednesday: {
        label: "Cardio",
        exercises: [
            ex("running", 1, 30, 0, 0),
            ex("jump-rope", 3, 60, 0, 30),
            ex("mountain-climbers", 3, 30, 0, 30),
        ],
    },
    Thursday: {
        label: "Rest Day",
        exercises: [],
    },
    Friday: {
        label: "Full Body",
        exercises: [
            ex("deadlift", 3, 8, 0, 90),
            ex("bench-press", 3, 10, 0, 75),
            ex("barbell-row", 3, 10, 0, 75),
            ex("russian-twist", 3, 20, 0, 30),
            ex("burpees", 3, 15, 0, 30),
        ],
    },
    Saturday: {
        label: "Mobility & Core",
        exercises: [
            ex("plank", 3, 60, 0, 30),
            ex("leg-raise", 3, 15, 0, 30),
            ex("ab-wheel", 3, 10, 0, 30),
            ex("cycling", 1, 20, 0, 0),
            ex("bulgarian-split", 3, 10, 0, 60),
        ],
    },
    Sunday: {
        label: "Rest Day",
        exercises: [],
    },
};

// ─── Lookup ───────────────────────────────────────────────────────────

const TEMPLATES: Record<Goal, { name: string; description: string; roster: WeeklyRoster }> = {
    "Build Muscle": {
        name: "Muscle Builder PPL",
        description: "6-day Push/Pull/Legs split for maximum hypertrophy",
        roster: BUILD_MUSCLE,
    },
    "Lose Weight": {
        name: "Fat Burner",
        description: "Full-body strength + HIIT cardio for fat loss",
        roster: LOSE_WEIGHT,
    },
    "Keep Fit": {
        name: "Functional Fitness",
        description: "Balanced functional training for overall health",
        roster: KEEP_FIT,
    },
};

export function getTemplateForGoal(goal: Goal) {
    return TEMPLATES[goal] || TEMPLATES["Keep Fit"];
}

export function getTemplateName(goal: Goal): string {
    return TEMPLATES[goal]?.name || "Functional Fitness";
}

export function getTemplateDescription(goal: Goal): string {
    return TEMPLATES[goal]?.description || "";
}
