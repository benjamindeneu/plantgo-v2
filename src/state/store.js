// src/state/store.js
import { emit } from "../utils/eventBus.js";

const state = {
  user: null,
  observations: [],
  ui: { resultModalOpen: false }
};

export function getState() { return structuredClone(state); }
export function setState(patch) {
  // shallow patch for top-level; nest carefully in controllers
  Object.assign(state, patch);
  emit("state:changed", getState());
}
