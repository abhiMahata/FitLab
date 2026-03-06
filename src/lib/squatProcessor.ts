/**
 * squatProcessor.ts
 * 
 * JavaScript port of process_frame.py + utils.py
 * Handles squat form analysis: angle calculation, state tracking,
 * rep counting, and form feedback — all running in the browser.
 */

import type { Thresholds } from "./thresholds";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

// ─── Landmark Indices (MediaPipe Pose) ───────────────────────────────
const LANDMARKS = {
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
const COLORS = {
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
};

// ─── Types ────────────────────────────────────────────────────────────
export interface SquatStats {
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

interface Point {
    x: number;
    y: number;
}

type FeedbackEntry = [string, string]; // [message, color]

const FEEDBACK_MAP: Record<number, FeedbackEntry> = {
    0: ["BEND BACKWARDS", "rgba(0, 153, 255, 0.9)"],
    1: ["BEND FORWARD", "rgba(0, 153, 255, 0.9)"],
    2: ["KNEE FALLING OVER TOE", "rgba(255, 80, 80, 0.9)"],
    3: ["SQUAT TOO DEEP", "rgba(255, 80, 80, 0.9)"],
};

// ─── Math Utilities ───────────────────────────────────────────────────

function findAngle(p1: Point, p2: Point, refPt: Point = { x: 0, y: 0 }): number {
    const p1Ref = { x: p1.x - refPt.x, y: p1.y - refPt.y };
    const p2Ref = { x: p2.x - refPt.x, y: p2.y - refPt.y };

    const dot = p1Ref.x * p2Ref.x + p1Ref.y * p2Ref.y;
    const mag1 = Math.sqrt(p1Ref.x ** 2 + p1Ref.y ** 2);
    const mag2 = Math.sqrt(p2Ref.x ** 2 + p2Ref.y ** 2);

    const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const theta = Math.acos(cosTheta);

    return Math.floor((180 / Math.PI) * theta);
}

function getLandmarkCoord(
    landmarks: NormalizedLandmark[],
    index: number,
    width: number,
    height: number
): Point {
    const lm = landmarks[index];
    return {
        x: Math.round(lm.x * width),
        y: Math.round(lm.y * height),
    };
}

// ─── Canvas Drawing Utilities ─────────────────────────────────────────

function drawLine(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width = 3) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
}

function drawCircle(ctx: CanvasRenderingContext2D, p: Point, radius: number, color: string) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawDottedLine(ctx: CanvasRenderingContext2D, p: Point, startY: number, endY: number, color: string) {
    ctx.fillStyle = color;
    for (let i = startY; i <= endY; i += 8) {
        ctx.beginPath();
        ctx.arc(p.x, i, 2, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function drawAngleArc(
    ctx: CanvasRenderingContext2D,
    center: Point,
    radius: number,
    startDeg: number,
    endDeg: number,
    color: string
) {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, startRad, endRad);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawLabel(
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

    // Background pill
    const rx = pos.x - padding;
    const ry = pos.y - fontSize - padding + 2;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(rx, ry, width, height, 6);
    ctx.fill();

    // Text
    ctx.fillStyle = textColor;
    ctx.fillText(text, pos.x, pos.y);
}

// ─── Squat Processor Class ────────────────────────────────────────────

export class SquatProcessor {
    private thresholds: Thresholds;
    private stateSeq: string[] = [];
    private startInactiveTime = performance.now();
    private startInactiveTimeFront = performance.now();
    private inactiveTime = 0;
    private inactiveTimeFront = 0;
    private displayText = [false, false, false, false];
    private countFrames = [0, 0, 0, 0];
    private lowerHips = false;
    private incorrectPosture = false;
    private prevState: string | null = null;
    private currState: string | null = null;

    public squatCount = 0;
    public improperSquat = 0;

    constructor(thresholds: Thresholds) {
        this.thresholds = thresholds;
    }

    setThresholds(thresholds: Thresholds) {
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
        this.lowerHips = false;
        this.incorrectPosture = false;
        this.prevState = null;
        this.currState = null;
        this.squatCount = 0;
        this.improperSquat = 0;
    }

    private getState(kneeAngle: number): string | null {
        const t = this.thresholds.HIP_KNEE_VERT;
        if (kneeAngle >= t.NORMAL[0] && kneeAngle <= t.NORMAL[1]) return "s1";
        if (kneeAngle >= t.TRANS[0] && kneeAngle <= t.TRANS[1]) return "s2";
        if (kneeAngle >= t.PASS[0] && kneeAngle <= t.PASS[1]) return "s3";
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

    /**
     * Process a frame of landmarks and draw overlays on the canvas.
     * Returns live stats for the UI.
     */
    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): SquatStats {
        const feedback: string[] = [];

        // Extract key landmarks
        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, canvasWidth, canvasHeight);
        const leftShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, canvasWidth, canvasHeight);
        const leftElbow = getLandmarkCoord(landmarks, LANDMARKS.left.elbow, canvasWidth, canvasHeight);
        const leftWrist = getLandmarkCoord(landmarks, LANDMARKS.left.wrist, canvasWidth, canvasHeight);
        const leftHip = getLandmarkCoord(landmarks, LANDMARKS.left.hip, canvasWidth, canvasHeight);
        const leftKnee = getLandmarkCoord(landmarks, LANDMARKS.left.knee, canvasWidth, canvasHeight);
        const leftAnkle = getLandmarkCoord(landmarks, LANDMARKS.left.ankle, canvasWidth, canvasHeight);
        const leftFoot = getLandmarkCoord(landmarks, LANDMARKS.left.foot, canvasWidth, canvasHeight);

        const rightShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, canvasWidth, canvasHeight);
        const rightElbow = getLandmarkCoord(landmarks, LANDMARKS.right.elbow, canvasWidth, canvasHeight);
        const rightWrist = getLandmarkCoord(landmarks, LANDMARKS.right.wrist, canvasWidth, canvasHeight);
        const rightHip = getLandmarkCoord(landmarks, LANDMARKS.right.hip, canvasWidth, canvasHeight);
        const rightKnee = getLandmarkCoord(landmarks, LANDMARKS.right.knee, canvasWidth, canvasHeight);
        const rightAnkle = getLandmarkCoord(landmarks, LANDMARKS.right.ankle, canvasWidth, canvasHeight);
        const rightFoot = getLandmarkCoord(landmarks, LANDMARKS.right.foot, canvasWidth, canvasHeight);

        // Check camera alignment via shoulder offset angle
        const offsetAngle = findAngle(leftShldr, rightShldr, nose);

        let kneeVertAngle = 0;
        let hipVertAngle = 0;
        let ankleVertAngle = 0;

        if (offsetAngle > this.thresholds.OFFSET_THRESH) {
            // Camera NOT aligned — facing camera head-on
            const endTime = performance.now();
            this.inactiveTimeFront += (endTime - this.startInactiveTimeFront) / 1000;
            this.startInactiveTimeFront = endTime;

            if (this.inactiveTimeFront >= this.thresholds.INACTIVE_THRESH) {
                this.squatCount = 0;
                this.improperSquat = 0;
                this.inactiveTimeFront = 0;
                this.startInactiveTimeFront = performance.now();
            }

            // Draw nose and shoulders only
            drawCircle(ctx, nose, 7, COLORS.white);
            drawCircle(ctx, leftShldr, 7, COLORS.yellow);
            drawCircle(ctx, rightShldr, 7, COLORS.magenta);

            feedback.push("CAMERA NOT ALIGNED — stand sideways");

            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
            this.prevState = null;
            this.currState = null;

            return {
                correctCount: this.squatCount,
                incorrectCount: this.improperSquat,
                formAccuracy: this.getAccuracy(),
                currentFeedback: feedback,
                isAligned: false,
                offsetAngle,
                lowerHips: false,
                kneeAngle: 0,
                hipAngle: 0,
                ankleAngle: 0,
                currentState: null,
            };
        }

        // ── Camera is aligned (side view) ──────────────────────────────

        this.inactiveTimeFront = 0;
        this.startInactiveTimeFront = performance.now();

        // Determine which side is closer to camera
        const distLeft = Math.abs(leftFoot.y - leftShldr.y);
        const distRight = Math.abs(rightFoot.y - rightShldr.y);

        let shldr: Point, elbow: Point, wrist: Point, hip: Point, knee: Point, ankle: Point, foot: Point;
        let multiplier: number;

        if (distLeft > distRight) {
            shldr = leftShldr; elbow = leftElbow; wrist = leftWrist;
            hip = leftHip; knee = leftKnee; ankle = leftAnkle; foot = leftFoot;
            multiplier = -1;
        } else {
            shldr = rightShldr; elbow = rightElbow; wrist = rightWrist;
            hip = rightHip; knee = rightKnee; ankle = rightAnkle; foot = rightFoot;
            multiplier = 1;
        }

        // ── Calculate vertical angles ──────────────────────────────────

        hipVertAngle = findAngle(shldr, { x: hip.x, y: 0 }, hip);
        kneeVertAngle = findAngle(hip, { x: knee.x, y: 0 }, knee);
        ankleVertAngle = findAngle(knee, { x: ankle.x, y: 0 }, ankle);

        // ── Draw angle arcs and dotted guidelines ──────────────────────

        drawAngleArc(ctx, hip, 30, -90, -90 + multiplier * hipVertAngle, COLORS.white);
        drawDottedLine(ctx, hip, hip.y - 80, hip.y + 20, COLORS.blue);

        drawAngleArc(ctx, knee, 20, -90, -90 - multiplier * kneeVertAngle, COLORS.white);
        drawDottedLine(ctx, knee, knee.y - 50, knee.y + 20, COLORS.blue);

        drawAngleArc(ctx, ankle, 30, -90, -90 + multiplier * ankleVertAngle, COLORS.white);
        drawDottedLine(ctx, ankle, ankle.y - 50, ankle.y + 20, COLORS.blue);

        // ── Draw skeleton (limbs) ──────────────────────────────────────

        drawLine(ctx, shldr, elbow, COLORS.lightBlue, 4);
        drawLine(ctx, elbow, wrist, COLORS.lightBlue, 4);
        drawLine(ctx, shldr, hip, COLORS.lightBlue, 4);
        drawLine(ctx, hip, knee, COLORS.lightBlue, 4);
        drawLine(ctx, knee, ankle, COLORS.lightBlue, 4);
        drawLine(ctx, ankle, foot, COLORS.lightBlue, 4);

        // ── Draw joints ────────────────────────────────────────────────

        [shldr, elbow, wrist, hip, knee, ankle, foot].forEach((pt) => {
            drawCircle(ctx, pt, 7, COLORS.yellow);
        });

        // ── State machine ──────────────────────────────────────────────

        const currentState = this.getState(kneeVertAngle);
        this.currState = currentState;
        this.updateStateSequence(currentState);

        // ── Count reps ─────────────────────────────────────────────────

        if (currentState === "s1") {
            if (this.stateSeq.length === 3 && !this.incorrectPosture) {
                this.squatCount++;
            } else if (this.stateSeq.includes("s2") && this.stateSeq.length === 1) {
                this.improperSquat++;
            } else if (this.incorrectPosture) {
                this.improperSquat++;
            }
            this.stateSeq = [];
            this.incorrectPosture = false;
        } else {
            // ── Form feedback ────────────────────────────────────────────

            if (hipVertAngle > this.thresholds.HIP_THRESH[1]) {
                this.displayText[0] = true;
            } else if (hipVertAngle < this.thresholds.HIP_THRESH[0] && this.stateSeq.filter((s) => s === "s2").length === 1) {
                this.displayText[1] = true;
            }

            if (
                kneeVertAngle > this.thresholds.KNEE_THRESH[0] &&
                kneeVertAngle < this.thresholds.KNEE_THRESH[1] &&
                this.stateSeq.filter((s) => s === "s2").length === 1
            ) {
                this.lowerHips = true;
            } else if (kneeVertAngle > this.thresholds.KNEE_THRESH[2]) {
                this.displayText[3] = true;
                this.incorrectPosture = true;
            }

            if (ankleVertAngle > this.thresholds.ANKLE_THRESH) {
                this.displayText[2] = true;
                this.incorrectPosture = true;
            }
        }

        // ── Inactivity detection ───────────────────────────────────────

        if (this.currState === this.prevState) {
            const endTime = performance.now();
            this.inactiveTime += (endTime - this.startInactiveTime) / 1000;
            this.startInactiveTime = endTime;

            if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
                this.squatCount = 0;
                this.improperSquat = 0;
                this.inactiveTime = 0;
                this.startInactiveTime = performance.now();
            }
        } else {
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
        }

        // ── Lower hips feedback ────────────────────────────────────────

        if (this.stateSeq.includes("s3") || currentState === "s1") {
            this.lowerHips = false;
        }

        if (this.lowerHips) {
            feedback.push("LOWER YOUR HIPS");
        }

        // ── Collect active feedback messages ────────────────────────────

        for (let i = 0; i < 4; i++) {
            if (this.displayText[i]) {
                this.countFrames[i]++;
            }
        }

        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > 0 && this.countFrames[i] <= this.thresholds.CNT_FRAME_THRESH) {
                feedback.push(FEEDBACK_MAP[i][0]);
            }
        }

        // ── Draw angle labels next to joints ───────────────────────────

        drawLabel(ctx, String(Math.round(hipVertAngle)), { x: hip.x + 10, y: hip.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(kneeVertAngle)), { x: knee.x + 15, y: knee.y + 10 }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(ankleVertAngle)), { x: ankle.x + 10, y: ankle.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

        // ── Reset counters that exceeded threshold ─────────────────────

        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > this.thresholds.CNT_FRAME_THRESH) {
                this.displayText[i] = false;
                this.countFrames[i] = 0;
            }
        }

        this.prevState = currentState;

        return {
            correctCount: this.squatCount,
            incorrectCount: this.improperSquat,
            formAccuracy: this.getAccuracy(),
            currentFeedback: feedback,
            isAligned: true,
            offsetAngle,
            lowerHips: this.lowerHips,
            kneeAngle: kneeVertAngle,
            hipAngle: hipVertAngle,
            ankleAngle: ankleVertAngle,
            currentState,
        };
    }

    /**
     * Process when no pose is detected — returns default stats.
     */
    processNoPose(): SquatStats {
        const endTime = performance.now();
        this.inactiveTime += (endTime - this.startInactiveTime) / 1000;

        if (this.inactiveTime >= this.thresholds.INACTIVE_THRESH) {
            this.squatCount = 0;
            this.improperSquat = 0;
            this.inactiveTime = 0;
        }

        this.startInactiveTime = endTime;
        this.prevState = null;
        this.currState = null;
        this.displayText = [false, false, false, false];
        this.countFrames = [0, 0, 0, 0];

        return {
            correctCount: this.squatCount,
            incorrectCount: this.improperSquat,
            formAccuracy: this.getAccuracy(),
            currentFeedback: ["No pose detected — step into frame"],
            isAligned: false,
            offsetAngle: 0,
            lowerHips: false,
            kneeAngle: 0,
            hipAngle: 0,
            ankleAngle: 0,
            currentState: null,
        };
    }

    private getAccuracy(): number {
        const total = this.squatCount + this.improperSquat;
        if (total === 0) return 100;
        return Math.round((this.squatCount / total) * 100);
    }
}
