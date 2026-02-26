// scripts/updateRecordsAndPlayoffs.js
// Loads the most recent week's game scores into the score carousel.
// Fixes vs original:
//   - Skeleton cards rendered immediately so layout doesn't jump
//   - Team details fetched in parallel (Promise.all) not sequentially
//   - Error boundary around every async step
//   - Pagination buttons updated correctly
//   - No duplicate DOMContentLoaded listener

import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";
const WEEK_TYPE   = "reg";
const PAGE_SIZE   = 8;

let currentPage = 0;
let allGames    = [];   // [{ awayTeam, homeTeam, game }]

// ── Helpers ────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

/** Inject skeleton cards while real data is in-flight. */
function renderSkeleton() {
  const container = $("score-carousel");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < PAGE_SIZE; i++) {
    const card = document.createElement("div");
    card.className = "score-card score-card--skeleton";
    card.setAttribute("aria-hidden", "true");
    card.innerHTML = `
      <div class="score-row">
        <div class="skel-circle skeleton"></div>
        <div class="skel-bar skeleton"></div>
        <div class="skel-num skeleton"></div>
      </div>
      <div class="score-row">
        <div class="skel-circle skeleton"></div>
        <div class="skel-bar skeleton"></div>
        <div class="skel-num skeleton"></div>
      </div>
    `;
    container.appendChild(card);
  }
}

async function getLatestWeekNumber() {
  const snap = await get(ref(db, `${LEAGUE_PATH}/schedules/${WEEK_TYPE}`));
  if (!snap.exists()) return null;
  const weeks = Object.keys(snap.val()).map(Number).filter(n => !isNaN(n));
  return weeks.length ? Math.max(...weeks) : null;
}

async function getTeamMeta(teamId) {
  const snap = await get(ref(db, `${LEAGUE_PATH}/teams/${teamId}/meta`));
  return snap.exists() ? snap.val() : null;
}

// ── Card building ──────────────────────────────────────────────────

function buildScoreCard(awayTeam, homeTeam, game) {
  const card = document.createElement("div");
  card.className = "score-card";
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label",
    `${homeTeam.abbrName} vs ${awayTeam.abbrName}: ${game.homeScore ?? "–"}–${game.awayScore ?? "–"}`
  );

  const awayLogo   = `images/logos/${awayTeam.logoId}.png`;
  const homeLogo   = `images/logos/${homeTeam.logoId}.png`;
  const awayWins   = (game.awayScore ?? -1) > (game.homeScore ?? -1);
  const homeWins   = (game.homeScore ?? -1) > (game.awayScore ?? -1);
  const awayScore  = game.awayScore ?? "–";
  const homeScore  = game.homeScore ?? "–";

  card.innerHTML = `
    <div class="score-row">
      <img class="score-logo" src="${homeLogo}"
           alt="${homeTeam.abbrName}" loading="lazy" width="24" height="24" />
      <span class="score-team">${homeTeam.abbrName}</span>
      <span class="score-value${homeWins ? " score-winner" : ""}">${homeScore}</span>
    </div>
    <div class="score-row">
      <img class="score-logo" src="${awayLogo}"
           alt="${awayTeam.abbrName}" loading="lazy" width="24" height="24" />
      <span class="score-team">${awayTeam.abbrName}</span>
      <span class="score-value${awayWins ? " score-winner" : ""}">${awayScore}</span>
    </div>
  `;

  const navigate = () => {
    if (game.scheduleId) {
      window.location.href = `game.html?scheduleId=${game.scheduleId}`;
    }
  };
  card.addEventListener("click", navigate);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(); }
  });

  return card;
}

// ── Pagination rendering ───────────────────────────────────────────

function renderPage() {
  const container = $("score-carousel");
  if (!container) return;

  const start   = currentPage * PAGE_SIZE;
  const pageSet = allGames.slice(start, start + PAGE_SIZE);

  container.innerHTML = "";

  if (!pageSet.length) {
    const msg = document.createElement("div");
    msg.className = "scores-error";
    msg.textContent = "No scores available.";
    container.appendChild(msg);
  } else {
    for (const { awayTeam, homeTeam, game } of pageSet) {
      container.appendChild(buildScoreCard(awayTeam, homeTeam, game));
    }
  }

  const prevBtn = $("prevScores");
  const nextBtn = $("nextScores");
  if (prevBtn) prevBtn.disabled = currentPage === 0;
  if (nextBtn) nextBtn.disabled = (currentPage + 1) * PAGE_SIZE >= allGames.length;
}

// ── Main loader ────────────────────────────────────────────────────

async function loadScoresCarousel() {
  renderSkeleton();

  try {
    const weekNumber = await getLatestWeekNumber();
    if (weekNumber === null) {
      throw new Error("No weeks found in schedule.");
    }

    const schedSnap = await get(
      ref(db, `${LEAGUE_PATH}/schedules/${WEEK_TYPE}/${weekNumber}`)
    );
    if (!schedSnap.exists()) {
      throw new Error(`No games found for week ${weekNumber}.`);
    }

    const rawGames = schedSnap.val();
    // rawGames may be an array or a keyed object
    const gameList = Array.isArray(rawGames)
      ? rawGames
      : Object.values(rawGames);

    // Fetch all team metadata in parallel
    const resolved = await Promise.all(
      gameList.map(async (game) => {
        try {
          const [awayTeam, homeTeam] = await Promise.all([
            getTeamMeta(game.awayTeamId),
            getTeamMeta(game.homeTeamId),
          ]);
          if (!awayTeam || !homeTeam) return null;
          return { awayTeam, homeTeam, game };
        } catch {
          return null;
        }
      })
    );

    allGames = resolved.filter(Boolean);
    renderPage();
  } catch (err) {
    console.warn("[scoreCarousel]", err.message);
    const container = $("score-carousel");
    if (container) {
      container.innerHTML =
        `<div class="scores-error">Could not load scores — check back soon.</div>`;
    }
    const prevBtn = $("prevScores");
    const nextBtn = $("nextScores");
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────

window.addEventListener("DOMContentLoaded", () => {
  loadScoresCarousel();

  const prevBtn = $("prevScores");
  const nextBtn = $("nextScores");

  prevBtn?.addEventListener("click", () => {
    if (currentPage > 0) { currentPage--; renderPage(); }
  });

  nextBtn?.addEventListener("click", () => {
    if ((currentPage + 1) * PAGE_SIZE < allGames.length) {
      currentPage++;
      renderPage();
    }
  });
});
