/**
 * Login.tsx
 * Email/Password authentication page.
 * Matches FitLab dark premium aesthetic with animated transitions.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User, Dumbbell, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/authContext";

interface LoginProps {
    onSuccess?: () => void;
}

const Login = ({ onSuccess }: LoginProps) => {
    const { signIn, signUp, resetPassword } = useAuth();

    const [isSignUp, setIsSignUp] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password, displayName || undefined);
            } else {
                await signIn(email, password);
            }
            onSuccess?.();
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            switch (firebaseError.code) {
                case "auth/user-not-found":
                    setError("No account found with this email.");
                    break;
                case "auth/wrong-password":
                    setError("Incorrect password.");
                    break;
                case "auth/email-already-in-use":
                    setError("An account with this email already exists.");
                    break;
                case "auth/invalid-email":
                    setError("Please enter a valid email address.");
                    break;
                case "auth/too-many-requests":
                    setError("Too many attempts. Please try again later.");
                    break;
                case "auth/invalid-credential":
                    setError("Invalid email or password.");
                    break;
                default:
                    setError(firebaseError.message || "Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError("");
        setSuccess("");
        if (!email) {
            setError("Enter your email address first.");
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email);
            setSuccess("Password reset email sent! Check your inbox.");
            setTimeout(() => setShowForgot(false), 3000);
        } catch (err: unknown) {
            const firebaseError = err as { code?: string; message?: string };
            if (firebaseError.code === "auth/user-not-found") {
                setError("No account found with this email.");
            } else {
                setError("Failed to send reset email. Try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header / Branding */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center pt-16 pb-8 px-6"
            >
                <div className="w-20 h-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-5 shadow-lg shadow-primary/10">
                    <Dumbbell className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">FitLab</h1>
                <p className="text-muted-foreground text-sm mt-1">Your AI-powered fitness companion</p>
            </motion.div>

            {/* Form Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex-1 px-6 pb-8"
            >
                <AnimatePresence mode="wait">
                    {showForgot ? (
                        /* ─── Forgot Password ─── */
                        <motion.div
                            key="forgot"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <h2 className="text-xl font-bold text-foreground mb-2">Reset Password</h2>
                            <p className="text-muted-foreground text-sm mb-6">
                                Enter your email and we'll send you a reset link.
                            </p>

                            <div className="relative mb-4">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email address"
                                    className="w-full bg-muted rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>

                            {error && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mb-4 bg-destructive/10 px-4 py-2 rounded-lg">
                                    {error}
                                </motion.p>
                            )}
                            {success && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-primary text-sm mb-4 bg-primary/10 px-4 py-2 rounded-lg">
                                    {success}
                                </motion.p>
                            )}

                            <button
                                onClick={handleForgotPassword}
                                disabled={loading}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 mb-4"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
                                Send Reset Link
                            </button>

                            <button
                                onClick={() => { setShowForgot(false); setError(""); setSuccess(""); }}
                                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← Back to sign in
                            </button>
                        </motion.div>
                    ) : (
                        /* ─── Sign In / Sign Up ─── */
                        <motion.form
                            key="auth"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={handleSubmit}
                        >
                            {/* Tab Toggle */}
                            <div className="flex bg-muted rounded-xl p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(false); setError(""); }}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${!isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                                        }`}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(true); setError(""); }}
                                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                                        }`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            <div className="space-y-3">
                                {/* Display Name (Sign Up only) */}
                                <AnimatePresence>
                                    {isSignUp && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="relative overflow-hidden"
                                        >
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                placeholder="Display name (optional)"
                                                className="w-full bg-muted rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Email */}
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email address"
                                        className="w-full bg-muted rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                        autoComplete="email"
                                    />
                                </div>

                                {/* Password */}
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="w-full bg-muted rounded-xl pl-12 pr-12 py-4 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                        autoComplete={isSignUp ? "new-password" : "current-password"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>

                                {/* Confirm Password (Sign Up only) */}
                                <AnimatePresence>
                                    {isSignUp && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="relative overflow-hidden"
                                        >
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm password"
                                                className="w-full bg-muted rounded-xl pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all"
                                                autoComplete="new-password"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Forgot Password */}
                            {!isSignUp && (
                                <button
                                    type="button"
                                    onClick={() => { setShowForgot(true); setError(""); }}
                                    className="text-sm text-primary font-semibold mt-3 mb-1 block"
                                >
                                    Forgot password?
                                </button>
                            )}

                            {/* Error */}
                            {error && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm mt-3 bg-destructive/10 px-4 py-2 rounded-lg">
                                    {error}
                                </motion.p>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-6 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {isSignUp ? "Create Account" : "Sign In"}
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {/* Toggle text */}
                            <p className="text-center text-sm text-muted-foreground mt-6">
                                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                                    className="text-primary font-semibold ml-1"
                                >
                                    {isSignUp ? "Sign In" : "Sign Up"}
                                </button>
                            </p>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Footer */}
            <div className="text-center pb-8">
                <p className="text-xs text-muted-foreground/40">FitLab v1.0 • Your data is encrypted & secure</p>
            </div>
        </div>
    );
};

export default Login;
