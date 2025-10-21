// src/controllers/Herbarium.controller.js
import { createHerbariumView } from "../ui/components/Herbarium.view.js";
import { loadDiscoveries } from "../data/discoveries.repo.js";
import { auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

export function HerbariumPanel() {
  const view = createHerbariumView();

  // Wait for auth, then load entries
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Page script already redirects to login, but show a friendly message meanwhile
      view.setStatus("Please log in.");
      view.clearEntries();
      return;
    }

    try {
      view.setStatus("Loading your herbarium…");
      const entries = await loadDiscoveries(user.uid);
      view.renderEntries(entries);
      view.setStatus(""); // safe: status is separate from list
    } catch (e) {
      console.error("[Herbarium] load error:", e);
      view.setStatus("Could not load your herbarium.");
      view.clearEntries();
    }
  });

  return view.element;
}
