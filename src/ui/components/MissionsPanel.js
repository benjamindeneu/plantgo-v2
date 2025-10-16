import { fetchMissions } from "../../api/plantgo.js";

export function MissionsPanel() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>Missions near you</h2>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="btn">Get Location & Missions</button>
    </div>
    <div id="list" class="form-grid" aria-live="polite">No missions yet.</div>
  `;

  sec.querySelector("#locate").addEventListener("click", async () => {
    const list = sec.querySelector("#list");
    list.textContent = "Fetching location…";
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      list.textContent = "Loading missions…";
      const data = await fetchMissions({ lat, lon });
      const missions = data?.missions || data || [];
      if (!missions.length) { list.textContent = "No missions returned."; return; }
      list.innerHTML = missions.map(m => `
        <div class="species-item">
          <div class="species-info">
            <p><strong>${m.name ?? "Unnamed mission"}</strong></p>
            <p class="muted">${m.description ?? ""}</p>
          </div>
        </div>
      `).join("");
    } catch (e) {
      list.textContent = e.message || "Location/mission error.";
    }
  });

  return sec;
}
