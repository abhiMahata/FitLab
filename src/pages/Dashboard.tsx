import { useState, useEffect, useMemo } from "react";
import { Dumbbell, Droplet, Sparkles, Plus, Minus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── Today's day ──
  const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  // ── Roster data (live from localStorage) ──
  const roster = loadRoster();
  const todayRoster = roster[today] || { label: "", exercises: [] };
  const todayExercises = todayRoster.exercises.map((re) => ({
    ...re,
    exercise: getExerciseById(re.exerciseId),
  })).filter((e) => e.exercise);

  // ── Today's workout log ──
  const todayLog = getTodayLog();

  // ── Water tracking (persisted per day) ──
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
      {/* Header */}
      <header className="pt-8 pb-6 px-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 border-[3px] border-primary flex items-center justify-center mb-3">
          <span className="text-4xl">👤</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}!</h1>
      </header>

      {/* Today's Details */}
      <section className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">Today's Details</h2>
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            {today}
          </span>
        </div>

        <div className="space-y-4">
          {/* ── Card 1: Today's Workout (from Roster) ── */}
          <div
            className="glass-card p-5 cursor-pointer group"
            onClick={() => navigate("/workout-roster")}
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">{today}'s Workout</p>
                <p className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  {todayRoster.label || (todayExercises.length > 0 ? "Workout Day" : "Rest Day")}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            {/* Exercise preview */}
            {todayExercises.length > 0 ? (
              <div className="space-y-2">
                {todayExercises.slice(0, 4).map((item) => (
                  <div
                    key={item.exerciseId}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40"
                  >
                    <span className="text-lg">{item.exercise!.emoji}</span>
                    <span className="text-sm text-foreground font-medium flex-1 truncate">
                      {item.exercise!.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground text-center">
                    +{todayExercises.length - 4} more exercises
                  </p>
                )}
                {todayLog ? (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-primary text-sm font-semibold">✅ Workout completed</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(todayLog.durationSeconds / 60)} min)
                    </span>
                  </div>
                ) : (
                  <p className="text-center text-xs text-primary/70 pt-1">
                    Tap to start workout →
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No exercises planned. Tap to set up your roster.
              </p>
            )}
          </div>

          {/* ── Card 2: Water Intake ── */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-fitlab-blue/20 flex items-center justify-center">
                <Droplet className="w-7 h-7 text-fitlab-blue" />
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">Water Intake</p>
                <p className="text-2xl font-bold text-foreground">
                  {waterLiters}{" "}
                  <span className="text-muted-foreground text-base font-normal">
                    / {waterGoal / 1000}L
                  </span>
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-lg font-bold ${waterProgress >= 100
                      ? "text-primary"
                      : waterProgress >= 50
                        ? "text-fitlab-blue"
                        : "text-muted-foreground"
                    }`}
                >
                  {waterProgress}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-fitlab-blue transition-all duration-500"
                style={{ width: `${waterProgress}%` }}
              />
            </div>

            {/* Bottle size selector */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mr-1">Bottle:</p>
              {BOTTLE_SIZES.map((b, i) => (
                <button
                  key={b.ml}
                  onClick={() => setSelectedBottle(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${selectedBottle === i
                      ? "bg-fitlab-blue text-white"
                      : "bg-muted text-muted-foreground hover:bg-fitlab-blue/20"
                    }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Add / Remove buttons */}
            <div className="flex gap-3">
              <button
                onClick={removeWater}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all font-semibold text-sm"
              >
                <Minus className="w-4 h-4" /> Remove
              </button>
              <button
                onClick={addWater}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary transition-all font-semibold text-sm"
              >
                <Plus className="w-4 h-4" /> Add {BOTTLE_SIZES[selectedBottle].label}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Fun Fact */}
      <section className="px-6 mt-8">
        <div className="glass-card p-5 border-l-4 border-primary">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-primary font-semibold uppercase tracking-wider text-sm">
              Fitness Fun Fact
            </span>
          </div>
          <p className="text-foreground text-base leading-relaxed">{funFact}</p>
        </div>
      </section>

      {/* Bottom Menu */}
      <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
    </div>
  );
};

export default Dashboard;
