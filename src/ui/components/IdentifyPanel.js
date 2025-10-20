import { identifyPlant } from "../../api/plantgo.js";
import { ResultModal } from "./ResultModal.js";
import { auth, db } from "../../../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function IdentifyPanel() {
  /* ...existing markup code... */

  // keep `chosen` array from your current code

  wrap.querySelector("#identify").addEventListener("click", async () => {
    if (!chosen.length) { feedback.textContent = "Please add at least one photo."; return; }
    const file = chosen[0];

    // Build photo preview URLs for the modal
    const photoUrls = chosen.map(f => URL.createObjectURL(f));

    // Get current total points BEFORE showing modal (for correct level display)
    let currentTotal = 0;
    const user = auth.currentUser;
    if (user) {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        currentTotal = Number(snap.data()?.total_points ?? 0);
      } catch {}
    }

    // Show modal immediately with loader + level from Firestore
    const modal = ResultModal();
    document.body.appendChild(modal.el);
    await modal.initLoading({ photos: photoUrls, currentTotalPoints: currentTotal });

    // Get geolocation
    let lat, lon;
    try {
      feedback.textContent = "Fetching location…";
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      lat = pos.coords.latitude; lon = pos.coords.longitude;
    } catch {
      feedback.textContent = "Location permission denied or unavailable.";
      return;
    }

    // Call API
    try {
      feedback.textContent = "Identifying…";
      const result = await identifyPlant({ file, lat, lon, model: "best" });

      // Extract PlantNet image code from raw (best effort)
      const bestRaw = result?.identify?.raw || null;
      const plantnetImageCode =
        bestRaw?.images?.[0]?.id ||
        bestRaw?.imageCode ||
        bestRaw?.image?.id ||
        "";

      // Stream the result to the modal (also saves observation & discovery, updates total)
      await modal.showResult({
        ...result,
        lat, lon,
        plantnetImageCode,
        photoCount: chosen.length,
      });

      feedback.textContent = "Done.";
    } catch (e) {
      feedback.textContent = e?.message || "Identify failed.";
    }
  });

  return wrap;
}
