import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import WorkoutRoster from "./pages/WorkoutRoster";
import CalorieTracker from "./pages/CalorieTracker";
import AIFormChecker from "./pages/AIFormChecker";
import SleepTracker from "./pages/SleepTracker";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
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

export default App;
