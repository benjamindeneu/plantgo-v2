// src/services/db.service.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function getUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() };
}

export async function saveObservation(uid, observation) {
  const ref = collection(db, "users", uid, "observations");
  const res = await addDoc(ref, observation);
  return res.id;
}
