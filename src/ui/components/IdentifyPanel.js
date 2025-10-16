import { identifyPlant } from "../../api/plantgo.js";
import { Modal } from "./Modal.js";

export function IdentifyPanel() {
  const wrap = document.createElement("section");
  wrap.className = "general-validation card";
  wrap.innerHTML = `
    <h2>Identify a plant</h2>
    <input id="files" type="file" accept="image/*" capture="environment" multiple hidden>
    <label class="label-file" for="files">Add photos</label>
    <div class="preview-strip" id="preview"></div>
    <div style="display:flex; gap:8px; justify-content:center; margin-top:12px">
      <button id="identify" class="primary">Identify now</button>
      <button id="clear" class="secondary">Clear</button>
    </div>
    <div id="feedback" aria-live="polite" class="validation-feedback"></div>
  `;

  const input = wrap.querySelector("#files");
  const preview = wrap.querySelector("#preview");
  const feedback = wrap.querySelector("#feedback");
  const chosen = [];

  input.addEventListener("change", () => {
    preview.innerHTML = "";
    chosen.length = 0;
    for (const f of input.files) {
      chosen.push(f);
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
    chosen.length = 0;
    feedback.textContent = "";
  });

  wrap.querySelector("#identify").addEventListener("click", async () => {
    if (!chosen.length) { feedback.textContent = "Please add at least one photo."; return; }
    feedback.textContent = "Identifying…";
    try {
      const result = await identifyPlant({ files: chosen });
      const modal = Modal({ title: "Identification Results", content: `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>` });
      document.body.appendChild(modal);
      feedback.textContent = "Done.";
    } catch (e) {
      feedback.textContent = e.message;
    }
  });

  return wrap;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}
