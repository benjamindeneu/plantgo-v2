// src/controllers/header.controller.js
import { getState, setState } from "../state/store.js";
import { on } from "../utils/eventBus.js";
import { HeaderView } from "../ui/components/Header.view.js";
import { logout } from "../services/auth.service.js";

export function initHeader(root) {
  function render() {
    const { user } = getState();
    root.innerHTML = HeaderView({ user });
    root.querySelector("[data-logout]")?.addEventListener("click", async () => {
      await logout();
      setState({ user: null });
    });
  }
  render();
  on("state:changed", render);
}
