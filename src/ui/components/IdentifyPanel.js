// src/ui/components/IdentifyPanel.js
import { identifyPlant } from "../../api/plantgo.js";
import { ResultModal } from "./ResultModal.js";

export function IdentifyPanel() {
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

  const input = wrap.querySelector("#files");
  const preview = wrap.querySelector("#preview");
  const feedback = wrap.querySelector("#feedback");
  let chosen = [];

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

  wrap.querySelector("#identify").addEventListener("click", async () => {
    if (!chosen.length) { feedback.textContent = "Please add at least one photo."; return; }

    // Use the first image (same as your old backend)
    const file = chosen[0];

    // Create & show modal immediately (with loader)
    const modal = ResultModal();
    document.body.appendChild(modal.el);
    modal.showLoading("Identifying…");

    // Lock header progress (so live onSnapshot doesn't fight us)
    const pb = document.getElementById("resultLevelProgressBar");
    if (pb) pb.dataset.locked = "true";

    // Get geolocation, then call API
    try {
      feedback.textContent = "Fetching location…";
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      feedback.textContent = "Identifying…";
      const result = await identifyPlant({ file, lat, lon, model: "best" });

      await modal.showResult(result);
      feedback.textContent = "Done.";
    } catch (e) {
      feedback.textContent = e.message || "Identify failed";
      // keep modal open but stop loader
      try {
        await modal.showResult({ identify: { name: "Error" }, points: { total: 0, detail: {} } });
      } catch {}
    } finally {
      // Unlock progress bar updates from Firestore again
      const pb2 = document.getElementById("resultLevelProgressBar");
      if (pb2) pb2.dataset.locked = "false";
    }
  });

  return wrap;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
