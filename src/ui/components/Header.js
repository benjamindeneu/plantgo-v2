export function Header({ user, level=1, progress=0, onMenu, onLogout, onHerbarium }) {
  const root = document.createElement("header");
  root.className = "nav";
  root.innerHTML = `
    <div class="brandmark">🌿 PlantGo</div>
    <div class="user-area">
      <button id="userBtn" class="user-btn" aria-haspopup="menu" aria-expanded="false">
        <span class="user-name">${user?.displayName ?? "User"}</span>
        <span class="level-badge">Lv. <span id="levelNumber">${level}</span></span>
      </button>
      <div id="userMenu" class="menu" role="menu" hidden>
        <button class="menu-item" role="menuitem" id="menuHerbarium">📗 Herbarium</button>
        <button class="menu-item danger" role="menuitem" id="menuLogout">🚪 Log out</button>
      </div>
    </div>
  `;

  const btn = root.querySelector("#userBtn");
  const menu = root.querySelector("#userMenu");
  const levelEl = root.querySelector("#levelNumber");

  function openMenu() {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    document.addEventListener("click", outsideClose, { once: true });
    document.addEventListener("keydown", escClose, { once: true });
  }
  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  }
  function outsideClose(e) {
    if (!root.contains(e.target)) closeMenu();
  }
  function escClose(e) {
    if (e.key === "Escape") closeMenu();
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) openMenu(); else closeMenu();
    (onMenu || (()=>{}))();
  });

  root.querySelector("#menuLogout").addEventListener("click", () => {
    closeMenu();
    (onLogout || (()=>{}))();
  });
  root.querySelector("#menuHerbarium").addEventListener("click", () => {
    closeMenu();
    (onHerbarium || (()=>{}))();
  });

  // Public helpers
  root.setUser = (u) => {
    root.querySelector(".user-name").textContent = u?.displayName ?? "User";
  };
  root.setLevel = (lvl) => {
    levelEl.textContent = String(lvl ?? 1);
  };

  return root;
}
