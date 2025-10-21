// Generic modal view
export function ModalView({ id = "modal", open = false, title = "Modal", body = "", actions = [] }) {
  return `
    <dialog id="${id}" class="modal"${open ? " open" : ""} aria-labelledby="${id}-title">
      <div class="modal-content">
        <button class="close" data-close aria-label="Close">×</button>
        <h3 id="${id}-title" class="h3">${title}</h3>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          ${(actions||[]).map(a => `<button class="btn ${a.variant||"outline"}" data-action="${a.action}">${a.label}</button>`).join("")}
        </div>
      </div>
    </dialog>
  `;
}
