// src/pages/herbarium.app.js
import { Header } from "../ui/components/Header.js";
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { listenUserLevel } from "../user/level.js";

// Mount header with the Herbarium variant ("Main" + "Log out")
const headerRoot = document.getElementById("appHeader");

const header = Header({
  user: null,
  level: 1,
  progress: 0,
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

headerRoot.replaceWith(header);

// Keep header in sync with auth state (name + level if you compute it here)
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "./login.html";
    return;
  }
  header.setUser(user);
  // If you have a level listener for Herbarium as well, you can reuse your existing code here.
});

let stopLevel = () => {};
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  if (stopLevel) stopLevel();
  stopLevel = listenUserLevel(user.uid, (lvl) => header.setLevel(lvl));
});