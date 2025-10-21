import { getState, setState } from "../state/store.js";
import { on } from "../utils/eventBus.js";
import { IdentifyPanelView } from "../ui/components/IdentifyPanel.view.js";
import { computeObservationPoints } from "../domain/points.js";

async function mockIdentifyFromPhoto(file) {
  await new Promise(r => setTimeout(r, 600));
  return [
    { id: "bellis-perennis", name: "Bellis perennis", confidence: 0.92, photo: "https://picsum.photos/seed/bellis/400/300" },
    { id: "taraxacum-officinale", name: "Taraxacum officinale", confidence: 0.78, photo: "https://picsum.photos/seed/tarax/400/300" },
    { id: "trifolium-pratense", name: "Trifolium pratense", confidence: 0.64, photo: "https://picsum.photos/seed/trifo/400/300" }
  ];
}

export function mountIdentify(root) {
  function render() {
    const { ui } = getState();
    const suggestions = ui.identify?.suggestions || [];
    const isLoading = ui.identify?.loading || false;
    const photoPreview = ui.identify?.photoPreview || "";

    root.innerHTML = IdentifyPanelView({ isLoading, photoPreview, suggestions });

    const fileInput = root.querySelector("[data-file]");
    fileInput?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const preview = URL.createObjectURL(file);
      setState({ ui: { ...ui, identify: { ...ui.identify, loading: true, photoPreview: preview } } });
      const results = await mockIdentifyFromPhoto(file);
      setState({ ui: { ...getState().ui, identify: { ...getState().ui.identify, loading: false, suggestions: results } } });
    });

    root.querySelectorAll("[data-choose]")?.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.getAttribute("data-choose");
        const chosen = (getState().ui.identify?.suggestions||[]).find(s => s.id === id);
        if (!chosen) return;
        const obs = {
          speciesId: chosen.id,
          speciesName: chosen.name,
          photoUrl: chosen.photo,
          photos: [chosen.photo],
          rarity: "common"
        };
        obs.points = computeObservationPoints(obs);
        const s = getState();
        const updated = [...(s.observations||[]), obs];
        setState({ observations: updated, ui: { ...s.ui, resultModalOpen: true } });
      });
    });
  }
  render();
  on("state:changed", render);
}
