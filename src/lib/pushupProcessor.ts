/**
 * pushupProcessor.ts
 * 
 * AI form analysis for push-ups (side view).
 * Tracks elbow angle to detect up/down phases.
 * Checks: body alignment (hip sag / pike), elbow flare, depth.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
    type ExerciseStats, type IExerciseProcessor,
    LANDMARKS, COLORS,
    findJointAngle, findAngle, getLandmarkCoord,
    getCloserSide, drawSkeleton,
    drawLine, drawCircle, drawAngleArc, drawDottedLine, drawLabel,
    getAccuracy, defaultStats,
    drawARTrail, drawHeatmap
} from "./poseUtils";

// ─── Thresholds ──────────────────────────────────────────────────────

export interface PushupThresholds {
    ELBOW_ANGLE: { UP: [number, number]; TRANS: [number, number]; DOWN: [number, number] };
    HIP_ALIGN_THRESH: [number, number]; // min, max hip angle to shoulder-ankle line
    OFFSET_THRESH: number;
    INACTIVE_THRESH: number;
    CNT_FRAME_THRESH: number;
}

export function getPushupBeginner(): PushupThresholds {
    return {
        ELBOW_ANGLE: { UP: [130, 180], TRANS: [70, 160], DOWN: [25, 120] },
        HIP_ALIGN_THRESH: [120, 230],
        OFFSET_THRESH: 55,
        INACTIVE_THRESH: 20,
        CNT_FRAME_THRESH: 120,
    };
}

export function getPushupPro(): PushupThresholds {
    return {
        ELBOW_ANGLE: { UP: [160, 180], TRANS: [100, 155], DOWN: [40, 95] },
        HIP_ALIGN_THRESH: [165, 195],
        OFFSET_THRESH: 35,
        INACTIVE_THRESH: 15,
        CNT_FRAME_THRESH: 50,
    };
}

// ─── Processor ───────────────────────────────────────────────────────

export class PushupProcessor implements IExerciseProcessor {
    private thresholds: PushupThresholds;
    private correctCount = 0;
    private incorrectCount = 0;
    private stateSeq: string[] = [];
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;
    private displayText = [false, false]; // 0=hip sag, 1=hip pike
    private countFrames = [0, 0];
    private startInactiveTime = performance.now();
    private inactiveTime = 0;

    // ── Hardening: anti-cheat validation ──
    private bottomFrames = 0;       // frames spent in "down" state
    private bottomConfirmed = false; // true if held "down" for min frames
    private static readonly MIN_BOTTOM_FRAMES = 2;
    private static readonly MAX_VERTICAL_RATIO = 0.60; // body must be <60% vertical span vs horizontal

    // ── WOW Features: AR Trails & Heatmap ──
    private shldrTrail: { x: number; y: number; alpha: number }[] = [];
    private static readonly MAX_TRAIL_LENGTH = 15;

    constructor(thresholds: PushupThresholds) {
        this.thresholds = thresholds;
    }

    reset() {
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.stateSeq = [];
        this.incorrectPosture = false;
        this.prevState = null;
        this.currState = null;
        this.displayText = [false, false];
        this.countFrames = [0, 0];
        this.startInactiveTime = performance.now();
        this.inactiveTime = 0;
        this.bottomFrames = 0;
        this.bottomConfirmed = false;
        this.shldrTrail = [];
    }

    private getState(elbowAngle: number): string | null {
        const t = this.thresholds.ELBOW_ANGLE;
        if (elbowAngle >= t.UP[0] && elbowAngle <= t.UP[1]) return "up";
        if (elbowAngle >= t.TRANS[0] && elbowAngle <= t.TRANS[1]) return "trans";
        if (elbowAngle >= t.DOWN[0] && elbowAngle <= t.DOWN[1]) return "down";
        return null;
    }

    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number
    ): ExerciseStats {
        const feedback: string[] = [];

        // Check side alignment
        const leftShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, w, h);
        const rightShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, w, h);
        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, w, h);
        const offsetAngle = findAngle(leftShldr, rightShldr, nose);

        if (offsetAngle > this.thresholds.OFFSET_THRESH) {
            drawCircle(ctx, nose, 7, COLORS.white);
            drawCircle(ctx, leftShldr, 7, COLORS.yellow);
            drawCircle(ctx, rightShldr, 7, COLORS.magenta);
            feedback.push("CAMERA NOT ALIGNED — stand sideways");
            return {
                ...defaultStats(this.correctCount, this.incorrectCount, feedback),
                isAligned: false,
                offsetAngle,
            };
        }

        // Get closer side
        const side = getCloserSide(landmarks, w, h);
        drawSkeleton(ctx, side);

        // Key angles
        const elbowAngle = findJointAngle(side.shldr, side.elbow, side.wrist);
        const bodyAngle = findJointAngle(side.shldr, side.hip, side.ankle); // body line

        // Draw angle visuals
        drawAngleArc(ctx, side.elbow, 25, -90, -90 + side.multiplier * elbowAngle, COLORS.white);
        drawLabel(ctx, `${Math.round(elbowAngle)}°`, { x: side.elbow.x + 15, y: side.elbow.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

        // Body alignment check
        const [minAlign, maxAlign] = this.thresholds.HIP_ALIGN_THRESH;
        if (bodyAngle < minAlign) {
            this.displayText[0] = true; // hips sagging
            this.incorrectPosture = true;
        } else if (bodyAngle > maxAlign) {
            this.displayText[1] = true; // hips piked
            this.incorrectPosture = true;
        }

        // Draw body line indicator
        const lineColor = bodyAngle >= minAlign && bodyAngle <= maxAlign ? COLORS.green : COLORS.red;
        drawLine(ctx, side.shldr, side.ankle, lineColor, 2);

        // ── WOW Features: Render AR Trail & Heatmap ──
        const minElbowAngle = this.thresholds.ELBOW_ANGLE.DOWN[1];
        const maxElbowAngle = this.thresholds.ELBOW_ANGLE.UP[0];
        const depthRatio = (maxElbowAngle - elbowAngle) / (maxElbowAngle - minElbowAngle);
        
        drawHeatmap(ctx, side.shldr, side.elbow, depthRatio);

        this.shldrTrail.push({ x: side.shldr.x, y: side.shldr.y, alpha: 1.0 });
        if (this.shldrTrail.length > PushupProcessor.MAX_TRAIL_LENGTH) {
            this.shldrTrail.shift();
        }
        for (let i = 0; i < this.shldrTrail.length; i++) {
            this.shldrTrail[i].alpha = (i + 1) / this.shldrTrail.length;
        }
        drawARTrail(ctx, this.shldrTrail);

        // ── Hardening: body orientation check ──
        // In a real push-up, the body is roughly horizontal.
        // If vertical span (shoulder-ankle Y diff) >> horizontal span, user is standing.
        const verticalSpan = Math.abs(side.shldr.y - side.ankle.y);
        const horizontalSpan = Math.abs(side.shldr.x - side.ankle.x);
        if (horizontalSpan > 0 && verticalSpan / horizontalSpan > PushupProcessor.MAX_VERTICAL_RATIO) {
            // Body is too upright for a push-up (likely standing / wall push-up)
            this.incorrectPosture = true;
        }

        // State machine
        const state = this.getState(elbowAngle);
        this.currState = state;

        // ── Hardening: track bottom hold ──
        if (state === "down") {
            this.bottomFrames++;
            if (this.bottomFrames >= PushupProcessor.MIN_BOTTOM_FRAMES) {
                this.bottomConfirmed = true;
            }
            if (!this.stateSeq.includes("down")) {
                this.stateSeq.push("down");
            }
        } else {
            if (state !== "down") {
                this.bottomFrames = 0;
            }
        }

        if (state === "up") {
            if (this.stateSeq.includes("down") && this.bottomConfirmed && !this.incorrectPosture) {
                this.correctCount++;
            } else if (this.stateSeq.includes("down") && (this.incorrectPosture || !this.bottomConfirmed)) {
                this.incorrectCount++;
            }
            this.stateSeq = [];
            this.incorrectPosture = false;
            this.bottomConfirmed = false;
            this.bottomFrames = 0;
        }

        // Feedback display
        for (let i = 0; i < 2; i++) {
            if (this.displayText[i]) this.countFrames[i]++;
        }
        if (this.countFrames[0] > 0 && this.countFrames[0] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("HIPS SAGGING — tighten core");
        }
        if (this.countFrames[1] > 0 && this.countFrames[1] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("HIPS TOO HIGH — straighten body");
        }
        for (let i = 0; i < 2; i++) {
            if (this.countFrames[i] > this.thresholds.CNT_FRAME_THRESH) {
                this.displayText[i] = false;
                this.countFrames[i] = 0;
            }
        }

        // Inactivity
        if (this.currState === this.prevState) {
            const now = performance.now();
            this.inactiveTime += (now - this.startInactiveTime) / 1000;
            this.startInactiveTime = now;
            if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
                this.correctCount = 0; this.incorrectCount = 0;
                this.inactiveTime = 0;
            }
        } else {
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
        }
        this.prevState = state;

        return {
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            formAccuracy: getAccuracy(this.correctCount, this.incorrectCount),
            currentFeedback: feedback,
            isAligned: true,
            offsetAngle,
            lowerHips: false,
            kneeAngle: elbowAngle,
            hipAngle: bodyAngle,
            ankleAngle: 0,
            currentState: state,
        };
    }

    processNoPose(): ExerciseStats {
        return {
            ...defaultStats(this.correctCount, this.incorrectCount, ["No pose detected — step into frame"]),
        };
    }
}
