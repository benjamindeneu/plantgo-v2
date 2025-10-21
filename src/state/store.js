import { emit } from "../utils/eventBus.js";

const state = {
  user: null,
  observations: [],
  ui: { resultModalOpen: false, identify: {}, missions: [] }
};

export function getState() { return structuredClone(state); }
export function setState(patch) {
  Object.assign(state, patch);
  emit("state:changed", getState());
}
