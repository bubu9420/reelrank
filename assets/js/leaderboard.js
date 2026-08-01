(function () {
  // Overlays: our hands-on results mapped onto the reference dataset.
  // status: 'tested' = real hands-on test completed, 'draft' = benchmark/documentation review, '' = reference only.
  var OVERLAYS = {
    "veo-3":      { name: "Veo 3.1", status: "draft",  reel: "5.0", review: "reviews/veo-3-review.html",       refNote: "Arena ref: Veo 3" },
    "kling-16":   { name: "Kling 3.0", status: "tested", reel: "4.0", review: "reviews/kling-3-review.html",    refNote: "Arena ref: Kling 1.6" },
    "runway-gen4":{ status: "draft", reel: "4.5", review: "reviews/runway-gen-4-review.html" }
  };

  var EXTRAS = [
    { id:"capcut-director-mode", name:"CapCut Director Mode", vendor:"CapCut", country:"CN", cat:"video",
      score:0, delta:0, votes:0, price:"Free / Pro", spec:"Editor + generator", st:["All-in-one short drama","Editing","Export"],
      url:"https://www.capcut.com/", rel:"2026-01-10", status:"draft", reel:"4.5", review:"reviews/capcut-director-mode-review.html" },
    { id:"hailuo-30", name:"Hailuo 3.0", vendor:"MiniMax", country:"CN", cat:"video",
      score:1388, delta:1, votes:13920, price:"Credit-based", spec:"Max:10s · 1080p", st:["Long takes","Narrative","Chinese"],
      url:"https://hailuoai.video/", rel:"2026-05-12", status:"draft", reel:"", review:"", refNote:"Arena ref: Hailuo 02" },
    { id:"seedance-25", name:"Seedance 2.5", vendor:"ByteDance", country:"CN", cat:"video",
      score:1342, delta:4, votes:18900, price:"Credits", spec:"Max:12s · 1080p", st:["Byte ecosystem","Templates","Long-form"],
      url:"https://dreamina.capcut.com/", rel:"2026-04-20", status:"draft", reel:"", review:"", refNote:"Arena ref: Dreamina" }
  ];

  var STARS = function (s) {
    if (!s) return "";
    var n = parseFloat(s);
    var full = Math.floor(n), half = (n - full) >= 0.5 ? 1 : 0, empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty) + " " + s;
  };

  var CATS = [
    { id: "all", label: "All" },
    { id: "video", label: "Video" },
    { id: "image", label: "Image" },
    { id: "audio", label: "Audio" },
    { id: "text", label: "Text" },
    { id: "code", label: "Code" }
  ];

  function models() {
    var m = (window.RR_MODELS || []).map(function (r) {
      var o = OVERLAYS[r.id] || {};
      return {
        id: r.id, name: o.name || r.name, vendor: r.vendor, country: r.country, cat: r.cat,
        score: r.score, delta: r.delta, votes: r.votes, price: r.price, spec: r.spec,
        st: r.st, url: r.url, rel: r.rel, status: o.status || "", reel: o.reel || "",
        review: o.review || "", refNote: o.refNote || ""
      };
    });
    EXTRAS.forEach(function (e) { m.push(e); });
    return m;
  }

  var state = { cat: "all", q: "", sort: "score" };

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render() {
    var wrap = document.getElementById("lbBody");
    var stats = document.getElementById("lbStats");
    var tabs = document.getElementById("lbTabs");
    if (!wrap) return;

    var all = models();
    var q = state.q.trim().toLowerCase();
    var list = all.filter(function (m) {
      if (state.cat !== "all" && m.cat !== state.cat) return false;
      if (q && (m.name + " " + m.vendor + " " + (m.st || []).join(" ")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (state.sort === "name") return a.name.localeCompare(b.name);
      if (state.sort === "new") return (b.rel || "").localeCompare(a.rel || "");
      return (b.score || 0) - (a.score || 0);
    });

    var tested = all.filter(function (m) { return m.status === "tested"; }).length;
    var draft = all.filter(function (m) { return m.status === "draft"; }).length;
    if (stats) {
      stats.innerHTML =
        '<div class="lb-stat"><b>' + all.length + '</b><span>Models tracked</span></div>' +
        '<div class="lb-stat"><b>' + (tested + draft) + '</b><span>Reviewed by us (' + tested + ' hands-on)</span></div>' +
        '<div class="lb-stat"><b>5</b><span>Categories</span></div>' +
        '<div class="lb-stat"><b>2026-08-01</b><span>Last updated</span></div>';
    }

    if (tabs) {
      tabs.innerHTML = CATS.map(function (c) {
        var n = c.id === "all" ? all.length : all.filter(function (m) { return m.cat === c.id; }).length;
        return '<button class="lb-tab' + (state.cat === c.id ? " active" : "") + '" data-cat="' + c.id + '">' +
          c.label + ' <em>' + n + '</em></button>';
      }).join("");
      tabs.querySelectorAll(".lb-tab").forEach(function (b) {
        b.addEventListener("click", function () { state.cat = b.getAttribute("data-cat"); render(); });
      });
    }

    if (!list.length) {
      wrap.innerHTML = '<tr><td colspan="9" class="lb-empty">No models match your search.</td></tr>';
      return;
    }

    wrap.innerHTML = list.map(function (m, i) {
      var trend = m.delta > 0 ? '<span class="trend-up">▲' + m.delta + '</span>'
        : m.delta < 0 ? '<span class="trend-down">▼' + Math.abs(m.delta) + '</span>'
        : '<span class="trend-flat">—</span>';
      var badge = "";
      var nameHtml = esc(m.name);
      if (m.status === "tested") {
        badge = ' <span class="badge badge-tested">TESTED</span>';
        nameHtml = '<a href="' + m.review + '">' + esc(m.name) + '</a>';
      } else if (m.status === "draft") {
        badge = ' <span class="badge badge-draft">DRAFT</span>';
        if (m.review) nameHtml = '<a href="' + m.review + '">' + esc(m.name) + '</a>';
      } else {
        badge = ' <span class="badge badge-ref">REF</span>';
        if (m.url) nameHtml = '<a href="' + m.url + '" target="_blank" rel="noopener">' + esc(m.name) + '</a>';
      }
      var refNote = m.refNote ? '<br><small>' + esc(m.refNote) + '</small>' : "";
      var reel = m.status === "tested" ? '<span class="rating">' + STARS(m.reel) + '</span>'
        : m.status === "draft" && m.reel ? '<span class="rating">' + STARS(m.reel) + '</span>'
        : '<span class="lb-na">—</span>';
      var arena = m.score ? '<span class="arena">' + m.score + '</span> ' + trend +
        (m.votes ? '<br><small>' + (m.votes / 1000).toFixed(1).replace(/\.0$/, "") + 'k votes</small>' : "") : "—";
      return '<tr class="' + (m.status === "tested" ? "tested-row" : m.status === "draft" ? "draft-row" : "") + '">' +
        '<td class="rank' + (i < 3 ? " rank-top" : "") + '">' + (i + 1) + '</td>' +
        '<td>' + nameHtml + badge + refNote + '</td>' +
        '<td>' + esc(m.vendor) + '</td>' +
        '<td>' + esc(m.country) + '</td>' +
        '<td>' + esc((m.st || []).join(" · ")) + '</td>' +
        '<td>' + esc(m.spec || "—") + '</td>' +
        '<td>' + esc(m.price || "—") + '</td>' +
        '<td>' + arena + '</td>' +
        '<td>' + reel + '</td>' +
        '</tr>';
    }).join("");
  }

  var qInput = document.getElementById("lbSearch");
  var sortSel = document.getElementById("lbSort");
  if (qInput) qInput.addEventListener("input", function () { state.q = qInput.value; render(); });
  if (sortSel) sortSel.addEventListener("change", function () { state.sort = sortSel.value; render(); });
  render();
})();
