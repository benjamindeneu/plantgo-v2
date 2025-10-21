// src/controllers/MissionCard.controller.js
import { createMissionCardView } from "../ui/components/MissionCard.view.js";
import { Modal } from "../ui/components/Modal.js";
import { getWikipediaImage } from "../ui/wiki.js";

/**
 * Drop-in replacement for SpeciesCard → MissionCard
 * Usage: MissionCard(speciesObj) -> HTMLElement
 */
export function MissionCard(species) {
  const sciName = species.name || species.scientific_name || "";
  const commonName = species.common_name || "No common name";

  const heroUrl =
    species.image_url ||
    species.image ||
    (Array.isArray(species.images) && species.images[0]) ||
    "";

  const totalPoints = Number(species.points?.total ?? 0);
  const { missionLevel, levelClass } = getRarityFromPoints(totalPoints);

  // create view
  const view = createMissionCardView({
    sciName,
    commonName,
    heroUrl,
    pointsTotal: totalPoints,
    levelClass,
    missionLevel,
  });

  // wire points modal (logic kept here)
  const detailObj = species.points?.detail || {};
  view.onPointsClick(() => {
    let detail = `<h2>Point details</h2><p><small>Mission: ${sciName}</small></p>`;
    if (detailObj && typeof detailObj === "object") {
      for (const key of Object.keys(detailObj)) {
        const label = prettyKey(key);
        detail += `<p>${label}: ${detailObj[key]} points</p>`;
      }
    } else {
      detail += `<p>No breakdown available.</p>`;
    }
    document.body.appendChild(Modal({ title: "Points", content: detail }));
  });

  // fetch Wikipedia image (like before)
  (async () => {
    try {
      const wikiImg = await getWikipediaImage(sciName);
      view.setWikiImage(wikiImg || "");
    } catch {
      view.setWikiImage("");
    }
  })();

  return view.element;
}

/* ------ helpers (logic) ------ */
function getRarityFromPoints(totalPoints) {
  if (totalPoints >= 1500) return { missionLevel: "Legendary", levelClass: "legendary-points" };
  if (totalPoints >= 1000) return { missionLevel: "Epic",       levelClass: "epic-points" };
  if (totalPoints >=  500) return { missionLevel: "Rare",       levelClass: "rare-points" };
  return { missionLevel: "Common", levelClass: "common-points" };
}
function prettyKey(k) {
  const map = {
    base: "Species observation",
    mission: "Mission bonus",
    mission_bonus: "Mission bonus",
    novelty: "New species bonus",
    new_species: "New species bonus",
  };
  return map[k] || k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
