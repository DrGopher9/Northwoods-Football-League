import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";

document.addEventListener("DOMContentLoaded", () => {
  initHomePage();
});

async function initHomePage() {
  const loader = document.getElementById("global-loader");
  const content = document.getElementById("main-content");

  try {
    // Fetch all necessary data concurrently, exactly once
    const [teamsSnap, scheduleSnap] = await Promise.all([
      get(ref(db, `${LEAGUE_PATH}/teams`)),
      get(ref(db, `${LEAGUE_PATH}/schedules/reg`))
    ]);

    if (!teamsSnap.exists() || !scheduleSnap.exists()) {
      throw new Error("League data could not be found.");
    }

    const teams = teamsSnap.val();
    const schedules = scheduleSnap.val();

    renderPlayoffPicture(teams);
    renderGameOfTheWeek(teams, schedules);
    
    // Smooth transition from loader to content
    loader.style.display = "none";
    content.classList.add("visible");

  } catch (error) {
    console.error("Initialization error:", error);
    loader.innerHTML = `<div class="error-state">Failed to load league data. Please check your connection.</div>`;
  }
}

function renderPlayoffPicture(teamsData) {
  const teams = [];
  
  for (const [teamId, team] of Object.entries(teamsData)) {
    if (!team.meta || !team.standings) continue;
    teams.push({
      teamId,
      abbr: team.meta.abbrName || "UNK",
      logoId: team.meta.logoId || "default",
      wins: team.standings.totalWins || 0,
      losses: team.standings.totalLosses || 0,
      ties: team.standings.totalTies || 0,
      seed: team.standings.seed || 99,
      conference: team.standings.conferenceName || "Unknown"
    });
  }

  const afcTeams = teams.filter(t => t.conference === "AFC").sort((a, b) => a.seed - b.seed);
  const nfcTeams = teams.filter(t => t.conference === "NFC").sort((a, b) => a.seed - b.seed);

  populateList("afcPlayoffs", afcTeams.slice(0, 7));
  populateList("afcHunt", afcTeams.slice(7, 10));
  populateList("nfcPlayoffs", nfcTeams.slice(0, 7));
  populateList("nfcHunt", nfcTeams.slice(7, 10));
}

function populateList(containerId, teams) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = teams.map(team => {
    let statusClass = "in-hunt";
    if (team.seed <= 4) statusClass = "division-winner";
    else if (team.seed <= 7) statusClass = "wild-card";

    return `
      <li class="playoff-team ${statusClass}">
        <span class="seed">#${team.seed}</span>
        <img loading="lazy" width="24" height="24" src="images/logos/${team.logoId}.png" class="team-logo" alt="${team.abbr}">
        <a href="teams.html?teamId=${team.teamId}" class="team-link">${team.abbr}</a>
        <span class="record">(${team.wins}-${team.losses}${team.ties ? '-' + team.ties : ''})</span>
      </li>
    `;
  }).join('');
}

function renderGameOfTheWeek(teams, schedules) {
  let gotw = null;
  let minDiff = Infinity;

  Object.entries(schedules).forEach(([week, games]) => {
    games.forEach((game) => {
      if (game.status === 2) {
        const home = teams[game.homeTeamId];
        const away = teams[game.awayTeamId];
        if (!home?.meta || !away?.meta) return;

        const sameDiv = home.meta.divName === away.meta.divName;
        const diff = Math.abs(game.awayScore - game.homeScore);
        const scoreComplete = game.awayScore != null && game.homeScore != null;

        if (scoreComplete && (diff < minDiff || (diff === minDiff && sameDiv))) {
          gotw = { game, home, away, week };
          minDiff = diff;
        }
      }
    });
  });

  if (!gotw) return;

  const { game, home, away, week } = gotw;
  
  document.getElementById("gotw-title").textContent = `Week ${week} – Game of the Week`;
  
  // Update Away Team
  document.getElementById("awayCity").textContent = away.meta.cityName;
  document.getElementById("awayName").textContent = away.meta.displayName;
  document.getElementById("awayName").href = `teams.html?teamId=${away.meta.teamId}`;
  document.getElementById("awayUser").textContent = away.meta.userName || "CPU";
  document.getElementById("awayLogo").src = `images/logos/${away.meta.logoId}.png`;
  document.getElementById("awayScore").textContent = game.awayScore;

  // Update Home Team
  document.getElementById("homeCity").textContent = home.meta.cityName;
  document.getElementById("homeName").textContent = home.meta.displayName;
  document.getElementById("homeName").href = `teams.html?teamId=${home.meta.teamId}`;
  document.getElementById("homeUser").textContent = home.meta.userName || "CPU";
  document.getElementById("homeLogo").src = `images/logos/${home.meta.logoId}.png`;
  document.getElementById("homeScore").textContent = game.homeScore;
  
  document.getElementById("gotwLink").href = `game.html?scheduleId=${game.scheduleId}`;
}
