import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, User, Target, Activity, Ruler, Weight, CheckCircle2 } from "lucide-react";
import { Gender, FitnessLevel, Goal, UserProfile, saveProfile, calculateBMI, calculateTDEE, estimateGoalWeeks } from "@/lib/userProfile";

const Onboarding = ({ onComplete }: { onComplete?: () => void }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [gender, setGender] = useState<Gender>("Male");
  const [goal, setGoal] = useState<Goal>("Keep Fit");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>("Beginner");
  const [age, setAge] = useState<number>(25);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(70);

  const nextStep = () => {
    if (step < 6) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const finishOnboarding = () => {
    const profile: UserProfile = {
      gender, age, heightCm, weightKg, targetWeightKg: goal === "Keep Fit" ? weightKg : targetWeightKg, fitnessLevel, goal, completedOnboarding: true,
    };
    saveProfile(profile);
    if (onComplete) onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">What's your gender?</h2>
            <p className="text-muted-foreground mb-8 text-sm">This helps us calculate your BMR and adjust calorie equations.</p>
            <div className="space-y-4">
              {(["Male", "Female", "Other"] as Gender[]).map(g => (
                <button key={g} onClick={() => { setGender(g); setTimeout(nextStep, 300); }} className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${gender === g ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'}`}>
                  <div className="flex items-center gap-3">
                    <User className={`w-5 h-5 ${gender === g ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-semibold ${gender === g ? "text-primary" : "text-foreground"}`}>{g}</span>
                  </div>
                  {gender === g && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">What is your main goal?</h2>
            <p className="text-muted-foreground mb-8 text-sm">We'll tailor your daily calorie targets and tips around this.</p>
            <div className="space-y-4">
              {(["Lose Weight", "Keep Fit", "Build Muscle"] as Goal[]).map(g => (
                <button key={g} onClick={() => { setGoal(g); setTimeout(nextStep, 300); }} className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${goal === g ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'}`}>
                  <div className="flex items-center gap-3">
                    <Target className={`w-5 h-5 ${goal === g ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-semibold ${goal === g ? "text-primary" : "text-foreground"}`}>{g}</span>
                  </div>
                  {goal === g && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">How active are you?</h2>
            <p className="text-muted-foreground mb-8 text-sm">This determines your daily energy expenditure.</p>
            <div className="space-y-4">
              {(["Beginner", "Intermediate", "Advanced"] as FitnessLevel[]).map(f => (
                <button key={f} onClick={() => { setFitnessLevel(f); setTimeout(nextStep, 300); }} className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition-all ${fitnessLevel === f ? 'border-primary bg-primary/10' : 'border-transparent bg-muted'}`}>
                  <div className="flex items-center gap-3">
                    <Activity className={`w-5 h-5 ${fitnessLevel === f ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-left">
                       <p className={`font-semibold ${fitnessLevel === f ? "text-primary" : "text-foreground"}`}>{f}</p>
                       <p className="text-[10px] text-muted-foreground mt-0.5">
                         {f === "Beginner" && "I rarely exercise."}
                         {f === "Intermediate" && "I exercise 2-3 times a week."}
                         {f === "Advanced" && "I exercise intensely 4+ times a week."}
                       </p>
                    </div>
                  </div>
                  {fitnessLevel === f && <CheckCircle2 className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">Physical Details</h2>
            <p className="text-muted-foreground mb-8 text-sm">Required for accurate health metrics.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs text-muted-foreground font-bold uppercase mb-2 block flex items-center gap-2"><User className="w-3 h-3"/> Age</label>
                <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full bg-muted p-4 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-primary" placeholder="Years" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-bold uppercase mb-2 block flex items-center gap-2"><Ruler className="w-3 h-3"/> Height (cm)</label>
                <input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="w-full bg-muted p-4 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-bold uppercase mb-2 block flex items-center gap-2"><Weight className="w-3 h-3"/> Current Weight (kg)</label>
                <input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="w-full bg-muted p-4 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-primary" />
              </div>
              {goal !== "Keep Fit" && (
                <div>
                  <label className="text-xs text-muted-foreground font-bold uppercase mb-2 block flex items-center gap-2"><Target className="w-3 h-3"/> Target Weight (kg)</label>
                  <input type="number" value={targetWeightKg} onChange={(e) => setTargetWeightKg(Number(e.target.value))} className="w-full border-2 border-primary/50 bg-primary/5 p-4 rounded-xl font-bold text-lg text-primary outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}
            </div>
          </motion.div>
        );
      case 5:
        const tempProfile: UserProfile = { gender, age, heightCm, weightKg, targetWeightKg: goal === "Keep Fit" ? weightKg : targetWeightKg, fitnessLevel, goal, completedOnboarding: false };
        const bmi = calculateBMI(tempProfile);
        const tdee = calculateTDEE(tempProfile);
        const weeks = estimateGoalWeeks(tempProfile);
        return (
          <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full text-center items-center justify-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-black mb-2">You're All Set!</h2>
            <p className="text-muted-foreground mb-10 text-sm max-w-[250px] mx-auto">Here is your personalized fitness plan summary.</p>
            
            <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-sm mb-6 text-left">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Current BMI</p>
                  <p className="text-xl font-bold text-foreground mt-1">{bmi}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase">Body Type</p>
                  <p className={`text-sm font-bold mt-1 ${bmi < 18.5 ? "text-fitlab-blue" : bmi < 25 ? "text-primary" : "text-fitlab-orange"}`}>
                    {bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : "Overweight"}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Daily Calorie Target</p>
                  <p className="text-xl font-bold text-foreground mt-1">{tdee} <span className="text-xs font-normal">kcal</span></p>
                </div>
                <div className="w-10 h-10 rounded-full bg-fitlab-orange/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-fitlab-orange" />
                </div>
              </div>

              {goal !== "Keep Fit" && weeks > 0 && (
                <div className="flex items-center gap-3 bg-primary/10 p-4 rounded-xl">
                  <Target className="w-5 h-5 text-primary" />
                  <p className="text-sm font-medium text-primary">Estimated time to reach {targetWeightKg}kg: <span className="font-bold">{weeks} weeks</span></p>
                </div>
              )}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      <div className="p-6 pb-0 flex items-center">
        {step > 1 && (
          <button onClick={prevStep} className="p-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1" />
        <span className="text-sm font-bold text-muted-foreground">Step {step}/5</span>
      </div>

      <div className="flex-1 p-6 pb-32 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pt-12">
        <button
          onClick={step === 5 ? finishOnboarding : nextStep}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          {step === 5 ? "Start My Journey" : "Continue"}
          {step !== 5 && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
