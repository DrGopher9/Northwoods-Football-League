import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { db } from "./firebaseConfig.js";

async function loadGameOfTheWeek() {
  const basePath = "data/xbsx/20390713";
  const teamsSnap = await get(child(ref(db), `${basePath}/teams`));
  if (!teamsSnap.exists()) return console.error("No teams found");
  const teams = teamsSnap.val();

  const scheduleSnap = await get(child(ref(db), `${basePath}/schedules/reg`));
  if (!scheduleSnap.exists()) return console.error("No schedules found");

  let gotw = null;
  let minDiff = Infinity;

  Object.entries(scheduleSnap.val()).forEach(([week, games]) => {
    games.forEach((game) => {
      if (game.status === 2) {
        const home = teams[game.homeTeamId];
        const away = teams[game.awayTeamId];
        if (!home || !away || !home.meta || !away.meta) return;

        const sameDiv = home.meta.divName === away.meta.divName;
        const diff = Math.abs(game.awayScore - game.homeScore);
        const scoreComplete = game.awayScore != null && game.homeScore != null;

        const isBetter =
          scoreComplete &&
          (diff < minDiff || (diff === minDiff && sameDiv));

        if (isBetter) {
          gotw = { game, home, away, week };
          minDiff = diff;
        }
      }
    });
  });

  if (!gotw) return console.error("No valid Game of the Week found");

  const { game, home, away, week } = gotw;

  // Title
  const titleEl = document.querySelector(".game-of-the-week h2");
  if (titleEl) titleEl.textContent = `Week ${week} – Game of the Week`;

  // Away details
  document.querySelector("#awayCity").textContent = away.meta.cityName;
  const awayNameEl = document.getElementById("awayName");
  awayNameEl.textContent = away.meta.displayName;
  awayNameEl.href = `teams.html?teamId=${away.meta.teamId || game.awayTeamId}`;
  document.querySelector("#awayUser").textContent = away.meta.userName || "None";

  const awayImg = document.querySelector(".left-team .team-logo");
  if (awayImg) {
    awayImg.src = `images/logos/${away.meta.logoId}.png`;
    awayImg.alt = `${away.meta.abbrName || away.meta.displayName || "Away"} logo`;
    awayImg.setAttribute("loading", "lazy");
    awayImg.setAttribute("width", "48");
    awayImg.setAttribute("height", "48");
  }

  // Home details
  document.querySelector("#homeCity").textContent = home.meta.cityName;
  const homeNameEl = document.getElementById("homeName");
  homeNameEl.textContent = home.meta.displayName;
  homeNameEl.href = `teams.html?teamId=${home.meta.teamId || game.homeTeamId}`;
  document.querySelector("#homeUser").textContent = home.meta.userName || "None";

  const homeImg = document.querySelector(".right-team .team-logo");
  if (homeImg) {
    homeImg.src = `images/logos/${home.meta.logoId}.png`;
    homeImg.alt = `${home.meta.abbrName || home.meta.displayName || "Home"} logo`;
    homeImg.setAttribute("loading", "lazy");
    homeImg.setAttribute("width", "48");
    homeImg.setAttribute("height", "48");
  }

  // Scores + link
  document.querySelector("#awayScore").textContent = game.awayScore;
  document.querySelector("#homeScore").textContent = game.homeScore;
  document.querySelector("#gotwLink").href = `game.html?scheduleId=${game.scheduleId}`;
}


loadGameOfTheWeek();
