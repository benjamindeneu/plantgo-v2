export async function getCurrentPosition(opts = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, opts)
  );
}

/**
 * Follow the player's position until the returned function is called.
 *
 * Fixes that have not moved are dropped: the browser emits one every couple of
 * seconds even when standing still, and every one of them would re-run the
 * work the callers do on a move. Errors are handed over rather than thrown —
 * a watch that loses signal for a moment should not tear itself down.
 */
export function watchPosition(onPosition, { onError, minMoveM = 8, ...opts } = {}) {
  if (!navigator.geolocation) return () => {};

  let last = null;
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      if (last && distanceMeters(last, next) < minMoveM) return;
      last = next;
      onPosition(next, pos);
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000, ...opts }
  );
  return () => navigator.geolocation.clearWatch(id);
}

/** Metres between two { lat, lon } points (haversine). */
export function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Monitor geolocation permission state.
 * Immediately calls onGranted/onDenied based on current state,
 * and continues to call them whenever the state changes.
 * Returns a cleanup function.
 */
export function watchLocationPermission({ onGranted, onDenied }) {
  if (!navigator.geolocation) {
    onDenied();
    return () => {};
  }

  let permStatus = null;

  const handleState = (state) => {
    if (state === 'granted') onGranted();
    else if (state === 'denied') onDenied();
  };

  if (navigator.permissions) {
    navigator.permissions.query({ name: 'geolocation' }).then(status => {
      permStatus = status;
      handleState(status.state);
      status.onchange = () => handleState(status.state);
    });
  }

  return () => {
    if (permStatus) permStatus.onchange = null;
  };
}
