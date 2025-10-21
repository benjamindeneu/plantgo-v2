// src/ui/components/MissionCard.view.js

/**
 * Visual-only MissionCard.
 * Expects normalized props so the view stays dumb.
 */
export function createMissionCardView({
  sciName,
  commonName,
  heroUrl = "",
  pointsTotal = 0,
  levelClass = "common-points",  // "common-points" | "rare-points" | "epic-points" | "legendary-points"
  missionLevel = "Common",
}) {
  const root = document.createElement("div");
  // keeping class name to avoid CSS changes; you can rename to 'mission-item' later
  root.className = "species-item";

  root.innerHTML = `
    <div class="mission-title">Mission: ${sciName}</div>
    <div class="card-content">
      <div class="species-image-container">
        ${heroUrl ? `<img class="species-image" src="${heroUrl}" alt="${sciName}" loading="lazy">` : ""}
        <div class="wiki-thumb" aria-live="polite">
          <span class="wiki-label">Wikipedia</span>
          <div class="wiki-img-wrap"><div class="wiki-skeleton"></div></div>
        </div>
      </div>

      <div class="species-info">
        <p><strong>${commonName}</strong></p>
        <p class="muted">${sciName}</p>

        <div class="species-actions">
          <button class="points-btn ${levelClass}" type="button">${pointsTotal} points</button>
          <span class="mission-level ${levelClass}">${missionLevel}</span>
        </div>
      </div>
    </div>
  `;

  const wikiWrap = root.querySelector(".wiki-img-wrap");
  const pointsBtn = root.querySelector(".points-btn");

  // callbacks set by controller
  let onPoints = null;
  pointsBtn.addEventListener("click", () => { if (onPoints) onPoints(); });

  return {
    element: root,
    setWikiImage(url) {
      if (!wikiWrap) return;
      wikiWrap.innerHTML = url
        ? `<img src="${url}" alt="Wikipedia thumbnail for ${sciName}" loading="lazy">`
        : `<div class="wiki-missing">No image</div>`;
    },
    onPointsClick(cb) { onPoints = cb; },
  };
}
