import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, Plus, Trash2, Flame, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";

// ─── Types ────────────────────────────────────────────────────────────

type MealType = "Breakfast" | "Lunch" | "Snack" | "Dinner";

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  meal: MealType;
}

interface DayData {
  entries: FoodEntry[];
}

type WeekData = Record<string, DayData>; // key = "Monday", "Tuesday", ...

const MEALS: { type: MealType; emoji: string; timeHint: string }[] = [
  { type: "Breakfast", emoji: "🌅", timeHint: "6 AM – 10 AM" },
  { type: "Lunch", emoji: "☀️", timeHint: "12 PM – 2 PM" },
  { type: "Snack", emoji: "🍪", timeHint: "3 PM – 5 PM" },
  { type: "Dinner", emoji: "🌙", timeHint: "7 PM – 9 PM" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const CALORIE_GOAL = 2400;
const STORAGE_KEY = "fitlab-calorie-data";

// ─── Storage ──────────────────────────────────────────────────────────

function loadData(): WeekData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  const data: WeekData = {};
  for (const d of DAYS) data[d] = { entries: [] };
  return data;
}

function saveData(data: WeekData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Arc Gauge Component ──────────────────────────────────────────────

function CalorieArc({ consumed, goal }: { consumed: number; goal: number }) {
  const remaining = Math.max(0, goal - consumed);
  const pct = Math.min(1, consumed / goal);
  const overBudget = consumed > goal;

  // Arc params: semicircle from 180° to 0° (left to right, top half)
  const R = 90;
  const CX = 110;
  const CY = 105;
  const totalSegments = 30;
  const filledSegments = Math.round(pct * totalSegments);
  const segmentAngle = 180 / totalSegments;
  const gapAngle = 1.5;

  const segments = [];
  for (let i = 0; i < totalSegments; i++) {
    const startAngle = 180 - i * segmentAngle;
    const endAngle = startAngle - segmentAngle + gapAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = CX + R * Math.cos(startRad);
    const y1 = CY - R * Math.sin(startRad);
    const x2 = CX + R * Math.cos(endRad);
    const y2 = CY - R * Math.sin(endRad);

    const isFilled = i < filledSegments;
    segments.push(
      <path
        key={i}
        d={`M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`}
        fill="none"
        strokeWidth={14}
        strokeLinecap="round"
        stroke={
          isFilled
            ? overBudget
              ? "hsl(0 72% 51%)"
              : "hsl(var(--primary))"
            : "hsl(var(--muted))"
        }
        opacity={isFilled ? 1 : 0.5}
      />
    );
  }

  return (
    <div className="flex justify-center">
      <svg width="220" height="130" viewBox="0 0 220 130">
        {segments}
        {/* Center content */}
        <text x={CX} y={CY - 22} textAnchor="middle" className="text-primary" fill="currentColor" fontSize="18">
          🔥
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="34" fontWeight="bold" fontFamily="monospace">
          {remaining}
        </text>
        <text x={CX} y={CY + 26} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
          {overBudget ? "Over budget!" : "Remaining"}
        </text>
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

const CalorieTracker = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [weekData, setWeekData] = useState<WeekData>(loadData);

  // Add-food modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMeal, setAddMeal] = useState<MealType>("Breakfast");
  const [addName, setAddName] = useState("");
  const [addCalories, setAddCalories] = useState("");

  // Persist
  useEffect(() => { saveData(weekData); }, [weekData]);

  const dayKey = DAYS[selectedDay];
  const dayData = weekData[dayKey] || { entries: [] };
  const totalConsumed = dayData.entries.reduce((s, e) => s + e.calories, 0);

  // Group entries by meal
  const mealGroups = useMemo(() => {
    return MEALS.map((m) => ({
      ...m,
      entries: dayData.entries.filter((e) => e.meal === m.type),
      total: dayData.entries.filter((e) => e.meal === m.type).reduce((s, e) => s + e.calories, 0),
    }));
  }, [dayData.entries]);

  const addEntry = useCallback(() => {
    const name = addName.trim();
    const cal = parseInt(addCalories);
    if (!name || isNaN(cal) || cal <= 0) return;

    setWeekData((prev) => {
      const day = prev[dayKey] || { entries: [] };
      return {
        ...prev,
        [dayKey]: {
          entries: [...day.entries, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            calories: cal,
            meal: addMeal,
          }],
        },
      };
    });

    setAddName("");
    setAddCalories("");
    setShowAddModal(false);
  }, [addName, addCalories, addMeal, dayKey]);

  const removeEntry = useCallback((id: string) => {
    setWeekData((prev) => ({
      ...prev,
      [dayKey]: {
        entries: (prev[dayKey]?.entries || []).filter((e) => e.id !== id),
      },
    }));
  }, [dayKey]);

  const openAddFor = (meal: MealType) => {
    setAddMeal(meal);
    setAddName("");
    setAddCalories("");
    setShowAddModal(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Calorie Tracker</h1>
        <div className="w-12" />
      </header>

      {/* Day Tabs */}
      <section className="px-4 mb-6">
        <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
          {DAYS.map((day, i) => {
            const isToday = i === todayIdx;
            const isSelected = i === selectedDay;
            const dayCals = (weekData[day]?.entries || []).reduce((s, e) => s + e.calories, 0);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(i)}
                className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-center transition-all ${isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
              >
                <p className="text-xs font-bold uppercase">{day.slice(0, 3)}</p>
                <p className="text-[10px] mt-0.5">
                  {dayCals > 0 ? `${dayCals}` : "—"}
                </p>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Calorie Arc Gauge */}
      <section className="px-6 mb-2">
        <div className="glass-card p-5 pb-2">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-foreground">Calories</h2>
            <span className="text-sm text-muted-foreground">Goal: {CALORIE_GOAL.toLocaleString()} kcal</span>
          </div>
          <CalorieArc consumed={totalConsumed} goal={CALORIE_GOAL} />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground px-4">
            <span>Consumed: <span className="text-foreground font-semibold">{totalConsumed.toLocaleString()}</span></span>
            <span>Remaining: <span className="text-primary font-semibold">{Math.max(0, CALORIE_GOAL - totalConsumed).toLocaleString()}</span></span>
          </div>
        </div>
      </section>

      {/* Meal Sections */}
      <section className="px-6 mt-4">
        <div className="space-y-4">
          {mealGroups.map((meal) => (
            <div key={meal.type} className="glass-card p-4">
              {/* Meal header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{meal.emoji}</span>
                  <div>
                    <p className="font-semibold text-foreground">{meal.type}</p>
                    <p className="text-[10px] text-muted-foreground">{meal.timeHint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {meal.total > 0 && (
                    <span className="text-sm font-bold text-foreground">{meal.total} kcal</span>
                  )}
                  <button
                    onClick={() => openAddFor(meal.type)}
                    className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Entries */}
              {meal.entries.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-2">No items added</p>
              ) : (
                <div className="space-y-1.5">
                  {meal.entries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/40"
                    >
                      <Flame className="w-3.5 h-3.5 text-fitlab-orange flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">{entry.name}</span>
                      <span className="text-xs font-bold text-muted-foreground">{entry.calories} kcal</span>
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="p-1 rounded text-muted-foreground/40 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Add Food Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Add Food Item</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-full hover:bg-muted">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Meal selector */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Meal</p>
                <div className="flex gap-2">
                  {MEALS.map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setAddMeal(m.type)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${addMeal === m.type
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {m.emoji} {m.type.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food name */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Food Name</p>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Grilled Chicken, Rice, Apple..."
                  autoFocus
                  className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Calories */}
              <div className="mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Calories (kcal)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={addCalories}
                  onChange={(e) => setAddCalories(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEntry()}
                  placeholder="e.g. 250"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-2 focus:ring-primary text-lg font-bold"
                />
              </div>

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={addEntry}
                disabled={!addName.trim() || !addCalories || parseInt(addCalories) <= 0}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to {addMeal}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Menu */}
      <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
    </div>
  );
};

export default CalorieTracker;
