import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Dumbbell, User, Minus, Plus, Sparkles, Loader2, Video, RotateCcw, SwitchCamera, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseCard from "@/components/ExerciseCard";
import BottomMenu from "@/components/BottomMenu";
import { usePoseLandmarker } from "@/hooks/usePoseLandmarker";
import { type ExerciseStats, type IExerciseProcessor, type CameraView } from "@/lib/poseUtils";
import { SquatProcessor } from "@/lib/squatProcessor";
import { DeadliftProcessor } from "@/lib/deadliftProcessor";
import { BenchPressProcessor } from "@/lib/benchProcessor";
import { OHPProcessor } from "@/lib/ohpProcessor";
import { LungeProcessor } from "@/lib/lungeProcessor";
import { PushupProcessor, getPushupBeginner, getPushupPro } from "@/lib/pushupProcessor";
import { PullupProcessor, getPullupBeginner, getPullupPro } from "@/lib/pullupProcessor";
import { JoggingProcessor, getJoggingBeginner, getJoggingPro } from "@/lib/joggingProcessor";
import {
  getThresholdsBeginner, getThresholdsPro,
  getDeadliftBeginner, getDeadliftPro,
  getBenchBeginner, getBenchPro,
  getOHPBeginner, getOHPPro,
  getLungeBeginner, getLungePro,
  getFrontViewBeginner, getFrontViewPro,
} from "@/lib/thresholds";

function createProcessor(exercise: string, mode: "Beginner" | "Pro"): IExerciseProcessor {
  const b = mode === "Beginner";
  switch (exercise) {
    case "Deadlift": return new DeadliftProcessor(b ? getDeadliftBeginner() : getDeadliftPro());
    case "Bench Press": return new BenchPressProcessor(b ? getBenchBeginner() : getBenchPro());
    case "OHP": return new OHPProcessor(b ? getOHPBeginner() : getOHPPro());
    case "Lunge": return new LungeProcessor(b ? getLungeBeginner() : getLungePro());
    case "Push-ups": return new PushupProcessor(b ? getPushupBeginner() : getPushupPro());
    case "Pull-ups": return new PullupProcessor(b ? getPullupBeginner() : getPullupPro());
    case "Spot Jogging": return new JoggingProcessor(b ? getJoggingBeginner() : getJoggingPro());
    default: return new SquatProcessor(
      b ? getThresholdsBeginner() : getThresholdsPro(),
      b ? getFrontViewBeginner() : getFrontViewPro()
    );
  }
}

/** Exercises that support front-view analysis */
const FRONT_VIEW_EXERCISES = ["Squat"];

const exercises = [
  { name: "Squat", category: "Lower Body", iconType: "squat" },
  { name: "Deadlift", category: "Full Body", iconType: "deadlift" },
  { name: "Bench Press", category: "Upper Body", iconType: "bench" },
  { name: "OHP", category: "Shoulders", iconType: "ohp" },
  { name: "Lunge", category: "Legs", iconType: "lunge" },
  { name: "Push-ups", category: "Upper Body", iconType: "pushup" },
  { name: "Pull-ups", category: "Upper Body", iconType: "pullup" },
  { name: "Spot Jogging", category: "Cardio", iconType: "jogging" },
];

const AIFormChecker = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [mode] = useState<"Beginner" | "Pro">("Beginner");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraView, setCameraView] = useState<CameraView>("side");
  const [poseDetected, setPoseDetected] = useState(false);
  const [stats, setStats] = useState<ExerciseStats>({
    correctCount: 0,
    incorrectCount: 0,
    formAccuracy: 0,
    currentFeedback: [],
    isAligned: false,
    offsetAngle: 0,
    lowerHips: false,
    kneeAngle: 0,
    hipAngle: 0,
    ankleAngle: 0,
    currentState: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const processorRef = useRef<IExerciseProcessor>(
    createProcessor("Squat", "Beginner")
  );
  const lastTimestampRef = useRef<number>(-1);

  const { landmarker, isLoading: isModelLoading, error: modelError } = usePoseLandmarker();

  // Recreate processor when mode or exercise changes
  useEffect(() => {
    if (selectedExercise) {
      processorRef.current = createProcessor(selectedExercise, mode);
    }
  }, [mode, selectedExercise]);

  const handleExerciseSelect = (name: string) => {
    setSelectedExercise(name);
    processorRef.current = createProcessor(name, mode);
    setCameraView("side"); // reset view on exercise change
    setTimeout(() => setShowCamera(true), 300);
  };

  // Toggle between side and front view
  const handleToggleCameraView = () => {
    const newView = cameraView === "side" ? "front" : "side";
    setCameraView(newView);
    if (processorRef.current.setCameraView) {
      processorRef.current.setCameraView(newView);
    }
  };

  // Start camera (re-runs when facingMode changes)
  useEffect(() => {
    if (!showCamera) return;

    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        // Stop any existing streams first
        if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [showCamera, facingMode]);

  // Detection loop
  const detectFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const lm = landmarker.current;

    if (!video || !canvas || !lm || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const timestamp = video.currentTime * 1000;
    if (timestamp === lastTimestampRef.current) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastTimestampRef.current = timestamp;

    try {
      const result = lm.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        setPoseDetected(true);
        const newStats = processorRef.current.process(
          result.landmarks[0],
          ctx,
          canvas.width,
          canvas.height
        );
        setStats(newStats);
      } else {
        setPoseDetected(false);
        const newStats = processorRef.current.processNoPose();
        // Override accuracy to 0 when no pose is detected
        setStats({ ...newStats, formAccuracy: 0 });
      }
    } catch {
      // Detection error — skip frame
    }

    animFrameRef.current = requestAnimationFrame(detectFrame);
  }, [landmarker]);

  // Start/stop detection loop
  useEffect(() => {
    if (showCamera && !isModelLoading) {
      animFrameRef.current = requestAnimationFrame(detectFrame);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [showCamera, isModelLoading, detectFrame]);

  const handleReset = () => {
    processorRef.current.reset();
    setPoseDetected(false);
    setStats({
      correctCount: 0,
      incorrectCount: 0,
      formAccuracy: 0,
      currentFeedback: [],
      isAligned: false,
      offsetAngle: 0,
      lowerHips: false,
      kneeAngle: 0,
      hipAngle: 0,
      ankleAngle: 0,
      currentState: null,
    } as ExerciseStats);
  };

  const handleBack = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setShowCamera(false);
    setSelectedExercise(null);
    handleReset();
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case "squat":
      case "lunge":
      case "pushup":
      case "jogging":
        return User;
      case "deadlift":
      case "bench":
        return Minus;
      case "ohp":
      case "pullup":
        return Plus;
      default:
        return Dumbbell;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {!showCamera ? (
          <motion.div
            key="exercise-select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-32"
          >
            {/* Header */}
            <header className="p-6 flex items-center justify-between">
              <button
                onClick={() => navigate("/")}
                className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-green">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </button>
            </header>

            {/* Title */}
            <section className="px-6 mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Choose your Exercise
              </h1>
              <p className="text-muted-foreground">
                Select an exercise to start real-time AI form analysis.
              </p>
            </section>

            {/* Exercise Grid */}
            <section className="px-6 mb-8">
              <div className="grid grid-cols-2 gap-4">
                {exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.name}
                    name={exercise.name}
                    category={exercise.category}
                    icon={getIcon(exercise.iconType)}
                    isSelected={selectedExercise === exercise.name}
                    onClick={() => handleExerciseSelect(exercise.name)}
                  />
                ))}
              </div>
            </section>

            {/* AI Insights Banner */}
            <section className="px-6">
              <div className="solid-card p-5 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold uppercase tracking-wider text-sm">
                    AI Insights Ready
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Our AI model is optimized for these exercises. Position your phone 5-8
                  feet away for the best results.
                </p>
              </div>
            </section>

            {/* Bottom Menu */}
            <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
          </motion.div>
        ) : (
          <motion.div
            key="camera-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
          >
            {/* Camera + Canvas container */}
            <div className="relative h-full w-full">
              {/* Video feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />

              {/* Pose overlay canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />

              {/* Model loading overlay */}
              {isModelLoading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <p className="text-white text-lg font-semibold">Loading AI Model...</p>
                  <p className="text-white/60 text-sm mt-1">This may take a few seconds</p>
                </div>
              )}

              {modelError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
                  <p className="text-red-400 text-lg font-semibold">{modelError}</p>
                </div>
              )}

              {/* Header Overlay */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
                <button
                  onClick={handleBack}
                  className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white uppercase bg-card border border-border px-3 py-1.5 rounded-full">
                    {selectedExercise}
                  </span>
                </div>

                <div className="text-right bg-card border border-border px-3 py-1.5 rounded-xl">
                  <span className="text-3xl font-bold text-primary">
                    {String(stats.correctCount).padStart(2, "0")}
                  </span>
                  <span className="text-white/60 ml-1 text-sm">REPS</span>
                </div>
              </div>

              {/* Live Feedback Badges */}
              <div className="absolute top-20 left-4 z-10 flex flex-col gap-2">
                <AnimatePresence>
                  {stats.currentFeedback.map((msg, idx) => (
                    <motion.div
                      key={msg}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold ${msg.includes("DEEP") || msg.includes("KNEE") || msg.includes("CAVING") || msg.includes("NOT ALIGNED") || msg.includes("FACE THE")
                        ? "bg-red-500/90 text-white"
                        : msg.includes("LOWER") || msg.includes("BEND") || msg.includes("HIP SHIFT") || msg.includes("SHOULDER")
                          ? "bg-orange-500/90 text-white"
                          : "bg-card border border-border text-white"
                        }`}
                    >
                      {msg}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Alignment indicator */}
              <div className="absolute top-20 right-4 z-10">
                <div
                  className={`w-3 h-3 rounded-full ${poseDetected ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                    }`}
                />
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                {/* Stats Bar */}
                <div className="bg-card rounded-2xl p-4 mb-4 border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-4">
                      <div>
                        <span className="text-white/50 text-xs uppercase tracking-wider">Correct</span>
                        <p className="text-green-400 font-bold text-xl">{stats.correctCount}</p>
                      </div>
                      <div>
                        <span className="text-white/50 text-xs uppercase tracking-wider">Incorrect</span>
                        <p className="text-red-400 font-bold text-xl">{stats.incorrectCount}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-white/50 text-xs uppercase tracking-wider">Form Accuracy</span>
                      <p className="text-primary font-bold text-xl">{stats.formAccuracy}%</p>
                    </div>
                  </div>
                  {/* Accuracy Bar */}
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{
                        width: `${stats.formAccuracy}%`,
                        backgroundColor:
                          stats.formAccuracy >= 80
                            ? "rgb(74, 222, 128)"
                            : stats.formAccuracy >= 50
                              ? "rgb(250, 204, 21)"
                              : "rgb(248, 113, 113)",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setFacingMode((prev) => prev === "user" ? "environment" : "user")}
                    className="w-13 h-13 rounded-xl bg-card flex items-center justify-center border border-border"
                  >
                    <SwitchCamera className="w-5 h-5 text-white" />
                  </button>

                  {/* Side/Front toggle — only for supported exercises */}
                  {selectedExercise && FRONT_VIEW_EXERCISES.includes(selectedExercise) && (
                    <button
                      onClick={handleToggleCameraView}
                      className={`h-13 px-4 rounded-xl flex items-center justify-center gap-2 border transition-colors ${cameraView === "front"
                        ? "bg-primary/15 border-primary text-primary"
                        : "bg-card border-border text-white"
                        }`}
                    >
                      <Eye className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {cameraView === "side" ? "Side" : "Front"}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={handleReset}
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center glow-green"
                  >
                    <RotateCcw className="w-6 h-6 text-primary-foreground" />
                  </button>
                  <button
                    onClick={handleBack}
                    className="w-13 h-13 rounded-xl bg-card flex items-center justify-center border border-border"
                  >
                    <Video className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIFormChecker;
