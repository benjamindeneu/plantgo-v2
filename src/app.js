import { Header } from "./ui/components/Header.js";
import { IdentifyPanel } from "./ui/components/IdentifyPanel.js";
import { MissionsPanel } from "./ui/components/MissionsPanel.js";
import { requireAuth } from "./auth/guard.js";

async function App(root) {
  const user = await requireAuth();
  if (!user) return; // redirected if not authed

  root.innerHTML = "";
  root.classList.add("app-shell");
  const header = Header({ user, level: 1, progress: 10, onMenu: () => {} });
  const main = document.createElement("main");
  main.appendChild(IdentifyPanel());
  main.appendChild(document.createElement("hr"));
  main.appendChild(MissionsPanel());
  root.append(header, main);
}

App(document.getElementById("app"));
