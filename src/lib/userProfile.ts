export type Gender = "Male" | "Female" | "Other";
export type FitnessLevel = "Beginner" | "Intermediate" | "Advanced";
export type Goal = "Lose Weight" | "Build Muscle" | "Keep Fit";

export interface UserProfile {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  fitnessLevel: FitnessLevel;
  goal: Goal;
  completedOnboarding: boolean;
}

const STORAGE_KEY = "fitlab-user-profile";

export function getProfile(): UserProfile | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// Mifflin-St Jeor Equation
export function calculateBMR(profile: UserProfile | null): number {
  if (!profile) return 1800; // default
  let bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  if (profile.gender === "Male") {
    bmr += 5;
  } else if (profile.gender === "Female") {
    bmr -= 161;
  } else {
    bmr -= 78;
  }
  return Math.round(bmr);
}

export function calculateTDEE(profile: UserProfile | null): number {
  if (!profile) return 2400; // default
  const bmr = calculateBMR(profile);
  
  let multiplier = 1.2;
  if (profile.fitnessLevel === "Beginner") multiplier = 1.375;
  if (profile.fitnessLevel === "Intermediate") multiplier = 1.55;
  if (profile.fitnessLevel === "Advanced") multiplier = 1.725;
  
  let tdee = bmr * multiplier;
  
  if (profile.goal === "Lose Weight") tdee -= 500;
  if (profile.goal === "Build Muscle") tdee += 300;
  
  return Math.max(1200, Math.round(tdee)); // minimum safe calories is ~1200
}

export function calculateBMI(profile: UserProfile | null): number {
  if (!profile) return 22.0; // default
  const heightM = profile.heightCm / 100;
  return Number((profile.weightKg / (heightM * heightM)).toFixed(1));
}

export function getWaterGoalMl(profile: UserProfile | null): number {
   if (!profile) return 3000;
   return Math.round(profile.weightKg * 35); // 35ml per kg of bodyweight
}

export function estimateGoalWeeks(profile: UserProfile | null): number {
   if (!profile) return 0;
   const diff = Math.abs(profile.weightKg - profile.targetWeightKg);
   if (diff === 0) return 0;
   return Math.ceil(diff / 0.5); // ~0.5kg per week change is sustainable
}
