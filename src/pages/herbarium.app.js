// src/pages/herbarium.app.js

import { Header } from "../ui/components/Header.js";
import { HerbariumCard } from "../ui/components/HerbariumCard.js";
import { listenUserLevel } from "../user/level.js";

// Firebase config is at project root
import { auth, db } from "../../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection, getDocs, query, orderBy, documentId
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Header with “Main” + “Log out”
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

// Load discoveries: users/{uid}/discoveries ordered alphabetically by doc ID (= speciesName)
async function loadDiscoveries(uid) {
  const ref = collection(db, "users", uid, "discoveries");
  const qy = query(ref, orderBy(documentId(), "asc"));
  const snap = await getDocs(qy);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      name: d.id,                    // doc id == speciesName
      discoveredAt: data.discoveredAt,
      image_url: "",                 // we’ll let HerbariumCard fetch Wikipedia by name
    };
  });
}

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
    for (const e of entries) listEl.appendChild(HerbariumCard(e));
  } catch (e) {
    console.error("[Herbarium] load error:", e);
    listEl.textContent = "Could not load your herbarium.";
  }
});
