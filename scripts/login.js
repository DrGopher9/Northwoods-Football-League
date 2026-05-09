// scripts/login.js
import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMINS_PATH = "config/admins";

function dest() {
  const qp = new URLSearchParams(location.search);
  return qp.get("redirect") || "/admin_coaches.html";
}

function showReason() {
  const r = new URLSearchParams(location.search).get("reason");
  const map = {
    "signin": "Please sign in to continue.",
    "not-admin": "Signed in, but your account isn’t authorized for admin.",
    "error": "Couldn’t verify admin status. Try again."
  };
  const el = document.getElementById("reason");
  if (r && map[r]) el.textContent = map[r];
}

async function isAdmin(uid) {
  const snap = await get(ref(db, `${ADMINS_PATH}/${uid}`));
  return snap.exists() && snap.val() === true;
}

document.addEventListener("DOMContentLoaded", () => {
  showReason();
  const auth = getAuth();

  onAuthStateChanged(auth, async (user) => {
    if (user && await isAdmin(user.uid)) {
      location.replace(dest());
    }
  });

  document.getElementById("emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const err = document.getElementById("emailErr");
    err.textContent = "";
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      if (await isAdmin(user.uid)) location.replace(dest());
      else err.textContent = "Signed in, but this account isn’t authorized for admin.";
    } catch (e) {
      err.textContent = e.message || "Sign in failed.";
    }
  });

  document.getElementById("googleBtn").addEventListener("click", async () => {
    const err = document.getElementById("googleErr");
    err.textContent = "";
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      if (await isAdmin(user.uid)) location.replace(dest());
      else err.textContent = "Signed in, but this account isn’t authorized for admin.";
    } catch (e) {
      err.textContent = e.message || "Google sign in failed.";
    }
  });
});
