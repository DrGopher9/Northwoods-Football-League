
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "./firebaseConfig.js";

async function fetchPlayoffData() {
  const basePath = "data/xbsx/20390713";
  const teamsRef = ref(db, `${basePath}/teams`);
  const teamsSnap = await get(teamsRef);
  if (!teamsSnap.exists()) {
    console.error("No teams found");
    return;
  }

  const rawData = teamsSnap.val();
  const teams = [];

  for (const [teamId, team] of Object.entries(rawData)) {
    const meta = team.meta;
    const standings = team.standings;
    if (!meta || !standings) continue;

    teams.push({
      teamId,
      abbr: meta.abbrName || "UNK",
      logoId: meta.logoId || "default",
      wins: standings.totalWins || 0,
      losses: standings.totalLosses || 0,
      ties: standings.totalTies || 0,
      seed: standings.seed || 99,
      conference: standings.conferenceName || "Unknown"
    });
  }

  const afcTeams = teams.filter(t => t.conference === "AFC").sort((a, b) => a.seed - b.seed).slice(0, 10);
  const nfcTeams = teams.filter(t => t.conference === "NFC").sort((a, b) => a.seed - b.seed).slice(0, 10);

  renderPlayoffSection("afcPlayoffs", afcTeams.slice(0, 7));
  renderPlayoffSection("afcHunt", afcTeams.slice(7, 10));
  renderPlayoffSection("nfcPlayoffs", nfcTeams.slice(0, 7));
  renderPlayoffSection("nfcHunt", nfcTeams.slice(7, 10));
}

function renderPlayoffSection(containerId, teams) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  teams.forEach(team => {
    const li = document.createElement("li");
    li.className = "playoff-team";
    if (team.seed <= 4) li.classList.add("division-winner");
    else if (team.seed <= 7) li.classList.add("wild-card");
    else li.classList.add("in-hunt");

    li.innerHTML = `
      <span class="seed">#${team.seed}</span>
      <img loading="lazy" width="24" height="24"
           src="images/logos/${team.logoId}.png"
           class="team-logo"
           alt="${team.abbr} logo">
      <a href="teams.html?teamId=${team.teamId}" class="team-link">${team.abbr}</a>
      (${team.wins}-${team.losses}${team.ties ? '-' + team.ties : ''})
    `;
    container.appendChild(li);
  });
}


fetchPlayoffData();
