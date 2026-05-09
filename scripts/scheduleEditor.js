import { db } from "./firebaseConfig.js";
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { TEAM_OPTIONS } from "./statsConstants.js";

// Editor path - update schedule.js to use this path when ready
const basePath = "config/schedules";

const seasonSelect = document.getElementById("seasonSelect");
const typeSelect = document.getElementById("typeSelect");
const weekSelect = document.getElementById("weekSelect");
const loadBtn = document.getElementById("loadBtn");
const addGameBtn = document.getElementById("addGameBtn");
const saveAllBtn = document.getElementById("saveAllBtn");
const addSeasonBtn = document.getElementById("addSeasonBtn");
const deleteSeasonBtn = document.getElementById("deleteSeasonBtn");
const tableBody = document.querySelector("#scheduleTable tbody");

let games = {};
let currentSeasons = []; // Track available seasons

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showMessage(msg, type = "info") {
  // Create a simple toast notification
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === "error" ? "#f44336" : type === "success" ? "#4caf50" : "#2196f3"};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-weight: bold;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = "Loading...";
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

// ============================================
// SEASON MANAGEMENT
// ============================================

async function loadSeasons() {
  try {
    console.log(`🔍 Loading seasons from: ${basePath}`);
    const snap = await get(ref(db, basePath));
    const previousValue = seasonSelect.value; // Remember current selection
    seasonSelect.innerHTML = "";
    currentSeasons = [];

    console.log("📊 Snapshot exists?", snap.exists());
    
    if (snap.exists()) {
      const val = snap.val();
      console.log("📦 Raw data:", val);
      
      // Get all season keys and sort them numerically
      const seasonKeys = Object.keys(val)
        .filter(k => !isNaN(k))
        .map(k => parseInt(k))
        .sort((a, b) => a - b);

      console.log("🔢 Found season keys:", seasonKeys);
      currentSeasons = seasonKeys;

      if (seasonKeys.length === 0) {
        // No seasons exist yet
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Click 'Add Season' to start";
        seasonSelect.appendChild(opt);
        seasonSelect.disabled = true;
        showMessage("No seasons found. Click 'Add Season' to create one.", "info");
        return;
      }

      // Re-enable dropdown if it was disabled
      seasonSelect.disabled = false;

      seasonKeys.forEach(key => {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = `Season ${key}`;
        seasonSelect.appendChild(opt);
      });

      // Restore previous selection if it still exists, otherwise select first
      if (previousValue && seasonKeys.includes(parseInt(previousValue))) {
        seasonSelect.value = previousValue;
      } else if (seasonKeys.length > 0) {
        seasonSelect.value = seasonKeys[0];
      }

      showMessage(`Loaded ${seasonKeys.length} season(s)`, "success");

    } else {
      // Database path doesn't exist at all
      console.log("⚠️ No data at path, creating initial structure...");
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Click 'Add Season' to start";
      seasonSelect.appendChild(opt);
      seasonSelect.disabled = true;
      showMessage("No seasons found. Click 'Add Season' to create one.", "info");
    }
  } catch (error) {
    console.error("❌ Error loading seasons:", error);
    showMessage("Failed to load seasons: " + error.message, "error");
  }
}

async function addSeason() {
  const seasonInput = prompt(
    "Enter season number:\n\n" +
    (currentSeasons.length > 0 
      ? `Existing seasons: ${currentSeasons.join(", ")}\n` 
      : "No existing seasons.\n") +
    "\nEnter any number (e.g., 1, 5, 26, etc.):"
  );

  if (!seasonInput) return;

  const seasonNum = parseInt(seasonInput.trim());
  
  if (isNaN(seasonNum) || seasonNum < 1) {
    showMessage("Please enter a valid positive number", "error");
    return;
  }

  if (currentSeasons.includes(seasonNum)) {
    showMessage(`Season ${seasonNum} already exists!`, "error");
    return;
  }

  try {
    setLoading(addSeasonBtn, true);
    const seasonPath = `${basePath}/${seasonNum}`;
    console.log(`📝 Creating season at: ${seasonPath}`);
    
    const seasonRef = ref(db, seasonPath);
    
    // Create empty structure with both reg and pre weeks
    const emptyStructure = {
      reg: { "1": {} },  // Initialize with week 1
      post: { "1": {} }, // Initialize with week 1
      pre: { "1": {} }   // Initialize with week 1
    };

    console.log("💾 Writing data:", emptyStructure);
    await set(seasonRef, emptyStructure);
    console.log("✅ Season created successfully!");
    
    // Wait a moment for Firebase to sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showMessage(`Season ${seasonNum} created successfully!`, "success");
    
    // Manually add to currentSeasons and update dropdown instead of reloading
    currentSeasons.push(seasonNum);
    currentSeasons.sort((a, b) => a - b);
    
    // Rebuild dropdown
    seasonSelect.innerHTML = "";
    seasonSelect.disabled = false;
    
    currentSeasons.forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `Season ${key}`;
      seasonSelect.appendChild(opt);
    });
    
    // Select the new season
    seasonSelect.value = seasonNum;
    
    // Auto-load the schedule for the new season
    await loadSchedule();
    
  } catch (error) {
    console.error("❌ Error creating season:", error);
    showMessage("Failed to create season: " + error.message, "error");
  } finally {
    setLoading(addSeasonBtn, false);
  }
}

async function deleteSeason() {
  if (!seasonSelect.value) {
    showMessage("Please select a season to delete", "error");
    return;
  }

  const seasonNum = seasonSelect.value;
  const confirmed = confirm(
    `⚠️ WARNING ⚠️\n\n` +
    `Are you sure you want to delete Season ${seasonNum}?\n\n` +
    `This will permanently delete:\n` +
    `• All regular season games\n` +
    `• All preseason games\n` +
    `• All weeks and data\n\n` +
    `This action CANNOT be undone!`
  );

  if (!confirmed) return;

  // Double confirmation for safety
  const doubleCheck = prompt(
    `Type "DELETE ${seasonNum}" to confirm deletion:`
  );

  if (doubleCheck !== `DELETE ${seasonNum}`) {
    showMessage("Deletion cancelled", "info");
    return;
  }

  try {
    setLoading(deleteSeasonBtn, true);
    const seasonRef = ref(db, `${basePath}/${seasonNum}`);
    await remove(seasonRef);
    
    showMessage(`Season ${seasonNum} deleted successfully`, "success");
    
    // Reload seasons
    await loadSeasons();
    
    // Clear the table and check if we need to disable the dropdown
    tableBody.innerHTML = "";
    
    if (currentSeasons.length === 0) {
      seasonSelect.disabled = true;
      renderTable(); // Show empty state
    } else {
      // Load the first available season
      await loadSchedule();
    }
    
  } catch (error) {
    console.error("Error deleting season:", error);
    showMessage("Failed to delete season", "error");
  } finally {
    setLoading(deleteSeasonBtn, false);
  }
}

// ============================================
// WEEK MANAGEMENT
// ============================================

function populateWeeks() {
  weekSelect.innerHTML = "";
  for (let w = 1; w <= 18; w++) {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = `Week ${w}`;
    weekSelect.appendChild(opt);
  }
}

// ============================================
// GAME MANAGEMENT
// ============================================

async function loadSchedule() {
  if (!seasonSelect.value) {
    showMessage("Please select a season first", "error");
    return;
  }

  try {
    setLoading(loadBtn, true);
    const path = `${basePath}/${seasonSelect.value}/${typeSelect.value}/${weekSelect.value}`;
    const snap = await get(ref(db, path));
    games = snap.exists() ? snap.val() : {};
    renderTable();
    
    const gameCount = Object.keys(games).length;
    showMessage(
      gameCount > 0 
        ? `Loaded ${gameCount} game(s) for Week ${weekSelect.value}` 
        : `No games found for Week ${weekSelect.value}`,
      gameCount > 0 ? "success" : "info"
    );
  } catch (error) {
    console.error("Error loading schedule:", error);
    showMessage("Failed to load schedule", "error");
  } finally {
    setLoading(loadBtn, false);
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  
  if (Object.keys(games).length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="9" style="text-align:center; padding: 2rem; color: #999;">
        No games scheduled. Click "Add Game" to create one.
      </td>
    `;
    tableBody.appendChild(row);
    return;
  }

  Object.entries(games).forEach(([id, game]) => {
    const row = createGameRow(id, game);
    tableBody.appendChild(row);
  });
}

function createTeamDropdown(selectedId = "") {
  const select = document.createElement("select");
  select.classList.add("teamSelect");

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Select Team --";
  select.appendChild(defaultOpt);

  TEAM_OPTIONS.forEach(team => {
    const opt = document.createElement("option");
    opt.value = team.id;
    opt.textContent = team.abbr;
    if (String(team.id) === String(selectedId)) opt.selected = true;
    select.appendChild(opt);
  });

  return select;
}

function createLogoCell(teamId) {
  const img = document.createElement("img");
  img.classList.add("teamLogo");
  img.src = teamId !== "" ? `images/logos/${teamId}.png` : "";
  img.alt = teamId !== "" ? `Logo ${teamId}` : "";
  img.style.cssText = "height: 32px; width: 32px; object-fit: contain;";
  return img;
}

function createGameRow(id, game = {}) {
  const row = document.createElement("tr");
  row.dataset.id = id;

  const homeSelect = createTeamDropdown(game.homeTeamId || "");
  const awaySelect = createTeamDropdown(game.awayTeamId || "");
  const homeLogo = createLogoCell(game.homeTeamId || "");
  const awayLogo = createLogoCell(game.awayTeamId || "");

  homeSelect.addEventListener("change", e => {
    homeLogo.src = e.target.value ? `images/logos/${e.target.value}.png` : "";
  });
  awaySelect.addEventListener("change", e => {
    awayLogo.src = e.target.value ? `images/logos/${e.target.value}.png` : "";
  });

  row.innerHTML = `
    <td><input type="number" value="${game.week || weekSelect.value}" class="week" min="1" max="18"></td>
    <td class="teamCell homeCell"></td>
    <td><input type="number" value="${game.homeScore ?? ""}" class="homeScore" min="0"></td>
    <td class="teamCell awayCell"></td>
    <td><input type="number" value="${game.awayScore ?? ""}" class="awayScore" min="0"></td>
    <td><input type="text" value="${game.homeUser || ""}" class="homeUser" placeholder="Home Username"></td>
    <td><input type="text" value="${game.awayUser || ""}" class="awayUser" placeholder="Away Username"></td>
    <td><input type="text" value="${game.notes || ""}" class="notes" placeholder="Optional notes"></td>
    <td><button class="delete-btn" title="Delete this game">🗑️</button></td>
  `;

  const homeCell = row.querySelector(".homeCell");
  const awayCell = row.querySelector(".awayCell");
  homeCell.appendChild(homeLogo);
  homeCell.appendChild(homeSelect);
  awayCell.appendChild(awayLogo);
  awayCell.appendChild(awaySelect);

  row.querySelector(".delete-btn").addEventListener("click", async () => {
    const confirmed = confirm("Delete this game?");
    if (!confirmed) return;

    const id = row.dataset.id;
    try {
      await remove(ref(db, `${basePath}/${seasonSelect.value}/${typeSelect.value}/${weekSelect.value}/${id}`));
      row.remove();
      showMessage("Game deleted", "success");
      
      // If no games left, show empty state
      if (tableBody.children.length === 0) {
        renderTable();
      }
    } catch (error) {
      console.error("Error deleting game:", error);
      showMessage("Failed to delete game", "error");
    }
  });

  return row;
}

function addGame() {
  if (!seasonSelect.value) {
    showMessage("Please select a season first", "error");
    return;
  }

  const id = `manual_${Date.now()}`;
  const newRow = createGameRow(id);
  
  // Remove empty state if present
  if (tableBody.querySelector('td[colspan="9"]')) {
    tableBody.innerHTML = "";
  }
  
  tableBody.appendChild(newRow);
  showMessage("New game added. Don't forget to save!", "info");
}

async function saveAllGames() {
  if (!seasonSelect.value) {
    showMessage("Please select a season first", "error");
    return;
  }

  const rows = document.querySelectorAll("#scheduleTable tbody tr");
  
  // Check if there's only the empty state row
  if (rows.length === 1 && rows[0].querySelector('td[colspan="9"]')) {
    showMessage("No games to save", "info");
    return;
  }

  const updates = {};
  let hasErrors = false;

  rows.forEach(row => {
    const id = row.dataset.id;
    if (!id) return; // Skip empty state row

    const homeSelect = row.querySelector(".homeCell select");
    const awaySelect = row.querySelector(".awayCell select");
    
    // Validation
    if (!homeSelect.value || !awaySelect.value) {
      hasErrors = true;
      row.style.backgroundColor = "#3d1f1f";
      return;
    } else {
      row.style.backgroundColor = "";
    }

    updates[id] = {
      week: parseInt(row.querySelector(".week").value) || 1,
      homeTeamId: homeSelect.value,
      homeScore: parseInt(row.querySelector(".homeScore").value) || 0,
      awayTeamId: awaySelect.value,
      awayScore: parseInt(row.querySelector(".awayScore").value) || 0,
      homeUser: row.querySelector(".homeUser").value,
      awayUser: row.querySelector(".awayUser").value,
      notes: row.querySelector(".notes").value,
      seasonIndex: parseInt(seasonSelect.value)
    };
  });

  if (hasErrors) {
    showMessage("Please select teams for all games (highlighted rows)", "error");
    return;
  }

  try {
    setLoading(saveAllBtn, true);
    const path = `${basePath}/${seasonSelect.value}/${typeSelect.value}/${weekSelect.value}`;
    await set(ref(db, path), updates);
    showMessage(`Schedule saved! ${Object.keys(updates).length} game(s) updated.`, "success");
  } catch (error) {
    console.error("Error saving schedule:", error);
    showMessage("Failed to save schedule", "error");
  } finally {
    setLoading(saveAllBtn, false);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

loadBtn.addEventListener("click", loadSchedule);
addGameBtn.addEventListener("click", addGame);
saveAllBtn.addEventListener("click", saveAllGames);
addSeasonBtn.addEventListener("click", addSeason);
deleteSeasonBtn.addEventListener("click", deleteSeason);

// Auto-load when filters change
seasonSelect.addEventListener("change", loadSchedule);
typeSelect.addEventListener("change", loadSchedule);
weekSelect.addEventListener("change", loadSchedule);

// ============================================
// INITIALIZATION
// ============================================

async function initialize() {
  populateWeeks();
  await loadSeasons();
  
  // Load schedule if a season is selected
  if (seasonSelect.value) {
    await loadSchedule();
  }
}

// ============================================
// AUTH GATE
// ============================================

const auth = getAuth();
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Admins only. Please log in.");
    window.location.href = "admin.html";
  } else {
    await initialize();
  }
});

// Add CSS animations for toast
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
