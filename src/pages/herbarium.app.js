// src/pages/herbarium.app.js

import { Header } from "../controllers/Header.controller.js";
import { HerbariumPanel } from "../controllers/Herbarium.controller.js";
import { listenUserLevel } from "../user/level.js";

// Firebase at project root
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// ----- Header (Herbarium variant) -----
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

// ----- Herbarium list panel -----
const listMount = document.getElementById("discoveriesList");
// Replace the old list node with our panel (which still contains a #discoveriesList inside)
const herbariumPanel = HerbariumPanel();
listMount.replaceWith(herbariumPanel);

// Keep header level in sync with auth (same as before)
let stopLevel = () => {};
onAuthStateChanged(auth, (user) => {
  if (!user) { location.href = "./login.html"; return; }

  header.setUser(user);
  if (stopLevel) stopLevel();
  stopLevel = listenUserLevel(user.uid, (lvl) => header.setLevel(lvl));
});
