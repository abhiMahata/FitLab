/**
 * AlarmScreen.tsx
 *
 * Full-screen alarm overlay with puzzle challenges.
 * User MUST solve a puzzle to stop the alarm — no snooze, no easy dismiss.
 * Puzzle types: Math, Memory Sequence, Rapid Tap, Type-It-Out.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { alarmSound } from "@/lib/alarmSound";

interface AlarmScreenProps {
    onDismiss: () => void;
}

type PuzzleType = "math" | "sequence" | "tap" | "type";

// ─── Puzzle generators ────────────────────────────────────────────────

function generateMathPuzzle() {
    const ops = ["+", "×"] as const;
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a: number, b: number, answer: number;
    if (op === "+") {
        a = Math.floor(Math.random() * 150) + 50;
        b = Math.floor(Math.random() * 150) + 50;
        answer = a + b;
    } else {
        a = Math.floor(Math.random() * 20) + 5;
        b = Math.floor(Math.random() * 12) + 3;
        answer = a * b;
    }
    return { question: `${a} ${op} ${b} = ?`, answer };
}

function generateSequence(length = 4): number[] {
    return Array.from({ length }, () => Math.floor(Math.random() * 4));
}

const TYPE_PHRASES = [
    "I AM AWAKE AND READY",
    "RISE AND SHINE NOW",
    "TIME TO GET UP TODAY",
    "NO MORE SLEEPING IN",
    "GOOD MORNING WORLD",
    "WAKE UP RIGHT NOW",
];

const TILE_COLORS = [
    "bg-primary", "bg-fitlab-orange", "bg-fitlab-blue", "bg-destructive",
];

const TILE_ACTIVE_COLORS = [
    "bg-primary shadow-[0_0_20px_rgba(74,222,128,0.8)]",
    "bg-fitlab-orange shadow-[0_0_20px_rgba(255,165,0,0.8)]",
    "bg-fitlab-blue shadow-[0_0_20px_rgba(0,127,255,0.8)]",
    "bg-destructive shadow-[0_0_20px_rgba(255,50,50,0.8)]",
];

// ─── Component ────────────────────────────────────────────────────────

const AlarmScreen = ({ onDismiss }: AlarmScreenProps) => {
    const [puzzleType, setPuzzleType] = useState<PuzzleType>("math");
    const [solved, setSolved] = useState(false);
    const [shake, setShake] = useState(false);

    // Math puzzle state
    const [mathPuzzle, setMathPuzzle] = useState(generateMathPuzzle);
    const [mathInput, setMathInput] = useState("");

    // Sequence puzzle state
    const [sequence, setSequence] = useState<number[]>([]);
    const [seqPhase, setSeqPhase] = useState<"showing" | "input">("showing");
    const [seqHighlight, setSeqHighlight] = useState(-1);
    const [seqInput, setSeqInput] = useState<number[]>([]);
    const [seqStep, setSeqStep] = useState(0);

    // Tap puzzle state
    const [tapCount, setTapCount] = useState(0);
    const tapTarget = 30;

    // Type puzzle state
    const [typeTarget, setTypeTarget] = useState("");
    const [typeInput, setTypeInput] = useState("");

    // Start alarm sound
    useEffect(() => {
        alarmSound.start();
        return () => { alarmSound.stop(); };
    }, []);

    // Pick random puzzle on mount
    useEffect(() => {
        const types: PuzzleType[] = ["math", "sequence", "tap", "type"];
        const picked = types[Math.floor(Math.random() * types.length)];
        setPuzzleType(picked);

        if (picked === "math") setMathPuzzle(generateMathPuzzle());
        if (picked === "sequence") {
            const seq = generateSequence(5);
            setSequence(seq);
            setSeqPhase("showing");
        }
        if (picked === "type") {
            setTypeTarget(TYPE_PHRASES[Math.floor(Math.random() * TYPE_PHRASES.length)]);
        }
    }, []);

    // Sequence: show the pattern
    useEffect(() => {
        if (puzzleType !== "sequence" || seqPhase !== "showing" || sequence.length === 0) return;
        let i = 0;
        const timer = setInterval(() => {
            if (i < sequence.length) {
                setSeqHighlight(sequence[i]);
                setTimeout(() => setSeqHighlight(-1), 500);
                i++;
            } else {
                clearInterval(timer);
                setTimeout(() => setSeqPhase("input"), 400);
            }
        }, 800);
        return () => clearInterval(timer);
    }, [puzzleType, seqPhase, sequence]);

    const triggerShake = useCallback(() => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    }, []);

    const handleDismiss = useCallback(() => {
        setSolved(true);
        alarmSound.stop();
        setTimeout(() => onDismiss(), 600);
    }, [onDismiss]);

    // ── Math submit ──
    const handleMathSubmit = useCallback(() => {
        if (Number(mathInput) === mathPuzzle.answer) {
            handleDismiss();
        } else {
            setMathInput("");
            triggerShake();
        }
    }, [mathInput, mathPuzzle, handleDismiss, triggerShake]);

    // ── Sequence tile tap ──
    const handleSeqTap = useCallback((tileIdx: number) => {
        if (seqPhase !== "input") return;
        const expected = sequence[seqStep];
        if (tileIdx === expected) {
            const newInput = [...seqInput, tileIdx];
            setSeqInput(newInput);
            setSeqStep(seqStep + 1);
            if (newInput.length === sequence.length) {
                handleDismiss();
            }
        } else {
            // Wrong — restart
            setSeqInput([]);
            setSeqStep(0);
            setSeqPhase("showing");
            triggerShake();
        }
    }, [seqPhase, sequence, seqStep, seqInput, handleDismiss, triggerShake]);

    // ── Tap puzzle ──
    const handleTap = useCallback(() => {
        const newCount = tapCount + 1;
        setTapCount(newCount);
        if (newCount >= tapTarget) handleDismiss();
    }, [tapCount, handleDismiss]);

    // ── Type puzzle ──
    const handleTypeSubmit = useCallback(() => {
        if (typeInput.trim().toUpperCase() === typeTarget) {
            handleDismiss();
        } else {
            setTypeInput("");
            triggerShake();
        }
    }, [typeInput, typeTarget, handleDismiss, triggerShake]);

    // Current time
    const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    useEffect(() => {
        const t = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        }, 1000);
        return () => clearInterval(t);
    }, []);

    if (solved) {
        return (
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
            >
                <p className="text-3xl font-bold text-primary">☀️ Good Morning!</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex flex-col"
        >
            {/* Flashing background */}
            <motion.div
                animate={{ backgroundColor: ["rgba(220,38,38,0.15)", "rgba(220,38,38,0.05)", "rgba(220,38,38,0.15)"] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 bg-background"
            />

            <div className="relative z-10 flex flex-col h-full p-6">
                {/* Time */}
                <div className="text-center pt-8 mb-8">
                    <motion.p
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-6xl font-bold text-foreground font-mono"
                    >
                        {time}
                    </motion.p>
                    <p className="text-destructive font-bold text-lg mt-2 uppercase tracking-widest">
                        ⏰ ALARM — SOLVE TO STOP
                    </p>
                </div>

                {/* Puzzle Area */}
                <motion.div
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex-1 flex flex-col items-center justify-center"
                >
                    {/* ── MATH PUZZLE ── */}
                    {puzzleType === "math" && (
                        <div className="w-full max-w-sm text-center">
                            <div className="glass-card p-6 mb-6">
                                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                                    Solve to dismiss
                                </p>
                                <p className="text-4xl font-bold text-foreground mb-6">
                                    {mathPuzzle.question}
                                </p>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={mathInput}
                                    onChange={(e) => setMathInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleMathSubmit()}
                                    placeholder="Your answer"
                                    autoFocus
                                    className="w-full bg-muted rounded-xl px-4 py-4 text-center text-2xl font-bold text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleMathSubmit}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg"
                            >
                                Submit Answer
                            </motion.button>
                        </div>
                    )}

                    {/* ── SEQUENCE PUZZLE ── */}
                    {puzzleType === "sequence" && (
                        <div className="w-full max-w-sm text-center">
                            <div className="glass-card p-6 mb-6">
                                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                                    {seqPhase === "showing" ? "Watch the sequence..." : "Repeat the sequence!"}
                                </p>
                                <p className="text-foreground font-semibold mb-6">
                                    {seqPhase === "input" && `${seqStep} / ${sequence.length}`}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[0, 1, 2, 3].map((idx) => (
                                        <motion.button
                                            key={idx}
                                            whileTap={seqPhase === "input" ? { scale: 0.9 } : {}}
                                            onClick={() => handleSeqTap(idx)}
                                            disabled={seqPhase === "showing"}
                                            className={`aspect-square rounded-2xl transition-all duration-200 ${seqHighlight === idx
                                                    ? TILE_ACTIVE_COLORS[idx]
                                                    : `${TILE_COLORS[idx]} opacity-40`
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAP PUZZLE ── */}
                    {puzzleType === "tap" && (
                        <div className="w-full max-w-sm text-center">
                            <div className="glass-card p-6 mb-6">
                                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                                    Tap rapidly to dismiss!
                                </p>
                                <p className="text-5xl font-bold text-foreground mb-2">
                                    {tapCount} / {tapTarget}
                                </p>
                                <div className="h-3 bg-muted rounded-full overflow-hidden mb-6">
                                    <motion.div
                                        className="h-full rounded-full bg-primary"
                                        animate={{ width: `${(tapCount / tapTarget) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleTap}
                                className="w-full py-10 rounded-2xl bg-primary text-primary-foreground font-bold text-2xl active:bg-primary/80"
                            >
                                TAP! TAP! TAP!
                            </motion.button>
                        </div>
                    )}

                    {/* ── TYPE PUZZLE ── */}
                    {puzzleType === "type" && (
                        <div className="w-full max-w-sm text-center">
                            <div className="glass-card p-6 mb-6">
                                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                                    Type exactly to dismiss
                                </p>
                                <p className="text-xl font-bold text-primary mb-6 tracking-wider">
                                    "{typeTarget}"
                                </p>
                                <input
                                    type="text"
                                    value={typeInput}
                                    onChange={(e) => setTypeInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleTypeSubmit()}
                                    placeholder="Type the phrase above..."
                                    autoFocus
                                    className="w-full bg-muted rounded-xl px-4 py-4 text-center text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary uppercase"
                                />
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleTypeSubmit}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg"
                            >
                                Submit
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default AlarmScreen;
