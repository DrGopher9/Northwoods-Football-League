// scripts/playoff_picture_division_logic.js
// Populates the playoff picture sidebar on index.html.
// Fixes vs original:
//   - Skeleton rows shown immediately while Firebase fetches
//   - Error handling with user-visible fallback
//   - Guard against missing meta/standings data
//   - Correct div-winner detection (seeds 1–4 are division winners)

import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";

// ── Skeleton helpers ───────────────────────────────────────────────

function injectSkeletons(listId, count = 7) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    li.className = "playoff-team";
    li.setAttribute("aria-hidden", "true");
    li.innerHTML = `
      <span class="seed skeleton" style="width:1.2rem;height:13px;border-radius:3px;display:inline-block;"></span>
      <span class="skeleton playoff-skeleton-row" style="flex:1;height:20px;margin-left:.35rem;border-radius:4px;"></span>
    `;
    list.appendChild(li);
  }
}

// ── Rendering ──────────────────────────────────────────────────────

function renderList(listId, teams) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = "";

  if (!teams.length) {
    const li = document.createElement("li");
    li.className = "playoff-team";
    li.style.color = "var(--text-3)";
    li.style.fontSize = "0.82rem";
    li.textContent = "No data available.";
    list.appendChild(li);
    return;
  }

  for (const team of teams) {
    const li = document.createElement("li");
    li.className = "playoff-team";
    // Seeds 1–4 are division winners
    if (team.seed <= 4) li.classList.add("division-winner");

    const record = team.ties
      ? `(${team.wins}-${team.losses}-${team.ties})`
      : `(${team.wins}-${team.losses})`;

    li.innerHTML = `
      <span class="seed">#${team.seed}</span>
      <img class="team-logo" loading="lazy" width="20" height="20"
           src="images/logos/${team.logoId}.png"
           alt="${team.abbr} logo" />
      <a class="team-link" href="teams.html?teamId=${team.teamId}">${team.abbr}</a>
      <span class="record">${record}</span>
    `;
    list.appendChild(li);
  }
}

// ── Main fetch ─────────────────────────────────────────────────────

async function fetchPlayoffData() {
  // Show skeletons immediately
  injectSkeletons("afcPlayoffs", 7);
  injectSkeletons("afcHunt", 3);
  injectSkeletons("nfcPlayoffs", 7);
  injectSkeletons("nfcHunt", 3);

  try {
    const snap = await get(ref(db, `${LEAGUE_PATH}/teams`));
    if (!snap.exists()) throw new Error("No teams data found.");

    const raw = snap.val();
    const teams = [];

    for (const [teamId, team] of Object.entries(raw)) {
      const meta      = team?.meta;
      const standings = team?.standings;
      if (!meta || !standings) continue;

      teams.push({
        teamId,
        abbr:       meta.abbrName       || "???",
        logoId:     meta.logoId         ?? "default",
        wins:       standings.totalWins   ?? 0,
        losses:     standings.totalLosses ?? 0,
        ties:       standings.totalTies   ?? 0,
        seed:       standings.seed        ?? 99,
        conference: standings.conferenceName || "Unknown",
      });
    }

    // Sort by seed ascending, cap at 10 per conference
    const sortBySeed  = (a, b) => a.seed - b.seed;
    const afcTeams = teams.filter(t => t.conference === "AFC").sort(sortBySeed).slice(0, 10);
    const nfcTeams = teams.filter(t => t.conference === "NFC").sort(sortBySeed).slice(0, 10);

    renderList("afcPlayoffs", afcTeams.slice(0, 7));
    renderList("afcHunt",     afcTeams.slice(7));
    renderList("nfcPlayoffs", nfcTeams.slice(0, 7));
    renderList("nfcHunt",     nfcTeams.slice(7));
  } catch (err) {
    console.warn("[playoffPicture]", err.message);
    // Clear skeletons and show error state in each list
    for (const id of ["afcPlayoffs", "afcHunt", "nfcPlayoffs", "nfcHunt"]) {
      const list = document.getElementById(id);
      if (!list) continue;
      list.innerHTML = "";
      const li = document.createElement("li");
      li.className = "playoff-team";
      li.style.color = "var(--text-3)";
      li.style.fontSize = "0.82rem";
      li.textContent = "Unable to load standings.";
      list.appendChild(li);
    }
  }
}

fetchPlayoffData();
