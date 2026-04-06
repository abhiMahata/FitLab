# FitLab Application Summary

## 1. The Startup Flow (Splash Screen)
When the user first opens the app, they are greeted by the Splash Screen (`SplashScreen.tsx`):
- It features modern Framer Motion animations, displaying a glowing green dumbbell icon and the text "FitLab".
- It shows a dynamic progress loading bar at the bottom.
- Depending on the phase, a quirky tagline ("Must've Been the wind!") fades into "AI-Powered Fitness Coach".
- After about 3 seconds, the splash screen unmounts smoothly, revealing the main Dashboard.

## 2. The Dashboard (Home Base)
The `Dashboard.tsx` acts as the user's daily command center. It is designed to give a high-level overview of the day at a glance:
- **Header & Quick Action:** Adapts the greeting based on the time of day ("Good Morning/Afternoon/Evening") and provides a quick-access `Zap` icon in the top right to jump straight into the AI Form Checker.
- **Streak Banner:** A dynamic banner showing the user's current activity streak (e.g., "3 days streak"). If a streak is active, a flame icon animates and glows.
- **Quick Stats:** Three compact cards showing the number of planned exercises today, current water intake in Liters, and today's status ("Ready", "✓ Done", or "Rest").
- **Today's Workout Card:** Shows a summary of what's planned for the current day based on the roster. It previews the first 4 exercises with their sets/reps. Tapping this card jumps straight to the Workout Roster.
- **Water Intake Tracker:** A dedicated card with a large circular progress ring. It allows the user to quickly log water by selecting a bottle size (250ml to 1L) and hitting `+ Add`.
- **Fun Fact:** A dynamically selected fitness fact for motivation and learning (e.g., "Muscle tissue burns 3× more calories at rest...").

## 3. Navigation System (Bottom Menu)
Unlike traditional tab bars, FitLab uses a modern, draggable Swipe-Up Bottom Sheet (`BottomMenu.tsx`).
- The user grabs the "handle" at the bottom of the screen and drags it up to reveal the app's core feature grid.
- Features are categorized logically: PLAN (Workout), LOG (Calories), ANALYZE (AI Form), and RECOVER (Sleep).
- There is also a direct link to the user's Profile & Settings at the bottom of the menu.

## 4. The Core Features (The specific App Pages)
When traversing via the Bottom Menu, the user can access varying functional pillars of the app:

* **Workout Roster (`/workout-roster`)**
   - The user schedules what exercises they will perform on what days (Monday - Sunday).
   - They define sets and reps, acting as their personalized workout planner. The Dashboard pulls today's routine directly from this module.

* **Calorie Tracker (`/calorie-tracker`)**
   - Allows the user to precisely track their daily energy intake. Handles logging meals and visualizes macros (Proteins, Carbs, Fats) to help hit nutritional goals.

* **AI Form Checker (`/ai-form-checker` & processors)**
   - This is the flagship technical feature. It uses device cameras and MediaPipe Vision to track body landmarks in real-time.
   - It records specific movements and uses complex math to determine limb angles (e.g., knee angles, hip shifts).
   - Real-Time Feedback: It can draw a skeleton over the user and provide on-screen feedback if it detects bad form—such as "KNEES CAVING IN", "SQUAT TOO DEEP", or "CAMERA NOT ALIGNED". It intelligently routes between tracking side profiles and frontal views for perfect technique analysis.

* **Sleep Tracker (`/sleep-tracker`)**
   - Dedicated to recovery management. Tracks the user's sleep cycles, bedtime, and wake time, aiming to improve overall performance.

* **Profile & Settings (`/profile`)**
   - Displays user preferences. This is where users toggle settings like Light/Dark mode and read up on the app's Help resources explaining how each main module functions.

## Summary of App Architecture
FitLab is built as a React (Vite + TypeScript) Single Page Application interacting with standard DOM APIs and LocalStorage for data persistence. It relies heavily on Tailwind CSS for aesthetic styling, Framer Motion for silky-smooth micro-animations, Radix UI/Lucide React for iconography, and Google's MediaPipe for its advanced Computer Vision capabilities.
