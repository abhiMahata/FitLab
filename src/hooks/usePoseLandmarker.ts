/**
 * usePoseLandmarker.ts
 * 
 * React hook that initializes MediaPipe PoseLandmarker
 * for in-browser pose detection.
 */

import { useEffect, useRef, useState } from "react";
import {
    PoseLandmarker,
    FilesetResolver,
} from "@mediapipe/tasks-vision";

export function usePoseLandmarker() {
    const landmarkerRef = useRef<PoseLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );

                const landmarker = await PoseLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
                        delegate: "GPU",
                    },
                    runningMode: "VIDEO",
                    numPoses: 1,
                    minPoseDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                if (!cancelled) {
                    landmarkerRef.current = landmarker;
                    setIsLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to load PoseLandmarker:", err);
                    setError("Failed to load AI model. Please refresh.");
                    setIsLoading(false);
                }
            }
        }

        init();

        return () => {
            cancelled = true;
            landmarkerRef.current?.close();
        };
    }, []);

    return { landmarker: landmarkerRef, isLoading, error };
}
