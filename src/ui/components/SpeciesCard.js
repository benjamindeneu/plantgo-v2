// src/ui/components/SpeciesCard.js
import { Modal } from "./Modal.js";
import { fetchWikipediaImage } from "../wiki.js";

/**
 * SpeciesCard — old-style: hero image, wiki image (small), and a points badge button
 * Expects:
 *  - species.name (scientific) and species.common_name
 *  - species.image_url | species.image | species.images[0] (optional)
 *  - species.points.total (number), species.points.detail (object)  ← used for the button + modal
 */
export function SpeciesCard(species) {
  const imgUrl =
    species.image_url ||
    species.image ||
    (Array.isArray(species.images) && species.images[0]) ||
    "";

  const sciName = species.name || species.scientific_name || "";
  const commonName = species.common_name || "No common name";

  const totalPoints = Number(species.points?.total ?? 0);
  let missionLevel = "Common";
  let levelClass = "common-points";
  if (totalPoints >= 1500) { missionLevel = "Legendary"; levelClass = "legendary-points"; }
  else if (totalPoints >= 1000) { missionLevel = "Epic"; levelClass = "epic-points"; }
  else if (totalPoints >= 500) { missionLevel = "Rare"; levelClass = "rare-points"; }

  const root = document.createElement("div");
  root.className = "species-item";
  root.innerHTML = `
    <div class="mission-title">Mission: ${sciName}</div>
    <div class="card-content">
      <div class="species-image-container">
        ${imgUrl ? `<img class="species-image" src="${imgUrl}" alt="${sciName}" loading="lazy">` : ""}
        <div class="wiki-thumb" aria-live="polite">
          <span class="wiki-label">Wikipedia</span>
          <div class="wiki-img-wrap"><div class="wiki-skeleton"></div></div>
        </div>
      </div>

      <div class="species-info">
        <p><strong>${commonName}</strong></p>
        <p class="muted">${sciName}</p>

        <div class="species-actions">
          <button class="points-btn ${levelClass}" type="button">${totalPoints} points</button>
          <span class="mission-level ${levelClass}">${missionLevel}</span>
        </div>
      </div>
    </div>
  `;

  // Points breakdown modal (same behavior as your old version)
  const detailObj = species.points?.detail || {};
  root.querySelector(".points-btn").addEventListener("click", () => {
    let detail = `<h2>Point details</h2><p><small>Mission: ${sciName}</small></p>`;
    if (detailObj && typeof detailObj === "object") {
      for (const key of Object.keys(detailObj)) {
        const label = key === "base" ? "Species observation" : key;
        detail += `<p>${label}: ${detailObj[key]} points</p>`;
      }
    } else {
      detail += `<p>No breakdown available.</p>`;
    }
    const modal = Modal({ title: "Points", content: detail });
    document.body.appendChild(modal);
  });

  // Load Wikipedia thumbnail
  (async () => {
    const wikiImg = await fetchWikipediaImage(sciName);
    const wrap = root.querySelector(".wiki-img-wrap");
    if (!wrap) return;
    wrap.innerHTML = wikiImg
      ? `<img src="${wikiImg}" alt="Wikipedia thumbnail for ${sciName}" loading="lazy">`
      : `<div class="wiki-missing">No image</div>`;
  })();

  return root;
}
