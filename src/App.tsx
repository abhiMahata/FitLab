import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import BadgeNotifier from "./components/BadgeNotifier";
import Dashboard from "./pages/Dashboard";
import WorkoutRoster from "./pages/WorkoutRoster";
import CalorieTracker from "./pages/CalorieTracker";
import AIFormChecker from "./pages/AIFormChecker";
import SleepTracker from "./pages/SleepTracker";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import { getProfile } from "./lib/userProfile";

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    const p = getProfile();
    return p ? p.completedOnboarding : false;
  });

  if (!showSplash && !hasOnboarded) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<Onboarding onComplete={() => setHasOnboarded(true)} />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <BadgeNotifier />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workout-roster" element={<WorkoutRoster />} />
          <Route path="/calorie-tracker" element={<CalorieTracker />} />
          <Route path="/ai-form-checker" element={<AIFormChecker />} />
          <Route path="/sleep-tracker" element={<SleepTracker />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
