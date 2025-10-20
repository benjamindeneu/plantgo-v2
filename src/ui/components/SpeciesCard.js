// src/ui/components/SpeciesCard.js
import { Modal } from "./Modal.js";
import { getWikipediaImage } from "../wiki.js";

export function SpeciesCard(species) {
  const sciName = species.name || species.scientific_name || "";
  const commonName = species.common_name || "No common name";

  const hero =
    species.image_url ||
    species.image ||
    (Array.isArray(species.images) && species.images[0]) ||
    "";

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
        ${hero ? `<img class="species-image" src="${hero}" alt="${sciName}" loading="lazy">` : ""}
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

  // Points details (same behavior as original)
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
    document.body.appendChild(Modal({ title: "Points", content: detail }));
  });

  // Load Wikipedia thumbnail using the OLD method
  (async () => {
    const wikiImg = await getWikipediaImage(sciName);
    const wrap = root.querySelector(".wiki-img-wrap");
    if (!wrap) return;
    wrap.innerHTML = wikiImg
      ? `<img src="${wikiImg}" alt="Wikipedia thumbnail for ${sciName}" loading="lazy">`
      : `<div class="wiki-missing">No image</div>`;
  })();

  return root;
}
