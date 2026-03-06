/**
 * pullupProcessor.ts
 * 
 * AI form analysis for pull-ups (front-facing camera).
 * Tracks elbow angle and chin-to-bar (shoulder/wrist) height 
 * to detect up/down phases.
 * Checks: full extension, chin above bar, body swing.
 */

import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
    type ExerciseStats, type IExerciseProcessor,
    LANDMARKS, COLORS,
    findJointAngle, getLandmarkCoord,
    drawLine, drawCircle, drawLabel,
    getAccuracy, defaultStats,
} from "./poseUtils";

// ─── Thresholds ──────────────────────────────────────────────────────

export interface PullupThresholds {
    ELBOW_ANGLE: { UP: [number, number]; TRANS: [number, number]; DOWN: [number, number] };
    BODY_SWING_THRESH: number; // max horizontal offset between shoulders and hips
    INACTIVE_THRESH: number;
    CNT_FRAME_THRESH: number;
}

export function getPullupBeginner(): PullupThresholds {
    return {
        ELBOW_ANGLE: { UP: [20, 110], TRANS: [60, 155], DOWN: [110, 180] },
        BODY_SWING_THRESH: 90,
        INACTIVE_THRESH: 20,
        CNT_FRAME_THRESH: 120,
    };
}

export function getPullupPro(): PullupThresholds {
    return {
        ELBOW_ANGLE: { UP: [25, 75], TRANS: [80, 125], DOWN: [130, 180] },
        BODY_SWING_THRESH: 35,
        INACTIVE_THRESH: 15,
        CNT_FRAME_THRESH: 50,
    };
}

// ─── Processor ───────────────────────────────────────────────────────

export class PullupProcessor implements IExerciseProcessor {
    private thresholds: PullupThresholds;
    private correctCount = 0;
    private incorrectCount = 0;
    private stateSeq: string[] = [];
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;
    private displayText = [false, false]; // 0=not full extension, 1=swinging
    private countFrames = [0, 0];
    private startInactiveTime = performance.now();
    private inactiveTime = 0;

    constructor(thresholds: PullupThresholds) {
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

        // Get both sides (front view — use both arms)
        const lShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, w, h);
        const lElbow = getLandmarkCoord(landmarks, LANDMARKS.left.elbow, w, h);
        const lWrist = getLandmarkCoord(landmarks, LANDMARKS.left.wrist, w, h);
        const lHip = getLandmarkCoord(landmarks, LANDMARKS.left.hip, w, h);
        const lKnee = getLandmarkCoord(landmarks, LANDMARKS.left.knee, w, h);

        const rShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, w, h);
        const rElbow = getLandmarkCoord(landmarks, LANDMARKS.right.elbow, w, h);
        const rWrist = getLandmarkCoord(landmarks, LANDMARKS.right.wrist, w, h);
        const rHip = getLandmarkCoord(landmarks, LANDMARKS.right.hip, w, h);
        const rKnee = getLandmarkCoord(landmarks, LANDMARKS.right.knee, w, h);

        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, w, h);

        // Draw skeleton (both sides for front view)
        // Left side
        drawLine(ctx, lShldr, lElbow, COLORS.lightBlue, 4);
        drawLine(ctx, lElbow, lWrist, COLORS.lightBlue, 4);
        drawLine(ctx, lShldr, lHip, COLORS.lightBlue, 4);
        drawLine(ctx, lHip, lKnee, COLORS.lightBlue, 4);
        // Right side
        drawLine(ctx, rShldr, rElbow, COLORS.cyan, 4);
        drawLine(ctx, rElbow, rWrist, COLORS.cyan, 4);
        drawLine(ctx, rShldr, rHip, COLORS.cyan, 4);
        drawLine(ctx, rHip, rKnee, COLORS.cyan, 4);
        // Across
        drawLine(ctx, lShldr, rShldr, COLORS.lightBlue, 3);
        drawLine(ctx, lHip, rHip, COLORS.lightBlue, 3);

        // Joints
        [lShldr, lElbow, lWrist, lHip, rShldr, rElbow, rWrist, rHip, nose].forEach((pt) =>
            drawCircle(ctx, pt, 6, COLORS.yellow)
        );

        // Average elbow angles from both arms
        const lElbowAngle = findJointAngle(lShldr, lElbow, lWrist);
        const rElbowAngle = findJointAngle(rShldr, rElbow, rWrist);
        const avgElbowAngle = (lElbowAngle + rElbowAngle) / 2;

        // Draw labels
        drawLabel(ctx, `${Math.round(lElbowAngle)}°`, { x: lElbow.x - 50, y: lElbow.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, `${Math.round(rElbowAngle)}°`, { x: rElbow.x + 15, y: rElbow.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

        // Body swing check (horizontal offset between avg shoulder and avg hip)
        const avgShldrX = (lShldr.x + rShldr.x) / 2;
        const avgHipX = (lHip.x + rHip.x) / 2;
        const swing = Math.abs(avgShldrX - avgHipX);

        if (swing > this.thresholds.BODY_SWING_THRESH) {
            this.displayText[1] = true;
            this.incorrectPosture = true;
        }

        // State machine
        const state = this.getState(avgElbowAngle);
        this.currState = state;

        // Rep counting: down → up = 1 rep
        if (state === "up") {
            if (!this.stateSeq.includes("up")) {
                this.stateSeq.push("up");
            }
        }

        if (state === "down") {
            if (this.stateSeq.includes("up") && !this.incorrectPosture) {
                this.correctCount++;
            } else if (this.stateSeq.includes("up") && this.incorrectPosture) {
                this.incorrectCount++;
            }
            this.stateSeq = [];
            this.incorrectPosture = false;
        }

        // Feedback
        for (let i = 0; i < 2; i++) {
            if (this.displayText[i]) this.countFrames[i]++;
        }
        if (this.countFrames[0] > 0 && this.countFrames[0] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("EXTEND ARMS FULLY");
        }
        if (this.countFrames[1] > 0 && this.countFrames[1] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("STOP SWINGING — keep body still");
        }
        for (let i = 0; i < 2; i++) {
            if (this.countFrames[i] > this.thresholds.CNT_FRAME_THRESH) {
                this.displayText[i] = false;
                this.countFrames[i] = 0;
            }
        }

        // State label
        if (state === "up") feedback.push("CHIN ABOVE BAR ✓");

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
            offsetAngle: 0,
            lowerHips: false,
            kneeAngle: avgElbowAngle,
            hipAngle: 0,
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
