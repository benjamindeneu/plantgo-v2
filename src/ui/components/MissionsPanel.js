// src/ui/components/MissionsPanel.js
import { fetchMissions } from "../../api/plantgo.js";
import { SpeciesCard } from "./SpeciesCard.js";

export function MissionsPanel() {
  const sec = document.createElement("section");
  sec.className = "card";
  sec.innerHTML = `
    <h2>Missions near you</h2>
    <div style="display:flex;gap:8px;justify-content:center;margin-bottom:8px">
      <button id="locate" class="secondary" type="button">Get Location & Missions</button>
    </div>
    <div id="list" class="form-grid" aria-live="polite">No missions yet.</div>
  `;

  const list = sec.querySelector("#list");

  sec.querySelector("#locate").addEventListener("click", async () => {
    list.textContent = "Fetching location…";
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      list.textContent = "Loading missions…";
      const data = await fetchMissions({ lat, lon });

      const missions = Array.isArray(data?.missions) ? data.missions
                      : (Array.isArray(data) ? data : []);

      if (!missions.length) {
        list.textContent = "No missions returned.";
        return;
      }

      // Render species cards with plots
      list.innerHTML = "";
      for (const sp of missions) {
        list.appendChild(SpeciesCard(sp));
      }
    } catch (e) {
      list.textContent = e?.message || "Location/mission error.";
    }
  });

  return sec;
}
