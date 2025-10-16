import { db } from "../../firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function listenUserLevel(uid, onLevel) {
  if (!uid) return () => {};
  const ref = doc(db, "users", uid);
  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const total = Number(data?.total_points ?? 0);
    const level = Math.floor(1 + (total / 11000));
    onLevel(level, total);
  }, (err) => console.error("[listenUserLevel]", err));
  return unsub;
}
