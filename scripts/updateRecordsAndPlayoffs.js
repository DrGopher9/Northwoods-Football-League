import { db } from "./firebaseConfig.js";
import {
  ref,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const leaguePath = "data/xbsx/20390713";
const weekType = "reg";
const pageSize = 8;

let currentPage = 0;
let allGames = [];

async function getLatestWeekNumber() {
  const weekRef = ref(db, `${leaguePath}/schedules/${weekType}`);
  const snapshot = await get(weekRef);
  if (!snapshot.exists()) return null;

  const weeks = Object.keys(snapshot.val()).map(Number);
  return Math.max(...weeks);
}

async function getTeamDetails(teamId) {
  const snapshot = await get(ref(db, `${leaguePath}/teams/${teamId}/meta`));
  return snapshot.exists() ? snapshot.val() : null;
}

function createGameCard(awayTeam, homeTeam, gameData) {
  const card = document.createElement("div");
  card.classList.add("score-card");

  const awayLogo = `images/logos/${awayTeam.logoId}.png`;
  const homeLogo = `images/logos/${homeTeam.logoId}.png`;

  const awayScore = gameData.awayScore;
  const homeScore = gameData.homeScore;

  const awayIsWinner = awayScore > homeScore;
  const homeIsWinner = homeScore > awayScore;

  card.innerHTML = `
    <div class="score-row">
      <img loading="lazy" width="32" height="32"
           src="${homeLogo}" alt="${homeTeam.abbrName} logo" class="score-logo">
      <span class="score-team">${homeTeam.abbrName}</span>
      <span class="score-value ${homeIsWinner ? "score-winner" : ""}">${homeScore}</span>
    </div>
    <div class="score-row">
      <img loading="lazy" width="32" height="32"
           src="${awayLogo}" alt="${awayTeam.abbrName} logo" class="score-logo">
      <span class="score-team">${awayTeam.abbrName}</span>
      <span class="score-value ${awayIsWinner ? "score-winner" : ""}">${awayScore}</span>
    </div>
  `;

  card.addEventListener("click", () => {
    window.location.href = `game.html?scheduleId=${gameData.scheduleId}`;
  });

  return card;
}


function renderScoresPage() {
  const scoresContainer = document.getElementById("score-carousel");
  scoresContainer.innerHTML = "";

  const pageGames = allGames.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  for (const { awayTeam, homeTeam, game } of pageGames) {
    const card = createGameCard(awayTeam, homeTeam, game);
    scoresContainer.appendChild(card);
  }

  // Update pagination buttons
  document.getElementById("prevScores").disabled = currentPage === 0;
  document.getElementById("nextScores").disabled = (currentPage + 1) * pageSize >= allGames.length;
}

async function loadScoresCarousel() {
  const scoresContainer = document.getElementById("score-carousel");
  if (!scoresContainer) return;

  try {
    const regSeasonRef = ref(db, `${leaguePath}/schedules/${weekType}`);
    const regSeasonSnap = await get(regSeasonRef);
    if (!regSeasonSnap.exists()) {
      console.warn("No regular season schedule data found in Firebase.");
      return;
    }

    const weekNumber = await getLatestWeekNumber();
    if (weekNumber === null) {
      console.warn("No weeks found.");
      return;
    }

    const schedRef = ref(db, `${leaguePath}/schedules/${weekType}/${weekNumber}`);
    const snapshot = await get(schedRef);

    if (snapshot.exists()) {
      const games = snapshot.val();

      for (const game of games) {
        const [awayTeam, homeTeam] = await Promise.all([
          getTeamDetails(game.awayTeamId),
          getTeamDetails(game.homeTeamId)
        ]);

        if (awayTeam && homeTeam) {
          allGames.push({ awayTeam, homeTeam, game });
        }
      }

      renderScoresPage(); // initial render
    }
  } catch (err) {
    console.error("Error loading scores:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadScoresCarousel();

  document.getElementById("prevScores").addEventListener("click", () => {
    if (currentPage > 0) {
      currentPage--;
      renderScoresPage();
    }
  });

  document.getElementById("nextScores").addEventListener("click", () => {
    if ((currentPage + 1) * pageSize < allGames.length) {
      currentPage++;
      renderScoresPage();
    }
  });
});
