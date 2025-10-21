// src/ui/components/MissionsPanel.js
import { fetchMissions } from "../../api/plantgo.js";
import { SpeciesCard } from "./SpeciesCard.js";

// IMPORTANT: firebase-config is at the project root (not in src)
import { auth, db } from "../../../firebase-config.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

function toDate(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFresh(ts, windowMs = THREE_HOURS_MS) {
  const d = toDate(ts);
  if (!d) return false;
  return Date.now() - d.getTime() < windowMs;
}

function renderSpeciesList(listEl, missionsList = []) {
  listEl.innerHTML = "";
  if (!missionsList.length) {
    listEl.textContent = "No missions yet.";
    return;
  }
  for (const m of missionsList) listEl.appendChild(SpeciesCard(m));
}

async function saveSpeciesAndMissions(userRef, speciesList, missionsList) {
  try {
    await updateDoc(userRef, {
      species_list: speciesList || [],
      missions_list: missionsList || [],
      last_species_fetch: serverTimestamp(),
    });
    console.log("[Firestore] species_list + missions_list saved.");
  } catch (error) {
    console.error("[Firestore] Error saving species/missions:", error);
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

  // === Restore cached missions on load (your old behavior) ===
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      list.textContent = "Please log in.";
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};

      // last_species_fetch: Firestore Timestamp
      if (isFresh(data.last_species_fetch)) {
        console.log("[Cache] Using saved species and missions from Firestore");
        const speciesList = data.species_list || [];
        const missionsList = data.missions_list || [];
        renderSpeciesList(list, missionsList);
      } else {
        console.log("[Fetch] No recent species fetch — user must fetch again (or auto-trigger after geolocation).");
        list.textContent = "No missions yet. Use the button above.";
      }
    } catch (e) {
      console.error("[Restore cached missions] Error:", e);
      list.textContent = "Unable to load cached missions.";
    }
  });

  // === Button: fetch by location, render, and SAVE to Firestore ===
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

      renderSpeciesList(list, missions);

      // Save back to user doc like before
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        // If your backend returns a separate species list, pass it here; otherwise keep empty.
        const speciesList = []; // or map from `missions` if you used to derive it
        await saveSpeciesAndMissions(userRef, speciesList, missions);
      }
    } catch (e) {
      console.error("[Locate/Fetch] Error:", e);
      list.textContent = e?.message || "Location/mission error.";
    }
  });

  return sec;
}
