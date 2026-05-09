// scripts/authGuard.js
import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMINS_PATH = "config/admins"; // { uid: true }

function redirectToLogin(loginPath = "/login", reason = "") {
  const dest = `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search)}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`;
  location.replace(dest);
}

/** Resolves with the user if signed in AND allowed; otherwise redirects to /login */
export function ensureAdmin(loginPath = "/login") {
  const auth = getAuth();
  return new Promise((resolve) => {
    const off = onAuthStateChanged(auth, async (user) => {
      if (!user) { off(); return redirectToLogin(loginPath, "signin"); }
      try {
        const snap = await get(ref(db, `${ADMINS_PATH}/${user.uid}`));
        if (snap.exists() && snap.val() === true) {
          off(); resolve(user);
        } else {
          off(); redirectToLogin(loginPath, "not-admin");
        }
      } catch (e) {
        console.error("admin check failed", e);
        off(); redirectToLogin(loginPath, "error");
      }
    });
  });
}

export function attachSignOut(selector = "#signOutBtn") {
  const btn = document.querySelector(selector);
  if (!btn) return;
  const auth = getAuth();
  btn.addEventListener("click", async () => {
    await signOut(auth);
    location.replace("/login");
  });
}
