import { auth, db } from "../../firebase-config.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export async function getCurrentUser() {
  return auth.currentUser ?? null;
}

export async function getUserTotalPoints(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return Number(snap.data()?.total_points ?? 0);
}

export async function saveSpeciesAndMissions(uid, speciesList = [], missionsList = []) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    species_list: speciesList,
    missions_list: missionsList,
    last_species_fetch: serverTimestamp(),
  });
}

export async function getCachedMissions(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}
