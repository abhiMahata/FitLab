/**
 * deadliftProcessor.ts
 * 
 * Real-time deadlift form analysis using MediaPipe landmarks.
 * Tracks hip hinge angle, back position, knee bend, and rep counting.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { DeadliftThresholds } from "./thresholds";
import {
    type ExerciseStats, type IExerciseProcessor, type FeedbackEntry,
    LANDMARKS, COLORS, findAngle, getLandmarkCoord, getCloserSide,
    drawSkeleton, drawAngleArc, drawDottedLine, drawLabel, drawCircle,
    getAccuracy, defaultStats,
    drawARTrail, drawHeatmap
} from "./poseUtils";

const FEEDBACK_MAP: Record<number, FeedbackEntry> = {
    0: ["BACK ROUNDING", "rgba(255, 80, 80, 0.9)"],
    1: ["KNEES TOO BENT", "rgba(0, 153, 255, 0.9)"],
    2: ["BAR DRIFTING FORWARD", "rgba(255, 165, 0, 0.9)"],
    3: ["LOCKOUT INCOMPLETE", "rgba(255, 80, 80, 0.9)"],
};

export class DeadliftProcessor implements IExerciseProcessor {
    private thresholds: DeadliftThresholds;
    private stateSeq: string[] = [];
    private startInactiveTime = performance.now();
    private startInactiveTimeFront = performance.now();
    private inactiveTime = 0;
    private inactiveTimeFront = 0;
    private displayText = [false, false, false, false];
    private countFrames = [0, 0, 0, 0];
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;
    public repCount = 0;
    public improperRep = 0;

    // ── Hardening: anti-cheat validation ──
    private static readonly MIN_KNEE_BEND = 15;        // knees must bend ≥15° during lift
    private static readonly MAX_LOCKOUT_HIP_ANGLE = 15; // hip angle must be <15° at lockout
    private static readonly BAR_DRIFT_RATIO = 0.15;    // bar drift max = 15% of body height

    // ── WOW Features: AR Trails & Heatmap ──
    private wristTrail: { x: number; y: number; alpha: number }[] = [];
    private static readonly MAX_TRAIL_LENGTH = 15;

    constructor(thresholds: DeadliftThresholds) {
        this.thresholds = thresholds;
    }

    setThresholds(thresholds: DeadliftThresholds) {
        this.thresholds = thresholds;
        this.reset();
    }

    reset() {
        this.stateSeq = [];
        this.startInactiveTime = performance.now();
        this.startInactiveTimeFront = performance.now();
        this.inactiveTime = 0;
        this.inactiveTimeFront = 0;
        this.displayText = [false, false, false, false];
        this.countFrames = [0, 0, 0, 0];
        this.incorrectPosture = false;
        this.prevState = null;
        this.currState = null;
        this.repCount = 0;
        this.improperRep = 0;
        this.wristTrail = [];
    }

    private getState(hipVertAngle: number): string | null {
        const t = this.thresholds.HIP_VERT;
        if (hipVertAngle >= t.NORMAL[0] && hipVertAngle <= t.NORMAL[1]) return "s1";
        if (hipVertAngle >= t.TRANS[0] && hipVertAngle <= t.TRANS[1]) return "s2";
        if (hipVertAngle >= t.PASS[0] && hipVertAngle <= t.PASS[1]) return "s3";
        return null;
    }

    private updateStateSequence(state: string | null) {
        if (!state) return;
        if (state === "s2") {
            if (
                (!this.stateSeq.includes("s3") && this.stateSeq.filter((s) => s === "s2").length === 0) ||
                (this.stateSeq.includes("s3") && this.stateSeq.filter((s) => s === "s2").length === 1)
            ) {
                this.stateSeq.push(state);
            }
        } else if (state === "s3") {
            if (!this.stateSeq.includes(state) && this.stateSeq.includes("s2")) {
                this.stateSeq.push(state);
            }
        }
    }

    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): ExerciseStats {
        const feedback: string[] = [];
        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, canvasWidth, canvasHeight);
        const leftShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, canvasWidth, canvasHeight);
        const rightShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, canvasWidth, canvasHeight);
        const offsetAngle = findAngle(leftShldr, rightShldr, nose);

        if (offsetAngle > this.thresholds.OFFSET_THRESH) {
            const endTime = performance.now();
            this.inactiveTimeFront += (endTime - this.startInactiveTimeFront) / 1000;
            this.startInactiveTimeFront = endTime;
            if (this.inactiveTimeFront >= this.thresholds.INACTIVE_THRESH) {
                this.repCount = 0; this.improperRep = 0;
                this.inactiveTimeFront = 0;
                this.startInactiveTimeFront = performance.now();
            }
            drawCircle(ctx, nose, 7, COLORS.white);
            drawCircle(ctx, leftShldr, 7, COLORS.yellow);
            drawCircle(ctx, rightShldr, 7, COLORS.magenta);
            feedback.push("CAMERA NOT ALIGNED — stand sideways");
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
            this.prevState = null; this.currState = null;
            return { ...defaultStats(this.repCount, this.improperRep, feedback), offsetAngle };
        }

        this.inactiveTimeFront = 0;
        this.startInactiveTimeFront = performance.now();
        const side = getCloserSide(landmarks, canvasWidth, canvasHeight);
        const { shldr, hip, knee, ankle, multiplier } = side;

        // ── Key angles ──
        const hipVertAngle = findAngle(shldr, { x: hip.x, y: 0 }, hip);
        const kneeVertAngle = findAngle(hip, { x: knee.x, y: 0 }, knee);
        const ankleVertAngle = findAngle(knee, { x: ankle.x, y: 0 }, ankle);

        // ── Draw visual guides ──
        drawAngleArc(ctx, hip, 30, -90, -90 + multiplier * hipVertAngle, COLORS.white);
        drawDottedLine(ctx, hip, hip.y - 80, hip.y + 20, COLORS.blue);
        drawAngleArc(ctx, knee, 20, -90, -90 - multiplier * kneeVertAngle, COLORS.white);
        drawDottedLine(ctx, knee, knee.y - 50, knee.y + 20, COLORS.blue);
        drawSkeleton(ctx, side, COLORS.orange);

        // ── WOW Features: Render AR Trail & Heatmap ──
        const minHipAngle = this.thresholds.HIP_VERT.NORMAL[0]; // ~0 standing
        const maxHipAngle = this.thresholds.HIP_VERT.PASS[1]; // ~90 bottom
        const depthRatio = (hipVertAngle - minHipAngle) / (maxHipAngle - minHipAngle);
        
        // Deadlift works posterior chain: Lower back and Hamstrings
        drawHeatmap(ctx, shldr, hip, depthRatio);
        drawHeatmap(ctx, hip, knee, depthRatio);

        this.wristTrail.push({ x: side.wrist.x, y: side.wrist.y, alpha: 1.0 });
        if (this.wristTrail.length > DeadliftProcessor.MAX_TRAIL_LENGTH) {
            this.wristTrail.shift();
        }
        for (let i = 0; i < this.wristTrail.length; i++) {
            this.wristTrail[i].alpha = (i + 1) / this.wristTrail.length;
        }
        drawARTrail(ctx, this.wristTrail);

        // ── State machine ──
        const currentState = this.getState(hipVertAngle);
        this.currState = currentState;
        this.updateStateSequence(currentState);

        // ── Rep counting ──
        if (currentState === "s1") {
            // ── Hardening: lockout validation ──
            // At s1, hip must be nearly vertical (fully standing)
            if (hipVertAngle > DeadliftProcessor.MAX_LOCKOUT_HIP_ANGLE && this.stateSeq.length >= 2) {
                this.incorrectPosture = true;
            }

            if (this.stateSeq.length === 3 && !this.incorrectPosture) {
                this.repCount++;
            } else if (this.stateSeq.includes("s2") && this.stateSeq.length === 1) {
                this.improperRep++;
            } else if (this.incorrectPosture) {
                this.improperRep++;
            }
            this.stateSeq = [];
            this.incorrectPosture = false;
        } else {
            // Form feedback: back rounding
            if (hipVertAngle > this.thresholds.BACK_THRESH[1]) {
                this.displayText[0] = true;
                this.incorrectPosture = true;
            }
            // Form feedback: knees too bent
            if (kneeVertAngle > this.thresholds.KNEE_THRESH && this.stateSeq.includes("s2")) {
                this.displayText[1] = true;
            }

            // ── Hardening: concurrent knee-bend check ──
            // A real deadlift involves knee bend. If knees are locked straight
            // (pure waist bow), it's not a deadlift.
            if (this.stateSeq.includes("s2") && kneeVertAngle < DeadliftProcessor.MIN_KNEE_BEND) {
                this.incorrectPosture = true;
            }

            // Form feedback: bar drifting (wrist far from ankle)
            // ── Hardening: normalized bar drift (was hardcoded 60px) ──
            const bodyRefH = Math.max(1, Math.abs(side.shldr.y - side.ankle.y));
            const barDrift = Math.abs(side.wrist.x - side.ankle.x);
            const normalizedDrift = barDrift / bodyRefH;
            if (normalizedDrift > DeadliftProcessor.BAR_DRIFT_RATIO && this.stateSeq.includes("s2")) {
                this.displayText[2] = true;
                this.incorrectPosture = true;
            }
        }

        // ── Inactivity ──
        if (this.currState === this.prevState) {
            const endTime = performance.now();
            this.inactiveTime += (endTime - this.startInactiveTime) / 1000;
            this.startInactiveTime = endTime;
            if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
                this.repCount = 0; this.improperRep = 0;
                this.inactiveTime = 0;
                this.startInactiveTime = performance.now();
            }
        } else {
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
        }

        // ── Collect feedback ──
        for (let i = 0; i < 4; i++) { if (this.displayText[i]) this.countFrames[i]++; }
        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > 0 && this.countFrames[i] <= this.thresholds.CNT_FRAME_THRESH)
                feedback.push(FEEDBACK_MAP[i][0]);
        }

        // ── Draw labels ──
        drawLabel(ctx, String(Math.round(hipVertAngle)), { x: hip.x + 10, y: hip.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(kneeVertAngle)), { x: knee.x + 15, y: knee.y + 10 }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > this.thresholds.CNT_FRAME_THRESH) {
                this.displayText[i] = false; this.countFrames[i] = 0;
            }
        }
        this.prevState = currentState;

        return {
            correctCount: this.repCount,
            incorrectCount: this.improperRep,
            formAccuracy: getAccuracy(this.repCount, this.improperRep),
            currentFeedback: feedback,
            isAligned: true,
            offsetAngle,
            lowerHips: false,
            kneeAngle: kneeVertAngle,
            hipAngle: hipVertAngle,
            ankleAngle: ankleVertAngle,
            currentState,
        };
    }

    processNoPose(): ExerciseStats {
        const endTime = performance.now();
        this.inactiveTime += (endTime - this.startInactiveTime) / 1000;
        if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
            this.repCount = 0; this.improperRep = 0; this.inactiveTime = 0;
        }
        this.startInactiveTime = endTime;
        this.prevState = null; this.currState = null;
        this.displayText = [false, false, false, false];
        this.countFrames = [0, 0, 0, 0];
        return defaultStats(this.repCount, this.improperRep, ["No pose detected — step into frame"]);
    }
}
