export async function getCurrentPosition(opts = { enableHighAccuracy: true, timeout: 10000 }) {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, opts)
  );
}
