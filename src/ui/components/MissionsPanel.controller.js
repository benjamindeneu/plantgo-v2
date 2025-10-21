// src/ui/components/MissionsPanel.controller.js
import { fetchMissions } from "../../api/plantgo.js";
import { createMissionsPanelView } from "./MissionsPanel.view.js";

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

// ---- helpers (logic-only) ----
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

// ---- controller entry ----
export function MissionsPanel() {
  const view = createMissionsPanelView();

  // Restore cached missions on load
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      view.setStatus("Please log in.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};

      if (isFresh(data.last_species_fetch)) {
        console.log("[Cache] Using saved species and missions from Firestore");
        const missionsList = data.missions_list || [];
        view.renderMissions(missionsList);
      } else {
        console.log("[Fetch] No recent species fetch — user must fetch again (or auto-trigger after geolocation).");
        view.setStatus("No missions yet. Use the button above.");
      }
    } catch (e) {
      console.error("[Restore cached missions] Error:", e);
      view.setStatus("Unable to load cached missions.");
    }
  });

  // Button: fetch by location, render, and SAVE to Firestore
  view.onLocate(async () => {
    view.setStatus("Fetching location…");
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      view.setStatus("Loading missions…");
      const data = await fetchMissions({ lat, lon });

      const missions = Array.isArray(data?.missions)
        ? data.missions
        : (Array.isArray(data) ? data : []);

      view.renderMissions(missions);

      // Save back to user doc like before
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const speciesList = []; // map from `missions` if needed
        await saveSpeciesAndMissions(userRef, speciesList, missions);
      }
    } catch (e) {
      console.error("[Locate/Fetch] Error:", e);
      view.setStatus(e?.message || "Location/mission error.");
    }
  });

  return view.element;
}
