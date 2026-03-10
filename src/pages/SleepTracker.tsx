import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft, Moon, Sun, Clock, Play, Square, Star, Sparkles,
  TrendingUp, TrendingDown, ChevronRight, RotateCcw, AlarmClock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";
import AlarmScreen from "@/components/AlarmScreen";

// ─── Types ────────────────────────────────────────────────────────────
interface SleepEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  bedtime: number;     // timestamp ms
  wakeTime: number;    // timestamp ms
  durationMin: number;
  quality: number;     // 1-5 stars
  mood: string;        // emoji
  score: number;       // 0-100
}

type TrackerView = "home" | "sleeping" | "rating";

const MOODS = [
  { emoji: "😫", label: "Awful" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😊", label: "Good" },
  { emoji: "🤩", label: "Great" },
];

const SLEEP_TIPS = [
  "Keep your room between 15-19°C (60-67°F) for optimal sleep.",
  "Avoid screens 30 min before bed — blue light suppresses melatonin.",
  "Stick to a consistent sleep schedule, even on weekends.",
  "Caffeine has a 6-hour half-life. Skip coffee after 2 PM.",
  "A 10-minute pre-bed stretch routine can improve sleep quality by 20%.",
  "Magnesium-rich foods (bananas, almonds) naturally relax your muscles.",
  "White noise or pink noise can reduce the time it takes to fall asleep by 38%.",
  "Exposure to morning sunlight helps reset your circadian rhythm.",
];

// ─── Helpers ──────────────────────────────────────────────────────────
const STORAGE_KEY = "fitlab-sleep-entries";

function loadEntries(): SleepEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveEntries(entries: SleepEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

function calcScore(durationMin: number, quality: number): number {
  // Duration score: 7-9h = ideal (100), below/above penalized
  const idealMin = 480; // 8 hours
  const durationDiff = Math.abs(durationMin - idealMin);
  const durationScore = Math.max(0, 100 - durationDiff * 0.3);
  // Quality score: 1-5 mapped to 0-100
  const qualityScore = (quality / 5) * 100;
  // Weighted
  return Math.round(durationScore * 0.5 + qualityScore * 0.5);
}

function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 85) return { text: "Excellent!", color: "text-primary" };
  if (score >= 70) return { text: "Great night!", color: "text-primary" };
  if (score >= 50) return { text: "Decent sleep", color: "text-fitlab-yellow" };
  return { text: "Needs improvement", color: "text-fitlab-orange" };
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString([], { weekday: "short" });
}

// ─── Component ────────────────────────────────────────────────────────
const SleepTracker = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<TrackerView>("home");
  const [entries, setEntries] = useState<SleepEntry[]>(loadEntries);

  // Sleep session state
  const [bedtime, setBedtime] = useState<number | null>(() => {
    const saved = localStorage.getItem("fitlab-sleep-active");
    return saved ? Number(saved) : null;
  });

  // Rating state
  const [ratingQuality, setRatingQuality] = useState(3);
  const [ratingMood, setRatingMood] = useState(3); // index into MOODS
  const [wakeTimestamp, setWakeTimestamp] = useState(0);

  // Elapsed time while sleeping
  const [elapsed, setElapsed] = useState("");

  // ── Alarm state ──
  const [alarmEnabled, setAlarmEnabled] = useState(() => {
    return localStorage.getItem("fitlab-alarm-enabled") === "true";
  });
  const [alarmHour, setAlarmHour] = useState(() => {
    return Number(localStorage.getItem("fitlab-alarm-hour") || "7");
  });
  const [alarmMinute, setAlarmMinute] = useState(() => {
    return Number(localStorage.getItem("fitlab-alarm-minute") || "0");
  });
  const [alarmFired, setAlarmFired] = useState(false);
  const alarmFiredRef = useRef(false);

  // Persist alarm settings
  useEffect(() => {
    localStorage.setItem("fitlab-alarm-enabled", String(alarmEnabled));
    localStorage.setItem("fitlab-alarm-hour", String(alarmHour));
    localStorage.setItem("fitlab-alarm-minute", String(alarmMinute));
  }, [alarmEnabled, alarmHour, alarmMinute]);

  useEffect(() => {
    if (bedtime && view === "sleeping") {
      const timer = setInterval(() => {
        const diff = Date.now() - bedtime;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);

        // Check alarm
        if (alarmEnabled && !alarmFiredRef.current) {
          const now = new Date();
          if (now.getHours() === alarmHour && now.getMinutes() === alarmMinute) {
            alarmFiredRef.current = true;
            setAlarmFired(true);
          }
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [bedtime, view, alarmEnabled, alarmHour, alarmMinute]);

  // Check if there's an active sleep session on mount
  useEffect(() => {
    if (bedtime) setView("sleeping");
  }, []);

  // Persist entries
  useEffect(() => { saveEntries(entries); }, [entries]);

  // ── Actions ──
  const startSleep = useCallback(() => {
    const now = Date.now();
    setBedtime(now);
    alarmFiredRef.current = false;
    setAlarmFired(false);
    localStorage.setItem("fitlab-sleep-active", String(now));
    setView("sleeping");
  }, []);

  const handleAlarmDismiss = useCallback(() => {
    setAlarmFired(false);
    alarmFiredRef.current = true; // prevent re-fire
    // auto-trigger wake up
    setWakeTimestamp(Date.now());
    setView("rating");
  }, []);

  const wakeUp = useCallback(() => {
    setWakeTimestamp(Date.now());
    setView("rating");
  }, []);

  const saveSession = useCallback(() => {
    if (!bedtime) return;
    const durationMin = (wakeTimestamp - bedtime) / 60000;
    const quality = ratingQuality;
    const score = calcScore(durationMin, quality);
    const today = new Date().toISOString().slice(0, 10);

    const entry: SleepEntry = {
      id: `${Date.now()}`,
      date: today,
      bedtime,
      wakeTime: wakeTimestamp,
      durationMin,
      quality,
      mood: MOODS[ratingMood].emoji,
      score,
    };

    setEntries((prev) => {
      const filtered = prev.filter((e) => e.date !== today);
      return [entry, ...filtered].slice(0, 30); // keep last 30 entries
    });

    setBedtime(null);
    localStorage.removeItem("fitlab-sleep-active");
    setRatingQuality(3);
    setRatingMood(3);
    setView("home");
  }, [bedtime, wakeTimestamp, ratingQuality, ratingMood]);

  const cancelSleep = useCallback(() => {
    setBedtime(null);
    localStorage.removeItem("fitlab-sleep-active");
    setView("home");
  }, []);

  // ── Computed data ──
  const todayEntry = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return entries.find((e) => e.date === today) || null;
  }, [entries]);

  const weekEntries = useMemo(() => {
    const last7: (SleepEntry | null)[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7.push(entries.find((e) => e.date === key) || null);
    }
    return last7;
  }, [entries]);

  const avgDuration = useMemo(() => {
    const valid = entries.filter((e) => e.durationMin > 0).slice(0, 7);
    if (valid.length === 0) return 0;
    return valid.reduce((s, e) => s + e.durationMin, 0) / valid.length;
  }, [entries]);

  const avgScore = useMemo(() => {
    const valid = entries.slice(0, 7);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((s, e) => s + e.score, 0) / valid.length);
  }, [entries]);

  const sleepTip = useMemo(() => SLEEP_TIPS[Math.floor(Math.random() * SLEEP_TIPS.length)], []);

  const scoreInfo = todayEntry ? getScoreLabel(todayEntry.score) : getScoreLabel(avgScore);

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Sleep Tracker</h1>
        <div className="w-12 h-12" />
      </header>

      <AnimatePresence mode="wait">
        {/* ═══════════ HOME VIEW ═══════════ */}
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Sleep Score Ring */}
            <section className="px-6 mb-6">
              <div className="solid-card p-6 text-center">
                <div className="relative w-40 h-40 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(todayEntry?.score || avgScore) * 2.83} ${100 * 2.83}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-foreground">
                      {todayEntry?.score || avgScore || "—"}
                    </span>
                    <span className="text-sm text-muted-foreground">Sleep Score</span>
                  </div>
                </div>
                <p className={`text-lg font-medium ${scoreInfo.color}`}>
                  {entries.length > 0 ? scoreInfo.text : "No data yet"}
                </p>
                {todayEntry && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {todayEntry.mood} You slept {formatDuration(todayEntry.durationMin)}
                  </p>
                )}
              </div>
            </section>

            {/* Today's Stats (if available) */}
            {todayEntry && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 mb-6"
              >
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Bedtime", value: formatTime(todayEntry.bedtime), icon: Moon },
                    { label: "Wake Up", value: formatTime(todayEntry.wakeTime), icon: Sun },
                    { label: "Duration", value: formatDuration(todayEntry.durationMin), icon: Clock },
                  ].map((s) => (
                    <div key={s.label} className="solid-card p-4 text-center">
                      <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className="text-base font-bold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Alarm Setting */}
            <section className="px-6 mb-5">
              <div className="solid-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-fitlab-orange/20 flex items-center justify-center">
                      <AlarmClock className="w-5 h-5 text-fitlab-orange" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">Wake-Up Alarm</p>
                      <p className="text-xs text-muted-foreground">Puzzle challenge to dismiss</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAlarmEnabled(!alarmEnabled)}
                    className={`w-12 h-7 rounded-full transition-all relative ${alarmEnabled ? "bg-primary" : "bg-muted"
                      }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${alarmEnabled ? "left-6" : "left-1"
                        }`}
                    />
                  </button>
                </div>

                {alarmEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center justify-center gap-2 pt-3 border-t border-border"
                  >
                    <select
                      value={alarmHour}
                      onChange={(e) => setAlarmHour(Number(e.target.value))}
                      className="bg-muted text-foreground font-bold text-2xl rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary appearance-none text-center w-20"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <span className="text-3xl font-bold text-foreground">:</span>
                    <select
                      value={alarmMinute}
                      onChange={(e) => setAlarmMinute(Number(e.target.value))}
                      className="bg-muted text-foreground font-bold text-2xl rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary appearance-none text-center w-20"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Start Sleep Button */}
            <section className="px-6 mb-8">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startSleep}
                className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 glow-green"
              >
                <Moon className="w-6 h-6" />
                Start Sleep Session
              </motion.button>
              {alarmEnabled && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  ⏰ Alarm set for {String(alarmHour).padStart(2, "0")}:{String(alarmMinute).padStart(2, "0")}
                </p>
              )}
            </section>

            {/* Weekly Chart */}
            <section className="px-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">This Week</h2>
                {avgDuration > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Avg {formatDuration(avgDuration)}
                  </span>
                )}
              </div>
              <div className="solid-card p-5">
                <div className="flex items-end justify-between gap-2 h-28">
                  {weekEntries.map((entry, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dayStr = d.toLocaleDateString([], { weekday: "short" });
                    const heightPct = entry ? Math.min(100, (entry.durationMin / 600) * 100) : 0;
                    const barColor = entry
                      ? entry.score >= 70
                        ? "bg-primary"
                        : entry.score >= 50
                          ? "bg-fitlab-blue"
                          : "bg-muted-foreground/40"
                      : "bg-muted";
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        {entry && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {Math.round(entry.durationMin / 60)}h
                          </span>
                        )}
                        <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
                          <div
                            className={`w-full rounded-lg transition-all duration-500 ${barColor}`}
                            style={{ height: `${Math.max(heightPct, entry ? 8 : 4)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground">{dayStr}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Insights */}
            {entries.length >= 2 && (
              <section className="px-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Insights</h2>
                <div className="space-y-3">
                  {/* Duration trend */}
                  {entries.length >= 2 && (
                    <div className="solid-card p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">Avg Sleep Duration</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDuration(avgDuration)} average over last {Math.min(entries.length, 7)} nights
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          {avgDuration >= 420 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-fitlab-orange" />
                          )}
                          <span className="font-medium text-sm">
                            {avgDuration >= 420 ? "On track" : "Below 7h"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Consistency */}
                  {entries.length >= 3 && (() => {
                    const bedtimes = entries.slice(0, 7).map((e) => {
                      const d = new Date(e.bedtime);
                      return d.getHours() * 60 + d.getMinutes();
                    });
                    const avg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
                    const variance = Math.round(
                      Math.sqrt(bedtimes.reduce((s, t) => s + (t - avg) ** 2, 0) / bedtimes.length)
                    );
                    return (
                      <div className="solid-card p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">Sleep Consistency</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Your bedtime varies by ~{variance} minutes.
                              {variance <= 30 ? " Great consistency!" : " Try going to bed at a more regular time."}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1 ${variance <= 30 ? "text-primary" : "text-fitlab-orange"}`}>
                            <span className="font-medium text-sm">±{variance}m</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            )}

            {/* Sleep Tip */}
            <section className="px-6">
              <div className="solid-card p-5 border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold uppercase tracking-wider text-sm">
                    Sleep Tip
                  </span>
                </div>
                <p className="text-foreground text-sm leading-relaxed">{sleepTip}</p>
              </div>
            </section>
          </motion.div>
        )}

        {/* ═══════════ SLEEPING VIEW ═══════════ */}
        {view === "sleeping" && (
          <motion.div
            key="sleeping"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-6"
          >
            <div className="solid-card p-8 text-center mb-8">
              {/* Moon animation */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
              >
                <Moon className="w-12 h-12 text-primary" />
              </motion.div>

              <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2">
                Sleeping since
              </p>
              <p className="text-lg text-foreground font-semibold mb-6">
                {bedtime ? formatTime(bedtime) : "—"}
              </p>

              {/* Timer */}
              <div className="text-5xl font-bold text-foreground font-mono tracking-wider mb-2">
                {elapsed || "00:00:00"}
              </div>
              <p className="text-muted-foreground text-sm mb-8">elapsed</p>

              {/* Pulsing indicator */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-3 h-3 rounded-full bg-primary"
                />
                <span className="text-sm text-muted-foreground">Tracking your sleep</span>
              </div>

              {/* Wake Up Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={wakeUp}
                className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3"
              >
                <Sun className="w-6 h-6" />
                I'm Awake!
              </motion.button>
            </div>

            {/* Cancel */}
            <button
              onClick={cancelSleep}
              className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-destructive transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel session</span>
            </button>
          </motion.div>
        )}

        {/* ═══════════ RATING VIEW ═══════════ */}
        {view === "rating" && (
          <motion.div
            key="rating"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-6"
          >
            <div className="solid-card p-6 text-center mb-6">
              <Sun className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Good Morning!</h2>
              <p className="text-muted-foreground">
                You slept for{" "}
                <span className="text-foreground font-semibold">
                  {bedtime ? formatDuration((wakeTimestamp - bedtime) / 60000) : "—"}
                </span>
              </p>
              <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
                <span>🌙 {bedtime ? formatTime(bedtime) : ""}</span>
                <span>☀️ {formatTime(wakeTimestamp)}</span>
              </div>
            </div>

            {/* Quality Rating */}
            <div className="solid-card p-6 mb-4">
              <h3 className="text-foreground font-semibold mb-4">How was your sleep?</h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 1.3 }}
                    onClick={() => setRatingQuality(star)}
                    className={`p-2 rounded-xl transition-all ${star <= ratingQuality
                      ? "text-primary scale-110"
                      : "text-muted-foreground/30"
                      }`}
                  >
                    <Star
                      className="w-9 h-9"
                      fill={star <= ratingQuality ? "currentColor" : "none"}
                    />
                  </motion.button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2">
                {ratingQuality === 1 && "Terrible"}
                {ratingQuality === 2 && "Poor"}
                {ratingQuality === 3 && "Average"}
                {ratingQuality === 4 && "Good"}
                {ratingQuality === 5 && "Excellent!"}
              </p>
            </div>

            {/* Mood */}
            <div className="solid-card p-6 mb-6">
              <h3 className="text-foreground font-semibold mb-4">How do you feel?</h3>
              <div className="flex justify-center gap-3">
                {MOODS.map((mood, i) => (
                  <motion.button
                    key={mood.emoji}
                    whileTap={{ scale: 1.2 }}
                    onClick={() => setRatingMood(i)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${ratingMood === i
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "opacity-50 hover:opacity-80"
                      }`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-[10px] text-muted-foreground">{mood.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={saveSession}
              className="w-full py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-3 glow-green"
            >
              Save & View Results
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Menu */}
      <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />

      {/* Alarm Overlay */}
      {alarmFired && <AlarmScreen onDismiss={handleAlarmDismiss} />}
    </div>
  );
};

export default SleepTracker;
