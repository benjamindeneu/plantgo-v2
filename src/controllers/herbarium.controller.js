// src/controllers/herbarium.controller.js
import { getState } from "../state/store.js";
import { HerbariumCardView } from "../ui/components/HerbariumCard.view.js";

export function mountHerbariumList(root) {
  function render() {
    const { observations } = getState();
    root.innerHTML = `
      <section class="grid herbs">
        ${observations.map(o => HerbariumCardView({
          speciesName: o.speciesName,
          photoUrl: o.photoUrl,
          points: o.points
        })).join("")}
      </section>
    `;
  }
  render();
}
