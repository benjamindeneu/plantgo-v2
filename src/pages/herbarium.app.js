// src/pages/herbarium.app.js

import { Header } from "../ui/components/Header.js";
import { SpeciesCard } from "../ui/components/SpeciesCard.js";

// Firebase config is at project root (NOT in src)
import { auth, db } from "../../firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc, getDoc, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ===== UI bootstrap: header with "Main" + "Log out"
const headerMount = document.getElementById("appHeader");
const header = Header({
  user: null,
  level: 1,
  menuVariant: "herbarium",
  onBackHome: () => { location.href = "./index.html"; },
  onLogout: async () => {
    try {
      await signOut(auth);
      location.href = "./login.html";
    } catch (e) {
      alert(e.message);
    }
  }
});
headerMount.replaceWith(header);

// ===== Helpers =====
function asDate(ts) {
  if (!ts) return null;
  if (typeof ts?.toDate === "function") return ts.toDate();
  if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapToSpecies(item) {
  // ---- FIELD MAPPING (adjust if your field names differ) ----
  // Try common field names you likely used:
  const sci = item.name || item.scientific_name || item.species_name || "";
  const common = item.common_name || item.vernacular_name || "";
  const img =
    item.image_url ||
    item.image ||
    (Array.isArray(item.images) && item.images[0]) ||
    item.photo_url ||
    "";

  // If your saving code stored points breakdown per specimen/mission:
  const pointsTotal = Number(item.points?.total ?? item.total_points ?? 0);
  const pointsDetail = item.points?.detail || item.points_detail || {};

  return {
    name: sci,
    common_name: common,
    image_url: img,
    points: {
      total: pointsTotal,
      detail: pointsDetail
    },
    // any other fields will be ignored by SpeciesCard
  };
}

async function loadHerbariumFor(uid) {
  // We’ll try in this order (to match common patterns from your previous code):
  // 1) users/{uid}/observations subcollection (ordered by timestamp desc)
  // 2) users/{uid}.herbarium_list array (fallback)
  // 3) users/{uid}.species_list (fallback)
  // Use whatever exists first.

  // 1) Subcollection "observations" (common in apps)
  try {
    const obsRef = collection(db, "users", uid, "observations");
    const q = query(obsRef, orderBy("timestamp", "desc"), limit(100));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => {
        const data = d.data();
        return mapToSpecies(data);
      });
    }
  } catch (e) {
    console.debug("[Herbarium] observations subcollection not found / skipped:", e?.message);
  }

  // 2) & 3) Arrays on user doc
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();

      // Prefer an explicit herbarium list if you stored one
      if (Array.isArray(data.herbarium_list) && data.herbarium_list.length) {
        return data.herbarium_list.map(mapToSpecies);
      }

      // Fallback to species_list (if your previous save stored recent species here)
      if (Array.isArray(data.species_list) && data.species_list.length) {
        return data.species_list.map(mapToSpecies);
      }
    }
  } catch (e) {
    console.debug("[Herbarium] user doc arrays not found / skipped:", e?.message);
  }

  return [];
}

// ===== Page load =====
const listEl = document.getElementById("discoveriesList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }
  header.setUser(user);

  try {
    listEl.textContent = "Loading your herbarium…";
    const entries = await loadHerbariumFor(user.uid);

    listEl.innerHTML = "";
    if (!entries.length) {
      listEl.textContent = "No saved discoveries yet.";
      return;
    }

    // Render as SpeciesCard (keeps Wikipedia thumb + points button behavior)
    for (const sp of entries) {
      listEl.appendChild(SpeciesCard(sp));
    }
  } catch (e) {
    console.error("[Herbarium] load error:", e);
    listEl.textContent = "Could not load your herbarium.";
  }
});
