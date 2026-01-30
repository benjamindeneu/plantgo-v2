// src/ui/components/IdentifyPanel.view.js

/**
 * Pure view for the Identify panel.
 * - Builds DOM
 * - Handles visual preview of selected files
 * - Accumulates multiple file selections
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

    <div id="actions" style="display:none; gap:8px; justify-content:center; margin-top:12px">
      <button id="identify" class="primary" type="button">Identify now</button>
      <button id="clear" class="secondary" type="button">Clear</button>
    </div>

    <div id="feedback" aria-live="polite" class="validation-feedback"></div>
  `;

  const input = wrap.querySelector("#files");
  const preview = wrap.querySelector("#preview");
  const feedback = wrap.querySelector("#feedback");
  const actions = wrap.querySelector("#actions");
  const btnIdentify = wrap.querySelector("#identify");
  const btnClear = wrap.querySelector("#clear");

  // --- callbacks registered by controller ---
  let filesChangeCb = null;
  let identifyCb = null;
  let clearCb = null;

  // --- internal accumulated state ---
  let selectedFiles = [];

  function setActionsVisible(isVisible) {
    actions.style.display = isVisible ? "flex" : "none";
  }

  function renderPreview(files = []) {
    preview.innerHTML = "";

    for (const file of files) {
      const img = document.createElement("img");
      img.className = "species-image";
      img.style.width = "84px";
      img.style.height = "84px";
      img.style.objectFit = "cover";
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
    }

    // Remove the temporary debug text about how many photos are selected
    // (keep feedback for controller-driven messages only)
    // Optionally clear feedback when user changes selection:
    // feedback.textContent = "";
    setActionsVisible(files.length > 0);
  }

  function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function clearSelection({ notify = true } = {}) {
    selectedFiles = [];
    input.value = "";
    renderPreview([]);
    if (notify && clearCb) clearCb();
  }

  // View-internal: reflect file input changes & notify controller
  input.addEventListener("change", () => {
    const newFiles = Array.from(input.files || []);
    const existing = new Set(selectedFiles.map(fileKey));

    for (const file of newFiles) {
      const key = fileKey(file);
      if (!existing.has(key)) {
        selectedFiles.push(file);
        existing.add(key);
      }
    }

    renderPreview(selectedFiles);
    if (filesChangeCb) filesChangeCb(selectedFiles);

    // Allow re-selecting the same file later
    input.value = "";
  });

  btnIdentify.addEventListener("click", () => {
    if (!selectedFiles.length) return;

    // Snapshot for safety (controller can ignore the argument if it doesn't use it)
    const filesSnapshot = selectedFiles.slice();

    if (identifyCb) identifyCb(filesSnapshot);

    // Clear the field right after submitting identification (your request)
    clearSelection({ notify: false });
  });

  btnClear.addEventListener("click", () => {
    clearSelection({ notify: true });
  });

  // Ensure initial hidden state
  setActionsVisible(false);

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
