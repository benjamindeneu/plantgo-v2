// src/app.js
import { setState } from "./state/store.js";
import { on } from "./utils/eventBus.js";
import { initHeader } from "./controllers/header.controller.js";
import { mountResultModal } from "./controllers/resultModal.controller.js";
import { mountHerbariumList } from "./controllers/herbarium.controller.js";

// Shell
const appRoot = document.getElementById("app");
appRoot.innerHTML = `
  <header id="appHeader" class="nav"></header>
  <main id="appMain" class="container">
    <h1 class="h1">Welcome to PlantGo</h1>
    <section id="herbariumRoot"></section>
  </main>
  <div id="overlayRoot"></div>
`;

// Mount header
initHeader(document.getElementById("appHeader"));
// Mount herbarium
mountHerbariumList(document.getElementById("herbariumRoot"));
// Mount modal
mountResultModal(document.getElementById("overlayRoot"));

// Example seed state (replace with real service calls)
setState({
  user: { displayName: "Explorer", points: 180, newBadges: [{ id: "collector-10", name: "Collector (10 species)" }] },
  observations: [
    { speciesId: "sp1", speciesName: "Bellis perennis", photoUrl: "https://picsum.photos/seed/flower1/400/300", points: 15 },
    { speciesId: "sp2", speciesName: "Taraxacum officinale", photoUrl: "https://picsum.photos/seed/flower2/400/300", points: 20 }
  ],
  ui: { resultModalOpen: true }
});

// In real app, wire auth + db services here and update state accordingly.
