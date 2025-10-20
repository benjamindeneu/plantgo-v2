// src/pages/herbarium.app.js

import { Header } from "../ui/components/Header.js";
import { SpeciesCard } from "../ui/components/SpeciesCard.js";
import { listenUserLevel } from "../user/level.js";

// IMPORTANT: firebase-config is at project root (NOT in src)
import { auth, db } from "../../firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  documentId,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ----- Header (Herbarium variant: Main + Log out)
const headerMount = document.getElementById("appHeader");
const header = Header({
  user: null,
  level: 1,
  menuVariant: "herbarium",
  onBackHome: () => { location.href = "./index.html"; },
  onLogout: async () => {
    try { await signOut(auth); location.href = "./login.html"; }
    catch (e) { alert(e.message); }
  }
});
headerMount.replaceWith(header);

// ----- Load discoveries exactly as stored: users/{uid}/discoveries, alphabetical by doc ID
async function loadDiscoveries(uid) {
  const ref = collection(db, "users", uid, "discoveries");
  const qy = query(ref, orderBy(documentId(), "asc")); // alphabetical (doc ID == speciesName)
  const snap = await getDocs(qy);
  return snap.docs.map(d => {
    // Doc ID == speciesName; fields include observationId, location, discoveredAt
    const data = d.data();
    const speciesName = d.id; // same as data.speciesName per your schema

    return {
      // SpeciesCard expects these:
      name: speciesName,
      common_name: "",       // not provided; leave empty
      image_url: "",         // SpeciesCard will fetch Wikipedia image from `name`
      points: { total: 0, detail: {} }, // not part of discoveries; keep neutral

      // Keep the rest available if you want to use later (not used by SpeciesCard)
      observationId: data.observationId,
      location: data.location,
      discoveredAt: data.discoveredAt,
    };
  });
}

// ----- Page boot
const listEl = document.getElementById("discoveriesList");
let stopLevel = () => {};

onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = "./login.html"; return; }

  header.setUser(user);
  if (stopLevel) stopLevel();
  stopLevel = listenUserLevel(user.uid, (lvl) => header.setLevel(lvl));

  try {
    listEl.textContent = "Loading your herbarium…";
    const entries = await loadDiscoveries(user.uid);

    listEl.innerHTML = "";
    if (!entries.length) {
      listEl.textContent = "No saved discoveries yet.";
      return;
    }
    for (const sp of entries) listEl.appendChild(SpeciesCard(sp));
  } catch (e) {
    console.error("[Herbarium] load error:", e);
    listEl.textContent = "Could not load your herbarium.";
  }
});
