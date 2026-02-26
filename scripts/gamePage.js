import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// --- safe DOM helpers (non-breaking) ---
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTMLById(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function appendHTMLById(id, html) {
  const el = document.getElementById(id);
  if (el) el.insertAdjacentHTML("beforeend", html);
}

function getEl(id) {
  return document.getElementById(id) || null;
}

const leaguePath = "data/xbsx/20390713";
const weekType = "reg";

function getScheduleIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("scheduleId");
}

async function findGameByScheduleId(scheduleId) {
  const scheduleRef = ref(db, `${leaguePath}/schedules/${weekType}`);
  const snapshot = await get(scheduleRef);
  if (!snapshot.exists()) return null;

  const data = snapshot.val();
  for (const [weekNumber, games] of Object.entries(data)) {
    for (const game of games) {
      if (String(game.scheduleId) === scheduleId) {
        return { ...game, weekNumber };
      }
    }
  }
  return null;
}

async function getTeam(teamId) {
  const refPath = `${leaguePath}/teams/${teamId}/meta`;
  const snapshot = await get(ref(db, refPath));
  return snapshot.exists() ? snapshot.val() : null;
}

async function fetchTeamStats(weekNumber, teamId) {
  const statsRef = ref(db, `${leaguePath}/stats/${weekType}/${weekNumber}/${teamId}/team-stats`);
  const snapshot = await get(statsRef);
  return snapshot.exists() ? snapshot.val() : null;
}

function buildTeamInfo(team, username, record) {
  return `
    <div class="game-recap--block">
      <h3>${team.cityName}</h3>
      <h2>${team.displayName}</h2>
      <p>${username || "None"}</p>
      <p><strong>Record:</strong> ${record}</p>
    </div>
  `;
}

function renderGameSummary(game, homeTeam, awayTeam, homeStats, awayStats) {
  const box = document.getElementById("summaryBox");
  if (!box) return;

  // Pull record from team stats if not present in schedule
  const awayWins = game.awayWins ?? awayStats?.totalWins ?? "-";
  const awayLosses = game.awayLosses ?? awayStats?.totalLosses ?? "-";
  const awayTies = game.awayTies ?? awayStats?.totalTies ?? "-";

  const homeWins = game.homeWins ?? homeStats?.totalWins ?? "-";
  const homeLosses = game.homeLosses ?? homeStats?.totalLosses ?? "-";
  const homeTies = game.homeTies ?? homeStats?.totalTies ?? "-";

  box.innerHTML = `
    <div class="recap-summary-flex">
      <div class="recap-team-side">
        <img class="recap-logo" src="images/logos/${homeTeam.logoId}.png" alt="${homeTeam.abbrName}" />
      </div>

      <div class="recap-team-info">
        <p class="recap-city">${homeTeam.cityName}</p>
        <p class="recap-name">${homeTeam.displayName}</p>
        <p class="recap-user">${homeTeam.userName || "None"}</p>
        <p class="recap-record">Record: ${homeWins}-${homeLosses}-${homeTies}</p>
      </div>

      <div class="recap-score-box">
        <div class="score-line">
          <span class="score-value">${game.homeScore}</span>
          <span class="vs">vs</span>
          <span class="score-value">${game.awayScore}</span>
        </div>
      </div>

      <div class="recap-team-info right-align">
        <p class="recap-city">${awayTeam.cityName}</p>
        <p class="recap-name">${awayTeam.displayName}</p>
        <p class="recap-user">${awayTeam.userName || "None"}</p>
        <p class="recap-record">Record: ${awayWins}-${awayLosses}-${awayTies}</p>
      </div>

      <div class="recap-team-side">
        <img class="recap-logo" src="images/logos/${awayTeam.logoId}.png" alt="${awayTeam.abbrName}" />
      </div>
    </div>
  `;
}

async function loadTeamStats(weekNumber, homeTeamId, awayTeamId) {
  const container = document.getElementById("teamStatsContainer");
  if (!container) return;

  const [homeStats, awayStats] = await Promise.all([
    fetchTeamStats(weekNumber, homeTeamId),
    fetchTeamStats(weekNumber, awayTeamId)
  ]);

  const statFields = [
    { key: "offTotalYds", label: "Total Yards" },
    { key: "offPassYds", label: "Passing Yards" },
    { key: "offPassTDs", label: "Passing Touchdowns" },
    { key: "offRushYds", label: "Rushing Yards" },
    { key: "offRushTDs", label: "Rushing Touchdowns" },
    { key: "off1stDowns", label: "1st Downs" },
    { key: "off3rdDownAtt", label: "3rd Down Attempts" },
    { key: "off3rdDownConv", label: "3rd Down Conversions" },
    { key: "off4thDownAtt", label: "4th Down Attempts" },
    { key: "off4thDownConv", label: "4th Down Conversions" },
    { key: "offRedZonePct", label: "Red Zone Efficiency" },
    { key: "defTotalYds", label: "Total Yards Allowed" },
    { key: "defPassYds", label: "Pass Yards Allowed" },
    { key: "defRushYds", label: "Rush Yards Allowed" },
    { key: "defForcedFum", label: "Forced Fumbles" },
    { key: "defFumRec", label: "Fumble Recoveries" },
    { key: "defSacks", label: "Sacks" },
    { key: "offIntsLost", label: "Interceptions Thrown" },
    { key: "offFumLost", label: "Fumbles Lost" },
    { key: "tOGiveaways", label: "Turnovers" },
    { key: "penalties", label: "Penalties" },
    { key: "penaltyYds", label: "Penalty Yards" }
  ];

  const buildStatsTable = (stats) => `
    <table class="team-stats-table">
      <thead><tr><th>Category</th><th>Value</th></tr></thead>
      <tbody>
        ${statFields.map(({ key, label }) => `
          <tr>
            <td>${label}</td>
            <td>${stats[key] !== undefined ? stats[key] : "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = `
    <div class="team-stats-entry">
      <h3>Home Team Stats</h3>
      ${buildStatsTable(homeStats)}
    </div>
    <div class="team-stats-entry">
      <h3>Away Team Stats</h3>
      ${buildStatsTable(awayStats)}
    </div>
  `;

  return { homeStats, awayStats };
}

async function loadGamePage() {
  const gameId = getScheduleIdFromURL();
  if (!gameId) return;

  try {
    const game = await findGameByScheduleId(gameId);
    if (!game) {
      console.warn("Game not found");
      return;
    }

    const [homeTeam, awayTeam, homeStats, awayStats] = await Promise.all([
  getTeam(game.homeTeamId),
  getTeam(game.awayTeamId),
  fetchTeamStats(game.weekNumber, game.homeTeamId),
  fetchTeamStats(game.weekNumber, game.awayTeamId),
]);

renderGameSummary(game, homeTeam, awayTeam, homeStats, awayStats);
document.getElementById("gameTitle").textContent = `Week ${parseInt(game.weekNumber)} Recap`;

await loadTeamStats(game.weekNumber, game.homeTeamId, game.awayTeamId);

  } catch (err) {
    console.error("Error loading game page:", err);
  }
}

function setupTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

      button.classList.add("active");
      document.getElementById(button.dataset.tab + "Container").classList.add("active");
    });
  });
}

// Optional placeholder content for now
function renderPlayerStatsPlaceholder() {
  const container = document.getElementById("playerStatsContainer");
  if (container) {
    container.innerHTML = `<div class="team-stats-entry"><p>Player stats coming soon...</p></div>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadGamePage();
  setupTabs();
  renderPlayerStatsPlaceholder(); // Update later with actual player stats
});


window.addEventListener("DOMContentLoaded", loadGamePage);
