import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

export function requireAuth() {
  return new Promise((resolve) => {
    let done = false;
    onAuthStateChanged(auth, (user) => {
      console.log("[auth] state:", user ? "in" : "out");
      const path = location.pathname.toLowerCase();
      const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
      if (!user && !isAuthPage) {
        location.replace("./login.html");
      } else if (user) {
        if (!done) { done = true; resolve(user); }
      }
    }, (err) => {
      console.error("[auth] err:", err);
      location.replace("./login.html");
    });
  });
}

export function redirectIfAuthed() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      const path = location.pathname.toLowerCase();
      const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
      if (user && isAuthPage) {
        location.replace("./index.html");
      }
      resolve(user);
    });
  });
}

export async function doSignOut() {
  await signOut(auth);
  location.replace("./login.html");
}
