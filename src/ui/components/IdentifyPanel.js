// src/ui/components/IdentifyPanel.js
import { identifyPlant } from "../../api/plantgo.js";
import { ResultModal } from "./ResultModal.js";
import { auth, db } from "../../../firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

export function IdentifyPanel() {
  // --- CREATE WRAPPER FIRST (prevents "wrap is not defined") ---
  const wrap = document.createElement("section");
  wrap.className = "general-validation card";
  wrap.innerHTML = `
    <h2>Identify a plant</h2>
    <input id="files" type="file" accept="image/*" capture="environment" multiple hidden>
    <label class="label-file" for="files">Add photo(s)</label>
    <div class="preview-strip" id="preview"></div>
    <div style="display:flex; gap:8px; justify-content:center; margin-top:12px">
      <button id="identify" class="primary" type="button">Identify now</button>
      <button id="clear" class="secondary" type="button">Clear</button>
    </div>
    <div id="feedback" aria-live="polite" class="validation-feedback"></div>
  `;

  // --- LOCAL STATE / ELEMENTS ---
  const input = wrap.querySelector("#files");
  const preview = wrap.querySelector("#preview");
  const feedback = wrap.querySelector("#feedback");
  let chosen = [];

  // --- FILE HANDLING ---
  input.addEventListener("change", () => {
    preview.innerHTML = "";
    chosen = Array.from(input.files || []);
    for (const f of chosen) {
      const img = document.createElement("img");
      img.className = "species-image";
      img.style.width = "84px";
      img.style.height = "84px";
      img.style.objectFit = "cover";
      img.src = URL.createObjectURL(f);
      preview.appendChild(img);
    }
    feedback.textContent = chosen.length ? `${chosen.length} photo(s) ready.` : "";
  });

  wrap.querySelector("#clear").addEventListener("click", () => {
    input.value = "";
    preview.innerHTML = "";
    chosen = [];
    feedback.textContent = "";
  });

  // --- IDENTIFY FLOW ---
  wrap.querySelector("#identify").addEventListener("click", async () => {
    if (!chosen.length) {
      feedback.textContent = "Please add at least one photo.";
      return;
    }

    const file = chosen[0]; // backend expects a single "image" field
    const photoUrls = chosen.map(f => URL.createObjectURL(f));

    // Get current total points BEFORE showing the modal, to display the real level/progress while loading
    let currentTotal = 0;
    const user = auth.currentUser;
    if (user) {
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        currentTotal = Number(snap.data()?.total_points ?? 0);
      } catch { /* noop */ }
    }

    // Show modal immediately (with loader & correct level)
    const modal = ResultModal();
    document.body.appendChild(modal.el);
    await modal.initLoading({ photos: photoUrls, currentTotalPoints: currentTotal });

    // Geolocation
    let lat, lon;
    try {
      feedback.textContent = "Fetching location…";
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000
        })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      feedback.textContent = "Location permission denied or unavailable.";
      return;
    }

    // Call backend
    try {
      feedback.textContent = "Identifying…";
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
