// src/ui/components/IdentifyPanel.controller.js
import { identifyPlant } from "../api/plantgo.js";
import { ResultModal } from "../ui/components/ResultModal.js";
import { createIdentifyPanelView } from "../ui/components/IdentifyPanel.view.js";

import { auth, db } from "../../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function IdentifyPanel() {
  const view = createIdentifyPanelView();

  // controller state (not stored in the view)
  let chosen = [];

  // Wire view events
  view.onFilesChange((files) => {
    chosen = files;
  });

  view.onClear(() => {
    chosen = [];
    view.setFeedback("");
  });

  view.onIdentify(async () => {
    if (!chosen.length) {
      view.setFeedback("Please add at least one photo.");
      return;
    }

    const file = chosen[0]; // backend expects a single "image" field
    const photoUrls = chosen.map((f) => URL.createObjectURL(f));

    // Get current total points before showing modal
    let currentTotal = 0;
    const user = auth.currentUser;
    if (user) {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        currentTotal = Number(snap.data()?.total_points ?? 0);
      } catch {
        /* noop */
      }
    }

    // Show modal immediately (with loader & correct level)
    const modal = ResultModal();
    document.body.appendChild(modal.el);
    await modal.initLoading({ photos: photoUrls, currentTotalPoints: currentTotal });

    // Geolocation
    let lat, lon;
    try {
      view.setFeedback("Fetching location…");
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      view.setFeedback("Location permission denied or unavailable.");
      return;
    }

    // Call backend
    try {
      view.setFeedback("Identifying…");
      const result = await identifyPlant({ file, lat, lon, model: "best" });

      // Extract PlantNet image code (best effort from raw)
      const bestRaw = result?.identify?.raw || null;
      const plantnetImageCode =
        bestRaw?.images?.[0]?.id ||
        bestRaw?.imageCode ||
        bestRaw?.image?.id ||
        "";

      await modal.showResult({
        ...result,
        lat,
        lon,
        plantnetImageCode,
        photoCount: chosen.length,
      });

      view.setFeedback("Done.");
    } catch (e) {
      view.setFeedback(e?.message || "Identify failed.");
    }
  });

  return view.element;
}
