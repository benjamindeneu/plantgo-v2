// src/pages/herbarium.app.js

import { Header } from "../ui/components/Header.js";
import { SpeciesCard } from "../ui/components/SpeciesCard.js";

// IMPORTANT: firebase-config is at project root (not in src)
import { auth, db } from "../../firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc, getDoc, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ===== Header with "Main" + "Log out" =====
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

// ===== Utilities =====
function mapToSpecies(item) {
  // FIELD MAPPING — aligns common names used in your previous code
  const sci =
    item.name ||
    item.scientific_name ||
    item.species_name ||
    item.species ||
    "";

  const common =
    item.common_name ||
    item.vernacular_name ||
    item.vernacular ||
    "";

  const img =
    item.image_url ||
    item.image ||
    (Array.isArray(item.images) && item.images[0]) ||
    item.photo_url ||
    item.photo ||
    "";

  const pointsTotal = Number(item.points?.total ?? item.total_points ?? 0);
  const pointsDetail = item.points?.detail || item.points_detail || {};

  return {
    name: sci,
    common_name: common,
    image_url: img,
    points: { total: pointsTotal, detail: pointsDetail },
    // keep extras untouched if present
    ...item,
  };
}

async function trySubcollection(uid, collName) {
  try {
    const ref = collection(db, "users", uid, collName);
    // prefer newest first
    const q = query(ref, orderBy("timestamp", "desc"), limit(200));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const rows = snap.docs.map(d => mapToSpecies(d.data()));
      console.log(`[Herbarium] loaded from subcollection: ${collName} (${rows.length})`);
      return rows;
    }
  } catch (e) {
    // silent; this coll may not exist in your project
    console.debug(`[Herbarium] no subcollection "${collName}" / skipped`, e?.message);
  }
  return [];
}

async function tryDocArray(uid, fieldName) {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const arr = snap.data()?.[fieldName];
      if (Array.isArray(arr) && arr.length) {
        const rows = arr.map(mapToSpecies);
        console.log(`[Herbarium] loaded from user doc array: ${fieldName} (${rows.length})`);
        return rows;
      }
    }
  } catch (e) {
    console.debug(`[Herbarium] user doc array "${fieldName}" not found / skipped`, e?.message);
  }
  return [];
}

// Tries all locations your previous code likely used, stops on first non-empty
async function loadHerbariumFor(uid) {
  // 1) subcollections (most precise)
  for (const coll of ["herbarium", "discoveries", "observations", "plants", "species"]) {
    const rows = await trySubcollection(uid, coll);
    if (rows.length) return rows;
  }

  // 2) arrays on user doc (fallbacks you previously used)
  for (const field of ["herbarium_list", "discoveries_list", "observations_list", "species_list"]) {
    const rows = await tryDocArray(uid, field);
    if (rows.length) return rows;
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
      console.warn("[Herbarium] nothing found in any known field/collection");
      return;
    }

    for (const sp of entries) listEl.appendChild(SpeciesCard(sp));
  } catch (e) {
    console.error("[Herbarium] load error:", e);
    listEl.textContent = "Could not load your herbarium.";
  }
});
