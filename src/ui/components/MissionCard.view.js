// src/ui/components/MissionCard.view.js

/**
 * Visual-only MissionCard.
 * Expects normalized props so the view stays dumb.
 * - Image handling mirrors HerbariumCard.view.js (skeleton, simple wrapper)
 * - No Wikipedia tag/badge
 * - Text wraps safely so it won't be hidden by the image
 */
export function createMissionCardView({
  sciName,
  commonName,
  heroUrl = "",
  pointsTotal = 0,
  levelClass = "common-points", // "common-points" | "rare-points" | "epic-points" | "legendary-points"
  missionLevel = "Common",
}) {
  const root = document.createElement("div");
  // keep class name to avoid CSS changes elsewhere
  root.className = "species-item";

  root.innerHTML = `
    <div class="mission-title">Mission: ${sciName}</div>
    <div class="card-content">
      <!-- Image handled like HerbariumCard: simple wrapper + skeleton -->
      <div class="mission-img" style="width:150px;height:150px;border-radius:10px;overflow:hidden;background:var(--surface-2);display:grid;place-items:center;">
        ${
          heroUrl
            ? `<img src="${heroUrl}" alt="${sciName}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`
            : `<div class="wiki-skeleton"></div>`
        }
      </div>

      <div class="species-info" style="overflow-wrap:anywhere;word-break:break-word;">
        <p><strong>${commonName}</strong></p>
        <p class="muted">${sciName}</p>

        <div class="species-actions">
          <button class="points-btn ${levelClass}" type="button">${pointsTotal} points</button>
          <span class="mission-level ${levelClass}">${missionLevel}</span>
        </div>
      </div>
    </div>
  `;

  const imgWrap = root.querySelector(".mission-img");
  const pointsBtn = root.querySelector(".points-btn");

  // callbacks set by controller
  let onPoints = null;
  pointsBtn.addEventListener("click", () => { if (onPoints) onPoints(); });

  return {
    element: root,
    // Match HerbariumCard.setImage behavior
    setImage(url) {
      if (!imgWrap) return;
      if (url) {
        imgWrap.innerHTML = `<img src="${url}" alt="${sciName}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">`;
      } else {
        imgWrap.innerHTML = `<div class="wiki-missing">No image</div>`;
      }
    },
    onPointsClick(cb) { onPoints = cb; },
  };
}
