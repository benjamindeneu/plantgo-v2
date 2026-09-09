// src/controllers/SettingsModal.controller.js
import { Modal } from "../ui/components/Modal.js";
import { t } from "../language/i18n.js";
import { debugMode } from "../data/debugMode.js";

/** Opens the settings modal. Mounted from the header menu. */
export function openSettingsModal() {
  const modal = Modal({ title: t("settings.title") });
  const body = modal.querySelector(".body");

  const label = document.createElement("label");
  label.className = "settings-toggle";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = debugMode.get();
  checkbox.addEventListener("change", () => debugMode.set(checkbox.checked));
  label.append(checkbox, document.createTextNode(t("settings.debugMode")));
  body.appendChild(label);

  document.body.appendChild(modal);
  return modal;
}
