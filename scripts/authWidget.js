// scripts/authWidget.js
import "./firebaseConfig.js";
import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMINS_PATH = "config/admins";

function currentPathWithQuery() {
  return location.pathname + location.search;
}

async function isAdmin(uid) {
  if (!uid) return false;
  const snap = await get(ref(db, `${ADMINS_PATH}/${uid}`));
  return snap.exists() && snap.val() === true;
}

function renderSignedOut(slot) {
  const url = `/login?redirect=${encodeURIComponent(currentPathWithQuery())}`;
  slot.innerHTML = `<a href="${url}">Sign in</a>`;
}

function renderSignedIn(slot, { name, admin }) {
  slot.innerHTML = `
    <div class="auth-badge">
      <span class="auth-name">${name}${admin ? ' <span class="admin-pill">Admin</span>' : ''}</span>
      <button class="btn small" id="signOutBtn">Sign out</button>
    </div>
  `;
  const auth = getAuth();
  slot.querySelector("#signOutBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    await signOut(auth);
    location.replace("/"); // send to home (or keep window.location.reload() if you prefer)
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Ensure the slot exists even if omitted
  let slot = document.getElementById("authSlot");
  if (!slot) {
    const list = document.querySelector(".navbar .navbar-links");
    if (list) {
      slot = document.createElement("li");
      slot.id = "authSlot";
      list.appendChild(slot);
    }
  }
  if (!slot) return;

  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    if (!user) return renderSignedOut(slot);
    const admin = await isAdmin(user.uid);
    const name = user.displayName || user.email || "Signed in";
    renderSignedIn(slot, { name, admin });
  });
});
