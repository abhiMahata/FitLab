/**
 * authContext.tsx
 * React Context for Firebase Authentication state.
 * Provides useAuth() hook for login, signup, signout, and current user.
 * Integrates with cloudSync for Firestore data synchronization.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail,
    updateProfile,
    type User,
} from "firebase/auth";
import { auth } from "./firebase";
import { startAutoSync, stopAutoSync, pushToCloud } from "./cloudSync";
import { trackEvent } from "./firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName?: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);

            // Start or stop cloud sync based on auth state
            if (firebaseUser) {
                startAutoSync(firebaseUser.uid);
            } else {
                stopAutoSync();
            }
        });
        return () => {
            unsubscribe();
            stopAutoSync();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
        // Sync starts automatically via onAuthStateChanged subscriber
        trackEvent("login", { method: "email" });
    };

    const signUp = async (email: string, password: string, displayName?: string) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName && cred.user) {
            await updateProfile(cred.user, { displayName });
        }
        trackEvent("sign_up", { method: "email" });
    };

    const signOut = async () => {
        // Push final data before signing out if connected
        if (user) {
            try {
                await pushToCloud(user.uid);
            } catch {
                // Ignore offline sync errors during signout
            }
        }
        stopAutoSync();
        await firebaseSignOut(auth);
        setUser(null);
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}

