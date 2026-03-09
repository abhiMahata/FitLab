/**
 * squatProcessor.ts
 * 
 * Squat form analysis supporting SIDE VIEW and FRONT VIEW.
 * Side view: hip hinge, knee tracking, squat depth via vertical angles.
 * Front view: knee valgus, hip shift, shoulder balance, depth via Y-ratio.
 */

import type { Thresholds, FrontViewThresholds } from "./thresholds";
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
    orange: "rgba(255, 165, 0, 1)",
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

type FeedbackEntry = [string, string];

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
    return Math.floor((180 / Math.PI) * Math.acos(cosTheta));
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
    const rx = pos.x - padding;
    const ry = pos.y - fontSize - padding + 2;
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(rx, ry, width, height, 6);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.fillText(text, pos.x, pos.y);
}

/** Draw a dashed horizontal line for symmetry guides */
function drawHorizontalGuide(ctx: CanvasRenderingContext2D, y: number, x1: number, x2: number, color: string) {
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
}

/** Draw a dashed vertical line for alignment guides */
function drawVerticalGuide(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number, color: string) {
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
}

// ─── Squat Processor Class ────────────────────────────────────────────

export type CameraView = "side" | "front";

export class SquatProcessor {
    private thresholds: Thresholds;
    private frontThresholds: FrontViewThresholds | null = null;
    private cameraView: CameraView = "side";

    // State machine
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

    // Front-view specific state
    private frontDisplayText = [false, false, false]; // valgus, hipShift, shoulderImbalance
    private frontCountFrames = [0, 0, 0];

    public squatCount = 0;
    public improperSquat = 0;

    constructor(thresholds: Thresholds, frontThresholds?: FrontViewThresholds) {
        this.thresholds = thresholds;
        this.frontThresholds = frontThresholds || null;
    }

    setCameraView(view: CameraView) {
        if (this.cameraView !== view) {
            this.cameraView = view;
            this.resetState();
        }
    }

    getCameraView(): CameraView {
        return this.cameraView;
    }

    setThresholds(thresholds: Thresholds) {
        this.thresholds = thresholds;
        this.reset();
    }

    setFrontThresholds(thresholds: FrontViewThresholds) {
        this.frontThresholds = thresholds;
    }

    reset() {
        this.resetState();
        this.squatCount = 0;
        this.improperSquat = 0;
    }

    private resetState() {
        this.stateSeq = [];
        this.startInactiveTime = performance.now();
        this.startInactiveTimeFront = performance.now();
        this.inactiveTime = 0;
        this.inactiveTimeFront = 0;
        this.displayText = [false, false, false, false];
        this.countFrames = [0, 0, 0, 0];
        this.frontDisplayText = [false, false, false];
        this.frontCountFrames = [0, 0, 0];
        this.lowerHips = false;
        this.incorrectPosture = false;
        this.prevState = null;
        this.currState = null;
    }

    private getState(kneeAngle: number): string | null {
        const t = this.thresholds.HIP_KNEE_VERT;
        if (kneeAngle >= t.NORMAL[0] && kneeAngle <= t.NORMAL[1]) return "s1";
        if (kneeAngle >= t.TRANS[0] && kneeAngle <= t.TRANS[1]) return "s2";
        if (kneeAngle >= t.PASS[0] && kneeAngle <= t.PASS[1]) return "s3";
        return null;
    }

    private getFrontState(depthRatio: number): string | null {
        if (!this.frontThresholds) return null;
        const t = this.frontThresholds.DEPTH_RATIO;
        if (depthRatio >= t.NORMAL[0] && depthRatio <= t.NORMAL[1]) return "s1";
        if (depthRatio >= t.TRANS[0] && depthRatio <= t.TRANS[1]) return "s2";
        if (depthRatio >= t.PASS[0] && depthRatio <= t.PASS[1]) return "s3";
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
     * Main process — routes to side or front view analysis.
     */
    process(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): SquatStats {
        if (this.cameraView === "front" && this.frontThresholds) {
            return this.processFrontView(landmarks, ctx, canvasWidth, canvasHeight);
        }
        return this.processSideView(landmarks, ctx, canvasWidth, canvasHeight);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SIDE VIEW (original logic)
    // ═══════════════════════════════════════════════════════════════════

    private processSideView(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): SquatStats {
        const feedback: string[] = [];

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

        const offsetAngle = findAngle(leftShldr, rightShldr, nose);

        let kneeVertAngle = 0;
        let hipVertAngle = 0;
        let ankleVertAngle = 0;

        if (offsetAngle > this.thresholds.OFFSET_THRESH) {
            const endTime = performance.now();
            this.inactiveTimeFront += (endTime - this.startInactiveTimeFront) / 1000;
            this.startInactiveTimeFront = endTime;

            if (this.inactiveTimeFront >= this.thresholds.INACTIVE_THRESH) {
                this.squatCount = 0;
                this.improperSquat = 0;
                this.inactiveTimeFront = 0;
                this.startInactiveTimeFront = performance.now();
            }

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

        // ── Camera is aligned (side view) ──
        this.inactiveTimeFront = 0;
        this.startInactiveTimeFront = performance.now();

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

        hipVertAngle = findAngle(shldr, { x: hip.x, y: 0 }, hip);
        kneeVertAngle = findAngle(hip, { x: knee.x, y: 0 }, knee);
        ankleVertAngle = findAngle(knee, { x: ankle.x, y: 0 }, ankle);

        drawAngleArc(ctx, hip, 30, -90, -90 + multiplier * hipVertAngle, COLORS.white);
        drawDottedLine(ctx, hip, hip.y - 80, hip.y + 20, COLORS.blue);
        drawAngleArc(ctx, knee, 20, -90, -90 - multiplier * kneeVertAngle, COLORS.white);
        drawDottedLine(ctx, knee, knee.y - 50, knee.y + 20, COLORS.blue);
        drawAngleArc(ctx, ankle, 30, -90, -90 + multiplier * ankleVertAngle, COLORS.white);
        drawDottedLine(ctx, ankle, ankle.y - 50, ankle.y + 20, COLORS.blue);

        drawLine(ctx, shldr, elbow, COLORS.lightBlue, 4);
        drawLine(ctx, elbow, wrist, COLORS.lightBlue, 4);
        drawLine(ctx, shldr, hip, COLORS.lightBlue, 4);
        drawLine(ctx, hip, knee, COLORS.lightBlue, 4);
        drawLine(ctx, knee, ankle, COLORS.lightBlue, 4);
        drawLine(ctx, ankle, foot, COLORS.lightBlue, 4);

        [shldr, elbow, wrist, hip, knee, ankle, foot].forEach((pt) => {
            drawCircle(ctx, pt, 7, COLORS.yellow);
        });

        const currentState = this.getState(kneeVertAngle);
        this.currState = currentState;
        this.updateStateSequence(currentState);

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

        // Inactivity
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

        if (this.stateSeq.includes("s3") || currentState === "s1") {
            this.lowerHips = false;
        }
        if (this.lowerHips) feedback.push("LOWER YOUR HIPS");

        for (let i = 0; i < 4; i++) {
            if (this.displayText[i]) this.countFrames[i]++;
        }
        for (let i = 0; i < 4; i++) {
            if (this.countFrames[i] > 0 && this.countFrames[i] <= this.thresholds.CNT_FRAME_THRESH) {
                feedback.push(FEEDBACK_MAP[i][0]);
            }
        }

        drawLabel(ctx, String(Math.round(hipVertAngle)), { x: hip.x + 10, y: hip.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(kneeVertAngle)), { x: knee.x + 15, y: knee.y + 10 }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);
        drawLabel(ctx, String(Math.round(ankleVertAngle)), { x: ankle.x + 10, y: ankle.y }, "rgba(0,0,0,0.6)", COLORS.lightGreen, 12);

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

    // ═══════════════════════════════════════════════════════════════════
    // FRONT VIEW — symmetry & alignment analysis
    // ═══════════════════════════════════════════════════════════════════

    private processFrontView(
        landmarks: NormalizedLandmark[],
        ctx: CanvasRenderingContext2D,
        canvasWidth: number,
        canvasHeight: number
    ): SquatStats {
        const ft = this.frontThresholds!;
        const feedback: string[] = [];

        // Extract ALL landmarks (both sides visible in front view)
        const nose = getLandmarkCoord(landmarks, LANDMARKS.nose, canvasWidth, canvasHeight);

        const lShldr = getLandmarkCoord(landmarks, LANDMARKS.left.shoulder, canvasWidth, canvasHeight);
        const rShldr = getLandmarkCoord(landmarks, LANDMARKS.right.shoulder, canvasWidth, canvasHeight);
        const lElbow = getLandmarkCoord(landmarks, LANDMARKS.left.elbow, canvasWidth, canvasHeight);
        const rElbow = getLandmarkCoord(landmarks, LANDMARKS.right.elbow, canvasWidth, canvasHeight);
        const lWrist = getLandmarkCoord(landmarks, LANDMARKS.left.wrist, canvasWidth, canvasHeight);
        const rWrist = getLandmarkCoord(landmarks, LANDMARKS.right.wrist, canvasWidth, canvasHeight);
        const lHip = getLandmarkCoord(landmarks, LANDMARKS.left.hip, canvasWidth, canvasHeight);
        const rHip = getLandmarkCoord(landmarks, LANDMARKS.right.hip, canvasWidth, canvasHeight);
        const lKnee = getLandmarkCoord(landmarks, LANDMARKS.left.knee, canvasWidth, canvasHeight);
        const rKnee = getLandmarkCoord(landmarks, LANDMARKS.right.knee, canvasWidth, canvasHeight);
        const lAnkle = getLandmarkCoord(landmarks, LANDMARKS.left.ankle, canvasWidth, canvasHeight);
        const rAnkle = getLandmarkCoord(landmarks, LANDMARKS.right.ankle, canvasWidth, canvasHeight);
        const lFoot = getLandmarkCoord(landmarks, LANDMARKS.left.foot, canvasWidth, canvasHeight);
        const rFoot = getLandmarkCoord(landmarks, LANDMARKS.right.foot, canvasWidth, canvasHeight);

        // ── Check if user is actually facing camera ──
        const offsetAngle = findAngle(lShldr, rShldr, nose);
        if (offsetAngle < ft.MIN_OFFSET) {
            // Not facing camera — show hint
            drawCircle(ctx, nose, 7, COLORS.white);
            drawCircle(ctx, lShldr, 7, COLORS.yellow);
            drawCircle(ctx, rShldr, 7, COLORS.magenta);
            feedback.push("FACE THE CAMERA for front-view analysis");

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

        // ── Draw full-body skeleton (both sides) ──
        // Left side (green-tinted)
        const leftLimbColor = "rgba(74, 222, 128, 0.9)";
        drawLine(ctx, lShldr, lElbow, leftLimbColor, 3);
        drawLine(ctx, lElbow, lWrist, leftLimbColor, 3);
        drawLine(ctx, lShldr, lHip, leftLimbColor, 3);
        drawLine(ctx, lHip, lKnee, leftLimbColor, 3);
        drawLine(ctx, lKnee, lAnkle, leftLimbColor, 3);
        drawLine(ctx, lAnkle, lFoot, leftLimbColor, 3);

        // Right side (blue-tinted)
        const rightLimbColor = "rgba(102, 204, 255, 0.9)";
        drawLine(ctx, rShldr, rElbow, rightLimbColor, 3);
        drawLine(ctx, rElbow, rWrist, rightLimbColor, 3);
        drawLine(ctx, rShldr, rHip, rightLimbColor, 3);
        drawLine(ctx, rHip, rKnee, rightLimbColor, 3);
        drawLine(ctx, rKnee, rAnkle, rightLimbColor, 3);
        drawLine(ctx, rAnkle, rFoot, rightLimbColor, 3);

        // Cross-body connections
        drawLine(ctx, lShldr, rShldr, COLORS.white, 2);
        drawLine(ctx, lHip, rHip, COLORS.white, 2);

        // Joints
        const allJoints = [nose, lShldr, rShldr, lElbow, rElbow, lWrist, rWrist,
            lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lFoot, rFoot];
        allJoints.forEach((pt) => drawCircle(ctx, pt, 5, COLORS.yellow));

        // ── Calculate metrics ──

        // 1. Knee valgus: compare knee separation vs ankle separation
        const kneeWidth = Math.abs(lKnee.x - rKnee.x);
        const ankleWidth = Math.abs(lAnkle.x - rAnkle.x);
        const valgusRatio = ankleWidth > 0 ? kneeWidth / ankleWidth : 1;

        // 2. Hip shift: horizontal distance from midpoint of hips to midpoint of shoulders
        const hipMidX = (lHip.x + rHip.x) / 2;
        const shoulderMidX = (lShldr.x + rShldr.x) / 2;
        const hipShift = Math.abs(hipMidX - shoulderMidX);

        // 3. Shoulder imbalance: Y difference between shoulders
        const shoulderDiff = Math.abs(lShldr.y - rShldr.y);

        // 4. Depth: ratio of (hip drops below standing position)
        // Using: how close hips are to knees vertically
        const hipMidY = (lHip.y + rHip.y) / 2;
        const kneeMidY = (lKnee.y + rKnee.y) / 2;
        const shoulderMidY = (lShldr.y + rShldr.y) / 2;
        // depthRatio: 0 = standing (hips near shoulders), 1 = deep (hips at knee level)
        const standingLen = Math.abs(kneeMidY - shoulderMidY);
        const depthRatio = standingLen > 0 ? Math.max(0, Math.min(1, (hipMidY - shoulderMidY) / standingLen)) : 0;

        // ── Draw analysis guides ──

        // Vertical center line (body alignment)
        const centerX = (shoulderMidX + hipMidX) / 2;
        drawVerticalGuide(ctx, centerX, nose.y - 20, Math.max(lFoot.y, rFoot.y) + 10, "rgba(255,255,255,0.2)");

        // Knee-ankle alignment indicator lines
        const kneeValgusColor = valgusRatio < ft.KNEE_VALGUS_RATIO ? COLORS.red : COLORS.primary;
        drawLine(ctx, lKnee, lAnkle, kneeValgusColor, 2);
        drawLine(ctx, rKnee, rAnkle, kneeValgusColor, 2);

        // Shoulder level guide
        const shoulderImbalanceColor = shoulderDiff > ft.SHOULDER_IMBALANCE_THRESH ? COLORS.orange : "rgba(255,255,255,0.15)";
        drawHorizontalGuide(ctx, (lShldr.y + rShldr.y) / 2, lShldr.x - 20, rShldr.x + 20, shoulderImbalanceColor);

        // Hip level guide
        const hipShiftColor = hipShift > ft.HIP_SHIFT_THRESH ? COLORS.orange : "rgba(255,255,255,0.15)";
        drawHorizontalGuide(ctx, hipMidY, lHip.x - 20, rHip.x + 20, hipShiftColor);

        // ── Draw labels ──
        drawLabel(ctx, `V:${valgusRatio.toFixed(2)}`, { x: (lKnee.x + rKnee.x) / 2 - 15, y: kneeMidY + 25 },
            valgusRatio < ft.KNEE_VALGUS_RATIO ? "rgba(255,50,50,0.8)" : "rgba(0,0,0,0.6)", "#fff", 11);

        drawLabel(ctx, `D:${Math.round(depthRatio * 100)}%`, { x: hipMidX + 30, y: hipMidY },
            "rgba(0,0,0,0.6)", COLORS.lightGreen, 11);

        // ── State machine (based on depth ratio) ──
        const currentState = this.getFrontState(depthRatio);
        this.currState = currentState;
        this.updateStateSequence(currentState);

        // ── Count reps ──
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
            // ── Form checks ──

            // Knee valgus
            if (valgusRatio < ft.KNEE_VALGUS_RATIO) {
                this.frontDisplayText[0] = true;
                this.incorrectPosture = true;
            }

            // Hip shift
            if (hipShift > ft.HIP_SHIFT_THRESH) {
                this.frontDisplayText[1] = true;
                this.incorrectPosture = true;
            }

            // Shoulder imbalance
            if (shoulderDiff > ft.SHOULDER_IMBALANCE_THRESH) {
                this.frontDisplayText[2] = true;
            }
        }

        // ── Inactivity detection ──
        if (this.currState === this.prevState) {
            const endTime = performance.now();
            this.inactiveTime += (endTime - this.startInactiveTime) / 1000;
            this.startInactiveTime = endTime;
            if (this.inactiveTime >= ft.INACTIVE_THRESH) {
                this.squatCount = 0;
                this.improperSquat = 0;
                this.inactiveTime = 0;
                this.startInactiveTime = performance.now();
            }
        } else {
            this.startInactiveTime = performance.now();
            this.inactiveTime = 0;
        }

        // ── Collect feedback ──
        const FRONT_FEEDBACK = [
            "KNEES CAVING IN",
            "HIP SHIFTING TO ONE SIDE",
            "SHOULDERS UNEVEN",
        ];

        for (let i = 0; i < 3; i++) {
            if (this.frontDisplayText[i]) this.frontCountFrames[i]++;
        }
        for (let i = 0; i < 3; i++) {
            if (this.frontCountFrames[i] > 0 && this.frontCountFrames[i] <= ft.CNT_FRAME_THRESH) {
                feedback.push(FRONT_FEEDBACK[i]);
            }
        }
        for (let i = 0; i < 3; i++) {
            if (this.frontCountFrames[i] > ft.CNT_FRAME_THRESH) {
                this.frontDisplayText[i] = false;
                this.frontCountFrames[i] = 0;
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
            lowerHips: false,
            kneeAngle: Math.round(valgusRatio * 100), // repurpose: valgus ratio %
            hipAngle: Math.round(hipShift),            // repurpose: hip shift px
            ankleAngle: Math.round(depthRatio * 100),  // repurpose: depth %
            currentState,
        };
    }

    /**
     * Process when no pose is detected.
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
        this.frontDisplayText = [false, false, false];
        this.frontCountFrames = [0, 0, 0];

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
