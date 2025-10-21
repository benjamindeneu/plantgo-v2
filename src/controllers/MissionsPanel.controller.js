import { createMissionsPanelView } from "../ui/components/MissionsPanel.view.js";
import { getCurrentUser } from "../data/user.repo.js";
import { getCurrentPosition } from "../data/geo.service.js";
import { maybeLoadCachedMissions, loadAndMaybePersistMissions } from "../data/missions.repo.js";

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

  (async () => {
    const user = await getCurrentUser();
    if (!user) return view.setStatus("Please log in.");

    try {
      const { missions, fromCache } = await maybeLoadCachedMissions(user.uid, isFresh);
      if (fromCache && missions.length) view.renderMissions(missions);
      else view.setStatus("No missions yet. Use the button above.");
    } catch (e) {
      console.error("[MissionsPanel] Cache load error:", e);
      view.setStatus("Unable to load cached missions.");
    }
  })();

  view.onLocate(async () => {
    view.setStatus("Fetching location…");
    try {
      const pos = await getCurrentPosition();
      view.setStatus("Loading missions…");

      const user = await getCurrentUser();
      const missions = await loadAndMaybePersistMissions(
        user?.uid,
        { lat: pos.coords.latitude, lon: pos.coords.longitude }
      );

      // ✅ render immediately regardless of save result
      view.renderMissions(missions);
      view.setStatus("");
    } catch (e) {
      console.error("[MissionsPanel] Locate/Fetch error:", e);
      view.setStatus(e?.message || "Location/mission error.");
    }
  });

  return view.element;
}
