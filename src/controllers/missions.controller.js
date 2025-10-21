// src/controllers/missions.controller.js
import { getState, setState } from "../state/store.js";
import { on } from "../utils/eventBus.js";
import { MissionsPanelView } from "../ui/components/MissionsPanel.view.js";

export function mountMissions(root) {
  function render() {
    const { ui } = getState();
    const missions = ui.missions || [];
    root.innerHTML = MissionsPanelView({ missions });

    root.querySelectorAll("[data-claim]")?.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-claim");
        const s = getState();
        const updated = (s.ui.missions||[]).map(m => m.id === id ? { ...m, completed: true, progress: 1 } : m);
        setState({ ui: { ...s.ui, missions: updated } });
      });
    });
  }
  render();
  on("state:changed", render);
}
