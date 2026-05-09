document.querySelectorAll("nav a").forEach(link => {
  if (window.location.pathname.endsWith(link.getAttribute("href"))) {
    link.classList.add("active");
  }
});
