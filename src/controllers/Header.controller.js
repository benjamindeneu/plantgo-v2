// src/controllers/Header.controller.js
import { createHeaderView } from "../ui/components/Header.view.js";

/**
 * Controller for Header:
 * - Creates the view
 * - Wires callbacks outward (to page/app)
 */
export function Header({
  user,
  level = 1,
  menuVariant = "main", // "main" | "herbarium"
  onMenu,
  onLogout,
  onHerbarium,  // used when menuVariant === "main"
  onBackHome,   // used when menuVariant === "herbarium"
} = {}) {
  const view = createHeaderView({ user, level, menuVariant });

  // forward UI events to external callbacks
  view.setOnMenuToggle(() => { (onMenu || (() => {}))(); });

  view.setOnPrimaryNav(() => {
    if (menuVariant === "herbarium") {
      (onBackHome || (() => {}))();
    } else {
      (onHerbarium || (() => {}))();
    }
  });

  view.setOnLogout(() => { (onLogout || (() => {}))(); });

  // expose same API as before
  const el = view.element;
  el.setUser = (u) => view.setUser(u);
  el.setLevel = (lvl) => view.setLevel(lvl);

  return el;
}
