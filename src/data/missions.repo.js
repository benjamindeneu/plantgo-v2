import { getCachedMissions, saveSpeciesAndMissions } from "./user.repo.js";
import { fetchMissions } from "../api/plantgo.js";

export async function maybeLoadCachedMissions(uid, isFreshFn) {
  const data = await getCachedMissions(uid);
  if (isFreshFn?.(data?.last_species_fetch)) {
    return { missions: data?.missions_list || [], fromCache: true };
  }
  return { missions: [], fromCache: false };
}

/**
 * Fetch missions and try to save them, but NEVER block rendering on save.
 * If save fails (no uid, rules, offline), we just log it.
 */
export async function loadAndMaybePersistMissions(uid, { lat, lon }, speciesList = []) {
  const data = await fetchMissions({ lat, lon });
  const missions = Array.isArray(data?.missions)
    ? data.missions
    : (Array.isArray(data) ? data : []);

  // fire-and-forget save
  if (uid) {
    saveSpeciesAndMissions(uid, speciesList, missions).catch((e) => {
      console.warn("[missions.repo] Save skipped/failed:", e?.message || e);
    });
  }
  return missions;
}
