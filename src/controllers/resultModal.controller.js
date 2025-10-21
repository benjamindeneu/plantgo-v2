import { on } from "../utils/eventBus.js";
import { getState } from "../state/store.js";
import { nextLevelInfo } from "../domain/levels.js";
import { ResultModalView } from "../ui/components/ResultModal.view.js";

const thresholds = [0, 100, 250, 500, 1000, 1500];

export function mountResultModal(root) {
  function render() {
    const { ui, user } = getState();
    const points = user?.points ?? 0;
    const level = nextLevelInfo(points, thresholds);

    root.innerHTML = ResultModalView({
      open: ui.resultModalOpen,
      points,
      level,
      badges: user?.newBadges ?? []
    });

    const dialog = root.querySelector("#resultModal");
    dialog?.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
    dialog?.querySelector("[data-cta='continue']")?.addEventListener("click", () => dialog.close());
  }

  render();
  on("state:changed", render);
}
