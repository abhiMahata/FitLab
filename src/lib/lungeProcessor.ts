/**
 * lungeProcessor.ts
 * 
 * Real-time lunge form analysis using MediaPipe landmarks.
 * Tracks front knee angle, torso uprightness, knee-over-toe, and rep counting.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { LungeThresholds } from "./thresholds";
import {
    type ExerciseStats, type IExerciseProcessor, type FeedbackEntry,
    LANDMARKS, COLORS, findAngle, getLandmarkCoord, getCloserSide,
    drawSkeleton, drawAngleArc, drawDottedLine, drawLabel, drawCircle,
    getAccuracy, defaultStats,
} from "./poseUtils";

const FEEDBACK_MAP: Record<number, FeedbackEntry> = {
    0: ["KNEE OVER TOE", "rgba(255, 80, 80, 0.9)"],
    1: ["TORSO LEANING FORWARD", "rgba(0, 153, 255, 0.9)"],
    2: ["GO DEEPER", "rgba(255, 165, 0, 0.9)"],
    3: ["KNEE CAVING INWARD", "rgba(255, 80, 80, 0.9)"],
};

export class LungeProcessor implements IExerciseProcessor {
    private thresholds: LungeThresholds;
    private stateSeq: string[] = [];
    private startInactiveTime = performance.now();
    private startInactiveTimeFront = performance.now();
    private inactiveTime = 0;
    private inactiveTimeFront = 0;
    private displayText = [false, false, false, false];
    private countFrames = [0, 0, 0, 0];
    private goDeeper = false;
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;
    public repCount = 0;
    public improperRep = 0;

    constructor(thresholds: LungeThresholds) {
        this.thresholds = thresholds;
    }

    setThresholds(thresholds: LungeThresholds) {
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
        this.goDeeper = false;
        this.incorrectPosture = false;
        this.prevState = null; this.currState = null;
        this.repCount = 0; this.improperRep = 0;
    }

    private getState(kneeVertAngle: number): string | null {
        const t = this.thresholds.KNEE_VERT;
        if (kneeVertAngle >= t.NORMAL[0] && kneeVertAngle <= t.NORMAL[1]) return "s1";
        if (kneeVertAngle >= t.TRANS[0] && kneeVertAngle <= t.TRANS[1]) return "s2";
        if (kneeVertAngle >= t.PASS[0] && kneeVertAngle <= t.PASS[1]) return "s3";
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
            }
            drawCircle(ctx, nose, 7, COLORS.white);
            drawCircle(ctx, leftShldr, 7, COLORS.yellow);
            drawCircle(ctx, rightShldr, 7, COLORS.magenta);
            feedback.push("CAMERA NOT ALIGNED — stand sideways");
            this.prevState = null; this.currState = null;
            return { ...defaultStats(this.repCount, this.improperRep, feedback), offsetAngle };
        }

        this.inactiveTimeFront = 0;
        this.startInactiveTimeFront = performance.now();
        const side = getCloserSide(landmarks, canvasWidth, canvasHeight);
        const { shldr, hip, knee, ankle, foot, multiplier } = side;

        // ── Key angles ──
        const kneeVertAngle = findAngle(hip, { x: knee.x, y: 0 }, knee);
        const hipVertAngle = findAngle(shldr, { x: hip.x, y: 0 }, hip);
        const ankleVertAngle = findAngle(knee, { x: ankle.x, y: 0 }, ankle);

        // ── Draw guides ──
        drawAngleArc(ctx, knee, 20, -90, -90 - multiplier * kneeVertAngle, COLORS.white);
        drawDottedLine(ctx, knee, knee.y - 50, knee.y + 20, COLORS.blue);
        drawAngleArc(ctx, hip, 30, -90, -90 + multiplier * hipVertAngle, COLORS.white);
        drawDottedLine(ctx, hip, hip.y - 80, hip.y + 20, COLORS.blue);
        drawSkeleton(ctx, side, COLORS.green);

        // ── State machine ──
        const currentState = this.getState(kneeVertAngle);
        this.currState = currentState;
        this.updateStateSequence(currentState);

        // ── Rep counting ──
        if (currentState === "s1") {
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
            // Knee over toe check — knee x-position past ankle
            const kneeOverToe = Math.abs(knee.x - ankle.x);
            if (knee.y > ankle.y - 10 && kneeOverToe > this.thresholds.KNEE_OVER_TOE_THRESH) {
                this.displayText[0] = true;
                this.incorrectPosture = true;
            }
            // Torso lean check
            if (hipVertAngle > this.thresholds.HIP_THRESH[1]) {
                this.displayText[1] = true;
            }
            // Go deeper check
            if (
                kneeVertAngle > this.thresholds.KNEE_VERT.TRANS[0] &&
                kneeVertAngle < this.thresholds.KNEE_VERT.TRANS[1] &&
                this.stateSeq.filter((s) => s === "s2").length === 1
            ) {
                this.goDeeper = true;
            }
        }

        // ── Check if deep enough ──
        if (this.stateSeq.includes("s3") || currentState === "s1") {
            this.goDeeper = false;
        }
        if (this.goDeeper) {
            feedback.push("GO DEEPER");
        }

        // ── Inactivity ──
        if (this.currState === this.prevState) {
            const endTime = performance.now();
            this.inactiveTime += (endTime - this.startInactiveTime) / 1000;
            this.startInactiveTime = endTime;
            if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
                this.repCount = 0; this.improperRep = 0;
                this.inactiveTime = 0;
            }
        } else {
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
        }

        // ── Feedback ──
        for (let i = 0; i < 4; i++) { if (this.displayText[i]) this.countFrames[i]++; }
        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > 0 && this.countFrames[i] <= this.thresholds.CNT_FRAME_THRESH)
                feedback.push(FEEDBACK_MAP[i][0]);
        }

        drawLabel(ctx, String(Math.round(kneeVertAngle)), { x: knee.x + 15, y: knee.y + 10 }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(hipVertAngle)), { x: hip.x + 10, y: hip.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

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
            lowerHips: this.goDeeper,
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
