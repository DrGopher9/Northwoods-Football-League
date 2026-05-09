// scripts/adminCoaches.js
import { db } from "./firebaseConfig.js";
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- Firebase Paths ---
const TEAMS_PATH = "data/xbsx/20390713/teams";  // still needed for team info
const COACHES_PATH = "config/coaches";          // new path for coach data

let TEAMS = {}; // teamId -> meta
const $ = (s) => document.querySelector(s);

function option(html, val) {
  const o = document.createElement("option");
  o.value = val;
  o.textContent = html;
  return o;
}

async function loadTeams() {
  const snap = await get(ref(db, TEAMS_PATH));
  if (!snap.exists()) return {};
  const out = {};
  for (const [teamId, node] of Object.entries(snap.val())) {
    out[teamId] = node.meta || {};
  }
  return out;
}

async function loadCoaches() {
  const snap = await get(ref(db, COACHES_PATH));
  return snap.exists() ? snap.val() : {};
}

function teamName(meta) {
  return [meta.cityName, meta.displayName].filter(Boolean).join(" ") || meta.abbrName || "Unknown";
}

function makeRow(teamId = "", data = {}) {
  const tr = document.createElement("tr");
  tr.dataset.origTeamId = teamId || "";

  // TEAM select
  const tdTeam = document.createElement("td");
  const sel = document.createElement("select");
  sel.className = "teamSel";
  sel.append(option("— Select Team —", ""));
  Object.entries(TEAMS)
    .sort((a, b) => teamName(a[1]).localeCompare(teamName(b[1])))
    .forEach(([id, meta]) => sel.append(option(teamName(meta), id)));
  sel.value = teamId || "";
  tdTeam.appendChild(sel);
  tr.appendChild(tdTeam);

  // Coach Name
  const tdCoach = document.createElement("td");
  tdCoach.innerHTML = `<input type="text" class="coachName" placeholder="Coach" value="${data.coachName || ""}">`;
  tr.appendChild(tdCoach);

  // PSN
  const tdPsn = document.createElement("td");
  tdPsn.innerHTML = `<input type="text" class="psn" placeholder="PSN" value="${data.psn || ""}">`;
  tr.appendChild(tdPsn);

  // Broadcast Platform
  const tdPlatform = document.createElement("td");
  const plat = document.createElement("select");
  plat.className = "platform";
  ["", "YouTube", "Twitch"].forEach(p => plat.append(option(p || "—", p)));
  plat.value = (data.broadcast?.platform || "");
  tdPlatform.appendChild(plat);
  tr.appendChild(tdPlatform);

  // Broadcast URL
  const tdUrl = document.createElement("td");
  tdUrl.innerHTML = `<input type="url" class="url" placeholder="https://..." value="${(data.broadcast?.url || "")}">`;
  tr.appendChild(tdUrl);

  // Timezone
  const tdTz = document.createElement("td");
  tdTz.innerHTML = `<input type="text" class="tz" placeholder="EST / CST / PST" value="${data.timezone || ""}">`;
  tr.appendChild(tdTz);

  // Actions
  const tdAct = document.createElement("td");
  const saveBtn = document.createElement("button");
  saveBtn.className = "btn primary";
  saveBtn.textContent = "Save";
  const delBtn = document.createElement("button");
  delBtn.className = "btn";
  delBtn.style.marginLeft = ".4rem";
  delBtn.textContent = "Delete";
  tdAct.append(saveBtn, delBtn);
  tr.appendChild(tdAct);

  // --- Save Logic ---
  saveBtn.addEventListener("click", async () => {
    const newTeamId = sel.value;
    const payload = {
      coachName: tr.querySelector(".coachName").value.trim(),
      psn: tr.querySelector(".psn").value.trim(),
      broadcast: {
        platform: tr.querySelector(".platform").value,
        url: tr.querySelector(".url").value.trim()
      },
      timezone: tr.querySelector(".tz").value.trim()
    };
    if (!newTeamId) { alert("Select a team first."); return; }

    const orig = tr.dataset.origTeamId;
    try {
      // If team changed, remove old key
      if (orig && orig !== newTeamId) {
        await remove(ref(db, `${COACHES_PATH}/${orig}`));
      }
      await set(ref(db, `${COACHES_PATH}/${newTeamId}`), payload);
      tr.dataset.origTeamId = newTeamId;
      alert("Saved!");
    } catch (e) {
      console.error("Save failed", e);
      alert("Save failed (see console).");
    }
  });

  // --- Delete Logic ---
  delBtn.addEventListener("click", async () => {
    const id = tr.dataset.origTeamId || sel.value;
    if (!id) { tr.remove(); return; }
    if (!confirm("Delete this coach row?")) return;
    try {
      await remove(ref(db, `${COACHES_PATH}/${id}`));
      tr.remove();
    } catch (e) {
      console.error("Delete failed", e);
      alert("Delete failed (see console).");
    }
  });

  return tr;
}

async function init() {
  try {
    TEAMS = await loadTeams();
    const rows = await loadCoaches();

    const tbody = document.getElementById("coachRows");
    tbody.innerHTML = "";

    // Existing rows
    Object.entries(rows).forEach(([teamId, data]) => {
      tbody.appendChild(makeRow(teamId, data));
    });

    // Add new row button
    document.getElementById("addRowBtn").addEventListener("click", () => {
      tbody.appendChild(makeRow("", {}));
    });
  } catch (e) {
    console.error("Admin coaches init failed:", e);
  }
}

document.addEventListener("DOMContentLoaded", init);
