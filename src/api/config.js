// Centralized endpoints (preserved exactly as requested)
//export const API_BASE_URL = "https://plantgo.onmypc.net/api/";
export const API_BASE_URL = "http://localhost:8111/api/";

export const SPECIES_PROXY_URL = `${API_BASE_URL}missions`;       // /api/missions
export const IDENTIFY_PROXY_URL = `${API_BASE_URL}identify`;     // /api/identify
export const PREDICTION_PROXY_URL = `${API_BASE_URL}prediction`; // /api/prediction
export const QUIZ_PROXY_URL = `${API_BASE_URL}quiz`;             // /api/quiz
export const DESCRIPTION_PROXY_BASE = `${API_BASE_URL}description`; // /api/description/<gbif_id>
export const TRIVIA_PROXY_BASE = `${API_BASE_URL}trivia`;           // /api/trivia/<gbif_id>
export const SDM_MODELS_URL = `${API_BASE_URL}sdm/available_models`;
export const MAP_MISSIONS_URL = `${API_BASE_URL}missions/map`;      // /api/missions/map
export const MISSION_DETAIL_BASE = `${API_BASE_URL}missions`;       // /api/missions/<mission_id>

// GeoPl@ntNet species probability tiles, used as a Leaflet overlay behind a
// selected mission. Same host the backend reads mission extents from.
export const GPN_TILE_BASE = "https://geo-beta.plantnet.org/bff/tile/geoplantnet";
