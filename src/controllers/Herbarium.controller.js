// src/controllers/Herbarium.controller.js
import { createHerbariumView } from "../ui/components/Herbarium.view.js";
import { loadDiscoveries } from "../data/discoveries.repo.js";
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { t } from "../language/i18n.js"; // <-- adjust path if needed in your tree

export function HerbariumPanel() {
  const view = createHerbariumView();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      view.setStatus(t("herbarium.status.loginRequired"));
      view.clearEntries();
      // keep empty list rendered in correct language
      view.refreshI18n();
      return;
    }

    try {
      view.setStatus(t("herbarium.status.loading"));
      const entries = await loadDiscoveries(user.uid);
      view.renderEntries(entries);
      view.setStatus("");
    } catch (e) {
      console.error("[Herbarium] load error:", e);
      view.setStatus(t("herbarium.status.loadFailed"));
      view.clearEntries();
      view.refreshI18n();
    }
  });

  return view.element;
}
