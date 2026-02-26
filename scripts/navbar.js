import { db } from "./firebaseConfig.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Toggle nav menu
document.getElementById("menu-toggle")?.addEventListener("change", () => {
  document.querySelector(".navbar-links")?.classList.toggle("open");
});

// Highlight active link
document.querySelectorAll(".navbar a").forEach(link => {
  if (window.location.pathname.endsWith(link.getAttribute("href"))) {
    link.classList.add("active");
  }
});

// ✅ Load and group teams by division
async function populateTeamDropdown() {
  const teamDropdown = document.getElementById("teamDropdown");
  if (!teamDropdown) return;

  const teamsRef = ref(db, "data/xbsx/20390713/teams");
  const snapshot = await get(teamsRef);
  if (!snapshot.exists()) return;

  const data = snapshot.val();
  const divisions = {};

  Object.entries(data).forEach(([teamId, teamData]) => {
    const meta = teamData.meta;
    if (!meta || !meta.divName || !meta.displayName || meta.logoId === undefined) return;

    if (!divisions[meta.divName]) divisions[meta.divName] = [];
    divisions[meta.divName].push({
      name: meta.displayName,
      logoId: meta.logoId,
      id: meta.teamId
    });
  });

  // Sort division names
  const afcOrder = ["AFC East", "AFC North", "AFC South", "AFC West"];
const nfcOrder = ["NFC East", "NFC North", "NFC South", "NFC West"];

const renderRow = (divisionList) => {
  const row = document.createElement("div");
  row.classList.add("dropdown-row");

  divisionList.forEach(divName => {
    const section = document.createElement("div");
    section.classList.add("division-column");
    section.innerHTML = `<h4>${divName}</h4>`;

    (divisions[divName] || []).sort((a, b) => a.name.localeCompare(b.name)).forEach(team => {
      const a = document.createElement("a");
      a.href = `teams.html?teamId=${team.id}`;
      a.innerHTML = `<img class="team-icon" src="images/logos/${team.logoId}.png" alt="${team.name}"> ${team.name}`;
      section.appendChild(a);
    });

    row.appendChild(section);
  });

  teamDropdown.appendChild(row);
};

renderRow(afcOrder);
renderRow(nfcOrder);

}

populateTeamDropdown();
