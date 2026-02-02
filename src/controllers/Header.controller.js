// src/controllers/Header.controller.js
import { createHeaderView } from "../ui/components/Header.view.js";
import { setLanguage } from "../language/i18n.js";

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

    // keep dropdown in sync with current doc lang
    view.setLanguageValue(document.documentElement.lang || "en");

    // do the real app behavior here
    view.setOnLanguageChange(async (lang) => {
      try {
        await setLanguage(lang);
        // optional: close menu after switching language
        // (only if you want; view already closes on outside click)
      } catch (e) {
        console.error("Failed to switch language:", e);
      }
    });

    const el = view.element;
    el.setUser = (u) => view.setUser(u);
    el.setLevel = (lvl) => view.setLevel(lvl);
    return el;
}
