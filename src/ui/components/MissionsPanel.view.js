import { MissionCard } from "../../controllers/MissionCard.controller.js";

function renderSpeciesList(listEl, missionsList = []) {
  listEl.innerHTML = "";
  if (!missionsList.length) {
    listEl.textContent = "No missions yet.";
    return;
  }
  for (const m of missionsList) listEl.appendChild(MissionCard(m));
}

export function createMissionsPanelView() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>Missions near you</h2>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="secondary" type="button">Get Location & Missions</button>
    </div>
    <div id="status" aria-live="polite" class="validation-feedback"></div>
    <div id="list" class="form-grid"></div>
  `;

  const statusEl = sec.querySelector("#status");
  const list = sec.querySelector("#list");
  const locateBtn = sec.querySelector("#locate");

  // optional: initial message
  statusEl.textContent = " ";

  return {
    element: sec,
    setStatus(text) { statusEl.textContent = text ?? ""; },
    renderMissions(missions) { renderSpeciesList(list, missions); },
    onLocate(handler) { locateBtn.addEventListener("click", handler); },
  };
}
