// src/ui/components/MissionCard.view.js
import { t } from "../../language/i18n.js";

export function createMissionCardView({
  sciName,
  commonName,
  heroUrl = "",
  pointsTotal = 0,
  levelClass = "common-points",
  missionLevel = "Common",
}) {
  const root = document.createElement("div");
  root.className = "species-item";

  root.innerHTML = `
    <div class="mission-title" id="missionTitle"></div>

    <div class="card-content">
      <div class="herbarium-img" id="imgWrap">
        ${
          heroUrl
            ? `<img class="species-image" src="${heroUrl}" alt="${escapeHtml(sciName)}" loading="lazy">`
            : `<div class="wiki-skeleton"></div>`
        }
      </div>

      <div class="species-info">
        <p><strong id="commonName">${escapeHtml(commonName)}</strong></p>
        <p class="muted" id="sciName">${escapeHtml(sciName)}</p>

        <div class="species-actions">
          <button class="points-btn ${levelClass}" id="pointsBtn" type="button"></button>
        </div>
      </div>
    </div>
  `;

  const missionTitleEl = root.querySelector("#missionTitle");
  const imgWrap = root.querySelector("#imgWrap");
  const pointsBtn = root.querySelector("#pointsBtn");

  let onPoints = null;
  pointsBtn.addEventListener("click", () => { if (onPoints) onPoints(); });

  function refreshI18n() {
    if (missionTitleEl) {
      missionTitleEl.textContent = `${t("missions.card.missionPrefix")} ${sciName}`;
    }
    if (pointsBtn) {
      pointsBtn.innerHTML = `${pointsTotal} ${t("missions.card.points")}<br>${escapeHtml(missionLevel)}`;
    }
  }

  refreshI18n();

  return {
    element: root,
    setWikiImage(url) {
      if (!imgWrap) return;
      imgWrap.innerHTML = url
        ? `<img src="${url}" alt="${escapeHtml(sciName)}" loading="lazy">`
        : `<div class="wiki-missing">${escapeHtml(t("missions.card.noImage"))}</div>`;
    },
    onPointsClick(cb) { onPoints = cb; },
    refreshI18n,
  };
}

function escapeHtml(s) {
  const str = String(s ?? "");
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
