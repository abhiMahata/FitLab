/**
 * cloudSync.ts
 * Hybrid localStorage + Firestore sync engine.
 * 
 * Strategy:
 * - localStorage is primary (fast, offline-first)
 * - Firestore is the cloud backup (persistent, cross-device)
 * - On login: pull cloud → merge into local with deterministic conflict resolution
 * - On save: write to local immediately, then push to cloud in background
 * 
 * Firestore structure: users/{uid} → single document with all user data
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getLocalDateString } from "./utils";

// Keys we sync to/from Firestore
export const SYNC_KEYS = [
  "fitlab-user-profile",
  "fitlab-weekly-roster",
  "fitlab-workout-logs",
  "fitlab-calorie-data",
  "fitlab-sleep-entries",
  "fitlab-form-sessions",
  "fitlab-streak-data",
] as const;

export type SyncKey = (typeof SYNC_KEYS)[number];

// ─── Sync Status & Concurrency State ─────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

let _syncStatus: SyncStatus = "idle";
let _lastSyncedAt: Date | null = null;
let _isPulling = false;
let _isPushing = false;
let _syncTimer: ReturnType<typeof setInterval> | null = null;
let _pushDebounce: ReturnType<typeof setTimeout> | null = null;
let _currentUid: string | null = null;
let _pendingPushUid: string | null = null;

export function getSyncStatus(): { status: SyncStatus; lastSyncedAt: Date | null } {
  return { status: _syncStatus, lastSyncedAt: _lastSyncedAt };
}

export function getCurrentSyncUid(): string | null {
  return _currentUid;
}

export function isPullingActive(): boolean {
  return _isPulling;
}

export function isPushingActive(): boolean {
  return _isPushing;
}

// ─── Types ────────────────────────────────────────────────────────────

export interface CloudData {
  [key: string]: unknown;
  waterHistory?: Record<string, number>;
  lastSyncedAt?: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isBlank(val: string | null): boolean {
  return !val || val === "{}" || val === "[]" || val === "null";
}

/**
 * Extracts a numeric timestamp from an item for chronological sorting.
 * Supports `completedAt`, `timestamp`, `wakeTime`, `bedtime`, `date`, and numeric IDs.
 */
export function getItemTimestamp(item: any): number {
  if (!item || typeof item !== "object") return 0;

  // 1. Direct numeric timestamp fields
  if (typeof item.completedAt === "number" && !isNaN(item.completedAt)) {
    return item.completedAt;
  }
  if (typeof item.timestamp === "number" && !isNaN(item.timestamp)) {
    return item.timestamp;
  }
  if (typeof item.wakeTime === "number" && !isNaN(item.wakeTime)) {
    return item.wakeTime;
  }
  if (typeof item.bedtime === "number" && !isNaN(item.bedtime)) {
    return item.bedtime;
  }

  // 2. Date string format (e.g. "2026-11-15")
  if (typeof item.date === "string" && item.date.length >= 10) {
    const parsed = Date.parse(item.date);
    if (!isNaN(parsed)) return parsed;
  }

  // 3. Fallback: Check if id is a millisecond timestamp
  if (typeof item.id === "number" && item.id > 1000000000) {
    return item.id;
  }
  if (typeof item.id === "string") {
    const numId = Number(item.id);
    if (!isNaN(numId) && numId > 1000000000) {
      return numId;
    }
  }

  return 0;
}

/**
 * Collect all local water tracking keys: `fitlab-water-YYYY-MM-DD`
 */
  export function getLocalWaterHistory(): Record<string, number> {
    const history: Record<string, number> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("fitlab-water-")) {
          const dateKey = key.slice("fitlab-water-".length);
          const val = Number(localStorage.getItem(key));
          if (!isNaN(val) && val > 0) {
            history[dateKey] = val;
          }
        }
      }
    } catch {
      // localStorage access failure
    }
    return history;
  }

  /**
   * Merges local and cloud water records by date taking Math.max(local, cloud).
   */
    export function mergeWaterHistory(
      localHistory: Record<string, number>,
      cloudHistory: Record<string, number>
    ): Record<string, number> {
      const merged: Record<string, number> = { ...localHistory };
      for (const [dateKey, cloudMl] of Object.entries(cloudHistory || {})) {
        if (typeof cloudMl !== "number" || cloudMl <= 0) continue;
        const localVal = merged[dateKey] || 0;
        merged[dateKey] = Math.max(localVal, cloudMl);
      }
      return merged;
    }

    /**
     * Merge two sets of array items by ID with conflict resolution and chronological sorting:
     * 1. Matching IDs are merged with local items taking precedence.
     * 2. All records are sorted descending by timestamp (newest first).
     * 3. The sorted array is sliced to maxItems, ensuring newest records always survive.
     */
    export function mergeArrayById<T extends { id?: string | number }>(
      local: T[],
      cloud: T[],
      maxItems = 60
    ): T[] {
      const map = new Map<string, T>();

          // 1. Populate from cloud
          if (Array.isArray(cloud)) {
            for (const item of cloud) {
              if (item && item.id != null) {
                map.set(String(item.id), item);
              }
            }
          }

              // 2. Local items overwrite cloud items on identical ID (local wins policy)
              if (Array.isArray(local)) {
                for (const item of local) {
                  if (item && item.id != null) {
                    map.set(String(item.id), item);
                  }
                }
              }

              // 3. Sort descending by timestamp before slicing
              const merged = Array.from(map.values()).sort((a, b) => {
                const timeA = getItemTimestamp(a);
                const timeB = getItemTimestamp(b);
                return timeB - timeA;
              });

              // 4. Return newest maxItems entries
              return merged.slice(0, maxItems);
            }

            // ─── Pull from Cloud ──────────────────────────────────────────────────

            /**
             * Download cloud data and merge into localStorage.
             * Resolves conflicts predictably:
             * - Arrays (workouts, sleep, form sessions) are unioned by ID, sorted newest-first, and sliced.
             * - Water history is merged by date taking Math.max(local, cloud).
             * - Calorie data merges per day of week.
             * - Profile and roster use cloud if local is blank/default.
             */
            export async function pullFromCloud(uid: string): Promise<void> {
              if (!uid || !_currentUid || _currentUid !== uid) return;

              _isPulling = true;
              if (_currentUid === uid) {
                _syncStatus = "syncing";
              }

              try {
                const docRef = doc(db, "users", uid);
                const snapshot = await getDoc(docRef);

                  // Lifecycle check: Verify active UID immediately after async getDoc
                  if (!_currentUid || _currentUid !== uid) {
                    console.log("[CloudSync] User changed or logged out during pull; aborting apply.");
                    return;
                  }

                  if (!snapshot.exists()) {
                    console.log("[CloudSync] No cloud data found for user. Initial state ready.");
                    // First-time user: schedule push of local state if user is still active
                    if (_currentUid === uid) {
                      _syncStatus = "synced";
                      _lastSyncedAt = new Date();
                      pushToCloud(uid);
                    }
                    return;
                  }

                  const cloudData = snapshot.data() as CloudData;

                  // 1. Sync standard keys
                  for (const key of SYNC_KEYS) {
                    // Recheck active UID during processing loop
                    if (!_currentUid || _currentUid !== uid) return;

                    const cloudValue = cloudData[key];
                    if (cloudValue === undefined || cloudValue === null) continue;

                    const localRaw = localStorage.getItem(key);

                    if (isBlank(localRaw)) {
                      // Local is completely empty: cloud wins unconditionally
                      localStorage.setItem(key, typeof cloudValue === "string" ? cloudValue : JSON.stringify(cloudValue));
                      continue;
                    }

                    // Local has data: perform structured merge to avoid data loss
                    try {
                      const localParsed = JSON.parse(localRaw!);

                      if (key === "fitlab-workout-logs" && Array.isArray(cloudValue) && Array.isArray(localParsed)) {
                        const merged = mergeArrayById(localParsed, cloudValue as any[], 60);
                        localStorage.setItem(key, JSON.stringify(merged));
                      } else if (key === "fitlab-sleep-entries" && Array.isArray(cloudValue) && Array.isArray(localParsed)) {
                        const merged = mergeArrayById(localParsed, cloudValue as any[], 30);
                        localStorage.setItem(key, JSON.stringify(merged));
                      } else if (key === "fitlab-form-sessions" && Array.isArray(cloudValue) && Array.isArray(localParsed)) {
                        const merged = mergeArrayById(localParsed, cloudValue as any[], 50);
                        localStorage.setItem(key, JSON.stringify(merged));
                      } else if (key === "fitlab-calorie-data" && typeof cloudValue === "object" && typeof localParsed === "object") {
                        const merged = { ...(cloudValue as Record<string, any>) };
                        // Local days with food entries override cloud days
                        for (const [day, dayData] of Object.entries(localParsed as Record<string, any>)) {
                          if (dayData && Array.isArray(dayData.entries) && dayData.entries.length > 0) {
                            merged[day] = dayData;
                          }
                        }
                        localStorage.setItem(key, JSON.stringify(merged));
                      }
                      // For profile and weekly roster: keep local if already populated
                    } catch {
                      // If JSON parsing fails, retain local data
                    }
                  }

                  // 2. Sync complete water history
                  const cloudWaterHistory = cloudData.waterHistory || {};
                  // Also include any legacy root fitlab-water-YYYY-MM-DD keys from cloud
                  for (const [k, v] of Object.entries(cloudData)) {
                    if (k.startsWith("fitlab-water-")) {
                      const dKey = k.slice("fitlab-water-".length);
                      if (typeof v === "number" && !cloudWaterHistory[dKey]) {
                        cloudWaterHistory[dKey] = v;
                      }
                    }
                  }

                    const localWaterHistory = getLocalWaterHistory();
                    const mergedWater = mergeWaterHistory(localWaterHistory, cloudWaterHistory);

                    for (const [dateKey, ml] of Object.entries(mergedWater)) {
                      if (ml > 0) {
                        localStorage.setItem(`fitlab-water-${dateKey}`, String(ml));
                      }
                    }

                    if (_currentUid === uid) {
                      _syncStatus = "synced";
                      _lastSyncedAt = new Date();
                      console.log("[CloudSync] Pull and merge complete for user", uid);
                    }
                  } catch (err) {
                    if (_currentUid === uid) {
                      _syncStatus = !navigator.onLine ? "offline" : "error";
                    }
                    console.warn("[CloudSync] Pull failed (offline or network):", err);
                  } finally {
                    _isPulling = false;
                      // If a push was queued while pull was in progress, execute it now if user matches
                      if (_pendingPushUid && _pendingPushUid === _currentUid) {
                        const nextUid = _pendingPushUid;
                        _pendingPushUid = null;
                        pushToCloud(nextUid);
                      } else {
                        _pendingPushUid = null;
                      }
                    }
                  }

                  // ─── Push to Cloud ────────────────────────────────────────────────────

                  /**
                   * Upload all localStorage data to Firestore.
                   * Concurrency protected:
                   * - Defers if a pull or previous push is already in flight.
                   * - Revalidates `_currentUid === uid` before and after network operations.
                   * - Never writes after logout or after an account switch.
                   */
                  export async function pushToCloud(uid: string): Promise<void> {
                      // Reject if no UID or if active user is logged out / switched
                      if (!uid || !_currentUid || _currentUid !== uid) {
                        return;
                      }

                        // Defer if a pull or another push is currently active
                        if (_isPulling || _isPushing) {
                          _pendingPushUid = uid;
                          return;
                        }

                        _isPushing = true;
                        if (_currentUid === uid) {
                          _syncStatus = "syncing";
                        }

                        try {
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

                          // Push full water history
                          const waterHistory = getLocalWaterHistory();
                          data.waterHistory = waterHistory;

                          // Backward compatibility: also set today's water as a direct field
                          const todayKey = `fitlab-water-${getLocalDateString()}`;
                          const todayWater = localStorage.getItem(todayKey);
                          if (todayWater) {
                            data[todayKey] = Number(todayWater);
                          }

                          data.lastSyncedAt = serverTimestamp();

                          // Revalidate UID immediately before committing network write
                          if (!_currentUid || _currentUid !== uid) {
                            console.log("[CloudSync] Active user changed before setDoc; aborting write.");
                            return;
                          }

                          const docRef = doc(db, "users", uid);
                          await setDoc(docRef, data, { merge: true });

                            // Revalidate UID immediately after async write completes
                            if (!_currentUid || _currentUid !== uid) {
                              console.log("[CloudSync] User changed during setDoc; skipping status update.");
                              return;
                            }

                            _syncStatus = "synced";
                            _lastSyncedAt = new Date();
                            console.log("[CloudSync] Push complete for user", uid);
                          } catch (err) {
                            if (_currentUid === uid) {
                              _syncStatus = !navigator.onLine ? "offline" : "error";
                            }
                            console.warn("[CloudSync] Push failed:", err);
                          } finally {
                            _isPushing = false;
                            // Execute pending push if queued and matching active user
                            if (_pendingPushUid && _pendingPushUid === _currentUid) {
                              const nextUid = _pendingPushUid;
                              _pendingPushUid = null;
                              pushToCloud(nextUid);
                            } else {
                              _pendingPushUid = null;
                            }
                          }
                        }

// ─── Auto-sync Lifecycle ──────────────────────────────────────────────

/**
 * Called when the user logs in to begin synchronization.
 * Handles account switching by resetting local cache when a different user logs in.
 */
export async function startAutoSync(uid: string): Promise<void> {
                          if (!uid) return;

                          // If already running for this user, do not duplicate
                          if (_currentUid === uid && _syncTimer) {
                            return;
                          }

                          // Account switching detection
                          const previousUid = localStorage.getItem("fitlab-sync-uid");
                          if (previousUid && previousUid !== uid) {
                            console.log("[CloudSync] Account switch detected. Resetting local cache for new user.");
                            clearLocalUserData();
                            _pendingPushUid = null;
                            _isPulling = false;
                            _isPushing = false;
                          }
                          localStorage.setItem("fitlab-sync-uid", uid);

                          _currentUid = uid;

                          // Clear existing timers
                          if (_syncTimer) {
                            clearInterval(_syncTimer);
                            _syncTimer = null;
                          }

                          // Pull from cloud immediately and await it
                          await pullFromCloud(uid);

                          // Periodic background push every 60 seconds (only if user is still active)
                          if (_currentUid === uid) {
                            _syncTimer = setInterval(() => {
                              if (_currentUid && navigator.onLine) {
                                pushToCloud(_currentUid);
                              }
                            }, 60_000);
                          }
                        }

                        /**
                         * Call on logout to stop all active sync jobs and clear user tracking.
                         */
                        export function stopAutoSync(): void {
                          if (_syncTimer) {
                            clearInterval(_syncTimer);
                            _syncTimer = null;
                          }
                          if (_pushDebounce) {
                            clearTimeout(_pushDebounce);
                            _pushDebounce = null;
                          }
                          _currentUid = null;
                          _pendingPushUid = null;
                          _isPulling = false;
                          _isPushing = false;
                          _syncStatus = "idle";
                        }

                        /**
                         * Trigger an immediate push with a 3-second debounce.
                         */
                        export function syncNow(): void {
                          if (!_currentUid) return;
                          if (_pushDebounce) clearTimeout(_pushDebounce);
                          _pushDebounce = setTimeout(() => {
                            if (_currentUid) {
                              pushToCloud(_currentUid);
                            }
                          }, 3000);
                        }

                        /**
                         * Clears user-specific local data upon account switching.
                         */
                        export function clearLocalUserData(): void {
                          for (const key of SYNC_KEYS) {
                            localStorage.removeItem(key);
                          }
                          // Clear all water entries
                          const waterKeys: string[] = [];
                          for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.startsWith("fitlab-water-")) {
                              waterKeys.push(k);
                            }
                          }
                          for (const k of waterKeys) {
                            localStorage.removeItem(k);
                          }
                        }

                        // ─── Online / Offline Event Listeners ─────────────────────────────────

                        if (typeof window !== "undefined") {
                          window.addEventListener("online", () => {
                            console.log("[CloudSync] Network online. Syncing...");
                            if (_currentUid) {
                              syncNow();
                            }
                          });

                          window.addEventListener("offline", () => {
                            _syncStatus = "offline";
                          });
                        }
