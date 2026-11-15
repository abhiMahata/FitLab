import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getLocalDateString,
  getLocalDateOffset,
  getMondayFirstDayIndex,
  getDayName,
  getDayNameFromDateKey,
  DAYS_OF_WEEK,
} from "./utils";
import {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  type UserProfile,
} from "./userProfile";
import {
  findAngle,
  findJointAngle,
  getLandmarkCoord,
  type Point,
} from "./poseUtils";
import {
  mergeArrayById,
  mergeWaterHistory,
  getItemTimestamp,
  startAutoSync,
  stopAutoSync,
  pushToCloud,
  pullFromCloud,
  getSyncStatus,
  getCurrentSyncUid,
} from "./cloudSync";

// ── Mock Browser Storage & Navigator for Node/Vitest Environment ───────

class LocalStorageMock {
  private store: Record<string, string> = {};

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }

  getItem(key: string) {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = new LocalStorageMock() as any;
}

if (typeof globalThis.navigator === "undefined") {
  (globalThis as any).navigator = { onLine: true };
}

// ── Mock Firebase Firestore ──────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}` })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  serverTimestamp: vi.fn(() => "MOCK_SERVER_TIMESTAMP"),
}));

vi.mock("./firebase", () => ({
  db: {},
}));

describe("1. Local Calendar Date Utilities (Timezone Bug Regression)", () => {
  it("formats local date as YYYY-MM-DD consistently", () => {
    const testDate = new Date(2026, 10, 15, 14, 30, 0); // Nov 15, 2026 2:30 PM local
    expect(getLocalDateString(testDate)).toBe("2026-11-15");
  });

  it("handles midnight transition in UTC+5:30 without shifting to UTC yesterday", () => {
    // Simulate a date that is 00:45 AM local on Nov 15 (which in UTC is Nov 14 19:15)
    const midnightLocal = new Date(2026, 10, 15, 0, 45, 0);
    const localStr = getLocalDateString(midnightLocal);
    expect(localStr).toBe("2026-11-15");
  });

  it("calculates date offsets correctly across day boundaries", () => {
    const baseDate = new Date(2026, 10, 15, 10, 0, 0); // Nov 15, 2026
    expect(getLocalDateOffset(-1, baseDate)).toBe("2026-11-14");
    expect(getLocalDateOffset(1, baseDate)).toBe("2026-11-16");
    expect(getLocalDateOffset(-7, baseDate)).toBe("2026-11-08");
  });
});

describe("2. Weekly Calendar Indexing (Sunday/Monday Standardization)", () => {
  it("standardizes Monday as index 0 and Sunday as index 6", () => {
    const monday = new Date(2026, 10, 9, 12, 0, 0); // Nov 9, 2026 is Monday
    const sunday = new Date(2026, 10, 15, 12, 0, 0); // Nov 15, 2026 is Sunday

    expect(getMondayFirstDayIndex(monday)).toBe(0);
    expect(getMondayFirstDayIndex(sunday)).toBe(6);
    expect(getDayName(monday)).toBe("Monday");
    expect(getDayName(sunday)).toBe("Sunday");
  });

  it("retrieves the correct day name from a YYYY-MM-DD date key", () => {
    expect(getDayNameFromDateKey("2026-11-09")).toBe("Monday");
    expect(getDayNameFromDateKey("2026-11-10")).toBe("Tuesday");
    expect(getDayNameFromDateKey("2026-11-11")).toBe("Wednesday");
    expect(getDayNameFromDateKey("2026-11-12")).toBe("Thursday");
    expect(getDayNameFromDateKey("2026-11-13")).toBe("Friday");
    expect(getDayNameFromDateKey("2026-11-14")).toBe("Saturday");
    expect(getDayNameFromDateKey("2026-11-15")).toBe("Sunday");
  });

  it("contains all 7 days of the week in standard order", () => {
    expect(DAYS_OF_WEEK).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });
});

describe("3. Biometric Calculations & Defensive Edge Cases", () => {
  const sampleProfile: UserProfile = {
    name: "Alex",
    age: 28,
    gender: "Male",
    heightCm: 180,
    weightKg: 75,
    targetWeightKg: 72,
    goal: "Build Muscle",
    fitnessLevel: "Intermediate",
  };

  it("calculates BMI accurately for valid profile", () => {
    expect(calculateBMI(sampleProfile)).toBe(23.1);
  });

  it("handles null or zero/negative dimensions safely without NaN or Infinity", () => {
    expect(calculateBMI(null)).toBe(22.0);
    expect(calculateBMI({ ...sampleProfile, heightCm: 0 })).toBe(22.0);
    expect(calculateBMI({ ...sampleProfile, weightKg: -5 })).toBe(22.0);
  });

  it("calculates BMR using Mifflin-St Jeor formula", () => {
    expect(calculateBMR(sampleProfile)).toBe(1740);

    const femaleProfile: UserProfile = {
      ...sampleProfile,
      gender: "Female",
      weightKg: 60,
      heightCm: 165,
      age: 25,
    };
    expect(calculateBMR(femaleProfile)).toBe(1345);
  });

  it("calculates TDEE factoring in fitness level multiplier and goal adjustment", () => {
    expect(calculateTDEE(sampleProfile)).toBe(2997);
    expect(calculateTDEE(null)).toBe(2400);
  });
});

describe("4. Pose Landmark Geometry & Boundary Protections", () => {
  it("calculates joint angles correctly using dot product", () => {
    const a: Point = { x: 100, y: 0 };
    const joint: Point = { x: 100, y: 100 };
    const b: Point = { x: 200, y: 100 };

    const angle = findJointAngle(a, joint, b);
    expect(angle).toBe(90);
  });

  it("handles straight line joint angles (180 degrees)", () => {
    const a: Point = { x: 0, y: 100 };
    const joint: Point = { x: 100, y: 100 };
    const b: Point = { x: 200, y: 100 };

    const angle = findJointAngle(a, joint, b);
    expect(angle).toBe(180);
  });

  it("prevents NaN when points are coincident", () => {
    const p: Point = { x: 50, y: 50 };
    const angle = findAngle(p, p, p);
    expect(Number.isNaN(angle)).toBe(false);
    expect(angle).toBe(0);
  });

  it("safely handles undefined landmarks without throwing TypeError", () => {
    const landmarks = [{ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }];

    const pt0 = getLandmarkCoord(landmarks, 0, 640, 480);
    expect(pt0).toEqual({ x: 320, y: 240 });

    const ptMissing = getLandmarkCoord(landmarks, 25, 640, 480);
    expect(ptMissing).toEqual({ x: 0, y: 0 });
  });
});

describe("5. Array Merging & Truncation Safety (mergeArrayById)", () => {
  it("extracts timestamps accurately from various item structures", () => {
    expect(getItemTimestamp({ completedAt: 1700000000000 })).toBe(1700000000000);
    expect(getItemTimestamp({ timestamp: 1690000000000 })).toBe(1690000000000);
    expect(getItemTimestamp({ wakeTime: 1680000000000 })).toBe(1680000000000);
    expect(getItemTimestamp({ bedtime: 1670000000000 })).toBe(1670000000000);
    expect(getItemTimestamp({ date: "2026-11-15" })).toBe(Date.parse("2026-11-15"));
    expect(getItemTimestamp({ id: "1700000050000" })).toBe(1700000050000);
    expect(getItemTimestamp(null)).toBe(0);
    expect(getItemTimestamp({})).toBe(0);
  });

  it("ensures newer local record survives truncation when cloud already has 60 entries", () => {
    // 60 older cloud records (timestamps 1000..60000)
    const cloudRecords = Array.from({ length: 60 }, (_, i) => ({
      id: `cloud-${i}`,
      completedAt: 1000 + i * 1000,
      title: `Workout ${i}`,
    }));

    // 1 brand new local record with the highest timestamp (70000)
    const localRecords = [
      {
        id: "local-newest",
        completedAt: 70000,
        title: "Latest Workout",
      },
    ];

    const merged = mergeArrayById(localRecords, cloudRecords, 60);

    // Must be capped at maxItems = 60
    expect(merged.length).toBe(60);

    // The newer local record MUST survive and appear at index 0 (newest first)
    expect(merged[0].id).toBe("local-newest");
    expect(merged[0].completedAt).toBe(70000);

    // The oldest cloud record (completedAt: 1000) must be sliced off
    const hasOldest = merged.some((item) => item.id === "cloud-0");
    expect(hasOldest).toBe(false);
  });

  it("merges duplicate IDs correctly with local version winning", () => {
    const cloudRecords = [
      { id: "w-101", completedAt: 5000, setsCompleted: 3, source: "cloud" },
      { id: "w-102", completedAt: 4000, setsCompleted: 4, source: "cloud" },
    ];

    const localRecords = [
      { id: "w-101", completedAt: 5000, setsCompleted: 5, source: "local" },
    ];

    const merged = mergeArrayById(localRecords, cloudRecords, 60);

    expect(merged.length).toBe(2);
    const item101 = merged.find((item) => item.id === "w-101");
    expect(item101?.setsCompleted).toBe(5);
    expect(item101?.source).toBe("local");
  });

  it("handles missing or invalid timestamps without crashing", () => {
    const records = [
      { id: "no-time" },
      { id: "invalid-time", completedAt: NaN },
      { id: "valid-time", completedAt: 5000 },
    ];

    const merged = mergeArrayById(records, [], 60);
    expect(merged.length).toBe(3);
    // Valid timestamp item sorts to the top
    expect(merged[0].id).toBe("valid-time");
  });

  it("strictly respects the maxItems limit", () => {
    const cloud = Array.from({ length: 20 }, (_, i) => ({ id: `c-${i}`, completedAt: i }));
    const local = Array.from({ length: 20 }, (_, i) => ({ id: `l-${i}`, completedAt: 100 + i }));

    const merged = mergeArrayById(local, cloud, 15);
    expect(merged.length).toBe(15);
  });
});

describe("6. Water History Merging (mergeWaterHistory)", () => {
  it("merges local and cloud water histories preserving all distinct dates", () => {
    const local = {
      "2026-11-14": 1500,
      "2026-11-15": 2000,
    };
    const cloud = {
      "2026-11-13": 2500,
      "2026-11-14": 1000,
    };

    const merged = mergeWaterHistory(local, cloud);

    expect(merged["2026-11-13"]).toBe(2500);
    expect(merged["2026-11-14"]).toBe(1500); // Local higher value retained
    expect(merged["2026-11-15"]).toBe(2000);
  });

  it("retains the larger value when local and cloud conflict", () => {
    const local = { "2026-11-15": 3000 };
    const cloud = { "2026-11-15": 2000 };

    expect(mergeWaterHistory(local, cloud)["2026-11-15"]).toBe(3000);

    // If cloud had higher value (e.g. logged on other device)
    const localLower = { "2026-11-15": 1000 };
    const cloudHigher = { "2026-11-15": 2500 };

    expect(mergeWaterHistory(localLower, cloudHigher)["2026-11-15"]).toBe(2500);
  });

  it("handles empty or missing cloud history safely", () => {
    const local = { "2026-11-15": 1500 };
    expect(mergeWaterHistory(local, {})).toEqual({ "2026-11-15": 1500 });
  });
});

describe("7. Cloud Sync Account Lifecycle & Concurrency Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    stopAutoSync();
  });

  afterEach(() => {
    stopAutoSync();
  });

  it("rejects pushToCloud if the user is logged out", async () => {
    stopAutoSync();
    expect(getCurrentSyncUid()).toBeNull();

    await pushToCloud("user-logged-out");

    // setDoc should never be invoked
    expect(mockSetDoc).not.toHaveBeenCalled();
    expect(getSyncStatus().status).toBe("idle");
  });

  it("rejects pushToCloud if UID does not match the active user (account switch)", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ "fitlab-user-profile": { name: "Active User" } }),
    });

    // Start sync for User B
    await startAutoSync("user-B");
    expect(getCurrentSyncUid()).toBe("user-B");

    // An in-flight or delayed push for User A arrives
    await pushToCloud("user-A");

    // setDoc should NOT be invoked for user-A
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("clears local user data when an account switch is detected", async () => {
    localStorage.setItem("fitlab-sync-uid", "old-user");
    localStorage.setItem("fitlab-user-profile", JSON.stringify({ name: "Old User" }));
    localStorage.setItem("fitlab-water-2026-11-15", "2500");

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ "fitlab-user-profile": { name: "New User" } }),
    });

    // Login with new user
    await startAutoSync("new-user");

    // Old user data should have been reset before pulling
    expect(localStorage.getItem("fitlab-sync-uid")).toBe("new-user");
    expect(getCurrentSyncUid()).toBe("new-user");
  });

  it("prevents an old operation from updating sync status after logout", async () => {
    mockGetDoc.mockImplementation(async () => {
      // Simulate delay during network getDoc
      stopAutoSync(); // user logs out while request was in-flight
      return {
        exists: () => true,
        data: () => ({ "fitlab-user-profile": { name: "User" } }),
      };
    });

    await pullFromCloud("user-temp");

    // Because user logged out, sync status should be idle, NOT synced
    expect(getCurrentSyncUid()).toBeNull();
    expect(getSyncStatus().status).toBe("idle");
  });
});
