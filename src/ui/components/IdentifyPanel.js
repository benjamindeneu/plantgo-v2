// src/ui/components/IdentifyPanel.js
import { identifyPlant } from "../../api/plantgo.js";
import { Modal } from "./Modal.js";

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
    if (!chosen.length) {
      feedback.textContent = "Please add at least one photo.";
      return;
    }

    // The backend expects ONE file under "image".
    // Use the first photo (same as your previous working logic).
    const file = chosen[0];

    feedback.textContent = "Fetching location…";
    let lat, lon;
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch (e) {
      feedback.textContent = "Location permission denied or unavailable.";
      return;
    }

    feedback.textContent = "Identifying…";
    try {
      const result = await identifyPlant({ file, lat, lon, model: "best" });
      // Show JSON result in a modal for now (matches your earlier debug style)
      const modal = Modal({
        title: "Identification Results",
        content: `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`
      });
      document.body.appendChild(modal);
      feedback.textContent = "Done.";
    } catch (e) {
      feedback.textContent = e.message;
    }
  });

  return wrap;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
