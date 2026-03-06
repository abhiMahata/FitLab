/**
 * ohpProcessor.ts
 * 
 * Real-time Overhead Press form analysis using MediaPipe landmarks.
 * Tracks elbow extension for rep counting, back lean for safety, and lockout quality.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { OHPThresholds } from "./thresholds";
import {
    type ExerciseStats, type IExerciseProcessor, type FeedbackEntry,
    LANDMARKS, COLORS, findAngle, findJointAngle, getLandmarkCoord, getCloserSide,
    drawSkeleton, drawAngleArc, drawDottedLine, drawLabel, drawCircle,
    getAccuracy, defaultStats,
} from "./poseUtils";

const FEEDBACK_MAP: Record<number, FeedbackEntry> = {
    0: ["EXCESSIVE BACK LEAN", "rgba(255, 80, 80, 0.9)"],
    1: ["LOCKOUT INCOMPLETE", "rgba(255, 165, 0, 0.9)"],
    2: ["PUSH HEAD THROUGH", "rgba(0, 153, 255, 0.9)"],
    3: ["PARTIAL REP", "rgba(255, 80, 80, 0.9)"],
};

export class OHPProcessor implements IExerciseProcessor {
    private thresholds: OHPThresholds;
    private stateSeq: string[] = [];
    private startInactiveTime = performance.now();
    private startInactiveTimeFront = performance.now();
    private inactiveTime = 0;
    private inactiveTimeFront = 0;
    private displayText = [false, false, false, false];
    private countFrames = [0, 0, 0, 0];
    private leanDetected = false;
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;
    public repCount = 0;
    public improperRep = 0;

    constructor(thresholds: OHPThresholds) {
        this.thresholds = thresholds;
    }

    setThresholds(thresholds: OHPThresholds) {
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
        this.leanDetected = false;
        this.incorrectPosture = false;
        this.prevState = null; this.currState = null;
        this.repCount = 0; this.improperRep = 0;
    }

    private getState(elbowAngle: number): string | null {
        const t = this.thresholds.ELBOW_ANGLE;
        if (elbowAngle >= t.NORMAL[0] && elbowAngle <= t.NORMAL[1]) return "s1"; // rack position
        if (elbowAngle >= t.TRANS[0] && elbowAngle <= t.TRANS[1]) return "s2";   // pressing
        if (elbowAngle >= t.PASS[0] && elbowAngle <= t.PASS[1]) return "s3";     // lockout
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
        const { shldr, elbow, wrist, hip, knee, multiplier } = side;

        // ── Key angles ──
        const elbowAngle = findJointAngle(shldr, elbow, wrist);
        const torsoLean = findAngle(shldr, { x: hip.x, y: 0 }, hip);

        // ── Draw ──
        drawAngleArc(ctx, elbow, 25, -90, -90 + multiplier * elbowAngle, COLORS.cyan);
        drawDottedLine(ctx, hip, hip.y - 80, hip.y + 20, COLORS.blue);
        drawAngleArc(ctx, hip, 30, -90, -90 + multiplier * torsoLean, COLORS.white);
        drawSkeleton(ctx, side, COLORS.cyan);

        // ── State machine ──
        const currentState = this.getState(elbowAngle);
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
            this.leanDetected = false;
        } else {
            // Back lean check
            if (torsoLean > this.thresholds.BACK_LEAN_THRESH[1]) {
                this.displayText[0] = true;
                this.incorrectPosture = true;
                this.leanDetected = true;
            }
            // Incomplete lockout (at top but elbow not fully extended)
            if (currentState === "s3" && elbowAngle < this.thresholds.ELBOW_ANGLE.PASS[1] - 10) {
                this.displayText[1] = true;
            }
        }

        if (this.leanDetected) {
            feedback.push("LEAN DETECTED — brace core");
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

        drawLabel(ctx, `${Math.round(elbowAngle)}°`, { x: elbow.x + 10, y: elbow.y }, "rgba(0,0,0,0.6)", COLORS.cyan, 13);
        drawLabel(ctx, `${Math.round(torsoLean)}°`, { x: hip.x + 10, y: hip.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

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
            kneeAngle: elbowAngle,
            hipAngle: torsoLean,
            ankleAngle: 0,
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
