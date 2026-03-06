/**
 * joggingProcessor.ts
 * 
 * AI form analysis for spot jogging (front-facing camera).
 * Counts alternating knee lifts (left/right) as "steps".
 * Checks: knee lift height, arm movement, posture.
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

export interface JoggingThresholds {
    KNEE_LIFT_ANGLE: number;     // knee angle (hip-knee-ankle) threshold for a "lifted" knee
    MIN_LIFT_Y_RATIO: number;    // knee must be above this % of hip-ankle distance
    POSTURE_LEAN_THRESH: number; // max forward/backward lean
    INACTIVE_THRESH: number;
    CNT_FRAME_THRESH: number;
}

export function getJoggingBeginner(): JoggingThresholds {
    return {
        KNEE_LIFT_ANGLE: 160,
        MIN_LIFT_Y_RATIO: 0.08,
        POSTURE_LEAN_THRESH: 60,
        INACTIVE_THRESH: 20,
        CNT_FRAME_THRESH: 120,
    };
}

export function getJoggingPro(): JoggingThresholds {
    return {
        KNEE_LIFT_ANGLE: 110,
        MIN_LIFT_Y_RATIO: 0.35,
        POSTURE_LEAN_THRESH: 20,
        INACTIVE_THRESH: 10,
        CNT_FRAME_THRESH: 40,
    };
}

// ─── Processor ───────────────────────────────────────────────────────

export class JoggingProcessor implements IExerciseProcessor {
    private thresholds: JoggingThresholds;
    private correctCount = 0;   // good steps
    private incorrectCount = 0; // low-lift steps
    private lastLifted: "left" | "right" | null = null;
    private leftDown = true;
    private rightDown = true;
    private prevState: string | null = null;
    private displayText = [false, false]; // 0=lift knees higher, 1=lean warning
    private countFrames = [0, 0];
    private startInactiveTime = performance.now();
    private inactiveTime = 0;

    constructor(thresholds: JoggingThresholds) {
        this.thresholds = thresholds;
    }

    reset() {
        this.correctCount = 0;
        this.incorrectCount = 0;
        this.lastLifted = null;
        this.leftDown = true;
        this.rightDown = true;
        this.prevState = null;
        this.displayText = [false, false];
        this.countFrames = [0, 0];
        this.startInactiveTime = performance.now();
        this.inactiveTime = 0;
    }

    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number
    ): ExerciseStats {
        const feedback: string[] = [];

        // Get both sides (front view)
        const lShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, w, h);
        const lElbow = getLandmarkCoord(landmarks, LANDMARKS.left.elbow, w, h);
        const lHip = getLandmarkCoord(landmarks, LANDMARKS.left.hip, w, h);
        const lKnee = getLandmarkCoord(landmarks, LANDMARKS.left.knee, w, h);
        const lAnkle = getLandmarkCoord(landmarks, LANDMARKS.left.ankle, w, h);

        const rShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, w, h);
        const rElbow = getLandmarkCoord(landmarks, LANDMARKS.right.elbow, w, h);
        const rHip = getLandmarkCoord(landmarks, LANDMARKS.right.hip, w, h);
        const rKnee = getLandmarkCoord(landmarks, LANDMARKS.right.knee, w, h);
        const rAnkle = getLandmarkCoord(landmarks, LANDMARKS.right.ankle, w, h);

        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, w, h);

        // Draw skeleton (both sides)
        drawLine(ctx, lShldr, lElbow, COLORS.lightBlue, 4);
        drawLine(ctx, lShldr, lHip, COLORS.lightBlue, 4);
        drawLine(ctx, lHip, lKnee, COLORS.lightBlue, 4);
        drawLine(ctx, lKnee, lAnkle, COLORS.lightBlue, 4);

        drawLine(ctx, rShldr, rElbow, COLORS.cyan, 4);
        drawLine(ctx, rShldr, rHip, COLORS.cyan, 4);
        drawLine(ctx, rHip, rKnee, COLORS.cyan, 4);
        drawLine(ctx, rKnee, rAnkle, COLORS.cyan, 4);

        drawLine(ctx, lShldr, rShldr, COLORS.lightBlue, 3);
        drawLine(ctx, lHip, rHip, COLORS.lightBlue, 3);

        [lShldr, lElbow, lHip, lKnee, lAnkle, rShldr, rElbow, rHip, rKnee, rAnkle, nose].forEach((pt) =>
            drawCircle(ctx, pt, 5, COLORS.yellow)
        );

        // Knee angles (hip-knee-ankle) — smaller angle = more lifted
        const lKneeAngle = findJointAngle(lHip, lKnee, lAnkle);
        const rKneeAngle = findJointAngle(rHip, rKnee, rAnkle);

        // Y-ratio: how high is the knee lifted relative to hip-ankle distance
        const lLiftRatio = (lAnkle.y - lKnee.y) / Math.max(1, lAnkle.y - lHip.y);
        const rLiftRatio = (rAnkle.y - rKnee.y) / Math.max(1, rAnkle.y - rHip.y);

        // Draw knee angle labels
        drawLabel(ctx, `${Math.round(lKneeAngle)}°`, { x: lKnee.x - 50, y: lKnee.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, `${Math.round(rKneeAngle)}°`, { x: rKnee.x + 15, y: rKnee.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

        // Posture check — lean angle (nose to midpoint of hips)
        const midHipX = (lHip.x + rHip.x) / 2;
        const midHipY = (lHip.y + rHip.y) / 2;
        const lean = Math.abs(nose.x - midHipX);
        if (lean > this.thresholds.POSTURE_LEAN_THRESH * 2) {
            this.displayText[1] = true;
        }

        // Draw posture line
        const postureColor = lean <= this.thresholds.POSTURE_LEAN_THRESH * 2 ? COLORS.green : COLORS.red;
        drawLine(ctx, nose, { x: midHipX, y: midHipY }, postureColor, 2);

        // ─── Knee lift detection (alternating) ────────────────────────────

        const lLifted = lKneeAngle < this.thresholds.KNEE_LIFT_ANGLE;
        const rLifted = rKneeAngle < this.thresholds.KNEE_LIFT_ANGLE;

        let currentState = "idle";

        // Left knee lift
        if (lLifted && this.leftDown && this.lastLifted !== "left") {
            this.leftDown = false;
            this.lastLifted = "left";
            currentState = "left_up";

            if (lLiftRatio >= this.thresholds.MIN_LIFT_Y_RATIO) {
                this.correctCount++;
            } else {
                this.incorrectCount++;
                this.displayText[0] = true;
            }
        }
        if (!lLifted) {
            this.leftDown = true;
        }

        // Right knee lift
        if (rLifted && this.rightDown && this.lastLifted !== "right") {
            this.rightDown = false;
            this.lastLifted = "right";
            currentState = "right_up";

            if (rLiftRatio >= this.thresholds.MIN_LIFT_Y_RATIO) {
                this.correctCount++;
            } else {
                this.incorrectCount++;
                this.displayText[0] = true;
            }
        }
        if (!rLifted) {
            this.rightDown = true;
        }

        // Highlight active knee
        if (lLifted) drawCircle(ctx, lKnee, 12, COLORS.primary);
        if (rLifted) drawCircle(ctx, rKnee, 12, COLORS.primary);

        // Feedback
        for (let i = 0; i < 2; i++) {
            if (this.displayText[i]) this.countFrames[i]++;
        }
        if (this.countFrames[0] > 0 && this.countFrames[0] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("LIFT KNEES HIGHER");
        }
        if (this.countFrames[1] > 0 && this.countFrames[1] <= this.thresholds.CNT_FRAME_THRESH) {
            feedback.push("STAY UPRIGHT — don't lean");
        }
        for (let i = 0; i < 2; i++) {
            if (this.countFrames[i] > this.thresholds.CNT_FRAME_THRESH) {
                this.displayText[i] = false;
                this.countFrames[i] = 0;
            }
        }

        // Step count display
        feedback.push(`Steps: ${this.correctCount + this.incorrectCount}`);

        // Inactivity
        if (currentState === this.prevState) {
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
        this.prevState = currentState;

        return {
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            formAccuracy: getAccuracy(this.correctCount, this.incorrectCount),
            currentFeedback: feedback,
            isAligned: true,
            offsetAngle: 0,
            lowerHips: false,
            kneeAngle: (lKneeAngle + rKneeAngle) / 2,
            hipAngle: 0,
            ankleAngle: 0,
            currentState,
        };
    }

    processNoPose(): ExerciseStats {
        return {
            ...defaultStats(this.correctCount, this.incorrectCount, ["No pose detected — step into frame"]),
        };
    }
}
