// src/ui/components/MissionsPanel.view.js
import { MissionCard } from "../../controllers/MissionCard.controller.js";
import { t } from "../../language/i18n.js";

function renderMissionsList(listEl, missionsList = []) {
  listEl.innerHTML = "";
  if (!missionsList.length) {
    listEl.textContent = t("missions.empty");
    return;
  }
  for (const m of missionsList) listEl.appendChild(MissionCard(m));
}

export function createMissionsPanelView() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h1 data-i18n="missions.title">Your missions</h1>

    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="secondary" type="button" data-i18n="missions.refresh">
        Refresh Missions
      </button>
    </div>

    <div id="status" aria-live="polite" class="validation-feedback"></div>
    <div id="list" class="form-grid"></div>
  `;

  const statusEl = sec.querySelector("#status");
  const listEl = sec.querySelector("#list");
  const locateBtn = sec.querySelector("#locate");

  // keep last missions so we can re-render on language change
  let lastMissions = [];

  function refreshI18n() {
    // re-render list so empty text (and any card-localized parts) update
    renderMissionsList(listEl, lastMissions);
  }

  document.addEventListener("i18n:changed", refreshI18n);

  // optional: initial message
  statusEl.textContent = " ";

  return {
    element: sec,
    setStatus(text) { statusEl.textContent = text ?? ""; },

    renderMissions(missions) {
      lastMissions = Array.isArray(missions) ? missions : [];
      renderMissionsList(listEl, lastMissions);
    },

    onLocate(handler) { locateBtn.addEventListener("click", handler); },

    refreshI18n,
  };
}
