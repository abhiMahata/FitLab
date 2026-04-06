import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"blur" | "reveal" | "exit">("blur");

  useEffect(() => {
    // Phase 1 → 2: Start reveal after a brief pause
    const revealTimer = setTimeout(() => setPhase("reveal"), 300);

    // Phase 2 → 3: Start exit after reveal completes
    const exitTimer = setTimeout(() => setPhase("exit"), 2200);

    // Fully done — unmount
    const doneTimer = setTimeout(() => onComplete(), 2800);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Background glow pulse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: phase === "reveal" ? 0.4 : 0,
              scale: phase === "reveal" ? 1.2 : 0.5,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-64 h-64 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(142 71% 45% / 0.3) 0%, transparent 70%)",
            }}
          />

          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, filter: "blur(20px)" }}
            animate={{
              opacity: phase === "reveal" ? 1 : 0,
              scale: phase === "reveal" ? 1 : 0.6,
              filter: phase === "reveal" ? "blur(0px)" : "blur(20px)",
            }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 glow-green"
          >
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </motion.div>

          {/* FitLab text — emerges from blur */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, filter: "blur(24px)" }}
            animate={{
              opacity: phase === "reveal" ? 1 : 0,
              scale: phase === "reveal" ? 1 : 0.85,
              filter: phase === "reveal" ? "blur(0px)" : "blur(24px)",
            }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="text-center"
          >
            <h1 className="text-5xl font-black tracking-tight text-foreground">
              Fit<span className="text-primary">Lab</span>
            </h1>
            {/* Tagline fades in after the title */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: phase === "reveal" ? 1 : 0,
                y: phase === "reveal" ? 0 : 8,
              }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="text-muted-foreground text-sm font-medium tracking-widest uppercase mt-3"
            >
              Must've Been the wind!
            </motion.p>
          </motion.div>

          {/* Bottom loading bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "reveal" ? 1 : 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="absolute bottom-16 w-32 h-1 bg-muted rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: phase === "reveal" ? "100%" : "0%" }}
              transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
              className="h-full bg-primary rounded-full"
            />
          </motion.div>
        </motion.div>
      ) : (
        /* Exit phase — quick fade */
        <motion.div
          key="splash-exit"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 glow-green">
            <Dumbbell className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-foreground">
            Fit<span className="text-primary">Lab</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium tracking-widest uppercase mt-3">
            AI-Powered Fitness Coach
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
