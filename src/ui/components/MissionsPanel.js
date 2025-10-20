// src/ui/components/MissionsPanel.js
import { fetchMissions } from "../../api/plantgo.js";
import { SpeciesCard } from "./SpeciesCard.js";

// === Auth + Firestore (same pattern as your old app) ===
import { auth, db } from "../../firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Adjust this if your old code used a different freshness window
const RECENT_HOURS = 24;

// Accepts millis, Firestore Timestamp (with .seconds), or ISO string
function isRecent(ts, hours = RECENT_HOURS) {
  if (!ts) return false;
  let ms;
  if (typeof ts === "number") ms = ts;
  else if (typeof ts === "object" && typeof ts.seconds === "number") ms = ts.seconds * 1000;
  else ms = Date.parse(ts);
  if (!Number.isFinite(ms)) return false;
  return (Date.now() - ms) <= hours * 60 * 60 * 1000;
}

async function tryRestoreLastMission(listEl) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    // Match your old shape: user doc stores the last mission under 'last_mission'
    const last = snap.data()?.last_mission;
    if (!last) return;

    // Expect a timestamp next to it (same name you used before, e.g. 'timestamp')
    // If your field name differs, change 'timestamp' below to your original.
    const ts = last.timestamp ?? snap.data()?.last_mission_timestamp;

    if (isRecent(ts)) {
      // Render exactly like before
      listEl.innerHTML = "";
      listEl.appendChild(SpeciesCard(last));
    }
  } catch (e) {
    // Silent fail to avoid blocking the UI
    console.error("[restore last mission]", e);
  }
}

export function MissionsPanel() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>Missions near you</h2>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="secondary" type="button">Get Location & Missions</button>
    </div>
    <div id="list" class="form-grid" aria-live="polite">Loading…</div>
  `;

  const list = sec.querySelector("#list");

  // === Restore last mission on page load, just like your old code ===
  // Wait for auth, then attempt to render stored mission if it's fresh
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      list.textContent = "Please log in.";
      return;
    }
    list.textContent = "Loading your last mission…";
    await tryRestoreLastMission(list);
    // If nothing restored, leave a friendly default
    if (!list.children.length) {
      list.textContent = "No missions yet.";
    }
  });

  // === Button to fetch fresh missions by location ===
  sec.querySelector("#locate").addEventListener("click", async () => {
    list.textContent = "Fetching location…";
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      list.textContent = "Loading missions…";
      const data = await fetchMissions({ lat, lon });

      const missions = Array.isArray(data?.missions) ? data.missions
                      : (Array.isArray(data) ? data : []);

      if (!missions.length) {
        list.textContent = "No missions returned.";
        return;
      }

      list.innerHTML = "";
      for (const sp of missions) list.appendChild(SpeciesCard(sp));

      // If you want to **update** the last_mission again (like your old code),
      // you likely did this elsewhere when a mission was selected/started.
      // If you want it here, you can write missions[0] & a timestamp back to the user doc.
      // (Not included since you asked only to restore on load.)
    } catch (e) {
      list.textContent = e?.message || "Location/mission error.";
    }
  });

  return sec;
}
