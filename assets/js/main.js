(function () {
  // Theme toggle
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function syncToggle() {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    var dark = currentTheme() === "dark";
    btn.textContent = dark ? "☀" : "☾";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
  }

  var toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("reelrank-theme", next); } catch (e) {}
      syncToggle();
    });
  }
  syncToggle();

  // Mobile navigation
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Feedback form -> mailto fallback
  var fbForm = document.getElementById("feedbackForm");
  if (fbForm) {
    fbForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var category = document.getElementById("fbCategory").value;
      var message = document.getElementById("fbMessage").value.trim();
      var email = document.getElementById("fbEmail").value.trim();
      if (!message) return;
      var subject = encodeURIComponent("[ReelRank] Feedback: " + category);
      var body = encodeURIComponent(
        "Category: " + category + "\n\n" +
        message +
        (email ? "\n\nReply-to: " + email : "") +
        "\n\n(sent from reelrank.com feedback page)"
      );
      var mailto = "mailto:yibulayinjiang@gmail.com?subject=" + subject + "&body=" + body;
      var success = document.getElementById("fbSuccess");
      if (success) success.classList.add("show");
      window.location.href = mailto;
    });
  }

  // Footer year
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
