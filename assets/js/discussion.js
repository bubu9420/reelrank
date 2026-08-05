/* 工具讨论区：数据与登录由 YingForum / YingAuth 提供（Supabase 后端） */
(function () {
  var Forum = window.YingForum || null;
  var Auth = window.YingAuth || null;
  var toolSel = document.getElementById("postTool");
  var content = document.getElementById("postContent");
  var postBtn = document.getElementById("postBtn");
  var loginCtaBtn = document.getElementById("loginCtaBtn");
  var hint = document.getElementById("loginHint");
  var emptyState = document.getElementById("emptyState");
  var feedBox = document.querySelector(".disc-feed");
  var feedCount = document.getElementById("feedCount");
  var toolFilter = document.getElementById("discToolFilter");

  var CATS = {
    image: ["image-compress.html", "image-convert.html", "image-crop.html", "image-resize.html", "image-rotate.html", "image-watermark.html", "image-nineslice.html", "image-bg.html", "image-idphoto.html", "image-merge.html"],
    video: ["video-compress.html", "video-to-gif.html", "video-convert.html", "video-trim.html", "video-vertical.html", "video-watermark.html", "video-speed.html", "video-extract-audio.html", "video-merge.html", "video-mute.html", "video-snapshot.html"],
    audio: ["audio-convert.html", "audio-trim.html", "audio-merge.html", "audio-volume.html", "audio-speed.html", "audio-ringtone.html", "audio-denoise.html", "audio-compress.html"]
  };
  var state = { cat: "all", tool: "" };

  function isLoggedIn() {
    return !!(Auth && Auth.isLoggedIn && Auth.isLoggedIn());
  }

  function setHint(msg, ok) {
    if (!hint) return;
    hint.textContent = msg;
    hint.classList.toggle("ok", !!ok);
  }

  function refreshGate() {
    var ok = isLoggedIn();
    postBtn.disabled = !ok;
    postBtn.hidden = !ok;
    if (loginCtaBtn) loginCtaBtn.hidden = ok;
    setHint(ok ? "已登录，可以发布" : "登录账号后才能发布", ok);
  }

  if (loginCtaBtn) {
    loginCtaBtn.addEventListener("click", openLogin);
  }

  function openLogin() {
    if (window.YingMember && YingMember.openLogin) YingMember.openLogin();
    else setHint("登录功能即将开放，敬请期待");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function fmtTime(ts) {
    try {
      var d = new Date(ts);
      var now = new Date();
      var diff = (now - d) / 1000;
      if (diff < 60) return "刚刚";
      if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
      if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    } catch (e) { return ""; }
  }

  function toolLabel(tool) {
    var s = toolSel.querySelector('option[value="' + tool + '"]');
    return s ? s.textContent : "其他";
  }

  function renderPosts(posts) {
    if (!feedBox) return;
    var old = feedBox.querySelectorAll(".disc-post");
    old.forEach(function (el) { el.remove(); });
    if (feedCount) feedCount.textContent = posts.length ? "（" + posts.length + " 条）" : "";
    if (!posts || !posts.length) {
      emptyState.textContent = "这里还没有讨论，登录后发第一帖吧。";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";
    posts.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "disc-post";
      card.innerHTML =
        '<div class="disc-post-head">' +
          '<span class="disc-avatar">' + esc((p.author || "用").slice(0, 1)) + "</span>" +
          '<span class="disc-author">' + esc(p.author || "匿名用户") + "</span>" +
          '<span class="disc-tag">' + esc(toolLabel(p.tool)) + "</span>" +
          '<span class="disc-time">' + fmtTime(p.created_at) + "</span>" +
        "</div>" +
        '<div class="disc-post-body">' + esc(p.content) + "</div>" +
        '<div class="disc-post-foot"><button class="disc-reply-btn" data-id="' + p.id + '">回复</button></div>' +
        '<div class="disc-replies" data-id="' + p.id + '"></div>' +
        '<div class="disc-reply-box" data-id="' + p.id + '" hidden>' +
          '<textarea rows="2" maxlength="500" placeholder="写下你的回复…"></textarea>' +
          '<button class="btn btn-ghost">发送回复</button>' +
        "</div>";
      feedBox.appendChild(card);

      var repliesBox = card.querySelector(".disc-replies");
      (p.replies || []).forEach(function (r) {
        var rEl = document.createElement("div");
        rEl.className = "disc-reply";
        rEl.innerHTML =
          '<span class="disc-author">' + esc(r.author || "匿名") + "</span> " +
          '<span class="disc-time">' + fmtTime(r.created_at) + "</span>" +
          '<div>' + esc(r.content) + "</div>";
        repliesBox.appendChild(rEl);
      });

      card.querySelector(".disc-reply-btn").addEventListener("click", function () {
        if (!isLoggedIn()) { openLogin(); return; }
        card.querySelector(".disc-reply-box").hidden = false;
      });
      card.querySelector(".disc-reply-box .btn").addEventListener("click", async function () {
        var ta = card.querySelector(".disc-reply-box textarea");
        var text = ta.value.trim();
        if (text.length < 1) return;
        try {
          if (Forum && Forum.createReply) {
            await Forum.createReply({ postId: p.id, content: text });
            ta.value = "";
            card.querySelector(".disc-reply-box").hidden = true;
            await loadPosts();
          } else {
            setHint("讨论区尚未开放，请稍后再试");
          }
        } catch (e) {
          setHint("回复失败：" + e.message);
        }
      });
    });
  }

  async function loadPosts() {
    if (!Forum || !Forum.listPosts) return;
    try {
      var tools = null;
      if (state.tool) tools = [state.tool];
      else if (state.cat !== "all") tools = CATS[state.cat] || null;
      var posts = await Forum.listPosts({ tools: tools, limit: 100 });
      renderPosts(posts);
    } catch (e) {
      setHint("加载讨论失败：" + e.message);
    }
  }

  /* 分类与工具筛选 */
  document.querySelectorAll(".disc-cat").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".disc-cat").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      state.cat = btn.getAttribute("data-cat");
      state.tool = "";
      toolFilter.value = "";
      loadPosts();
    });
  });
  toolFilter.addEventListener("change", function () {
    state.tool = toolFilter.value;
    if (state.tool) {
      state.cat = "all";
      document.querySelectorAll(".disc-cat").forEach(function (b) { b.classList.remove("active"); });
      document.querySelector('.disc-cat[data-cat="all"]').classList.add("active");
    }
    loadPosts();
  });

  /* 支持 ?tool=xxx 直达某个工具的讨论 */
  (function () {
    var m = /[?&]tool=([^&]+)/.exec(location.search);
    if (m) {
      var t = decodeURIComponent(m[1]);
      if (toolFilter.querySelector('option[value="' + t + '"]')) {
        state.tool = t;
        toolFilter.value = t;
      }
    }
  })();

  postBtn.addEventListener("click", async function () {
    if (!isLoggedIn()) { openLogin(); return; }
    var tool = toolSel.value;
    var text = content.value.trim();
    if (!tool) { setHint("请先选择你使用的工具"); toolSel.focus(); return; }
    if (text.length < 10) { setHint("内容至少 10 个字"); content.focus(); return; }
    setHint("发布中…");
    try {
      if (Forum && Forum.createPost) {
        await Forum.createPost({ tool: tool, content: text });
        content.value = "";
        setHint("发布成功", true);
        await loadPosts();
      } else {
        setHint("讨论区尚未开放，请稍后再试");
      }
    } catch (e) {
      setHint("发布失败：" + e.message);
    }
  });

  if (Auth && Auth.onAuthChange) Auth.onAuthChange(refreshGate);
  refreshGate();
  loadPosts();
})();
