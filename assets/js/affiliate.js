(function () {
  // Affiliate config: after you register each program, set enabled:true and
  // put your tracking value in `param` (e.g. "aff=12345", "via=yourname",
  // "tap_a=xxxx&tap_s=yyyy", or a full custom tracking URL).
  // Links marked with data-aff="..." are rewritten automatically.
  var AFFILIATES = {
    runway:   { enabled: false, url: "https://runwayml.com/pricing",            param: "" },
    capcut:   { enabled: false, url: "https://www.capcut.com/pricing",          param: "" },
    kling:    { enabled: false, url: "https://klingai.com/",                    param: "" },
    veo:      { enabled: false, url: "https://ai.google.dev/pricing",           param: "" },
    sora:     { enabled: false, url: "https://openai.com/sora/",                param: "" },
    hailuo:   { enabled: false, url: "https://hailuoai.video/",                 param: "" },
    seedance: { enabled: false, url: "https://dreamina.capcut.com/",            param: "" },
    synthesia:{ enabled: false, url: "https://www.synthesia.io/",               param: "" },
    heygen:   { enabled: false, url: "https://www.heygen.com/",                 param: "" }
  };

  function rewrite(a) {
    var id = a.getAttribute("data-aff");
    var cfg = AFFILIATES[id];
    if (!cfg || !cfg.enabled) return;
    if (cfg.param) {
      var sep = cfg.url.indexOf("?") > -1 ? "&" : "?";
      a.href = cfg.url + sep + cfg.param;
    } else {
      a.href = cfg.url;
    }
  }

  document.querySelectorAll("a[data-aff]").forEach(rewrite);

  // Leaderboard rows are rendered by leaderboard.js after this script runs,
  // so re-apply to any new links added to the DOM.
  var mo = new MutationObserver(function () {
    document.querySelectorAll("a[data-aff]:not([data-aff-done])").forEach(function (a) {
      a.setAttribute("data-aff-done", "1");
      rewrite(a);
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
