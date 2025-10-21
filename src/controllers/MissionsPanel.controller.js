// src/controllers/MissionsPanel.controller.js
import { createMissionsPanelView } from "../ui/components/MissionsPanel.view.js";
import { getCurrentPosition } from "../data/geo.service.js";
import { maybeLoadCachedMissions, loadAndMaybePersistMissions } from "../data/missions.repo.js";
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const toDate = (ts) =>
  typeof ts?.toDate === "function" ? ts.toDate()
    : typeof ts?.seconds === "number" ? new Date(ts.seconds * 1000)
    : new Date(ts);
const isFresh = (ts, win = THREE_HOURS_MS) => {
  const d = toDate(ts);
  if (!d || Number.isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < win;
};

export function MissionsPanel() {
  const view = createMissionsPanelView();

  // 🔑 React to auth state instead of reading auth.currentUser immediately
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      view.setStatus("Please log in.");
      return;
    }
    try {
      const { missions, fromCache } = await maybeLoadCachedMissions(user.uid, isFresh);
      if (fromCache && missions.length) {
        view.renderMissions(missions);
      } else {
        view.setStatus("No missions yet. Use the button above.");
      }
    } catch (e) {
      console.error("[MissionsPanel] Cache load error:", e);
      view.setStatus("Unable to load cached missions.");
    }
  });

  // Fetch by location → render immediately; save is best-effort in background
  view.onLocate(async () => {
    // this will clear the list, but will show "No missions yet." until data arrives
    view.renderMissions([]);
    view.setStatus("Fetching location…");
    try {
      const pos = await getCurrentPosition();
      view.setStatus("Loading missions…");

      const user = auth.currentUser;
      const missions = await loadAndMaybePersistMissions(
        user?.uid,
        { lat: pos.coords.latitude, lon: pos.coords.longitude }
      );

      view.renderMissions(missions);
      // view.setStatus(""); // only if status is separate from the list
    } catch (e) {
      console.error("[MissionsPanel] Locate/Fetch error:", e);
      view.setStatus(e?.message || "Location/mission error.");
    }
  });

  // (optional) You can expose unsubscribe if you ever need to clean up
  return view.element;
}
