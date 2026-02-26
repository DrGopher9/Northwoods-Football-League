// scripts/rulesPage.js
import { RULES } from "./rulesData.js";

// Utilities
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const container = $("#rulesContainer");
const toc = document.getElementById("rulesToc");
const searchInput = $("#rulesSearch");

// Render
function render() {
  // TOC
  toc.innerHTML = "";
  RULES.forEach(sec => {
    const secId = sec.id;
    const secLink = document.createElement("a");
    secLink.href = `#${secId}`;
    secLink.textContent = sec.title;
    toc.appendChild(secLink);

    sec.items.forEach(it => {
      const link = document.createElement("a");
      link.className = "sub";
      const id = `${secId}-${it.id || slug(it.heading)}`;
      link.href = `#${id}`;
      link.textContent = it.heading;
      toc.appendChild(link);
    });
  });

  // Sections
  container.innerHTML = RULES.map(sec => {
    const secHeader = `
      <h2 id="${sec.id}">${sec.title}
        <a class="anchor" href="#${sec.id}" title="Copy link">#</a>
      </h2>
    `;
    const items = sec.items.map(it => {
      const id = `${sec.id}-${it.id || slug(it.heading)}`;
      return `
        <details class="rule" id="${id}">
          <summary>
            <span>${it.heading}</span>
            <a class="anchor" href="#${id}" title="Copy link">#</a>
          </summary>
          <div class="rule-body">${it.html}</div>
        </details>
      `;
    }).join("");
    return secHeader + items;
  }).join("");
}

// Search: highlight matches, open matched details, hide unmatched
function applySearch(q) {
  const query = q.trim().toLowerCase();
  const rules = $$(".rule", container);
  // reset
  rules.forEach(d => {
    d.hidden = false;
    d.open = false;
    $$(".rule-body mark", d).forEach(m => m.replaceWith(...m.childNodes));
  });
  if (!query) return;

  rules.forEach(d => {
    const text = d.textContent.toLowerCase();
    const match = text.includes(query);
    d.hidden = !match;
    if (match) {
      d.open = true;
      // highlight in body text only
      const body = $(".rule-body", d);
      if (body) body.innerHTML = body.innerHTML.replace(
        new RegExp(`(${query.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})`, "gi"),
        "<mark>$1</mark>"
      );
    }
  });

  // Also auto-open containing section heading if any were shown
  const anyMatch = rules.some(r => !r.hidden);
  if (anyMatch) {
    // nothing else needed; details are already opened above
  }
}

// Deep-link: open and scroll to exact rule
function openFromHash() {
  const h = decodeURIComponent(location.hash.replace("#", ""));
  if (!h) return;
  const node = document.getElementById(h);
  if (node) {
    if (node.tagName.toLowerCase() === "details") node.open = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

render();
openFromHash();
window.addEventListener("hashchange", openFromHash);
searchInput?.addEventListener("input", (e) => applySearch(e.target.value));
