import { Header } from "./ui/components/Header.js";
import { IdentifyPanel } from "./ui/components/IdentifyPanel.js";
import { MissionsPanel } from "./ui/components/MissionsPanel.js";
import { listenUserLevel } from "./user/level.js";

import { auth } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

function App(root) {
  root.innerHTML = "";
  root.classList.add("app-shell");

  let stopLevel = () => {};

  const header = Header({
    user: null,
    level: 1,
    progress: 0,
    onMenu: () => {},
    onLogout: async () => {
      try {
        stopLevel();
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

  onAuthStateChanged(auth, (user) => {
    header.setUser(user);
    if (stopLevel) stopLevel();
    stopLevel = user ? listenUserLevel(user.uid, (lvl) => header.setLevel(lvl)) : (()=>{});
  });
}

App(document.getElementById("app"));
