// src/controllers/modal.controller.js
import { on } from "../utils/eventBus.js";

// This controller is intentionally minimal; views should be mounted where needed.
// If you generate a ModalView into a container, this controller hooks close buttons.
export function wireModalClose(container) {
  function attach() {
    container.querySelectorAll("dialog.modal")?.forEach(d => {
      d.querySelector("[data-close]")?.addEventListener("click", () => d.close());
    });
  }
  attach();
  on("state:changed", attach);
}
