export function Modal({ title = "", content = "" }) {
  const overlay = document.createElement("div");
  overlay.className = "modal show";
  overlay.setAttribute("role", "dialog");
  overlay.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <div class="body">${content}</div>
      <div class="result-actions">
        <button class="primary" id="doneBtn" type="button">Done</button>
      </div>
    </div>`;
  overlay.querySelector("#doneBtn").addEventListener("click", () => overlay.remove());
  //overlay.querySelector(".close").addEventListener("click", () => overlay.remove());
  return overlay;
}
