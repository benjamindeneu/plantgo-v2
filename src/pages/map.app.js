// src/pages/map.app.js
import { initI18n, t } from "../language/i18n.js";
import { Header } from "../controllers/Header.controller.js";
import { MissionMapPanel } from "../controllers/MissionMap.controller.js";
import { listenUserLevel } from "../user/level.js";
import { isBetaUser } from "../data/user.repo.js";

import { auth } from "../../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

await initI18n();

/**
 * Shown when a signed-in user is not on the beta list. This is a UI gate, not
 * a security boundary — the backend endpoints are open like the rest of the
 * API. It exists so the page only reaches people who opted in.
 */
function BetaGate() {
  const wrap = document.createElement("div");
  wrap.className = "beta-gate";
  wrap.innerHTML = `
    <div class="beta-gate__card card">
      <div class="beta-gate__icon">🗺</div>
      <h2 class="beta-gate__title"></h2>
      <p class="beta-gate__message muted"></p>
      <button class="secondary" type="button" id="betaGateBack"></button>
    </div>
  `;
  const apply = () => {
    wrap.querySelector(".beta-gate__title").textContent = t("map.gate.title");
    wrap.querySelector(".beta-gate__message").textContent = t("map.gate.message");
    wrap.querySelector("#betaGateBack").textContent = t("map.gate.back");
  };
  apply();
  document.addEventListener("i18n:changed", apply);
  wrap.querySelector("#betaGateBack").addEventListener("click", () => {
    location.href = "./index.html";
  });
  return wrap;
}

function App() {
  let stopLevel = () => {};
  let panel = null;

  const headerMount = document.getElementById("appHeader");
  const header = Header({
    user: null,
    level: 1,
    menuVariant: "herbarium",
    onBackHome: () => { location.href = "./index.html"; },
    onBadges: () => { location.href = "./badges.html"; },
    onQuiz: () => { location.href = "./quiz.html"; },
    onObservations: () => { location.href = "./observations.html"; },
    onLogout: async () => {
      try {
        stopLevel();
        await signOut(auth);
        location.replace("./login.html");
      } catch (e) {
        alert(e.message);
      }
    },
  });
  headerMount.replaceWith(header);

  const mount = document.getElementById("mapRoot");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      stopLevel();
      location.replace("./login.html");
      return;
    }

    header.setUser(user);
    stopLevel();
    stopLevel = listenUserLevel(user.uid, (lvl) => header.setLevel(lvl));

    if (panel) return; // already initialised for this session

    const beta = await isBetaUser(user.uid);
    if (!beta) {
      document.body.classList.add("map-page--gated");
      mount.replaceChildren(BetaGate());
      return;
    }

    panel = MissionMapPanel();
    mount.replaceChildren(panel.element);
    // Leaflet measures its container on init, so size it before starting.
    requestAnimationFrame(() => {
      panel.invalidate();
      panel.start();
    });
  });

  window.addEventListener("resize", () => panel?.invalidate());
}

App();
export default App;
