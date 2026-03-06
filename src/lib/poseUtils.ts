/**
 * poseUtils.ts
 * Shared utilities for all exercise processors:
 * landmark indices, colors, math, drawing, and common types.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// ─── Landmark Indices (MediaPipe Pose) ───────────────────────────────
export const LANDMARKS = {
    nose: 0,
    left: {
        shoulder: 11, elbow: 13, wrist: 15,
        hip: 23, knee: 25, ankle: 27, foot: 31,
    },
    right: {
        shoulder: 12, elbow: 14, wrist: 16,
        hip: 24, knee: 26, ankle: 28, foot: 32,
    },
} as const;

// ─── Colors ───────────────────────────────────────────────────────────
export const COLORS = {
    blue: "rgba(0, 127, 255, 1)",
    red: "rgba(255, 50, 50, 1)",
    green: "rgba(0, 255, 127, 1)",
    lightGreen: "rgba(100, 233, 127, 1)",
    yellow: "rgba(255, 255, 0, 1)",
    magenta: "rgba(255, 0, 255, 1)",
    white: "rgba(255, 255, 255, 1)",
    cyan: "rgba(0, 255, 255, 1)",
    lightBlue: "rgba(102, 204, 255, 1)",
    primary: "rgba(74, 222, 128, 1)",
    orange: "rgba(255, 165, 0, 1)",
    purple: "rgba(180, 100, 255, 1)",
};

// ─── Types ────────────────────────────────────────────────────────────
export interface Point {
    x: number;
    y: number;
}

export interface ExerciseStats {
    correctCount: number;
    incorrectCount: number;
    formAccuracy: number;
    currentFeedback: string[];
    isAligned: boolean;
    offsetAngle: number;
    lowerHips: boolean;
    kneeAngle: number;
    hipAngle: number;
    ankleAngle: number;
    currentState: string | null;
}

export interface IExerciseProcessor {
    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): ExerciseStats;
    processNoPose(): ExerciseStats;
    reset(): void;
}

export type FeedbackEntry = [string, string]; // [message, color]

// ─── Math Utilities ───────────────────────────────────────────────────

export function findAngle(p1: Point, p2: Point, refPt: Point = { x: 0, y: 0 }): number {
    const p1Ref = { x: p1.x - refPt.x, y: p1.y - refPt.y };
    const p2Ref = { x: p2.x - refPt.x, y: p2.y - refPt.y };
    const dot = p1Ref.x * p2Ref.x + p1Ref.y * p2Ref.y;
    const mag1 = Math.sqrt(p1Ref.x ** 2 + p1Ref.y ** 2);
    const mag2 = Math.sqrt(p2Ref.x ** 2 + p2Ref.y ** 2);
    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.floor((180 / Math.PI) * Math.acos(cosTheta));
}

export function findJointAngle(a: Point, joint: Point, b: Point): number {
    return findAngle(a, b, joint);
}

export function getLandmarkCoord(
    landmarks: NormalizedLandmark[],
    index: number,
    width: number,
    height: number
): Point {
    const lm = landmarks[index];
    return { x: Math.round(lm.x * width), y: Math.round(lm.y * height) };
}

// ─── Canvas Drawing Utilities ─────────────────────────────────────────

export function drawLine(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width = 3) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
}

export function drawCircle(ctx: CanvasRenderingContext2D, p: Point, radius: number, color: string) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

export function drawDottedLine(ctx: CanvasRenderingContext2D, p: Point, startY: number, endY: number, color: string) {
    ctx.fillStyle = color;
    for (let i = startY; i <= endY; i += 8) {
        ctx.beginPath();
        ctx.arc(p.x, i, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

export function drawAngleArc(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    startDeg: number,
    endDeg: number,
    color: string
) {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, (startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

export function drawLabel(
    ctx: CanvasRenderingContext2D,
    text: string,
    pos: Point,
    bgColor: string,
    textColor = "#fff",
    fontSize = 14
) {
    ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;
    const metrics = ctx.measureText(text);
    const padding = 8;
    const height = fontSize + padding * 2;
    const width = metrics.width + padding * 2;
    const rx = pos.x - padding;
    const ry = pos.y - fontSize - padding + 2;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(rx, ry, width, height, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(text, pos.x, pos.y);
}

// ─── Common Helpers ───────────────────────────────────────────────────

export function getAccuracy(correct: number, incorrect: number): number {
    const total = correct + incorrect;
    if (total === 0) return 100;
    return Math.round((correct / total) * 100);
}

export function defaultStats(correct = 0, incorrect = 0, feedback: string[] = []): ExerciseStats {
    return {
        correctCount: correct,
        incorrectCount: incorrect,
        formAccuracy: getAccuracy(correct, incorrect),
        currentFeedback: feedback,
        isAligned: false,
        offsetAngle: 0,
        lowerHips: false,
        kneeAngle: 0,
        hipAngle: 0,
        ankleAngle: 0,
        currentState: null,
    };
}

/** Determine which body side is closer to camera (side view) */
export function getCloserSide(landmarks: NormalizedLandmark[], w: number, h: number) {
    const lf = getLandmarkCoord(landmarks, LANDMARKS.left.foot, w, h);
    const ls = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, w, h);
    const rf = getLandmarkCoord(landmarks, LANDMARKS.right.foot, w, h);
    const rs = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, w, h);
    const distLeft = Math.abs(lf.y - ls.y);
    const distRight = Math.abs(rf.y - rs.y);

    if (distLeft > distRight) {
        return {
            shldr: ls,
            elbow: getLandmarkCoord(landmarks, LANDMARKS.left.elbow, w, h),
            wrist: getLandmarkCoord(landmarks, LANDMARKS.left.wrist, w, h),
            hip: getLandmarkCoord(landmarks, LANDMARKS.left.hip, w, h),
            knee: getLandmarkCoord(landmarks, LANDMARKS.left.knee, w, h),
            ankle: getLandmarkCoord(landmarks, LANDMARKS.left.ankle, w, h),
            foot: getLandmarkCoord(landmarks, LANDMARKS.left.foot, w, h),
            multiplier: -1,
        };
    }
    return {
        shldr: rs,
        elbow: getLandmarkCoord(landmarks, LANDMARKS.right.elbow, w, h),
        wrist: getLandmarkCoord(landmarks, LANDMARKS.right.wrist, w, h),
        hip: getLandmarkCoord(landmarks, LANDMARKS.right.hip, w, h),
        knee: getLandmarkCoord(landmarks, LANDMARKS.right.knee, w, h),
        ankle: getLandmarkCoord(landmarks, LANDMARKS.right.ankle, w, h),
        foot: getLandmarkCoord(landmarks, LANDMARKS.right.foot, w, h),
        multiplier: 1,
    };
}

/** Draw the standard skeleton for side-view exercises */
export function drawSkeleton(
    ctx: CanvasRenderingContext2D,
    side: ReturnType<typeof getCloserSide>,
    limbColor = COLORS.lightBlue,
    jointColor = COLORS.yellow,
    lineWidth = 4,
    jointRadius = 7
) {
    const { shldr, elbow, wrist, hip, knee, ankle, foot } = side;
    drawLine(ctx, shldr, elbow, limbColor, lineWidth);
    drawLine(ctx, elbow, wrist, limbColor, lineWidth);
    drawLine(ctx, shldr, hip, limbColor, lineWidth);
    drawLine(ctx, hip, knee, limbColor, lineWidth);
    drawLine(ctx, knee, ankle, limbColor, lineWidth);
    drawLine(ctx, ankle, foot, limbColor, lineWidth);
    [shldr, elbow, wrist, hip, knee, ankle, foot].forEach((pt) =>
        drawCircle(ctx, pt, jointRadius, jointColor)
    );
}
