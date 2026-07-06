# FitLab AI Coach — Comprehensive Interview Guide

> **How to use this document:** Every section is written as a Q&A pair so you can recite the answer fluently in an interview. Read the question out loud, then explain the answer in your own words using the notes below.

---

## 1. What is FitLab AI Coach? What was the inspiration?

**Short Answer:** FitLab is a mobile-first AI fitness coaching app that acts as a personal trainer living inside your phone.

**Inspiration & Problem Statement:**
The inspiration comes from a very real problem: personal trainers are expensive (₹2,000–₹5,000/session in India), and most people who work out alone have no idea if their form is correct. Bad form leads to injuries, and injuries stop progress entirely. Existing apps like MyFitnessPal or Nike Training Club give you workout *plans*, but none of them watch you move and tell you in real time that your knees are caving in.

The idea was to democratize coaching — give everyone access to the kind of feedback only a trained eye could provide, using the camera that's already in their pocket.

Additionally, most fitness apps treat each feature in a silo. FitLab was designed around a cross-feature intelligence philosophy: your sleep quality should influence your workout intensity recommendation. Your post-workout calorie burn should change your food targets. Everything talks to everything else.

---

## 2. What is the Design Methodology?

**The Four Pillars:**

FitLab is organized around 4 recovery and performance pillars:
1. **PLAN** — Workout Roster (schedule your week)
2. **LOG** — Calorie Tracker (fuel your body)
3. **ANALYZE** — AI Form Checker (train correctly)
4. **RECOVER** — Sleep Tracker (repair and grow)

**Design Philosophy:**
- **Mobile-first, dark-mode-default** — designed for someone in a gym with sweaty hands, not at a desk.
- **Frictionless UX** — The bottom menu is a swipe-up sheet, not a static tab bar, to maximize screen real estate during workouts.
- **Micro-animations everywhere** — using Framer Motion for state transitions, streak banners, rep counters. The app should *feel* alive.
- **Data coherence** — every module reads from a shared localStorage schema so no feature is isolated.

---

## 3. What is the Tech Stack?

| Layer | Technology | Why |
|---|---|---|
| **Framework** | React 18 + Vite + TypeScript | Fast HMR dev loop, strict typing for complex math |
| **Styling** | Tailwind CSS v3 | Utility-first, consistent design tokens |
| **Animations** | Framer Motion | Declarative spring animations, `AnimatePresence` for page transitions |
| **Computer Vision** | Google MediaPipe (`@mediapipe/tasks-vision`) | On-device, GPU-accelerated, 33-landmark pose model — runs in browser |
| **Icons** | Lucide React | Lightweight, tree-shakeable SVG icons |
| **UI Primitives** | Radix UI (Toast, Progress, Tooltip) | Accessible headless components |
| **Native Packaging** | Capacitor v8 | Wraps the web app in a native Android shell; gives access to native Camera API |
| **Backend/Auth** | Firebase (optional cloud sync) | Auth + Firestore for cross-device data persistence |
| **Notifications/Toast** | Sonner | Elegant toast notifications |
| **Theming** | next-themes | Dark/Light mode toggle with zero flash |

**Build Output:** Vite compiles to `dist/`, Capacitor copies that into the Android `assets/` folder, Gradle builds the APK.

---

## 4. What is a PWA? How is it implemented here?

**PWA = Progressive Web App**

A PWA is a web application that behaves like a native app. The three defining characteristics are:

1. **Installable** — Can be added to the home screen from a browser (no app store needed).
2. **Offline-capable** — Works without an internet connection using a Service Worker that caches assets.
3. **App-like UX** — Runs fullscreen, no browser chrome, has its own splash screen and icon.

**How FitLab implements this:**
- **Vite PWA Plugin** generates a `manifest.json` (defines app name, icons, theme color, display mode = `standalone`) and a Service Worker that pre-caches all JS/CSS/HTML bundles.
- **Capacitor** takes the PWA one step further and wraps it in a real `.apk`, giving access to **native APIs** (camera permission dialogs, filesystem) that a browser PWA cannot access.
- The result: FitLab can be deployed as a web PWA at a URL *and* distributed as an Android APK — same codebase.

**Why not just React Native?**
The team wanted to move fast. React + Vite means the web build, PWA distribution, and Android build all share 100% of the same source code. No native bridge layer to maintain.

---

## 5. How Does the App Store Data? (No Backend Required!)

**Primary storage: `localStorage`**

All user data is persisted in the browser's `localStorage` as JSON strings. There is no mandatory backend — the app works fully offline.

| Data | localStorage Key |
|---|---|
| User profile (age, weight, goals) | `fitlab-user-profile` |
| Weekly workout roster | `fitlab-weekly-roster` |
| Workout logs (completed sessions) | `fitlab-workout-logs` |
| Active workout session (resume if app closes) | `fitlab-active-workout` |
| Calorie entries per day | `fitlab-calorie-data` |
| Sleep entries (last 30 nights) | `fitlab-sleep-entries` |
| Active sleep session | `fitlab-sleep-active` |
| Water intake (per date key) | `fitlab-water-YYYY-MM-DD` |
| AI form session history | `fitlab-form-sessions` |

**Cloud Sync (optional):**
After every `localStorage` write, the code fires `import("@/lib/cloudSync").then(m => m.syncNow())`. This module pushes data to Firebase Firestore if the user is logged in, enabling cross-device sync. If not logged in, this silently fails — offline-first by design.

---

## 6. How Does the Workout Roster Work?

**Data Structure:**
```typescript
type WeeklyRoster = Record<string, DayRoster>;
// e.g. { "Monday": { label: "Chest & Triceps", exercises: [...] }, ... }

interface RosterExercise {
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;     // in kg
  restSeconds: number;
}
```

**Three Views:**
1. **Roster View** — Day tabs (Mon–Sun) with each day's exercise list. User sets Sets/Reps/Weight/Rest per exercise.
2. **Browse View** — A searchable, filterable exercise library (by muscle group) to add exercises.
3. **Workout View** — The active workout mode: guided set-by-set, with a live timer.

**Auto-labeling:** When exercises are added, `autoLabel()` reads the muscle groups of all selected exercises and auto-generates the day label (e.g., "Chest & Shoulders").

**AI Template Suggestions:** On first use, FitLab reads the user's goal from their profile and calls `getTemplateForGoal(goal)` to offer a pre-built weekly plan (e.g., "PPL - Power" for muscle building, "Fat Burner Circuit" for weight loss).

---

## 7. How Does the Workout Timer Work?

**Elapsed Timer (Total Workout Duration):**
When the user taps "Start Workout", the current Unix timestamp (`Date.now()`) is stored in state (`workoutStartTime`). A `setInterval` running every 1000ms computes `Math.floor((Date.now() - workoutStartTime) / 1000)` and formats it as `M:SS`.

**Rest Timer (Between Sets):**
After each completed set, `startRest(seconds)` is called. A `setInterval` counts down from the exercise's configured `restSeconds`. At every tick: `setRestTime(prev => prev <= 1 ? (clearInterval, 0) : prev - 1)`. The user can also tap "Skip Rest" to clear the interval early.

**Session Persistence:**
The active workout state (`currentExIdx`, `currentSet`, `completedSets`, `workoutStartTime`) is written to `localStorage` after every change. If the app crashes or the user navigates away, re-opening restores the session exactly where they left off.

**Progress Tracking:**
```
overallProgress = (completedSets / totalSets) * 100
```
A Framer Motion animated bar fills up as sets are completed.

---

## 8. How Does the Calorie Tracker Work? (The Math Behind TDEE)

**Goal:** Give the user a personalized daily calorie target and track their intake against it.

**Step 1 — BMR (Basal Metabolic Rate):**
Using the **Mifflin-St Jeor Equation** (the most validated modern formula):
```
BMR = (10 × weight_kg) + (6.25 × height_cm) − (5 × age)
     + 5   (Male)
     − 161 (Female)
     − 78  (Other)
```

**Step 2 — TDEE (Total Daily Energy Expenditure):**
BMR is multiplied by an **activity multiplier** based on fitness level:
```
Beginner     → BMR × 1.375  (light activity)
Intermediate → BMR × 1.55   (moderate activity)
Advanced     → BMR × 1.725  (very active)
```

**Step 3 — Goal Adjustment:**
```
Lose Weight  → TDEE − 500 kcal  (creates a deficit)
Build Muscle → TDEE + 300 kcal  (slight surplus)
Keep Fit     → TDEE (maintenance)
```

**Minimum floor: 1,200 kcal** (clinically safe minimum).

**Water Goal:**
```
Water Goal (ml) = weight_kg × 35
```
Based on the general recommendation of 35ml per kg of bodyweight.

**Arc Gauge (UI):**
The calorie visualization is an SVG semi-circle split into 30 segments. Each segment fills based on `Math.round((consumed/goal) * 30)`. If `consumed > goal`, segments turn red — "Over Budget!" The arc is drawn using trigonometry: each segment is an SVG `<path>` arc computed from `Math.cos/sin` at each segment's angle.

---

## 9. How Does the AI Form Checker Work?

This is the most technically complex feature. It works in three layers:

### Layer 1: Pose Detection (MediaPipe)

The `usePoseLandmarker` hook initializes **Google MediaPipe's PoseLandmarker** model on component mount:
- Downloads the `pose_landmarker_lite.task` model (a TFLite model, ~6MB).
- Runs in **VIDEO mode** on the GPU delegate.
- Outputs 33 body landmarks per frame, each with `{x, y, z}` normalized coordinates (0.0–1.0 relative to frame size).

A `requestAnimationFrame` loop feeds each video frame to `landmarker.detectForVideo(videoElement, timestamp)` at ~30fps.

### Layer 2: Geometry & State Machine (Exercise Processors)

Each exercise has a dedicated processor class implementing `IExerciseProcessor`. All processors use the same core math from `poseUtils.ts`:

**The Core Angle Formula (Law of Cosines / Dot Product):**
```typescript
function findAngle(p1, p2, refPt): number {
  // Translate both vectors to refPt as origin
  const p1Ref = { x: p1.x - refPt.x, y: p1.y - refPt.y };
  const p2Ref = { x: p2.x - refPt.x, y: p2.y - refPt.y };
  
  // Dot product
  const dot = p1Ref.x * p2Ref.x + p1Ref.y * p2Ref.y;
  const mag1 = Math.sqrt(p1Ref.x² + p1Ref.y²);
  const mag2 = Math.sqrt(p2Ref.x² + p2Ref.y²);
  
  // θ = arccos(dot / (|A| × |B|))
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.floor((180 / Math.PI) * Math.acos(cosTheta));
}
```

This gives the angle at any joint. For example, `findAngle(hip, {x: knee.x, y: 0}, knee)` gives the angle between the thigh and a vertical reference line — the **knee vertical angle** used to determine squat depth.

**State Machine (Squat Example):**

The squat has 3 states based on the knee vertical angle:
```
s1 (Standing):   kneeAngle in [165°, 195°]  — upright
s2 (Transition): kneeAngle in [80°, 165°]   — descending/ascending
s3 (Bottom):     kneeAngle in [50°, 80°]    — parallel or below
```

A rep is counted ONLY when the sequence `s1 → s2 → s3 → s2 → s1` is observed, AND:
- The state was held for at least 3 consecutive frames (debouncing noise)
- The bottom was held for ≥ 2 frames
- At least 800ms has passed since the last rep (anti-cheat)
- The hips actually dropped ≥ 12% of the person's body height (anti-cheat)

### Layer 3: Form Feedback Rules

Each processor checks angular thresholds against configurable `Thresholds` objects (different values for Beginner vs Pro mode):

| Check | How it's detected |
|---|---|
| **Knees caving in** (valgus) | In front view: `kneeWidth / ankleWidth < threshold` |
| **Hip shift** | `|hipMidX - shoulderMidX| > threshold` |
| **Squat too deep** | `kneeAngle > KNEE_THRESH[2]` (hyper-flexion) |
| **Knee over toe** | `ankleVertAngle > ANKLE_THRESH` |
| **Back not straight** | `hipVertAngle > HIP_THRESH[1]` |
| **Not aligned** | `offsetAngle > OFFSET_THRESH` (side view check) |
| **Not facing camera** | `offsetAngle < MIN_OFFSET` (front view check) |

**Side View vs Front View:**
- **Side view** checks sagittal plane mechanics: depth, back angle, knee tracking over toes.
- **Front view** checks frontal plane: knee valgus (knees caving), hip shift (leaning left/right), shoulder imbalance.

The user can toggle between both views mid-session with the "Eye" button.

**WOW Visual Features on Canvas:**
- **AR Trajectory Trail:** A cyan glowing trail follows the hip joint, drawn by fading line segments. The trail shows *how* you moved through the rep.
- **Muscle Activation Heatmap:** A color gradient polygon drawn between hip and knee changes from green→yellow→red as squat depth increases, simulating "which muscles are working harder."

### Layer 4: Text-to-Speech Coaching
Using the browser's `SpeechSynthesis` API, feedback messages are spoken aloud:
- Same message won't repeat within 4 seconds (throttled via timestamp map).
- Rate set to 1.1x for a coaching-style delivery.
- Can be muted with a toggle button.

**Supported Exercises:** Squat, Deadlift, Bench Press, OHP, Lunge, Push-ups, Pull-ups, Spot Jogging — each with their own custom processor and threshold sets.

---

## 10. What is the FitLab Brain? (Cross-Feature Intelligence)

`fitlabBrain.ts` is the adaptive intelligence layer — a pure-function module (no React state) that reads from ALL four features and generates cross-feature advisories.

**How it works:**
Every feature page calls `getFitLabContext()` at render time. This function:
1. Reads sleep data from `localStorage`
2. Reads nutrition/calorie data
3. Reads today's workout log
4. Reads recent AI form sessions

Then it computes:

**Intensity Modifier:**
```typescript
let modifier = 1.0;
if (sleepScore >= 85) modifier += 0.15;  // great sleep → push harder
if (sleepScore < 55)  modifier -= 0.25;  // bad sleep → go easy
if (isUnderfueled)    modifier -= 0.15;  // not enough food → reduce intensity
if (waterPct < 40)    modifier -= 0.10;  // dehydrated → reduce intensity
modifier = clamp(modifier, 0.5, 1.3);
```

**Cross-Feature Advisory Examples:**
- Sleep score 45 → shows "Fatigue Warning" on the Form Checker page
- Heavy workout done + low calorie intake → shows "Refuel Now! 🚨" on Calorie page
- Great sleep score 90 → shows "Peak Form Day ⚡" on Workout page
- Sleep trend declining over 4+ days → shows "Consider deloading this week"

Each advisory has a `level` (positive/info/warning/critical), an icon, title, message, and a `targetFeature` so it only appears on the relevant page.

---

## 11. How Does the Sleep Tracker Work?

**Flow:**
1. User sets an optional wake-up alarm (hour + minute dropdowns).
2. Taps "Start Sleep Session" → `bedtime = Date.now()` is stored.
3. App enters "Sleeping" view with an animated moon, elapsed timer (HH:MM:SS), and tracks the alarm.
4. On wake, user taps "I'm Awake!" and rates their sleep (1–5 stars) and mood (5 emoji options).
5. Session is saved with a computed `score`.

**Sleep Score Formula:**
```typescript
function calcScore(durationMin, quality): number {
  const idealMin = 480; // 8 hours
  const durationDiff = Math.abs(durationMin - idealMin);
  const durationScore = Math.max(0, 100 - durationDiff * 0.3);
  // penalty: 0.3 points per minute away from 8h
  
  const qualityScore = (quality / 5) * 100;
  // 1 star = 20, 3 stars = 60, 5 stars = 100
  
  return Math.round(durationScore * 0.5 + qualityScore * 0.5);
  // 50% weight on duration, 50% on subjective quality
}
```

**Sleep Consistency Analysis:**
Using statistical variance on bedtimes from the last 7 entries:
```typescript
const avg = bedtimes.reduce((a, b) => a + b) / n;
const variance = Math.sqrt(sum((t - avg)²) / n);
// If variance <= 30 minutes → "Great consistency!"
// If variance > 30 minutes → "Try going to bed at a regular time."
```

**Weekly Bar Chart:**
Each bar height = `(durationMin / 600) * 100` — capped at 100% (10 hours = full bar). Color-coded by score: green (≥70), blue (≥50), grey (below).

**Alarm System:**
The alarm is checked every second inside the sleep timer's `setInterval`. When `now.getHours() === alarmHour && now.getMinutes() === alarmMinute`, the `AlarmScreen` overlay fires. The alarm uses a **puzzle challenge** (math problem) to prevent sleepy accidental dismissals — ensuring the user is actually awake.

**Sleep Trend Detection:**
Compares the average score of the most recent 3 entries vs the 3 before that:
```
recentAvg > olderAvg + 5 → "improving"
recentAvg < olderAvg - 5 → "declining"
else                      → "stable"
```

---

## 12. What is the Navigation System? (Bottom Sheet Menu)

Instead of a standard tab bar, FitLab uses a **draggable swipe-up bottom sheet** (`BottomMenu.tsx`).

- A "handle" at the bottom of the screen invites the user to drag upward.
- Uses Framer Motion's drag gestures with `onDragEnd` — if the drag velocity or distance crosses a threshold, the sheet snaps open; otherwise it snaps closed.
- Inside, features are organized in a grid with category labels (PLAN, LOG, ANALYZE, RECOVER).
- This design choice: (a) maximizes the active workout view — no tab bar eating up real estate, (b) feels like a native mobile gesture the user already knows from system interfaces.

---

## 13. What is the Onboarding & User Profile System?

On first launch, the user completes a 4-step onboarding (`Onboarding.tsx`):
1. **Goal** — Lose Weight / Build Muscle / Keep Fit
2. **Body Stats** — Gender, Age, Height (cm), Weight (kg), Target Weight
3. **Fitness Level** — Beginner / Intermediate / Advanced
4. **Profile Photo** (optional)

This data is saved as a `UserProfile` object in `localStorage`. From this single source, the app derives:
- **TDEE** (daily calorie target)
- **Water goal** (35ml × weight)
- **Workout template** (`getTemplateForGoal`)
- **Exercise thresholds** (Beginner vs Pro mode in AI Form Checker)
- **Estimated weeks to goal** (`|currentWeight - targetWeight| / 0.5 kg per week`)

---

## 14. What is the Streak System?

The Dashboard shows a streak banner (e.g., "🔥 3 days streak").

- Streak is computed by `streakUtils.ts` which reads workout logs from `localStorage`.
- Counts consecutive days (from today backwards) where a workout was logged.
- If no workout today but yesterday was logged, the streak is maintained.
- A flame icon glows and pulses via CSS animation when streak > 0.

---

## 15. What is the Badge / Achievement System?

`badgeUtils.ts` evaluates all user data to award milestone badges:
- "First Rep" — First workout logged
- "Streak Warrior" — 7-day streak
- "Century Club" — 100 total correct reps in AI Form Checker
- "Sleep Champion" — Average sleep score > 80 for 5 days
- "Hydration Hero" — Hit water goal 3 days in a row

A `BadgeNotifier` component checks for newly unlocked badges on mount and shows a toast notification via the Sonner library.

---

## 16. Common Follow-Up Interview Questions

**Q: Why LocalStorage and not a real database?**
A: The design decision was offline-first. A fitness app must work in a gym with bad WiFi. LocalStorage provides instant reads/writes with no latency. Firebase acts as an optional cloud sync layer on top, not as the primary store. This architecture means zero dependency on internet connectivity for core features.

**Q: How does MediaPipe run in the browser? Isn't it slow?**
A: MediaPipe Tasks Vision compiles the model to WebAssembly (WASM) and uses the WebGL GPU delegate for inference. On a modern phone (2021+), inference runs in ~15–30ms per frame, well within the 33ms budget for 30fps. The `pose_landmarker_lite` model is specifically designed for mobile — it's a smaller, quantized (float16) version of the full model.

**Q: What's the difference between Beginner and Pro mode in AI Form Checker?**
A: The `Thresholds` object that each processor uses changes. Pro mode uses tighter angle ranges (e.g., squat depth must be below 75° knee angle vs 80° for beginner), narrower error tolerances, and requires more consistent form across reps before counting them.

**Q: How does the app handle the camera on Android vs web?**
A: On Android (Capacitor), `Camera.requestPermissions()` is called first via the Capacitor Camera plugin, which triggers the native Android permission dialog. Then `navigator.mediaDevices.getUserMedia()` opens the camera stream. On web, the Capacitor call is a no-op and falls back gracefully — the browser's own permission prompt handles it.

**Q: Can you explain the Mifflin-St Jeor equation more?**
A: It was published in 1990 by Mifflin et al. and validated against indirect calorimetry studies. It's preferred over the older Harris-Benedict equation (1919) because it was developed with modern populations and accounts for contemporary body compositions. The formula itself is a linear regression model fit to measured BMR data across many subjects.

**Q: What would you improve if you had 3 more months?**
A: (1) Add AI rep tracking via rep count from the camera rather than manual "Complete Set" tapping. (2) Integrate a food barcode scanner for instant calorie logging. (3) Add HRV (heart rate variability) tracking via the camera's flashlight (rPPG technique) for deeper recovery insights. (4) Build an ML model trained on form session data to give exercise-specific coaching that improves over time.

---

## 17. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    FitLab App Shell                     │
│  React Router (SPA) + Framer Motion Page Transitions    │
└────────┬──────────────┬───────────────┬────────────────-┘
         │              │               │               │
    Dashboard    WorkoutRoster    CalorieTracker   SleepTracker
    (home)       (plan + live     (TDEE + meals)  (sessions +
                  workout)                          alarm)
         │              │               │               │
         └──────────────┴───────────────┴───────────────┘
                                │
                        FitLab Brain
                    (fitlabBrain.ts — reads all
                     localStorage, emits advisories
                     and intensity modifier)
                                │
                   AIFormChecker (flagship)
                      │
              ┌───────┴────────┐
         MediaPipe         Exercise Processors
         PoseLandmarker    (SquatProcessor,
         (33 landmarks     DeadliftProcessor, etc.)
          @ 30fps GPU)          │
                          Angle Math (dot product)
                          State Machine (s1→s2→s3)
                          Form Rules (threshold checks)
                          Canvas Drawing (skeleton,
                           heatmap, AR trail)
                          TTS Feedback (SpeechSynthesis)
```

---

*Last updated: May 2026 — FitLab v1.2.0*
