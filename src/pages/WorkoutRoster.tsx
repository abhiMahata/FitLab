import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft, Plus, Trash2, Play, ChevronRight, Search, X,
  Timer, CheckCircle2, Dumbbell, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";
import {
  Exercise, EXERCISES, MUSCLE_GROUPS, MUSCLE_COLORS, MUSCLE_ICONS,
  MuscleGroup, getExerciseById, getExercisesByMuscle,
  RosterExercise, WeeklyRoster, DayRoster, WorkoutLog,
  DAYS_OF_WEEK, loadRoster, saveRoster, saveWorkoutLog,
} from "@/lib/exerciseLibrary";

type PageView = "roster" | "browse" | "workout";

const WorkoutRoster = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ── View state ──
  const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  // ── Restore active workout session from localStorage ──
  const savedSession = (() => {
    try {
      const raw = localStorage.getItem("fitlab-active-workout");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [view, setView] = useState<PageView>(savedSession ? "workout" : "roster");
  const [selectedDay, setSelectedDay] = useState<string>(today);

  // ── Roster data ──
  const [roster, setRoster] = useState<WeeklyRoster>(loadRoster);
  useEffect(() => { saveRoster(roster); }, [roster]);

  // ── Browse state ──
  const [browseFilter, setBrowseFilter] = useState<MuscleGroup | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [browseDay, setBrowseDay] = useState<string>(today);

  // ── Workout session state (restored from saved session if available) ──
  const [workoutDay, setWorkoutDay] = useState<string>(savedSession?.workoutDay || today);
  const [currentExIdx, setCurrentExIdx] = useState(savedSession?.currentExIdx || 0);
  const [currentSet, setCurrentSet] = useState(savedSession?.currentSet || 1);
  const [completedSets, setCompletedSets] = useState<Record<string, number>>(savedSession?.completedSets || {});
  const [isResting, setIsResting] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [workoutStartTime, setWorkoutStartTime] = useState(savedSession?.workoutStartTime || 0);
  const [workoutElapsed, setWorkoutElapsed] = useState(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Workout timer
  useEffect(() => {
    if (view === "workout" && workoutStartTime > 0) {
      const t = setInterval(() => setWorkoutElapsed(Math.floor((Date.now() - workoutStartTime) / 1000)), 1000);
      return () => clearInterval(t);
    }
  }, [view, workoutStartTime]);

  // Persist active workout session
  useEffect(() => {
    if (view === "workout" && workoutStartTime > 0) {
      localStorage.setItem("fitlab-active-workout", JSON.stringify({
        workoutDay,
        currentExIdx,
        currentSet,
        completedSets,
        workoutStartTime,
      }));
    }
  }, [view, workoutDay, currentExIdx, currentSet, completedSets, workoutStartTime]);

  const clearSavedSession = () => localStorage.removeItem("fitlab-active-workout");

  // ── Helpers ──
  const dayRoster = roster[selectedDay] || { label: "", exercises: [] };
  const workoutExercises = roster[workoutDay]?.exercises || [];

  const filteredExercises = EXERCISES.filter((e) => {
    const matchesMuscle = browseFilter === "All" || e.muscle === browseFilter;
    const matchesSearch = searchQuery === "" || e.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMuscle && matchesSearch;
  });

  // Group filtered exercises by muscle
  const groupedFiltered = MUSCLE_GROUPS.map((mg) => ({
    muscle: mg,
    exercises: filteredExercises.filter((e) => e.muscle === mg),
  })).filter((g) => g.exercises.length > 0);

  // Group roster exercises by muscle
  const groupedRoster = MUSCLE_GROUPS.map((mg) => ({
    muscle: mg,
    exercises: dayRoster.exercises.filter((re) => {
      const ex = getExerciseById(re.exerciseId);
      return ex?.muscle === mg;
    }),
  })).filter((g) => g.exercises.length > 0);

  // Auto-generate label from muscle groups
  const autoLabel = (exercises: typeof dayRoster.exercises): string => {
    const muscles = new Set<string>();
    exercises.forEach((re) => {
      const ex = getExerciseById(re.exerciseId);
      if (ex) muscles.add(ex.muscle);
    });
    if (muscles.size === 0) return "";
    return Array.from(muscles).join(" & ");
  };

  // ── Roster actions ──
  const addExercise = useCallback((exerciseId: string) => {
    const ex = getExerciseById(exerciseId);
    if (!ex) return;
    setRoster((prev) => {
      const day = prev[browseDay] || { label: "", exercises: [] };
      if (day.exercises.some((e) => e.exerciseId === exerciseId)) return prev;
      const newExercises = [...day.exercises, {
        exerciseId,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        restSeconds: 60,
      }];
      return {
        ...prev,
        [browseDay]: {
          ...day,
          label: autoLabel(newExercises),
          exercises: newExercises,
        },
      };
    });
  }, [browseDay]);

  const removeExercise = useCallback((day: string, exerciseId: string) => {
    setRoster((prev) => {
      const newExercises = prev[day].exercises.filter((e) => e.exerciseId !== exerciseId);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          label: autoLabel(newExercises),
          exercises: newExercises,
        },
      };
    });
  }, []);

  const updateExercise = useCallback((day: string, exerciseId: string, field: "sets" | "reps" | "restSeconds", value: number) => {
    setRoster((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.map((e) =>
          e.exerciseId === exerciseId ? { ...e, [field]: Math.max(1, value) } : e
        ),
      },
    }));
  }, []);

  const updateDayLabel = useCallback((day: string, label: string) => {
    setRoster((prev) => ({
      ...prev,
      [day]: { ...prev[day], label },
    }));
  }, []);

  // ── Workout actions ──
  const startWorkout = useCallback((day: string) => {
    setWorkoutDay(day);
    setCurrentExIdx(0);
    setCurrentSet(1);
    setCompletedSets({});
    setIsResting(false);
    setWorkoutStartTime(Date.now());
    setWorkoutElapsed(0);
    setView("workout");
  }, []);

  const completeSet = useCallback(() => {
    const ex = workoutExercises[currentExIdx];
    if (!ex) return;
    const newCompleted = { ...completedSets };
    newCompleted[ex.exerciseId] = (newCompleted[ex.exerciseId] || 0) + 1;
    setCompletedSets(newCompleted);

    const totalDone = newCompleted[ex.exerciseId];
    if (totalDone >= ex.sets) {
      // Move to next exercise
      if (currentExIdx < workoutExercises.length - 1) {
        setCurrentExIdx(currentExIdx + 1);
        setCurrentSet(1);
        startRest(ex.restSeconds);
      } else {
        finishWorkout(newCompleted);
      }
    } else {
      setCurrentSet(totalDone + 1);
      startRest(ex.restSeconds);
    }
  }, [workoutExercises, currentExIdx, completedSets, currentSet]);

  const startRest = useCallback((seconds: number) => {
    setIsResting(true);
    setRestTime(seconds);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = setInterval(() => {
      setRestTime((prev) => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current!);
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const skipRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsResting(false);
    setRestTime(0);
  }, []);

  const finishWorkout = useCallback((completed: Record<string, number>) => {
    const log: WorkoutLog = {
      id: `${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      day: workoutDay,
      exercises: workoutExercises.map((e) => ({
        exerciseId: e.exerciseId,
        setsCompleted: completed[e.exerciseId] || 0,
        totalSets: e.sets,
      })),
      durationSeconds: Math.floor((Date.now() - workoutStartTime) / 1000),
      completedAt: Date.now(),
    };
    saveWorkoutLog(log);
    clearSavedSession();
    setView("roster");
  }, [workoutDay, workoutExercises, workoutStartTime]);

  const cancelWorkout = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    clearSavedSession();
    setView("roster");
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-32">
      <AnimatePresence mode="wait">
        {/* ═══════════ ROSTER VIEW ═══════════ */}
        {view === "roster" && (
          <motion.div key="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <header className="p-6 flex items-center justify-between">
              <button onClick={() => navigate("/")} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-xl font-bold text-foreground">Workout Roster</h1>
              <div className="w-12" />
            </header>

            {/* Day Tabs */}
            <section className="px-4 mb-6">
              <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
                {DAYS_OF_WEEK.map((day) => {
                  const r = roster[day];
                  const count = r?.exercises?.length || 0;
                  const isToday = day === today;
                  const isSelected = day === selectedDay;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-center transition-all ${isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      <p className="text-xs font-bold uppercase">{day.slice(0, 3)}</p>
                      <p className="text-[10px] mt-0.5">
                        {count > 0 ? `${count} ex` : "Rest"}
                      </p>
                      {isToday && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Day Label */}
            <section className="px-6 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{selectedDay}</h2>
                <input
                  type="text"
                  value={dayRoster.label}
                  onChange={(e) => updateDayLabel(selectedDay, e.target.value)}
                  placeholder="e.g. Chest & Triceps"
                  className="flex-1 bg-transparent text-primary font-semibold text-sm placeholder:text-muted-foreground/40 outline-none border-b border-transparent focus:border-primary transition-all"
                />
              </div>
            </section>

            {/* Exercise List */}
            <section className="px-6 mb-6">
              {dayRoster.exercises.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Dumbbell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No exercises yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Tap + to browse and add exercises</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedRoster.map((group) => (
                    <div key={group.muscle}>
                      {/* Muscle group header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{MUSCLE_ICONS[group.muscle]}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${MUSCLE_COLORS[group.muscle]}`}>
                          {group.muscle}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <div className="space-y-2">
                        {group.exercises.map((rosterEx, idx) => {
                          const ex = getExerciseById(rosterEx.exerciseId);
                          if (!ex) return null;
                          return (
                            <motion.div
                              key={rosterEx.exerciseId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="glass-card p-4"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-2xl">{ex.emoji}</span>
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">{ex.name}</p>
                                  <p className="text-xs text-muted-foreground">{ex.description}</p>
                                </div>
                                <button
                                  onClick={() => removeExercise(selectedDay, rosterEx.exerciseId)}
                                  className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="flex gap-2">
                                {[
                                  { label: "Sets", field: "sets" as const, value: rosterEx.sets },
                                  { label: "Reps", field: "reps" as const, value: rosterEx.reps },
                                  { label: "Rest(s)", field: "restSeconds" as const, value: rosterEx.restSeconds },
                                ].map((ctrl) => (
                                  <div key={ctrl.label} className="flex-1">
                                    <p className="text-[10px] text-muted-foreground uppercase mb-1">{ctrl.label}</p>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => updateExercise(selectedDay, rosterEx.exerciseId, ctrl.field, ctrl.value - 1)}
                                        className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-sm flex items-center justify-center hover:bg-primary/20 hover:text-primary"
                                      >−</button>
                                      <span className="flex-1 text-center font-bold text-foreground text-sm">{ctrl.value}</span>
                                      <button
                                        onClick={() => updateExercise(selectedDay, rosterEx.exerciseId, ctrl.field, ctrl.value + 1)}
                                        className="w-7 h-7 rounded-lg bg-muted text-muted-foreground text-sm flex items-center justify-center hover:bg-primary/20 hover:text-primary"
                                      >+</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Add + Start buttons */}
            <section className="px-6 space-y-3">
              <button
                onClick={() => { setBrowseDay(selectedDay); setView("browse"); }}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-primary/40 text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition-all"
              >
                <Plus className="w-5 h-5" /> Add Exercises
              </button>

              {dayRoster.exercises.length > 0 && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startWorkout(selectedDay)}
                  className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 glow-green"
                >
                  <Play className="w-6 h-6" /> Start Workout
                </motion.button>
              )}
            </section>
          </motion.div>
        )}

        {/* ═══════════ BROWSE VIEW ═══════════ */}
        {view === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <header className="p-6 flex items-center justify-between">
              <button onClick={() => setView("roster")} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-xl font-bold text-foreground">Exercise Library</h1>
              <div className="w-12" />
            </header>

            {/* Adding to day */}
            <div className="px-6 mb-4">
              <p className="text-sm text-muted-foreground">
                Adding to <span className="text-primary font-semibold">{browseDay}</span>'s roster
              </p>
            </div>

            {/* Search */}
            <section className="px-6 mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full bg-muted rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </section>

            {/* Muscle Group Filter */}
            <section className="px-4 mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setBrowseFilter("All")}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${browseFilter === "All" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                >All</button>
                {MUSCLE_GROUPS.map((mg) => (
                  <button
                    key={mg}
                    onClick={() => setBrowseFilter(mg)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${browseFilter === mg ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {MUSCLE_ICONS[mg]} {mg}
                  </button>
                ))}
              </div>
            </section>

            {/* Exercise Cards — Grouped by Muscle */}
            <section className="px-6 pb-8">
              <p className="text-sm text-muted-foreground mb-3">{filteredExercises.length} exercises</p>
              <div className="space-y-6">
                {groupedFiltered.map((group) => (
                  <div key={group.muscle}>
                    {/* Group header */}
                    <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background py-2 z-10">
                      <span className="text-xl">{MUSCLE_ICONS[group.muscle]}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${MUSCLE_COLORS[group.muscle]}`}>
                        {group.muscle}
                      </span>
                      <span className="text-xs text-muted-foreground">{group.exercises.length}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-2">
                      {group.exercises.map((ex) => {
                        const alreadyAdded = roster[browseDay]?.exercises?.some((r) => r.exerciseId === ex.id);
                        return (
                          <motion.div
                            key={ex.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass-card p-4 flex items-center gap-3 ${alreadyAdded ? "opacity-50" : ""}`}
                          >
                            <span className="text-2xl">{ex.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{ex.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{ex.description}</p>
                              <span className="text-xs text-muted-foreground">{ex.defaultSets}×{ex.defaultReps}</span>
                            </div>
                            <button
                              onClick={() => addExercise(ex.id)}
                              disabled={alreadyAdded}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${alreadyAdded
                                ? "bg-primary/20 text-primary"
                                : "bg-primary text-primary-foreground hover:bg-primary/80"
                                }`}
                            >
                              {alreadyAdded ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {/* ═══════════ WORKOUT VIEW ═══════════ */}
        {view === "workout" && (() => {
          const dayExercises = workoutExercises;
          const currRosterEx = dayExercises[currentExIdx];
          const currEx = currRosterEx ? getExerciseById(currRosterEx.exerciseId) : null;
          const totalExercises = dayExercises.length;
          const totalSetsAll = dayExercises.reduce((s, e) => s + e.sets, 0);
          const completedSetsAll = Object.values(completedSets).reduce((s, v) => s + v, 0);
          const overallProgress = totalSetsAll > 0 ? (completedSetsAll / totalSetsAll) * 100 : 0;

          return (
            <motion.div key="workout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Header with timer */}
              <header className="p-6 flex items-center justify-between">
                <button onClick={cancelWorkout} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <X className="w-5 h-5 text-foreground" />
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Workout</p>
                  <p className="text-lg font-bold text-foreground font-mono">{fmt(workoutElapsed)}</p>
                </div>
                <div className="w-12 text-center">
                  <p className="text-xs text-muted-foreground">{currentExIdx + 1}/{totalExercises}</p>
                </div>
              </header>

              {/* Overall progress */}
              <section className="px-6 mb-6">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">{completedSetsAll}/{totalSetsAll} sets</p>
              </section>

              {currEx && currRosterEx && (
                <>
                  {/* Current Exercise */}
                  <section className="px-6 mb-6">
                    <div className="glass-card p-6 text-center">
                      <motion.span
                        key={currEx.id}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-6xl block mb-4"
                      >
                        {currEx.emoji}
                      </motion.span>
                      <motion.h2
                        key={`name-${currEx.id}`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-2xl font-bold text-foreground mb-1"
                      >
                        {currEx.name}
                      </motion.h2>
                      <p className="text-sm text-muted-foreground">{currEx.muscle} • {currEx.description}</p>
                    </div>
                  </section>

                  {/* Set tracker */}
                  <section className="px-6 mb-6">
                    <div className="glass-card p-5">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-foreground font-semibold">
                          Set {currentSet} of {currRosterEx.sets}
                        </p>
                        <p className="text-primary font-bold">{currRosterEx.reps} reps</p>
                      </div>

                      {/* Set indicators */}
                      <div className="flex gap-2 mb-4">
                        {Array.from({ length: currRosterEx.sets }, (_, i) => (
                          <div
                            key={i}
                            className={`flex-1 h-3 rounded-full transition-all ${i < (completedSets[currRosterEx.exerciseId] || 0)
                              ? "bg-primary"
                              : i === (completedSets[currRosterEx.exerciseId] || 0)
                                ? "bg-primary/40 animate-pulse"
                                : "bg-muted"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Rest timer or Complete button */}
                  <section className="px-6">
                    {isResting ? (
                      <div className="glass-card p-6 text-center">
                        <Timer className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Rest</p>
                        <p className="text-5xl font-bold text-foreground font-mono mb-4">{fmt(restTime)}</p>
                        <button
                          onClick={skipRest}
                          className="px-6 py-3 rounded-xl bg-muted text-muted-foreground font-semibold hover:bg-primary/20 hover:text-primary transition-all"
                        >
                          Skip Rest →
                        </button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={completeSet}
                        className="w-full py-6 rounded-2xl bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center gap-3 glow-green"
                      >
                        <CheckCircle2 className="w-7 h-7" />
                        Complete Set
                      </motion.button>
                    )}
                  </section>

                  {/* Exercise list preview */}
                  <section className="px-6 mt-6">
                    <p className="text-sm text-muted-foreground mb-3">Coming up</p>
                    <div className="space-y-2">
                      {dayExercises.slice(currentExIdx + 1, currentExIdx + 4).map((re) => {
                        const e = getExerciseById(re.exerciseId);
                        if (!e) return null;
                        return (
                          <div key={re.exerciseId} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/30">
                            <span className="text-lg">{e.emoji}</span>
                            <span className="text-sm text-muted-foreground">{e.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{re.sets}×{re.reps}</span>
                          </div>
                        );
                      })}
                      {currentExIdx + 1 >= dayExercises.length && (
                        <p className="text-center text-sm text-muted-foreground py-2">This is the last exercise! 💪</p>
                      )}
                    </div>
                  </section>
                </>
              )}
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Bottom Menu (hidden during workout) */}
      {view !== "workout" && (
        <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
      )}
    </div>
  );
};

export default WorkoutRoster;
