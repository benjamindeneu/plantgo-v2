// src/controllers/Header.controller.js
import { createHeaderView } from "../ui/components/Header.view.js";

export function Header({
  user,
  level = 1,
  menuVariant = "main",
  onMenu,
  onLogout,
  onHerbarium,
  onBackHome,
} = {}) {
    const view = createHeaderView({ user, level, menuVariant });

    view.setOnMenuToggle(() => { (onMenu || (() => {}))(); });

    view.setOnPrimaryNav(() => {
      if (menuVariant === "herbarium") (onBackHome || (() => {}))();
      else (onHerbarium || (() => {}))();
    });

    view.setOnLogout(() => { (onLogout || (() => {}))(); });

    const el = view.element;
    el.setUser = (u) => view.setUser(u);
    el.setLevel = (lvl) => view.setLevel(lvl);
    return el;
}
