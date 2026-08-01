(function () {
  var SUPPORTED = ["en"];
  var LANG_NAMES = {
    en: "English"
  };

  // derive asset prefix from this script's src (works from root and subfolders)
  var script = document.querySelector('script[src*="i18n.js"]');
  var prefix = "";
  if (script) {
    prefix = script.getAttribute("src").replace("assets/js/i18n.js", "");
  }

  function currentLang() {
    try {
      var s = localStorage.getItem("reelrank-lang");
      if (s && SUPPORTED.indexOf(s) > -1) return s;
    } catch (e) {}
  var nav = (navigator.language || "en").toLowerCase();
  var code = nav.slice(0, 2);
  return SUPPORTED.indexOf(code) > -1 ? code : "en";
  }

  function applyDict(dict) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var parts = el.getAttribute("data-i18n-attr").split(":");
      var key = parts[0];
      var attr = parts[1] || "placeholder";
      if (dict[key]) el.setAttribute(attr, dict[key]);
    });
  }

  function buildSelect(lang) {
    var sel = document.getElementById("langSelect");
    if (!sel) return;
    SUPPORTED.forEach(function (l) {
      var opt = document.createElement("option");
      opt.value = l;
      opt.textContent = LANG_NAMES[l];
      if (l === lang) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", function () {
      try { localStorage.setItem("reelrank-lang", sel.value); } catch (e) {}
      location.reload();
    });
  }

  var lang = currentLang();
  document.documentElement.setAttribute("lang", lang);
  buildSelect(lang);

  fetch(prefix + "assets/i18n/" + lang + ".json")
    .then(function (r) { return r.json(); })
    .then(applyDict)
    .catch(function () {});
})();
