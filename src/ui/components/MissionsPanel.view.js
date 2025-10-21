import { SpeciesCard } from "./SpeciesCard.js";

function renderSpeciesList(listEl, missionsList = []) {
  listEl.innerHTML = "";
  if (!missionsList.length) {
    listEl.textContent = "No missions yet.";
    return;
  }
  for (const m of missionsList) {
    // If your API uses a different shape, adjust here:
    // e.g., SpeciesCard(m.species) or SpeciesCard({ ...m, title: m.name })
    listEl.appendChild(SpeciesCard(m));
  }
}

export function createMissionsPanelView() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>Missions near you</h2>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="secondary" type="button">Get Location & Missions</button>
    </div>
    <div id="list" class="form-grid" aria-live="polite">Loading…</div>
  `;
  const list = sec.querySelector("#list");
  const locateBtn = sec.querySelector("#locate");

  return {
    element: sec,
    setStatus(text) { list.textContent = text ?? ""; },
    renderMissions(missions) { renderSpeciesList(list, missions); },
    onLocate(handler) { locateBtn.addEventListener("click", handler); },
  };
}
