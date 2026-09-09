// src/data/user.repo.js
import { auth, db } from "../../firebase-config.js";
import { doc, getDoc, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function isQuizDoneToday(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.data()?.quiz_last_date === todayKey();
}

export async function markQuizDone(uid) {
  await updateDoc(doc(db, "users", uid), { quiz_last_date: todayKey() });
}

export async function getCurrentUser() {
  return auth.currentUser ?? null;
}

export async function getUserTotalPoints(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return Number(snap.data()?.total_points ?? 0);
}

// UPDATED: added missionsModel
export async function saveSpeciesAndMissions(uid, speciesList = [], missionsList = [], missionsModel = "") {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    species_list: speciesList,
    missions_list: missionsList,
    missions_model: missionsModel,
    last_species_fetch: serverTimestamp(),
  });
}

/**
 * The missions the player is currently standing in.
 *
 * Kept apart from `missions_list` (the old home page's area cache) because it
 * answers a different question: not "what is near me" but "what could I
 * complete with the next photo I take".
 */
export async function saveMissionsHere(uid, missions = []) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { missions_here: missions });
}

export async function awardQuizPoints(uid, points) {
  if (!points) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { total_points: increment(points) });
}


export async function getCachedMissions(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}
