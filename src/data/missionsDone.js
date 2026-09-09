// src/data/missionsDone.js
import { db } from "../../firebase-config.js";
import {
  doc, getDoc, setDoc, onSnapshot, arrayUnion, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

/**
 * Which missions the player has accomplished today.
 *
 * A mission is worth its bonus once per day. The catalogue redraws overnight,
 * and a mission that comes back on a later day can be accomplished again — so
 * what has to be remembered is not "have you ever done this" but "have you
 * done this *today*".
 *
 * Stored one document per day at `users/{uid}/missionCompletions/{YYYY-MM-DD}`,
 * mirroring how daily quests already record themselves. A day per document
 * keeps each one small, expires the daily gate without any pruning, and leaves
 * a history to read back later — none of which a single growing field on the
 * user document would give.
 */

/** Local calendar day, matching the daily-quest key exactly. */
export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function dayRef(uid, day = todayKey()) {
  return doc(db, "users", uid, "missionCompletions", day);
}

/** Mission ids accomplished today, as a Set. Empty on any failure. */
export async function getMissionsDoneToday(uid) {
  if (!uid) return new Set();
  try {
    const snap = await getDoc(dayRef(uid));
    return new Set(snap.exists() ? (snap.data()?.missionIds ?? []) : []);
  } catch (e) {
    console.warn("[missionsDone] read failed:", e?.message || e);
    return new Set();
  }
}

/**
 * Live view of today's accomplished missions.
 *
 * The list and the pins both key off this, and an observation made from the
 * map has to mark its mission without a reload — so it is a subscription
 * rather than a fetch.
 *
 * @returns {() => void} teardown
 */
export function watchMissionsDoneToday(uid, onChange) {
  if (!uid) { onChange(new Set()); return () => {}; }
  // Pinned at subscribe time: a session left open across midnight keeps
  // watching the day it started on until something re-subscribes, which is
  // better than silently watching a document nobody is writing.
  const ref = dayRef(uid);
  return onSnapshot(
    ref,
    (snap) => onChange(new Set(snap.exists() ? (snap.data()?.missionIds ?? []) : [])),
    (e) => {
      console.warn("[missionsDone] watch failed:", e?.message || e);
      onChange(new Set());
    },
  );
}

/**
 * Record a mission as accomplished today.
 *
 * `arrayUnion` rather than a read-then-write: two observations finishing at
 * once would otherwise each write the list they read, and the later one would
 * drop the other's mission.
 */
export async function markMissionDone(uid, missionId) {
  if (!uid || !missionId) return;
  try {
    await setDoc(dayRef(uid), {
      missionIds: arrayUnion(missionId),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn("[missionsDone] write failed:", e?.message || e);
  }
}
