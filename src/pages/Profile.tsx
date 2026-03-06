import { useState, useEffect } from "react";
import { ArrowLeft, User, ChevronRight, Clock, Flame, Trophy, Settings, HelpCircle, Camera, Sun, Moon, X, Dumbbell, UtensilsCrossed, ScanEye, BedDouble } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import BottomMenu from "@/components/BottomMenu";

interface ProfileData {
    name: string;
    email: string;
}

type ThemeMode = "dark" | "light";

const Profile = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showGeneral, setShowGeneral] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    const [profile, setProfile] = useState<ProfileData>(() => {
        const saved = localStorage.getItem("fitlab-profile");
        return saved ? JSON.parse(saved) : { name: "", email: "" };
    });

    const [editForm, setEditForm] = useState<ProfileData>(profile);

    const [theme, setTheme] = useState<ThemeMode>(() => {
        return (localStorage.getItem("fitlab-theme") as ThemeMode) || "dark";
    });

    useEffect(() => {
        localStorage.setItem("fitlab-profile", JSON.stringify(profile));
    }, [profile]);

    // Apply theme to <html>
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("dark", "light");
        root.classList.add(theme);
        localStorage.setItem("fitlab-theme", theme);
    }, [theme]);

    const handleSaveProfile = () => {
        setProfile(editForm);
        setIsEditing(false);
    };

    const settingsSections = [
        {
            label: "Personal",
            icon: User,
            iconBg: "bg-primary/15",
            iconColor: "text-primary",
            action: () => setIsEditing(true),
        },
        {
            label: "General",
            icon: Settings,
            iconBg: "bg-fitlab-blue/15",
            iconColor: "text-fitlab-blue",
            action: () => setShowGeneral(true),
        },
        {
            label: "Help",
            icon: HelpCircle,
            iconBg: "bg-fitlab-purple/15",
            iconColor: "text-fitlab-purple",
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
                    {profile.name || "Your Name"}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {profile.email || "email@example.com"}
                </p>
            </motion.section>

            {/* Stats Row */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="px-6 mb-8"
            >
                <div className="glass-card p-5 flex items-center justify-around">
                    <div className="flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold text-foreground">0h 0m</span>
                        <span className="text-xs text-muted-foreground">Total time</span>
                    </div>
                    <div className="w-px h-14 bg-border" />
                    <div className="flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-fitlab-orange/15 flex items-center justify-center mb-2">
                            <Flame className="w-5 h-5 text-fitlab-orange" />
                        </div>
                        <span className="text-lg font-bold text-foreground">0 cal</span>
                        <span className="text-xs text-muted-foreground">Burned</span>
                    </div>
                    <div className="w-px h-14 bg-border" />
                    <div className="flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                            <Trophy className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-lg font-bold text-foreground">0</span>
                        <span className="text-xs text-muted-foreground">Done</span>
                    </div>
                </div>
            </motion.section>

            {/* Settings Sections */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="px-6"
            >
                <div className="glass-card overflow-hidden divide-y divide-border">
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
            </motion.section>

            {/* Edit Profile Modal */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setIsEditing(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card p-6 w-full max-w-sm"
                        >
                            <h3 className="text-xl font-bold text-foreground mb-6">Edit Profile</h3>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="Enter your name"
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        placeholder="Enter your email"
                                        className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-3 rounded-xl bg-muted text-muted-foreground font-semibold hover:bg-muted/80 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveProfile}
                                    className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
                                >
                                    Save
                                </button>
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
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                        onClick={() => setShowGeneral(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-card p-6 w-full max-w-sm"
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
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
                        onClick={() => setShowHelp(false)}
                    >
                        <motion.div
                            initial={{ y: 100 }}
                            animate={{ y: 0 }}
                            exit={{ y: 100 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-border/50"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-card/95 backdrop-blur-xl p-6 pb-4 border-b border-border/50 flex items-center justify-between">
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
                                <div className="glass-card p-4 mb-4">
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
                                        className="glass-card p-5"
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
                                    <p className="text-xs text-muted-foreground/60">FitLab v1.0 • Built with ❤️</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Menu */}
            <BottomMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
        </div>
    );
};

export default Profile;
