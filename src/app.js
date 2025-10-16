import { Header } from "./ui/components/Header.js";
import { IdentifyPanel } from "./ui/components/IdentifyPanel.js";
import { MissionsPanel } from "./ui/components/MissionsPanel.js";

// Firebase auth imports (use the old working pattern: root-level firebase-config.js)
import { auth } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

function getStoredLevel() {
  const v = Number(localStorage.getItem("userLevel"));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function App(root) {
  root.innerHTML = "";
  root.classList.add("app-shell");

  // Create header with placeholders; we'll update when auth state resolves
  const header = Header({
    user: null,
    level: getStoredLevel(),
    progress: 0,
    onMenu: () => {},
    onLogout: async () => {
      try {
        await signOut(auth);
        location.href = "./login.html";
      } catch (e) {
        alert(e.message);
      }
    },
    onHerbarium: () => { location.href = "./plantdex.html"; }
  });

  const main = document.createElement("main");
  main.appendChild(IdentifyPanel());
  main.appendChild(document.createElement("hr")).className = "rule";
  main.appendChild(MissionsPanel());

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `<div class="brand"><img alt="Powered by Pl@ntNet" loading="lazy" src="https://my.plantnet.org/images/powered-by-plantnet-dark.svg"/></div>`;

  root.append(header, main, footer);

  // Listen for auth changes and update header name
  onAuthStateChanged(auth, (user) => {
    header.setUser(user);
    // OPTIONAL: if you store level per user elsewhere, update it here:
    // header.setLevel(fetchLevelFor(user));
    // For now, read from localStorage so the UI matches prior expectations.
    header.setLevel(getStoredLevel());
  });
}

App(document.getElementById("app"));
