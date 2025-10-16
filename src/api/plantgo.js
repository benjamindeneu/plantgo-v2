import { SPECIES_PROXY_URL, IDENTIFY_PROXY_URL } from "./config.js";

async function http(url, opts={}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${res.status}] ${res.statusText} at ${url} :: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export async function fetchMissions({ lat, lon, model="best", limit=10 }) {
  return http(SPECIES_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon, model, limit })
  });
}

export async function identifyPlant({ files, lat, lon, model="best" }) {
  const formData = new FormData();
  for (const f of files) formData.append("files", f, f.name);
  if (lat != null) formData.append("lat", String(lat));
  if (lon != null) formData.append("lon", String(lon));
  formData.append("model", model);
  return http(IDENTIFY_PROXY_URL, { method: "POST", body: formData });
}
