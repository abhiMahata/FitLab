import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, User, ChevronRight, Clock, Flame, Trophy, Settings, HelpCircle, Camera, Sun, Moon, X, Dumbbell, UtensilsCrossed, ScanEye, BedDouble, Trash2, LogOut, Mail, KeyRound, Download, Target, Ruler, Weight, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";
import { checkBadges } from "@/lib/badgeUtils";
import { loadWorkoutLogs } from "@/lib/exerciseLibrary";
import { getProfile as getUserProfile, saveProfile as saveUserProfile, calculateBMI, type Goal, type FitnessLevel, type UserProfile } from "@/lib/userProfile";
import { useAuth } from "@/lib/authContext";
import teamCreditsImg from "@/assets/team_credits.jpeg";

type ThemeMode = "dark" | "light";

const Profile = () => {
    const navigate = useNavigate();
    const { user, signOut, resetPassword } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showAccount, setShowAccount] = useState(false);
    const [showFitness, setShowFitness] = useState(false);
    const [showGeneral, setShowGeneral] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [passwordResetSent, setPasswordResetSent] = useState(false);

    // Fitness profile editor state
    const [editAge, setEditAge] = useState(25);
    const [editHeight, setEditHeight] = useState(170);
    const [editWeight, setEditWeight] = useState(70);
    const [editTargetWeight, setEditTargetWeight] = useState(70);
    const [editGoal, setEditGoal] = useState<Goal>("Keep Fit");
    const [editFitnessLevel, setEditFitnessLevel] = useState<FitnessLevel>("Beginner");

    const [theme, setTheme] = useState<ThemeMode>(() => {
        return (localStorage.getItem("fitlab-theme") as ThemeMode) || "dark";
    });

    // Apply theme to <html>
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(theme);
        localStorage.setItem("fitlab-theme", theme);
    }, [theme]);

    // Load fitness profile into editor when opening
    const openFitnessEditor = () => {
        const p = getUserProfile();
        if (p) {
            setEditAge(p.age);
            setEditHeight(p.heightCm);
            setEditWeight(p.weightKg);
            setEditTargetWeight(p.targetWeightKg);
            setEditGoal(p.goal);
            setEditFitnessLevel(p.fitnessLevel);
        }
        setShowFitness(true);
    };

    const saveFitnessProfile = () => {
        const existing = getUserProfile();
        const updated: UserProfile = {
            gender: existing?.gender || "Male",
            age: editAge,
            heightCm: editHeight,
            weightKg: editWeight,
            targetWeightKg: editTargetWeight,
            goal: editGoal,
            fitnessLevel: editFitnessLevel,
            completedOnboarding: true,
        };
        saveUserProfile(updated);
        setShowFitness(false);
    };

    const handleChangePassword = async () => {
        if (user?.email) {
            await resetPassword(user.email);
            setPasswordResetSent(true);
            setTimeout(() => setPasswordResetSent(false), 4000);
        }
    };

    const handleExportData = () => {
        const data: Record<string, unknown> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("fitlab-")) {
                try { data[key] = JSON.parse(localStorage.getItem(key) || ""); } catch { data[key] = localStorage.getItem(key); }
            }
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `fitlab-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Badges ──
    const badges = useMemo(() => checkBadges(), []);
    const unlockedCount = badges.filter((b) => b.unlocked).length;

    // ── Real stats from workout logs ──
    const workoutStats = useMemo(() => {
        const logs = loadWorkoutLogs();
        const totalWorkouts = logs.length;
        const totalSeconds = logs.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        // Rough calorie estimate: ~5 cal per minute of exercise
        const calories = Math.round((totalSeconds / 60) * 5);
        return { totalWorkouts, timeLabel: `${hours}h ${mins}m`, calories };
    }, []);

    const userProfile = getUserProfile();
    const bmi = calculateBMI(userProfile);

    const settingsSections = [
        {
            label: "Account",
            icon: Mail,
            iconBg: "bg-primary/15",
            iconColor: "text-primary",
            action: () => setShowAccount(true),
        },
        {
            label: "Fitness Profile",
            icon: Target,
            iconBg: "bg-fitlab-orange/15",
            iconColor: "text-fitlab-orange",
            action: openFitnessEditor,
        },
        {
            label: "General",
            icon: Settings,
            iconBg: "bg-fitlab-blue/15",
            iconColor: "text-fitlab-blue",
            action: () => setShowGeneral(true),
        },
        {
            label: "Export Data",
            icon: Download,
            iconBg: "bg-fitlab-purple/15",
            iconColor: "text-fitlab-purple",
            action: handleExportData,
        },
        /*
        {
            label: "Team Credits",
            icon: Users,
            iconBg: "bg-green-500/15",
            iconColor: "text-green-500",
            action: () => setShowCredits(true),
        },*/
        {
            label: "Help",
            icon: HelpCircle,
            iconBg: "bg-muted",
            iconColor: "text-muted-foreground",
            action: () => setShowHelp(true),
        },
    ];

    const helpSections = [
        {
            icon: Dumbbell,
            iconBg: "bg-primary/15",
            iconColor: "text-primary",
            title: "Workout Roster",
            description: "Plan your weekly workout schedule. Browse 50+ exercises organized by muscle group, add them to any day of the week, and customize sets, reps, and rest times. Start a live workout session that tracks your progress set-by-set with rest timers. Your roster and active session are auto-saved — close and reopen anytime to pick up where you left off.",
        },
        {
            icon: UtensilsCrossed,
            iconBg: "bg-fitlab-orange/15",
            iconColor: "text-fitlab-orange",
            title: "Calorie Tracker",
            description: "Track your daily calorie intake across 7 days. A semicircular gauge shows your remaining calories against your 2000 cal goal. Add custom food entries organized by meal type — Breakfast, Lunch, Snack, and Dinner. Each entry records the food name and calorie count. All data persists per day.",
        },
        {
            icon: ScanEye,
            iconBg: "bg-fitlab-blue/15",
            iconColor: "text-fitlab-blue",
            title: "AI Form Checker",
            description: "Real-time exercise form analysis using your phone's camera and AI pose detection. Supports Squat, Deadlift, Bench Press, OHP, Lunge, Push-ups, Pull-ups, and Spot Jogging. The AI draws skeleton overlays on your body, counts reps, and gives live feedback on form errors. Switch between front and back cameras as needed.",
        },
        {
            icon: BedDouble,
            iconBg: "bg-fitlab-purple/15",
            iconColor: "text-fitlab-purple",
            title: "Sleep Tracker",
            description: "Track your sleep sessions by tapping 'Start Sleep' when you go to bed and 'I'm Awake' when you wake up. Rate your sleep quality with stars and mood. Set a smart alarm that triggers a puzzle challenge to dismiss — ensuring you actually wake up. View your weekly sleep chart with hours and quality ratings.",
        },
    ];

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
                <h2 className="text-xl font-bold text-foreground">Profile</h2>
                <div className="w-12" /> {/* spacer for centering */}
            </header>

            {/* Profile Avatar & Info */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center px-6 mb-8"
            >
                {/* Avatar */}
                <div className="relative mb-4">
                    <div className="w-28 h-28 rounded-full bg-muted border-4 border-primary/30 flex items-center justify-center overflow-hidden">
                        <User className="w-14 h-14 text-muted-foreground/40" />
                    </div>
                    <button className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                    </button>
                </div>

                {/* Name & Email */}
                <h1 className="text-2xl font-bold text-foreground mb-1">
                    {user?.displayName || "Your Name"}
                </h1>
                <p className="text-muted-foreground text-sm mb-3">
                    {user?.email || "email@example.com"}
                </p>

                {userProfile && (
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1.5 rounded-md bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider">{userProfile.goal}</span>
                        <span className="px-2 py-1.5 rounded-md bg-muted border border-border text-foreground text-xs font-bold">BMI: {bmi}</span>
                    </div>
                )}
            </motion.section>

            {/* Stats Row */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-6 mb-8"
            >
                <div className="solid-card-lg p-5 flex items-center justify-between">
                    <div className="flex-1 text-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold text-foreground">{workoutStats.timeLabel}</span>
                        <span className="text-xs text-muted-foreground block">Total Time</span>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div className="flex-1 text-center">
                        <div className="w-10 h-10 rounded-xl bg-fitlab-orange/15 flex items-center justify-center mx-auto mb-2">
                            <Flame className="w-5 h-5 text-fitlab-orange" />
                        </div>
                        <span className="text-lg font-bold text-foreground">{workoutStats.calories}</span>
                        <span className="text-xs text-muted-foreground block">Burned</span>
                    </div>
                    <div className="w-px h-12 bg-border" />
                    <div className="flex-1 text-center">
                        <div className="w-10 h-10 rounded-xl bg-fitlab-blue/15 flex items-center justify-center mx-auto mb-2">
                            <Trophy className="w-5 h-5 text-fitlab-blue" />
                        </div>
                        <span className="text-lg font-bold text-foreground">{workoutStats.totalWorkouts}</span>
                        <span className="text-xs text-muted-foreground block">Done</span>
                    </div>
                </div>
            </motion.section>

            {/* ═══ Trophy Case ═══ */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="px-6 mb-6"
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground">🏆 Achievements</h3>
                    <span className="text-sm font-semibold text-primary">{unlockedCount}/{badges.length}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {badges.map((badge, idx) => (
                        <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + idx * 0.03 }}
                            className={`solid-card p-3 text-center transition-all ${badge.unlocked
                                    ? "border-primary/30 bg-primary/5"
                                    : "opacity-40"
                                }`}
                        >
                            <span className="text-2xl block mb-1">
                                {badge.unlocked ? badge.emoji : "🔒"}
                            </span>
                            <p className="text-[9px] font-semibold text-foreground leading-tight truncate">
                                {badge.name}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </motion.section>

            {/* Settings Sections */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6 mb-6"
            >
                <div className="solid-card-lg overflow-hidden divide-y divide-border mb-6">
                    {settingsSections.map((section, index) => (
                        <motion.button
                            key={section.label}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + index * 0.05 }}
                            onClick={section.action}
                            className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors"
                        >
                            <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center ${section.iconBg}`}
                            >
                                <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                            </div>
                            <span className="flex-1 text-left text-foreground font-semibold text-base">
                                {section.label}
                            </span>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </motion.button>
                    ))}
                </div>

                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => {
                        if (window.confirm("Are you sure you want to reset all data? This cannot be undone.")) {
                            // Only clear FitLab specific keys to prevent wiping other localhost application data
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('fitlab-')) {
                                    localStorage.removeItem(key);
                                }
                            });
                            window.location.href = "/";
                        }
                    }}
                    className="w-full py-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive font-bold text-base flex items-center justify-center gap-2 hover:bg-destructive/20 transition-all"
                >
                    <Trash2 className="w-5 h-5" />
                    Reset All Data
                </motion.button>

                {/* Sign Out Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    onClick={async () => {
                        if (window.confirm("Sign out of your account?")) {
                            await signOut();
                        }
                    }}
                    className="w-full py-4 rounded-xl border border-muted bg-muted/50 text-foreground font-bold text-base flex items-center justify-center gap-2 hover:bg-muted transition-all mt-3"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </motion.button>
            </motion.section>

            {/* Account Info Modal */}
            <AnimatePresence>
                {showAccount && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
                        onClick={() => setShowAccount(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="solid-card-lg p-6 w-full max-w-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-foreground">Account</h3>
                                <button
                                    onClick={() => setShowAccount(false)}
                                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-foreground" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-muted rounded-xl p-4">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-foreground font-semibold">{user?.email || "Not signed in"}</p>
                                </div>
                                <div className="bg-muted rounded-xl p-4">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Display Name</p>
                                    <p className="text-foreground font-semibold">{user?.displayName || "Not set"}</p>
                                </div>
                                <div className="bg-muted rounded-xl p-4">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Account Created</p>
                                    <p className="text-foreground font-semibold">
                                        {user?.metadata?.creationTime
                                            ? new Date(user.metadata.creationTime).toLocaleDateString()
                                            : "Unknown"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleChangePassword}
                                disabled={passwordResetSent}
                                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                <KeyRound className="w-4 h-4" />
                                {passwordResetSent ? "Reset email sent ✓" : "Change Password"}
                            </button>
                            {passwordResetSent && (
                                <p className="text-xs text-primary text-center mt-2">Check your email for the reset link.</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Fitness Profile Editor Modal */}
            <AnimatePresence>
                {showFitness && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
                        onClick={() => setShowFitness(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="solid-card-lg p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto"
                        >
                            <h3 className="text-xl font-bold text-foreground mb-6">Edit Fitness Profile</h3>

                            <div className="space-y-4 mb-6">
                                {/* Age */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Age</label>
                                    <input type="number" value={editAge} onChange={(e) => setEditAge(Number(e.target.value))}
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {/* Height */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Height (cm)</label>
                                    <input type="number" value={editHeight} onChange={(e) => setEditHeight(Number(e.target.value))}
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {/* Weight */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Weight (kg)</label>
                                    <input type="number" value={editWeight} onChange={(e) => setEditWeight(Number(e.target.value))}
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {/* Target Weight */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Target Weight (kg)</label>
                                    <input type="number" value={editTargetWeight} onChange={(e) => setEditTargetWeight(Number(e.target.value))}
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                {/* Fitness Goal */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Fitness Goal</label>
                                    <div className="space-y-2">
                                        {(["Lose Weight", "Keep Fit", "Build Muscle"] as Goal[]).map(g => (
                                            <button key={g} onClick={() => setEditGoal(g)}
                                                className={`w-full p-3 rounded-xl flex items-center justify-between border-2 transition-all ${editGoal === g ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'}`}>
                                                <span className={`font-semibold text-sm ${editGoal === g ? "text-primary" : "text-foreground"}`}>{g}</span>
                                                {editGoal === g && <Target className="w-4 h-4 text-primary" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Fitness Level */}
                                <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">Fitness Level</label>
                                    <div className="space-y-2">
                                        {(["Beginner", "Intermediate", "Advanced"] as FitnessLevel[]).map(f => (
                                            <button key={f} onClick={() => setEditFitnessLevel(f)}
                                                className={`w-full p-3 rounded-xl flex items-center justify-between border-2 transition-all ${editFitnessLevel === f ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'}`}>
                                                <span className={`font-semibold text-sm ${editFitnessLevel === f ? "text-primary" : "text-foreground"}`}>{f}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowFitness(false)}
                                    className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold">Cancel</button>
                                <button onClick={saveFitnessProfile}
                                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Save</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* General Settings Modal */}
            <AnimatePresence>
                {showGeneral && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
                        onClick={() => setShowGeneral(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="solid-card-lg p-6 w-full max-w-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-foreground">General</h3>
                                <button
                                    onClick={() => setShowGeneral(false)}
                                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-foreground" />
                                </button>
                            </div>

                            {/* Theme Toggle */}
                            <div className="mb-4">
                                <label className="text-sm text-muted-foreground mb-3 block uppercase tracking-wider font-medium">
                                    Appearance
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setTheme("dark")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${theme === "dark"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-muted text-muted-foreground hover:border-muted-foreground/30"
                                            }`}
                                    >
                                        <Moon className="w-5 h-5" />
                                        <span className="font-semibold">Dark</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme("light")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${theme === "light"
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-muted text-muted-foreground hover:border-muted-foreground/30"
                                            }`}
                                    >
                                        <Sun className="w-5 h-5" />
                                        <span className="font-semibold">Light</span>
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground text-center mt-4">
                                Theme preference is saved automatically.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Help Modal */}
            <AnimatePresence>
                {showHelp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center"
                        onClick={() => setShowHelp(false)}
                    >
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-border"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-card p-6 pb-4 border-b border-border flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">FitLab Guide</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">How the app works</p>
                                </div>
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-foreground" />
                                </button>
                            </div>

                            {/* App Flow */}
                            <div className="p-6 space-y-2">
                                {/* Overview */}
                                <div className="solid-card p-4 mb-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        <span className="text-primary font-semibold">FitLab</span> is your all-in-one fitness companion.
                                        Use the <span className="text-foreground font-medium">swipe-up menu</span> from any
                                        screen to navigate between the four core features below. All your data is saved
                                        locally on your device.
                                    </p>
                                </div>

                                {/* Feature Sections */}
                                {helpSections.map((section, idx) => (
                                    <motion.div
                                        key={section.title}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + idx * 0.08 }}
                                        className="solid-card p-5"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.iconBg}`}>
                                                <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                                            </div>
                                            <h4 className="text-base font-bold text-foreground">{section.title}</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {section.description}
                                        </p>
                                    </motion.div>
                                ))}

                                {/* Version */}
                                <div className="text-center pt-4 pb-2">
                                    <p className="text-xs text-muted-foreground/60">FitLab v1.2 • Built with ❤️</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Credits Modal (Full Screen Image Viewer) */}
            <AnimatePresence>
                {showCredits && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 bg-black z-50 flex flex-col"
                    >
                        {/* Header Overlay */}
                        <div className="absolute top-0 left-0 w-full p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                            <button
                                onClick={() => setShowCredits(false)}
                                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                            <h3 className="text-white font-bold tracking-wider mr-2 text-sm drop-shadow-md">THE TEAM</h3>
                            <div className="w-10" />
                        </div>

                        {/* Image Full Size */}
                        <div className="flex-1 flex items-center justify-center w-full h-full overflow-hidden bg-black">
                            <img
                                src={teamCreditsImg}
                                alt="Team"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Menu */}
            <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
        </div>
    );
};

export default Profile;
