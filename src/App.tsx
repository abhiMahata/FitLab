import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import Login from "./pages/Login";
import { getProfile } from "./lib/userProfile";
import { AuthProvider, useAuth } from "./lib/authContext";
import { trackEvent } from "./lib/firebase";


function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    trackEvent("page_view", { page_path: location.pathname });
  }, [location.pathname]);
  return null;
}


const AppContent = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    const p = getProfile();
    return p ? p.completedOnboarding : false;
  });

 
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Auth loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  
  if (!user) {
    return <Login />;
  }

  if (!hasOnboarded) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Onboarding onComplete={() => setHasOnboarded(true)} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <>
      <BadgeNotifier />
      <BrowserRouter>
        <PageTracker />
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
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  );
};

export default App;
