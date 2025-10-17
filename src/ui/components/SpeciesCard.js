// src/ui/components/SpeciesCard.js
import { Modal } from "./Modal.js";

/**
 * Mini horizontal bar (inline SVG)
 */
function hBar({ value = 0, max = 100, label = "", format = v => `${v}`, accent = "#16a34a" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="mini-chart">
      <div class="mini-chart-head">
        <span>${label}</span>
        <span class="mini-chart-val">${format(value)}</span>
      </div>
      <svg class="mini-chart-svg" viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="6" fill="#e5e7eb" rx="3" ry="3"></rect>
        <rect x="0" y="0" width="${pct.toFixed(2)}" height="6" fill="${accent}" rx="3" ry="3"></rect>
      </svg>
    </div>
  `;
}

/**
 * SpeciesCard
 * Expects a `species` object with (best-effort based on your v1):
 * - name, common_name
 * - image_url (or images[]), probability (0..1), rarity (0..100), distance_km, last_seen_days
 * - points.total and points.detail (object)
 */
export function SpeciesCard(species) {
  const imgUrl =
    species.image_url ||
    species.image ||
    (Array.isArray(species.images) && species.images[0]) ||
    "";

  const probability = Number(species.probability ?? species.score ?? 0); // 0..1
  const rarity = Number(species.rarity ?? 0);                            // 0..100
  const distance = Number(species.distance_km ?? species.distance ?? 0); // km
  const lastSeenDays = Number(
    species.last_seen_days ?? species.lastSeenDays ?? species.last_seen ?? 0
  );
  const totalPoints = Number(species.points?.total ?? 0);
  const detailObj = species.points?.detail || {};

  // Level label based on total points (matches your old thresholds)
  let missionLevel = "Common";
  let levelClass = "common-points";
  if (totalPoints >= 1500) { missionLevel = "Legendary"; levelClass = "legendary-points"; }
  else if (totalPoints >= 1000) { missionLevel = "Epic"; levelClass = "epic-points"; }
  else if (totalPoints >= 500) { missionLevel = "Rare"; levelClass = "rare-points"; }

  // Inline mini charts
  const chartsHTML = `
    ${hBar({
      value: Math.round(probability * 100),
      max: 100,
      label: "Confidence",
      format: v => v + "%",
      accent: "#16a34a"
    })}
    ${hBar({
      value: Math.round(rarity),
      max: 100,
      label: "Rarity",
      format: v => v + "/100",
      accent: "#7c3aed"
    })}
    ${hBar({
      // “Freshness” = inverted last seen (lower days → higher freshness)
      value: Math.max(0, 100 - Math.min(100, lastSeenDays)),
      max: 100,
      label: "Freshness (recent obs.)",
      format: () => (Number.isFinite(lastSeenDays) ? `${lastSeenDays}d ago` : "—"),
      accent: "#0ea5e9"
    })}
    ${hBar({
      // Map distance to a “nearer is better” score up to 25 km (feel free to tweak)
      value: Math.max(0, 100 - Math.min(100, (distance / 25) * 100)),
      max: 100,
      label: "Distance",
      format: () => (Number.isFinite(distance) ? `${distance.toFixed(1)} km` : "—"),
      accent: "#f59e0b"
    })}
  `;

  const root = document.createElement("div");
  root.className = "species-item";
  root.innerHTML = `
    <div class="mission-title">Mission: ${species.name}</div>
    <div class="card-content">
      <div class="species-image-container">
        ${imgUrl ? `<img class="species-image" src="${imgUrl}" alt="${species.name}" loading="lazy">` : ""}
      </div>

      <div class="species-info">
        <p><strong>${species.common_name || "No common name"}</strong></p>
        <p class="muted">${species.name}</p>

        <div class="mini-chart-group">
          ${chartsHTML}
        </div>

        <div class="species-actions">
          <button class="points-btn ${levelClass}" type="button">${totalPoints} points</button>
          <span class="mission-level ${levelClass}">${missionLevel}</span>
        </div>
      </div>
    </div>
  `;

  // Points breakdown modal
  root.querySelector(".points-btn").addEventListener("click", () => {
    let detail = `<h2>Point details</h2><p><small>Mission: ${species.name}</small></p>`;
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

  return root;
}
