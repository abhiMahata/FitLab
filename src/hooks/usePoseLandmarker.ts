/**
 * usePoseLandmarker.ts
 * 
 * React hook that initializes MediaPipe PoseLandmarker
 * for in-browser pose detection with automatic GPU-to-CPU fallback.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
    PoseLandmarker,
    FilesetResolver,
} from "@mediapipe/tasks-vision";

const MODEL_PATH =
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const WASM_CDN =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

export function usePoseLandmarker() {
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [delegateUsed, setDelegateUsed] = useState<"GPU" | "CPU" | null>(null);

    const init = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Close existing landmarker instance if re-initializing
            if (landmarkerRef.current) {
                try {
                    landmarkerRef.current.close();
                } catch {
                    // Ignore close error on reinit
                }
                landmarkerRef.current = null;
            }

            const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

            let landmarker: PoseLandmarker | null = null;
            let activeDelegate: "GPU" | "CPU" = "GPU";

            try {
                // Attempt 1: Fast GPU acceleration
                landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: MODEL_PATH,
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
                activeDelegate = "GPU";
            } catch (gpuErr) {
                console.warn("[MediaPipe] GPU delegate failed, falling back to CPU:", gpuErr);
                // Attempt 2: CPU fallback
                landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: MODEL_PATH,
                        delegate: "CPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });
                activeDelegate = "CPU";
            }

            landmarkerRef.current = landmarker;
            setDelegateUsed(activeDelegate);
            setIsLoading(false);
        } catch (err) {
            console.error("[MediaPipe] Failed to load PoseLandmarker (both GPU and CPU):", err);
            setError(
                "Unable to load the pose detection model. Please verify your internet connection or WebAssembly support and try again."
            );
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        init().then(() => {
            if (!isMounted && landmarkerRef.current) {
                try {
                    landmarkerRef.current.close();
                } catch {
                    // ignore
                }
                landmarkerRef.current = null;
            }
        });

        return () => {
            isMounted = false;
            if (landmarkerRef.current) {
                try {
                    landmarkerRef.current.close();
                } catch {
                    // ignore
                }
                landmarkerRef.current = null;
            }
        };
    }, [init]);

    return { landmarker: landmarkerRef, isLoading, error, delegateUsed, retry: init };
}
