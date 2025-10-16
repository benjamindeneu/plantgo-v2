// Basic error surfaces
window.addEventListener('error', (e) => {
  const el = document.getElementById('app');
  if (!el) return;
  const msg = (e.error && e.error.message) || e.message || String(e);
  el.innerHTML = `<div style="padding:16px;border:1px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:8px;margin:16px;font-family:system-ui">⚠️ ${msg}</div>`;
  console.error(e.error || e.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  const el = document.getElementById('app');
  if (!el) return;
  const msg = (e.reason && e.reason.message) || String(e.reason);
  el.innerHTML = `<div style="padding:16px;border:1px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:8px;margin:16px;font-family:system-ui">⚠️ ${msg}</div>`;
  console.error(e.reason);
});
// Basic error surface to avoid silent white screens
window.addEventListener('error', (e) => {
  const el = document.getElementById('app');
  if (!el) return;
  const msg = (e.error && e.error.message) || e.message || String(e);
  el.innerHTML = `<div style="padding:16px;border:1px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:8px;margin:16px;font-family:system-ui">⚠️ ${msg}</div>`;
  console.error(e.error || e.message || e);
});
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
