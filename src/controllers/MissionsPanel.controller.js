import { identifyPlant } from "../api/plantgo.js";
import { ResultModal } from "../ui/components/ResultModal.js";
import { createIdentifyPanelView } from "../ui/components/IdentifyPanel.view.js";
import { getCurrentUser, getUserTotalPoints } from "../data/user.repo.js";
import { getCurrentPosition } from "../data/geo.service.js";

export function IdentifyPanel() {
  const view = createIdentifyPanelView();
  let chosen = [];

  view.onFilesChange((files) => { chosen = files; });
  view.onClear(() => { chosen = []; view.setFeedback(""); });

  view.onIdentify(async () => {
    if (!chosen.length) return view.setFeedback("Please add at least one photo.");

    const file = chosen[0];
    const photoUrls = chosen.map(f => URL.createObjectURL(f));

    // preload level/progress
    let currentTotal = 0;
    const user = await getCurrentUser();
    if (user) currentTotal = await getUserTotalPoints(user.uid);

    const modal = ResultModal();
    document.body.appendChild(modal.el);
    await modal.initLoading({ photos: photoUrls, currentTotalPoints: currentTotal });

    // geolocate
    let lat, lon;
    try {
      view.setFeedback("Fetching location…");
      const pos = await getCurrentPosition();
      ({ latitude: lat, longitude: lon } = pos.coords);
    } catch {
      return view.setFeedback("Location permission denied or unavailable.");
    }

    // identify
    try {
      view.setFeedback("Identifying…");
      const result = await identifyPlant({ file, lat, lon, model: "best" });

      const bestRaw = result?.identify?.raw || null;
      const plantnetImageCode =
        bestRaw?.images?.[0]?.id || bestRaw?.imageCode || bestRaw?.image?.id || "";

      await modal.showResult({ ...result, lat, lon, plantnetImageCode, photoCount: chosen.length });
      view.setFeedback("Done.");
    } catch (e) {
      view.setFeedback(e?.message || "Identify failed.");
    }
  });

  return view.element;
}
