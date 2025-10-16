import { auth } from "./firebase.js";
import { onAuthChanged } from "./compat.js";

export function requireAuth() {
  return new Promise((resolve) => {
    onAuthChanged((user) => {
      if (!user) {
        const path = location.pathname.toLowerCase();
        const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
        if (!isAuthPage) location.replace("./login.html");
      } else {
        resolve(user);
      }
    });
  });
}

export function redirectIfAuthed() {
  return new Promise((resolve) => {
    onAuthChanged((user) => {
      if (user) {
        const path = location.pathname.toLowerCase();
        const isAuthPage = path.endsWith("/login.html") || path.endsWith("/signup.html");
        if (isAuthPage) location.replace("./index.html");
      }
      resolve(user);
    });
  });
}
