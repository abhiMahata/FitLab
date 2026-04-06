/**
 * cloudSync.ts
 * Hybrid localStorage + Firestore sync engine.
 * 
 * Strategy:
 * - localStorage is primary (fast, works offline)
 * - Firestore is the cloud backup (persistent, cross-device)
 * - On login: pull cloud → merge into local (cloud wins if local is empty)
 * - On save: write to local immediately, then push to cloud in background
 * 
 * Firestore structure: users/{uid} → single document with all data
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Keys we sync to/from Firestore
const SYNC_KEYS = [
  "fitlab-user-profile",
  "fitlab-weekly-roster",
  "fitlab-workout-logs",
  "fitlab-calorie-data",
  "fitlab-sleep-entries",
] as const;

// ─── Sync Status ──────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

let _syncStatus: SyncStatus = "idle";
let _lastSyncedAt: Date | null = null;

export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: Date | null } {
  return { status: _syncStatus, lastSyncedAt: _lastSyncedAt };
}

// ─── Types ────────────────────────────────────────────────────────────

interface CloudData {
  [key: string]: unknown;
  lastSyncedAt?: unknown;
}

// ─── Pull from Cloud ──────────────────────────────────────────────────

/**
 * Download cloud data and merge into localStorage.
 * Called once on login. Cloud data fills in any missing local data.
 * If local already has data, local wins (user might have been offline).
 */
export async function pullFromCloud(uid: string): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      console.log("[CloudSync] No cloud data found, will push local on next save.");
      // First-time user: push whatever local data exists to cloud
      await pushToCloud(uid);
      return;
    }

    const cloudData = snapshot.data() as CloudData;

    for (const key of SYNC_KEYS) {
      const cloudValue = cloudData[key];
      const localValue = localStorage.getItem(key);

      if (cloudValue !== undefined && cloudValue !== null) {
        if (!localValue || localValue === "{}" || localValue === "[]" || localValue === "null") {
          // Local is empty, use cloud data
          localStorage.setItem(key, JSON.stringify(cloudValue));
          console.log(`[CloudSync] Pulled ${key} from cloud`);
        }
        // If local has data, keep it (local wins for offline-first)
      }
    }

    // Also sync today's water
    const todayKey = `fitlab-water-${new Date().toISOString().slice(0, 10)}`;
    const cloudWater = cloudData[todayKey];
    const localWater = localStorage.getItem(todayKey);
    if (cloudWater !== undefined && (!localWater || localWater === "0")) {
      localStorage.setItem(todayKey, String(cloudWater));
      console.log(`[CloudSync] Pulled today's water from cloud`);
    }

    console.log("[CloudSync] Pull complete.");
  } catch (err) {
    console.warn("[CloudSync] Pull failed (offline?):", err);
  }
}

// ─── Push to Cloud ────────────────────────────────────────────────────

/**
 * Upload all localStorage data to Firestore.
 * Called after data changes and on login.
 * Uses merge to avoid overwriting fields.
 */
export async function pushToCloud(uid: string): Promise<void> {
  try {
    _syncStatus = "syncing";
    const data: CloudData = {};

    for (const key of SYNC_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    }

    // Also push today's water
    const todayKey = `fitlab-water-${new Date().toISOString().slice(0, 10)}`;
    const waterVal = localStorage.getItem(todayKey);
    if (waterVal) {
      data[todayKey] = Number(waterVal);
    }

    data.lastSyncedAt = serverTimestamp();

    const docRef = doc(db, "users", uid);
    await setDoc(docRef, data, { merge: true });

    _syncStatus = "synced";
    _lastSyncedAt = new Date();
    console.log("[CloudSync] Push complete.");
  } catch (err) {
    _syncStatus = "error";
    console.warn("[CloudSync] Push failed (offline?):", err);
  }
}

// ─── Auto-sync helper ─────────────────────────────────────────────────

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let currentUid: string | null = null;

/**
 * Call this when the user logs in to start auto-syncing.
 */
export function startAutoSync(uid: string): void {
  currentUid = uid;
  // Pull from cloud immediately
  pullFromCloud(uid);
  // Start periodic push (every 60 seconds)
  stopAutoSync();
  syncTimer = setInterval(() => {
    if (currentUid) {
      pushToCloud(currentUid);
    }
  }, 60_000);
}

/**
 * Call this on logout to stop syncing.
 */
export function stopAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  currentUid = null;
}

/**
 * Trigger an immediate push (call after important data changes).
 * Debounced to avoid hammering Firestore.
 */
let pushDebounce: ReturnType<typeof setTimeout> | null = null;

export function syncNow(): void {
  if (!currentUid) return;
  if (pushDebounce) clearTimeout(pushDebounce);
  pushDebounce = setTimeout(() => {
    if (currentUid) pushToCloud(currentUid);
  }, 3000); // 3 second debounce
}
