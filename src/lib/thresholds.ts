// Angle thresholds for all exercise form analysis — Beginner and Pro modes

// ─── Squat ────────────────────────────────────────────────────────────
export interface Thresholds {
  HIP_KNEE_VERT: { NORMAL: [number, number]; TRANS: [number, number]; PASS: [number, number] };
  HIP_THRESH: [number, number];
  ANKLE_THRESH: number;
  KNEE_THRESH: [number, number, number];
  OFFSET_THRESH: number;
  INACTIVE_THRESH: number;
  CNT_FRAME_THRESH: number;
}

export function getThresholdsBeginner(): Thresholds {
  return {
    HIP_KNEE_VERT: { NORMAL: [0, 40], TRANS: [25, 80], PASS: [55, 120] },
    HIP_THRESH: [3, 80],
    ANKLE_THRESH: 70,
    KNEE_THRESH: [30, 90, 120],
    OFFSET_THRESH: 55.0,
    INACTIVE_THRESH: 20.0,
    CNT_FRAME_THRESH: 120,
  };
}

export function getThresholdsPro(): Thresholds {
  return {
    HIP_KNEE_VERT: { NORMAL: [0, 32], TRANS: [35, 65], PASS: [80, 95] },
    HIP_THRESH: [15, 50],
    ANKLE_THRESH: 30,
    KNEE_THRESH: [50, 80, 95],
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
  };
}

// ─── Deadlift ─────────────────────────────────────────────────────────
export interface DeadliftThresholds {
  HIP_VERT: { NORMAL: [number, number]; TRANS: [number, number]; PASS: [number, number] };
  BACK_THRESH: [number, number];
  KNEE_THRESH: number;
  OFFSET_THRESH: number;
  INACTIVE_THRESH: number;
  CNT_FRAME_THRESH: number;
}

export function getDeadliftBeginner(): DeadliftThresholds {
  return {
    HIP_VERT: { NORMAL: [0, 35], TRANS: [20, 70], PASS: [45, 110] },
    BACK_THRESH: [3, 80],
    KNEE_THRESH: 75,
    OFFSET_THRESH: 55.0,
    INACTIVE_THRESH: 20.0,
    CNT_FRAME_THRESH: 120,
  };
}

export function getDeadliftPro(): DeadliftThresholds {
  return {
    HIP_VERT: { NORMAL: [0, 20], TRANS: [25, 50], PASS: [55, 85] },
    BACK_THRESH: [10, 50],
    KNEE_THRESH: 40,
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
  };
}

// ─── Bench Press ──────────────────────────────────────────────────────
export interface BenchThresholds {
  ELBOW_ANGLE: { NORMAL: [number, number]; TRANS: [number, number]; PASS: [number, number] };
  BAR_PATH_THRESH: number;
  OFFSET_THRESH: number;
  INACTIVE_THRESH: number;
  CNT_FRAME_THRESH: number;
}

export function getBenchBeginner(): BenchThresholds {
  return {
    ELBOW_ANGLE: { NORMAL: [135, 180], TRANS: [80, 160], PASS: [30, 120] },
    BAR_PATH_THRESH: 90,
    OFFSET_THRESH: 55.0,
    INACTIVE_THRESH: 20.0,
    CNT_FRAME_THRESH: 120,
  };
}

export function getBenchPro(): BenchThresholds {
  return {
    ELBOW_ANGLE: { NORMAL: [160, 180], TRANS: [110, 155], PASS: [50, 105] },
    BAR_PATH_THRESH: 45,
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
  };
}

// ─── Overhead Press ───────────────────────────────────────────────────
export interface OHPThresholds {
  ELBOW_ANGLE: { NORMAL: [number, number]; TRANS: [number, number]; PASS: [number, number] };
  BACK_LEAN_THRESH: [number, number];
  OFFSET_THRESH: number;
  INACTIVE_THRESH: number;
  CNT_FRAME_THRESH: number;
}

export function getOHPBeginner(): OHPThresholds {
  return {
    ELBOW_ANGLE: { NORMAL: [30, 110], TRANS: [80, 160], PASS: [130, 180] },
    BACK_LEAN_THRESH: [3, 55],
    OFFSET_THRESH: 55.0,
    INACTIVE_THRESH: 20.0,
    CNT_FRAME_THRESH: 120,
  };
}

export function getOHPPro(): OHPThresholds {
  return {
    ELBOW_ANGLE: { NORMAL: [40, 90], TRANS: [95, 140], PASS: [145, 180] },
    BACK_LEAN_THRESH: [5, 25],
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
  };
}

// ─── Lunge ────────────────────────────────────────────────────────────
export interface LungeThresholds {
  KNEE_VERT: { NORMAL: [number, number]; TRANS: [number, number]; PASS: [number, number] };
  HIP_THRESH: [number, number];
  KNEE_OVER_TOE_THRESH: number;
  OFFSET_THRESH: number;
  INACTIVE_THRESH: number;
  CNT_FRAME_THRESH: number;
}

export function getLungeBeginner(): LungeThresholds {
  return {
    KNEE_VERT: { NORMAL: [0, 40], TRANS: [25, 75], PASS: [50, 120] },
    HIP_THRESH: [3, 70],
    KNEE_OVER_TOE_THRESH: 55,
    OFFSET_THRESH: 55.0,
    INACTIVE_THRESH: 20.0,
    CNT_FRAME_THRESH: 120,
  };
}

export function getLungePro(): LungeThresholds {
  return {
    KNEE_VERT: { NORMAL: [0, 25], TRANS: [30, 55], PASS: [60, 95] },
    HIP_THRESH: [5, 40],
    KNEE_OVER_TOE_THRESH: 20,
    OFFSET_THRESH: 35.0,
    INACTIVE_THRESH: 15.0,
    CNT_FRAME_THRESH: 50,
  };
}
