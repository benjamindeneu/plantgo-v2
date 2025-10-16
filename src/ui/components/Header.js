export function Header({ user, level=1, progress=0, onMenu }) {
  const root = document.createElement("header");
  root.className = "nav";
  root.innerHTML = `
    <div class="brandmark">🌿 PlantGo</div>
    <div id="userInfo">
      <button id="userBtn" aria-haspopup="true" aria-expanded="false">
        <span id="userName">${user?.displayName ?? "User"}</span>
        <span class="level-badge">
          Lv. <span id="levelNumber">${level}</span>
          <span id="levelProgressContainer"><span id="levelProgressBar" style="width:${progress}%"></span></span>
        </span>
      </button>
    </div>
  `;
  root.querySelector("#userBtn").addEventListener("click", onMenu || (()=>{}));
  return root;
}
