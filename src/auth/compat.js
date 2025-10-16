// Firebase adapter: works with BOTH compat and modular SDKs.
// Assumes your firebase-config.js exports { auth } (compat or modular).

import { auth } from "./firebase.js";

let _isCompat = false;
try {
  // compat usually has functions directly on the auth instance:
  _isCompat = typeof auth?.onAuthStateChanged === "function" && typeof auth?.signInWithEmailAndPassword === "function";
} catch {}

async function _loadModular() {
  // Load the modular helpers only if needed (and avoid version mismatch by not hardcoding a version here).
  const mod = await import("https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js");
  return mod;
}

export async function onAuthChanged(cb) {
  if (_isCompat) {
    return auth.onAuthStateChanged(cb);
  } else {
    const { onAuthStateChanged } = await _loadModular();
    return onAuthStateChanged(auth, cb);
  }
}

export async function signInEmailPassword(email, password) {
  if (_isCompat) {
    return auth.signInWithEmailAndPassword(email, password);
  } else {
    const { signInWithEmailAndPassword } = await _loadModular();
    return signInWithEmailAndPassword(auth, email, password);
  }
}

export async function createUserEmailPassword(email, password) {
  if (_isCompat) {
    return auth.createUserWithEmailAndPassword(email, password);
  } else {
    const { createUserWithEmailAndPassword } = await _loadModular();
    return createUserWithEmailAndPassword(auth, email, password);
  }
}

export async function updateUserProfile(profile) {
  if (_isCompat) {
    // compat has updateProfile on user
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user.");
    return user.updateProfile(profile);
  } else {
    const { updateProfile } = await _loadModular();
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user.");
    return updateProfile(user, profile);
  }
}

export { auth };
