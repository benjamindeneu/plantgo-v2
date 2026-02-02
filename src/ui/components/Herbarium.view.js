// src/ui/components/Herbarium.view.js
import { HerbariumCard } from "../../controllers/HerbariumCard.controller.js";
import { t } from "../../language/i18n.js";

function renderEntries(listEl, entries = []) {
  listEl.innerHTML = "";
  if (!entries.length) {
    listEl.textContent = t("herbarium.empty");
    return;
  }
  for (const e of entries) listEl.appendChild(HerbariumCard(e));
}

export function createHerbariumView() {
  const sec = document.createElement("section");
  sec.className = "herbarium-panel";

  sec.innerHTML = `
    <div id="herbariumStatus" class="validation-feedback" aria-live="polite"></div>
    <div id="discoveriesList" class="grid"></div>
  `;

  const statusEl = sec.querySelector("#herbariumStatus");
  const listEl = sec.querySelector("#discoveriesList");

  // keep last entries so we can re-render empty label on language change
  let lastEntries = [];

  function refreshI18n() {
    // If empty, we want the empty message to update language
    if (!lastEntries.length) renderEntries(listEl, lastEntries);
  }

  document.addEventListener("i18n:changed", () => {
    view.refreshI18n();
  });

  return {
    element: sec,

    setStatus(text) { statusEl.textContent = text ?? ""; },

    clearEntries() {
      lastEntries = [];
      listEl.innerHTML = "";
    },

    renderEntries(entries) {
      lastEntries = Array.isArray(entries) ? entries : [];
      renderEntries(listEl, lastEntries);
    },

    // controller can call this after setLanguage(...)
    refreshI18n,
  };
}
