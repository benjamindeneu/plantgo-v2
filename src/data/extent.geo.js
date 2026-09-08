// src/data/extent.geo.js
/**
 * Which missions the player is actually standing in.
 *
 * The map endpoint ships every mission with its zone polygon, so answering
 * that is a local point-in-polygon test rather than a request. It costs
 * nothing to redo, which is the whole point: the "valid here" list can follow
 * every GPS fix instead of lagging a round trip behind the player.
 *
 * GeoJSON order is [lon, lat] — the opposite of every other coordinate pair in
 * this app — so the conversion happens here, once, and callers pass lat/lon.
 */

/** Ray casting against one linear ring of [lon, lat] pairs. */
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat)) {
      const xCross = xi + ((lat - yi) / (yj - yi)) * (xj - xi);
      if (lon < xCross) inside = !inside;
    }
  }
  return inside;
}

/** First ring is the outline, any others are holes punched out of it. */
function pointInRings(lon, lat, rings = []) {
  if (!rings.length || !pointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(lon, lat, rings[i])) return false;
  }
  return true;
}

/** Is this coordinate inside a mission's zone? Polygon and MultiPolygon. */
export function pointInExtent(extent, lat, lon) {
  if (!extent || lat == null || lon == null) return false;
  if (extent.type === "Polygon") return pointInRings(lon, lat, extent.coordinates);
  if (extent.type === "MultiPolygon") {
    return (extent.coordinates || []).some((rings) => pointInRings(lon, lat, rings));
  }
  return false;
}

/**
 * The missions whose zone contains a point, best grade first.
 *
 * Missions with no zone — the approximate pins served where a region has no
 * species maps — are never "valid here": there is no boundary to be inside of,
 * and treating a pin as its own zone would hand out mission credit for
 * standing anywhere.
 */
export function missionsAtPoint(missions, lat, lon) {
  if (lat == null || lon == null) return [];
  return (missions || [])
    .filter((m) => pointInExtent(m?.extent, lat, lon))
    .sort((a, b) => (b?.grade?.score ?? 0) - (a?.grade?.score ?? 0));
}
