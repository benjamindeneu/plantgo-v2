import { setState } from "./state/store.js";
import { initHeader } from "./controllers/header.controller.js";
import { mountResultModal } from "./controllers/resultModal.controller.js";
import { mountHerbariumList } from "./controllers/herbarium.controller.js";
import { mountIdentify } from "./controllers/identify.controller.js";
import { mountMissions } from "./controllers/missions.controller.js";

const appRoot = document.getElementById("app");
appRoot.innerHTML = `
  <header id="appHeader" class="nav"></header>
  <main id="appMain" class="container">
    <h1 class="h1">Welcome to PlantGo</h1>
    <section id="identifyRoot"></section>
    <section id="missionsRoot"></section>
    <section id="herbariumRoot"></section>
  </main>
  <div id="overlayRoot"></div>
`;

initHeader(document.getElementById("appHeader"));
mountIdentify(document.getElementById("identifyRoot"));
mountMissions(document.getElementById("missionsRoot"));
mountHerbariumList(document.getElementById("herbariumRoot"));
mountResultModal(document.getElementById("overlayRoot"));

setState({
  ui: { missions: [
    { id: "m1", title: "Identify 3 species", desc: "Upload and confirm 3 distinct species.", points: 50, progress: 0.33, completed: false },
    { id: "m2", title: "Make 5 observations", desc: "Any species counts.", points: 75, progress: 0.2, completed: false },
    { id: "m3", title: "Find a rare plant", desc: "Any observation with rarity ‘rare’.", points: 120, progress: 0, completed: false }
  ] },
  user: { displayName: "Explorer", points: 180, newBadges: [{ id: "collector-10", name: "Collector (10 species)" }] },
  observations: [
    { speciesId: "sp1", speciesName: "Bellis perennis", photoUrl: "https://picsum.photos/seed/flower1/400/300", points: 15 },
    { speciesId: "sp2", speciesName: "Taraxacum officinale", photoUrl: "https://picsum.photos/seed/flower2/400/300", points: 20 }
  ],
  ui: { resultModalOpen: true }
});
