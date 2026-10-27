// Runs before first paint: restores saved theme/effects and flags that JS is available.
try {
  var d = document.documentElement;
  d.classList.add("js");
  d.dataset.theme = localStorage.getItem("theme") || "mono";
  d.dataset.fx = localStorage.getItem("fx") || "on";
} catch (e) {}
