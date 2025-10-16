export function Modal({ title = "", content = "" }) {
  const overlay = document.createElement("div");
  overlay.className = "modal show";
  overlay.setAttribute("role", "dialog");
  overlay.innerHTML = `
    <div class="modal-content">
      <button class="close" aria-label="Close">×</button>
      <h2>${title}</h2>
      <div class="body">${content}</div>
    </div>`;
  overlay.querySelector(".close").addEventListener("click", () => overlay.remove());
  return overlay;
}
