export function Header({ user, level=1, progress=0, onMenu }) {
  const root = document.createElement("header");
  root.className = "nav";
  root.innerHTML = `
    <div class="brandmark">🌿 PlantGo</div>
    <div id="userInfo"><button id="userBtn">${user?.displayName ?? "User"}</button></div>
  `;
  root.querySelector("#userBtn").addEventListener("click", onMenu || (()=>{}));
  return root;
}
