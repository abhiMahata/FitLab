/**
 * benchProcessor.ts
 * 
 * Real-time bench press form analysis using MediaPipe landmarks.
 * Tracks elbow joint angle for rep counting, bar path, and lockout quality.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { BenchThresholds } from "./thresholds";
import {
    type ExerciseStats, type IExerciseProcessor, type FeedbackEntry,
    LANDMARKS, COLORS, findAngle, findJointAngle, getLandmarkCoord, getCloserSide,
    drawSkeleton, drawAngleArc, drawLabel, drawCircle,
    getAccuracy, defaultStats,
} from "./poseUtils";

const FEEDBACK_MAP: Record<number, FeedbackEntry> = {
    0: ["PARTIAL REP — go deeper", "rgba(255, 80, 80, 0.9)"],
    1: ["LOCKOUT INCOMPLETE", "rgba(255, 165, 0, 0.9)"],
    2: ["BAR PATH DRIFTING", "rgba(0, 153, 255, 0.9)"],
    3: ["CONTROL THE DESCENT", "rgba(255, 165, 0, 0.9)"],
};

export class BenchPressProcessor implements IExerciseProcessor {
    private thresholds: BenchThresholds;
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
    private prevElbowAngle = 0;
    public repCount = 0;
    public improperRep = 0;

    constructor(thresholds: BenchThresholds) {
        this.thresholds = thresholds;
    }

    setThresholds(thresholds: BenchThresholds) {
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
        this.prevState = null; this.currState = null;
        this.prevElbowAngle = 0;
        this.repCount = 0; this.improperRep = 0;
    }

    private getState(elbowAngle: number): string | null {
        const t = this.thresholds.ELBOW_ANGLE;
        if (elbowAngle >= t.NORMAL[0] && elbowAngle <= t.NORMAL[1]) return "s1"; // lockout
        if (elbowAngle >= t.TRANS[0] && elbowAngle <= t.TRANS[1]) return "s2";   // transition
        if (elbowAngle >= t.PASS[0] && elbowAngle <= t.PASS[1]) return "s3";     // bottom
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
            feedback.push("CAMERA NOT ALIGNED — position from side");
            this.prevState = null; this.currState = null;
            return { ...defaultStats(this.repCount, this.improperRep, feedback), offsetAngle };
        }

        this.inactiveTimeFront = 0;
        this.startInactiveTimeFront = performance.now();
        const side = getCloserSide(landmarks, canvasWidth, canvasHeight);
        const { shldr, elbow, wrist, hip, multiplier } = side;

        // ── Key angle: elbow joint angle ──
        const elbowAngle = findJointAngle(shldr, elbow, wrist);
        const hipVertAngle = findAngle(shldr, { x: hip.x, y: 0 }, hip);

        // ── Draw ──
        drawAngleArc(ctx, elbow, 25, -90, -90 + multiplier * elbowAngle, COLORS.cyan);
        drawSkeleton(ctx, side, COLORS.purple);

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
        } else {
            // Partial rep: in transition but never reaching bottom
            if (currentState === "s2" && this.stateSeq.length === 1 && !this.stateSeq.includes("s3")) {
                // Detect if angles are going back up without touching bottom
                if (elbowAngle > this.prevElbowAngle + 5 && this.prevElbowAngle > 0) {
                    this.displayText[0] = true;
                }
            }
            // Bar path drift
            const barDrift = Math.abs(wrist.x - shldr.x);
            if (barDrift > this.thresholds.BAR_PATH_THRESH && this.stateSeq.length > 0) {
                this.displayText[2] = true;
                this.incorrectPosture = true;
            }
        }

        this.prevElbowAngle = elbowAngle;

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
            hipAngle: hipVertAngle,
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
