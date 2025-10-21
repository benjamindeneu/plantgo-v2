import { getCachedMissions, saveSpeciesAndMissions } from "./user.repo.js";
import { fetchMissions } from "../api/plantgo.js";

export async function maybeLoadCachedMissions(uid, isFreshFn) {
  const data = await getCachedMissions(uid);
  if (isFreshFn?.(data.last_species_fetch)) {
    return { missions: data.missions_list || [], fromCache: true };
  }
  return { missions: [], fromCache: false };
}

export async function loadAndPersistMissions(uid, { lat, lon }, speciesList = []) {
  const data = await fetchMissions({ lat, lon });
  const missions = Array.isArray(data?.missions) ? data.missions : (Array.isArray(data) ? data : []);
  await saveSpeciesAndMissions(uid, speciesList, missions);
  return missions;
}
