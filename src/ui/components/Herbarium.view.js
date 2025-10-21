// src/ui/components/Herbarium.view.js
import { HerbariumCard } from "./HerbariumCard.js";

function renderEntries(listEl, entries = []) {
  listEl.innerHTML = "";
  if (!entries.length) {
    listEl.textContent = "No saved discoveries yet.";
    return;
  }
  for (const e of entries) listEl.appendChild(HerbariumCard(e));
}

export function createHerbariumView() {
  const sec = document.createElement("section");
  sec.className = "herbarium-panel";

  // Keep the same id so existing CSS/layout still work
  sec.innerHTML = `
    <div id="herbariumStatus" class="validation-feedback" aria-live="polite"></div>
    <div id="discoveriesList" class="grid"></div>
  `;

  const statusEl = sec.querySelector("#herbariumStatus");
  const listEl = sec.querySelector("#discoveriesList");

  return {
    element: sec,
    setStatus(text) { statusEl.textContent = text ?? ""; },
    clearEntries() { listEl.innerHTML = ""; },
    renderEntries(entries) { renderEntries(listEl, entries); },
  };
}
