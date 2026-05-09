// scripts/adminHub.js
// Unified tab/panel switcher + lazy loader for admin tools.

const panels = {
  trade:   document.getElementById("panel-trade"),
  coaches: document.getElementById("panel-coaches"),
  rules:   document.getElementById("panel-rules"),
  data:    document.getElementById("panel-data"),   // ← add this
  "ea-sync": document.getElementById("panel-ea-sync"),
};

// scripts/adminHub.js  (only the loaders map needs changing)
const loaders = {
  trade:   () => import("./adminTradeCalc.js"),
  coaches: () => import("./adminCoaches.js"),
  rules:   () => import("./admin_rules.js"),
  data:    () => import("./admin_data.js").then(m => m.initDataAdmin?.()), // ← add this
  "ea-sync": () => import("./adminEaSync.js"),
};

const loaded = new Set();

function setActive(tabName) {
  // Tabs
  document.querySelectorAll(".tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  // Panels
  Object.entries(panels).forEach(([name, el]) => {
    if (!el) return;
    el.classList.toggle("active", name === tabName);
  });
  // Keep ?tab in the URL
  const url = new URL(location.href);
  url.searchParams.set("tab", tabName);
  history.replaceState({}, "", url);
}

async function showTab(tabName = "trade") {
  if (!panels[tabName]) tabName = "trade";     // guard
  setActive(tabName);
  if (loaders[tabName] && !loaded.has(tabName)) {
    try {
      await loaders[tabName]();
      loaded.add(tabName);
    } catch (e) {
      console.error("Admin module load failed:", tabName, e);
    }
  }
}

// Clicks
document.getElementById("tabs")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  e.preventDefault();
  showTab(btn.dataset.tab);
});

// Initial tab
const initial = new URLSearchParams(location.search).get("tab") || "trade";
showTab(initial);
