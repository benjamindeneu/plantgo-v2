// src/ui/components/IdentifyPanel.view.js

/**
 * Pure view for the Identify panel.
 * - Builds DOM
 * - Handles visual preview of selected files
 * - Emits user interactions to the controller via callbacks
 */
export function createIdentifyPanelView() {
  const wrap = document.createElement("section");
  wrap.className = "general-validation card";
  wrap.innerHTML = `
    <h1>Identify a plant</h1>
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
  const btnIdentify = wrap.querySelector("#identify");
  const btnClear = wrap.querySelector("#clear");

  // --- callbacks registered by controller ---
  let filesChangeCb = null;
  let identifyCb = null;
  let clearCb = null;

  function renderPreview(files = []) {
    preview.innerHTML = "";
    for (const f of files) {
      const img = document.createElement("img");
      img.className = "species-image";
      img.style.width = "84px";
      img.style.height = "84px";
      img.style.objectFit = "cover";
      img.src = URL.createObjectURL(f);
      preview.appendChild(img);
    }
    feedback.textContent = files.length ? `${files.length} photo(s) ready.` : "";
  }

  // View-internal: reflect file input changes & notify controller
  input.addEventListener("change", () => {
    const files = Array.from(input.files || []);
    renderPreview(files);
    if (filesChangeCb) filesChangeCb(files);
  });

  btnIdentify.addEventListener("click", () => {
    if (identifyCb) identifyCb();
  });

  btnClear.addEventListener("click", () => {
    // Reset visuals
    input.value = "";
    renderPreview([]);
    if (clearCb) clearCb();
  });

  return {
    element: wrap,
    // View APIs the controller can use:
    setFeedback(text) {
      feedback.textContent = text ?? "";
    },
    onFilesChange(cb) {
      filesChangeCb = cb;
    },
    onIdentify(cb) {
      identifyCb = cb;
    },
    onClear(cb) {
      clearCb = cb;
    },
  };
}
