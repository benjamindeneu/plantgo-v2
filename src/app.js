import { Header } from "./ui/components/Header.js";
import { IdentifyPanel } from "./ui/components/IdentifyPanel.js";
import { MissionsPanel } from "./ui/components/MissionsPanel.js";

function App(root) {
  root.innerHTML = "";
  root.classList.add("app-shell");

  const header = Header({ user: null, level: 1, progress: 10, onMenu: () => {} });
  const main = document.createElement("main");
  main.appendChild(IdentifyPanel());
  main.appendChild(document.createElement("hr")).className = "rule";
  main.appendChild(MissionsPanel());

  const footer = document.createElement("footer");
  footer.className = "footer";
  footer.innerHTML = `<div class="brand"><img alt="Powered by Pl@ntNet" loading="lazy" src="https://my.plantnet.org/images/powered-by-plantnet-dark.svg"/></div>`;

  root.append(header, main, footer);
}

App(document.getElementById("app"));
