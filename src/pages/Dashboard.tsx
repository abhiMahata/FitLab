import { useState, useEffect, useMemo } from "react";
import { Dumbbell, Droplet, Sparkles, Plus, Minus, ChevronRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";
import {
  DAYS_OF_WEEK, loadRoster, getExerciseById, getTodayLog,
} from "@/lib/exerciseLibrary";

const BOTTLE_SIZES = [
  { label: "250 ml", ml: 250 },
  { label: "500 ml", ml: 500 },
  { label: "750 ml", ml: 750 },
  { label: "1 L", ml: 1000 },
];

const FUN_FACTS = [
  "🏋️ Your muscles are about 40% of your total body weight.",
  "💪 It takes roughly 4 weeks for YOU to notice body changes, 8 weeks for friends, and 12 weeks for the rest of the world.",
  "🧠 Exercise can boost your brain's memory and thinking skills within just 10 minutes.",
  "🫀 Your heart beats about 100,000 times a day — exercise makes each beat more efficient.",
  "🔥 Muscle tissue burns 3× more calories at rest than fat tissue.",
  "🦴 Weight-bearing exercises like squats and deadlifts increase bone density by up to 8%.",
  "⚡ Just 30 minutes of exercise can improve your mood for up to 12 hours afterward.",
  "🏃 Running a single mile burns roughly 100 calories, regardless of pace.",
  "💤 People who exercise regularly fall asleep 35% faster and enjoy deeper sleep cycles.",
  "🧬 Exercise triggers the release of a protein called BDNF, which helps grow new brain cells.",
  "💧 Even 2% dehydration can decrease exercise performance by up to 25%.",
  "🫁 Regular cardio can increase your lung capacity by up to 15%.",
  "🏅 Grip strength is one of the strongest predictors of overall longevity.",
  "🎵 Listening to music while exercising can boost your performance by up to 15%.",
  "🍌 A post-workout banana helps replenish glycogen 50% faster than sports drinks.",
];

// Circular progress ring component
function ProgressRing({ progress, size = 80, strokeWidth = 6, color = "hsl(142,71%,45%)" }: {
  progress: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <svg width={size} height={size} className="gpu">
      <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
      <circle
        className="progress-ring-fill"
        cx={size / 2} cy={size / 2} r={radius}
        strokeWidth={strokeWidth}
        stroke={color}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── Today's day ──
  const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  // ── Roster data ──
  const roster = loadRoster();
  const todayRoster = roster[today] || { label: "", exercises: [] };
  const todayExercises = todayRoster.exercises.map((re) => ({
    ...re,
    exercise: getExerciseById(re.exerciseId),
  })).filter((e) => e.exercise);

  // ── Today's workout log ──
  const todayLog = getTodayLog();

  // ── Water tracking ──
  const dateKey = new Date().toISOString().slice(0, 10);
  const [waterMl, setWaterMl] = useState<number>(() => {
    const saved = localStorage.getItem(`fitlab-water-${dateKey}`);
    return saved ? Number(saved) : 0;
  });
  const [selectedBottle, setSelectedBottle] = useState(1);

  useEffect(() => {
    localStorage.setItem(`fitlab-water-${dateKey}`, String(waterMl));
  }, [waterMl, dateKey]);

  const addWater = () => setWaterMl((prev) => prev + BOTTLE_SIZES[selectedBottle].ml);
  const removeWater = () =>
    setWaterMl((prev) => Math.max(0, prev - BOTTLE_SIZES[selectedBottle].ml));

  const waterLiters = (waterMl / 1000).toFixed(1);
  const waterGoal = 3000;
  const waterProgress = Math.min(100, Math.round((waterMl / waterGoal) * 100));

  // ── Random fun fact ──
  const funFact = useMemo(() => FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)], []);

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ═══ Header ═══ */}
      <header className="pt-10 pb-8 px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-caps mb-1">{today}</p>
            <h1 className="text-2xl font-bold text-foreground">{greeting}</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/ai-form-checker")}
            className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-green-sm"
          >
            <Zap className="w-5 h-5 text-primary-foreground" />
          </motion.button>
        </div>

        {/* Quick stats row */}
        <div className="flex gap-3">
          <div className="flex-1 solid-card p-4">
            <p className="label-caps mb-1">Exercises</p>
            <p className="text-2xl stat-number text-foreground">
              {todayExercises.length}
            </p>
          </div>
          <div className="flex-1 solid-card p-4">
            <p className="label-caps mb-1">Water</p>
            <p className="text-2xl stat-number text-foreground">
              {waterLiters}<span className="text-sm font-normal text-muted-foreground">L</span>
            </p>
          </div>
          <div className="flex-1 solid-card p-4">
            <p className="label-caps mb-1">Status</p>
            <p className="text-sm font-semibold text-primary mt-1">
              {todayLog ? "✓ Done" : todayExercises.length > 0 ? "Ready" : "Rest"}
            </p>
          </div>
        </div>
      </header>

      {/* ═══ Today's Workout Card ═══ */}
      <section className="px-6 mb-5">
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/workout-roster")}
          className="solid-card-lg p-5 surface-interactive cursor-pointer"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="label-caps mb-0.5">Today's Workout</p>
              <p className="text-lg font-bold text-foreground truncate">
                {todayRoster.label || (todayExercises.length > 0 ? "Workout Day" : "Rest Day")}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>

          {todayExercises.length > 0 ? (
            <div className="space-y-1.5">
              {todayExercises.slice(0, 4).map((item) => (
                <div
                  key={item.exerciseId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50"
                >
                  <span className="text-base">{item.exercise!.emoji}</span>
                  <span className="text-sm text-foreground font-medium flex-1 truncate">
                    {item.exercise!.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {item.sets}×{item.reps}
                  </span>
                  {todayLog && (() => {
                    const logEx = todayLog.exercises.find((l) => l.exerciseId === item.exerciseId);
                    if (logEx && logEx.setsCompleted >= logEx.totalSets) {
                      return <span className="text-primary text-xs">✓</span>;
                    }
                    return null;
                  })()}
                </div>
              ))}
              {todayExercises.length > 4 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{todayExercises.length - 4} more
                </p>
              )}
              {todayLog ? (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <span className="text-primary text-sm font-semibold">Workout completed</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.round(todayLog.durationSeconds / 60)} min)
                  </span>
                </div>
              ) : (
                <p className="text-center text-xs text-primary/60 pt-2">
                  Tap to start →
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No exercises planned. Tap to set up your roster.
            </p>
          )}
        </motion.div>
      </section>

      {/* ═══ Water Intake Card ═══ */}
      <section className="px-6 mb-5">
        <div className="solid-card-lg p-5">
          <div className="flex items-center gap-4 mb-5">
            {/* Circular progress ring */}
            <div className="relative flex-shrink-0">
              <ProgressRing
                progress={waterProgress}
                size={72}
                strokeWidth={5}
                color={waterProgress >= 100 ? "hsl(142,71%,45%)" : "hsl(217,91%,60%)"}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Droplet className="w-5 h-5 text-fitlab-blue" />
              </div>
            </div>

            <div className="flex-1">
              <p className="label-caps mb-1">Water Intake</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl stat-number text-foreground">{waterLiters}</span>
                <span className="text-sm text-muted-foreground font-medium">/ {waterGoal / 1000}L</span>
              </div>
            </div>

            <div className="text-right">
              <span className={`text-2xl stat-number ${waterProgress >= 100 ? "text-primary" : waterProgress >= 50 ? "text-fitlab-blue" : "text-muted-foreground"
                }`}>
                {waterProgress}%
              </span>
            </div>
          </div>

          {/* Bottle size selector */}
          <div className="flex items-center gap-2 mb-3">
            <p className="label-caps mr-1">Bottle</p>
            {BOTTLE_SIZES.map((b, i) => (
              <button
                key={b.ml}
                onClick={() => setSelectedBottle(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedBottle === i
                    ? "bg-fitlab-blue text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Add / Remove buttons */}
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={removeWater}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground hover:text-destructive transition-colors font-semibold text-sm"
            >
              <Minus className="w-4 h-4" /> Remove
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={addWater}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add {BOTTLE_SIZES[selectedBottle].label}
            </motion.button>
          </div>
        </div>
      </section>

      {/* ═══ Fun Fact Card ═══ */}
      <section className="px-6 mt-6">
        <div className="solid-card-lg p-5 border-l-2 border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="label-caps text-primary">Fun Fact</span>
          </div>
          <p className="text-foreground text-sm leading-relaxed">{funFact}</p>
        </div>
      </section>

      {/* Bottom Menu */}
      <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
    </div>
  );
};

export default Dashboard;
