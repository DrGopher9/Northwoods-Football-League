// scripts/gotw_final_standalone.js
// Populates the Game of the Week block on index.html.
// Fixes vs original:
//   - Loading state shown before fetch
//   - Error handling with visible fallback
//   - Guards against null team/meta data
//   - Week label derived directly from the winning game object
//   - No brittle h2 text mutation (uses dedicated #gotwTitle element)

import { db } from "./firebaseConfig.js";
import { ref, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const LEAGUE_PATH = "data/xbsx/20390713";

// ── Loading / error states ─────────────────────────────────────────

function showLoading() {
  const box = document.querySelector(".game-of-the-week");
  if (!box) return;
  const card = box.querySelector(".gotw-card");
  if (card) {
    card.style.opacity = "0.35";
    card.style.pointerEvents = "none";
  }
}

function showError(message) {
  const box = document.querySelector(".game-of-the-week");
  if (!box) return;
  const card = box.querySelector(".gotw-card");
  if (card) card.remove();

  const msg = document.createElement("div");
  msg.className = "gotw-loading";
  msg.textContent = message;
  box.appendChild(msg);
}

function clearLoading() {
  const card = document.querySelector(".gotw-card");
  if (card) {
    card.style.opacity = "";
    card.style.pointerEvents = "";
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function loadGameOfTheWeek() {
  showLoading();

  try {
    const dbRef = ref(db);

    const [teamsSnap, scheduleSnap] = await Promise.all([
      get(child(dbRef, `${LEAGUE_PATH}/teams`)),
      get(child(dbRef, `${LEAGUE_PATH}/schedules/reg`)),
    ]);

    if (!teamsSnap.exists()) throw new Error("No teams found.");
    if (!scheduleSnap.exists()) throw new Error("No schedule found.");

    const teams    = teamsSnap.val();
    const schedule = scheduleSnap.val();

    // Find the completed game with the smallest score margin.
    // Tiebreak: same-division matchups rank higher.
    let gotw     = null;
    let minDiff  = Infinity;

    for (const [week, games] of Object.entries(schedule)) {
      // games may be an array or a keyed object
      const gameList = Array.isArray(games) ? games : Object.values(games);

      for (const game of gameList) {
        // status 2 = final
        if (game.status !== 2) continue;
        if (game.homeScore == null || game.awayScore == null) continue;

        const home = teams[game.homeTeamId];
        const away = teams[game.awayTeamId];
        if (!home?.meta || !away?.meta) continue;

        const sameDiv = home.meta.divName === away.meta.divName;
        const diff    = Math.abs(game.awayScore - game.homeScore);

        const isBetter =
          diff < minDiff ||
          (diff === minDiff && sameDiv);

        if (isBetter) {
          gotw    = { game, home, away, week };
          minDiff = diff;
        }
      }
    }

    if (!gotw) throw new Error("No completed games found for Game of the Week.");

    clearLoading();
    populateDOM(gotw);
  } catch (err) {
    console.warn("[gotw]", err.message);
    showError("Game of the Week data is not yet available.");
  }
}

// ── DOM population ─────────────────────────────────────────────────

function populateDOM({ game, home, away, week }) {
  // Week label — use gotwTitle if present, otherwise the h2 inside the section
  const titleEl = document.getElementById("gotwTitle")
    || document.querySelector(".game-of-the-week h2");
  if (titleEl) titleEl.textContent = `Week ${week} — Game of the Week`;

  // Away team (left side)
  setText("awayCity", away.meta.cityName ?? "");
  setLink("awayName", away.meta.displayName ?? "",
    `teams.html?teamId=${away.meta.teamId ?? game.awayTeamId}`);
  setText("awayUser", away.meta.userName ?? "");

  const awayImg = document.querySelector(".left-team .team-logo");
  if (awayImg) {
    awayImg.src    = `images/logos/${away.meta.logoId}.png`;
    awayImg.alt    = `${away.meta.abbrName ?? "Away"} logo`;
  }

  // Home team (right side)
  setText("homeCity", home.meta.cityName ?? "");
  setLink("homeName", home.meta.displayName ?? "",
    `teams.html?teamId=${home.meta.teamId ?? game.homeTeamId}`);
  setText("homeUser", home.meta.userName ?? "");

  const homeImg = document.querySelector(".right-team .team-logo");
  if (homeImg) {
    homeImg.src    = `images/logos/${home.meta.logoId}.png`;
    homeImg.alt    = `${home.meta.abbrName ?? "Home"} logo`;
  }

  // Scores
  setText("awayScore", String(game.awayScore ?? "--"));
  setText("homeScore", String(game.homeScore ?? "--"));

  // Game recap link
  const gotwLink = document.getElementById("gotwLink");
  if (gotwLink && game.scheduleId) {
    gotwLink.href = `game.html?scheduleId=${game.scheduleId}`;
  }
}

// ── Micro-helpers ──────────────────────────────────────────────────

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setLink(id, text, href) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (href) el.href = href;
}

// ── Boot ──────────────────────────────────────────────────────────

loadGameOfTheWeek();
