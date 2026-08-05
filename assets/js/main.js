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

/* ============ 影剪辑会员体系（MVP：每日免费次数 + 激活码解锁 VIP） ============ */
(function () {
  var FREE_DAILY = 3;
  var SECRET = "yingclip-vip-s2f9a7c4";
  var LS_VIP = "yingclip_vip";
  var LS_QUOTA = "yingclip_quota";
  var CONTACT = "yibulayinjiang@gmail.com";
  var PLANS = {
    M: { key: "M", name: "月卡", days: 30, price: "¥9.9", unit: "/月", note: "30 天无限使用 VIP 功能", hot: false },
    Y: { key: "Y", name: "年卡", days: 365, price: "¥69", unit: "/年", note: "365 天无限使用，比月卡省 ¥49.8", hot: true },
    L: { key: "L", name: "终身", days: 36500, price: "¥199", unit: "买断", note: "一次付费，永久无限使用", hot: false }
  };
  /* VIP 功能清单：免费用户每日限次使用，会员无限用。可按需增删（文件名）。 */
  var VIP_TOOLS = [
    "image-bg.html",
    "video-compress.html", "video-to-gif.html", "video-convert.html", "video-trim.html",
    "video-vertical.html", "video-watermark.html", "video-speed.html", "video-extract-audio.html",
    "video-merge.html", "video-mute.html", "video-snapshot.html",
    "audio-denoise.html"
  ];

  function currentToolPage() {
    var p = (location.pathname || "").split("/").pop().split("?")[0];
    return p || "";
  }
  function isVipTool() {
    return VIP_TOOLS.indexOf(currentToolPage()) > -1;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function readJSON(key) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString("zh-CN"); } catch (e) { return ""; }
  }

  function auth() { return window.YingAuth || null; }
  function isLoggedIn() {
    var a = auth();
    return !!(a && a.isLoggedIn && a.isLoggedIn());
  }
  function bonusToday() {
    var a = auth();
    return !!(a && a.bonusClaimedToday && a.bonusClaimedToday());
  }
  function dailyLimit() {
    var a = auth();
    var bonus = bonusToday() ? ((a && a.LOGIN_BONUS) || 5) : 0;
    return FREE_DAILY + bonus;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function getVip() {
    var v = readJSON(LS_VIP);
    if (v && v.expiresAt && Date.now() < v.expiresAt) return v;
    var a = auth();
    if (a && a.serverVipActive && a.serverVipActive()) {
      var p = a.profile();
      var code = a.serverVipPlan() || "";
      var planName = code === "M" ? "月卡" : code === "Y" ? "年卡" : code === "L" ? "终身" : "VIP";
      return { plan: planName, expiresAt: p ? p.vip_expires_at : null, fromServer: true };
    }
    return null;
  }
  function getQuota() {
    var q = readJSON(LS_QUOTA);
    if (q && q.date === todayStr() && typeof q.used === "number") return q;
    return { date: todayStr(), used: 0 };
  }
  function isVip() { return !!getVip(); }
  function remaining() {
    if (isVip()) return Infinity;
    return Math.max(0, dailyLimit() - getQuota().used);
  }
  function consume() {
    if (isVip()) return true;
    var q = getQuota();
    q.used += 1;
    writeJSON(LS_QUOTA, q);
    return q.used <= dailyLimit();
  }

  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) {
      return Promise.reject(new Error("no-crypto"));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      var bytes = new Uint8Array(buf), out = "";
      for (var i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
      return out;
    });
  }

  function validateCode(code) {
    var m = /^YC-([MLY])-([A-Z0-9]{6})-([A-Z0-9]{8})$/i.exec(String(code || "").trim().toUpperCase());
    if (!m) return Promise.resolve({ ok: false, msg: "激活码格式不正确（示例：YC-Y-AB12CD-34EF5678）" });
    var planKey = m[1], payload = m[2], checksum = m[3];
    return sha256Hex(SECRET + planKey + payload).then(function (hex) {
      if (hex.slice(0, 8).toUpperCase() !== checksum) return { ok: false, msg: "激活码无效，请核对后重试" };
      return { ok: true, planKey: planKey, plan: PLANS[planKey] };
    }).catch(function () {
      return { ok: false, msg: "当前浏览器不支持激活，请使用最新版 Chrome / Edge" };
    });
  }

  function activate(code) {
    var a = auth();
    if (a && a.configured) {
      return a.activateCode(code).then(function (r) {
        if (!r.ok) return { ok: false, msg: r.msg || "激活失败，请稍后重试" };
        var planName = r.plan === "M" ? "月卡" : r.plan === "Y" ? "年卡" : "终身";
        return { ok: true, vip: { plan: planName, expiresAt: r.expires_at, fromServer: true } };
      });
    }
    return validateCode(code).then(function (r) {
      if (!r.ok) return r;
      var now = Date.now();
      var vip = {
        plan: r.plan.name,
        planKey: r.planKey,
        activatedAt: now,
        expiresAt: now + r.plan.days * 86400000
      };
      writeJSON(LS_VIP, vip);
      return { ok: true, vip: vip };
    });
  }

  /* ---- 动态 UI：头部徽标 + 弹窗 + toast + 导航/页脚会员入口 ---- */
  var prefix = "";
  (function () {
    var s = document.currentScript && document.currentScript.src;
    if (s) { var i = s.indexOf("assets/js/main.js"); if (i > -1) prefix = s.slice(0, i); }
  })();
  var MEMBER_URL = prefix + "member.html";
  var badge = null, modal = null, toast = null, toastTimer = null;

  function ensureUI() {
    if (modal) return;
    var body = document.body;
    if (!body) return;

    var header = document.querySelector(".header-inner");
    if (header) {
      badge = document.createElement("button");
      badge.type = "button";
      badge.className = "member-badge";
      badge.id = "memberBadge";
      badge.title = "影剪辑会员";
      badge.addEventListener("click", function () { openModal(); });
      var tt = header.querySelector(".theme-toggle");
      header.insertBefore(badge, tt || null);

      var nav = document.getElementById("nav");
      if (nav) {
        var link = document.createElement("a");
        link.href = MEMBER_URL;
        link.className = "member-nav-link";
        link.textContent = "会员";
        var cta = nav.querySelector(".nav-cta");
        nav.insertBefore(link, cta || null);
      }

      var hs = document.querySelectorAll(".site-footer h4");
      for (var i = 0; i < hs.length; i++) {
        if ((hs[i].textContent || "").trim() === "关于") {
          var ul = hs[i].nextElementSibling;
          if (ul && ul.tagName === "UL") {
            var li = document.createElement("li");
            var fa = document.createElement("a");
            fa.href = MEMBER_URL;
            fa.textContent = "会员中心";
            li.appendChild(fa);
            ul.appendChild(li);
          }
        }
      }
    }

    modal = document.createElement("div");
    modal.className = "member-modal";
    modal.innerHTML =
      '<div class="member-overlay" data-close></div>' +
      '<div class="member-panel" role="dialog" aria-modal="true" aria-label="影剪辑会员">' +
        '<button class="member-close" data-close aria-label="关闭">×</button>' +
        '<div class="member-title">👑 影剪辑会员</div>' +
        '<div class="member-status" id="memberStatus"></div>' +
        '<div class="member-auth" id="memberAuthRow"></div>' +
        '<div class="member-quota"><div class="member-quota-bar"><div class="member-quota-fill" id="memberQuotaFill"></div></div><div class="member-quota-text" id="memberQuotaText"></div></div>' +
        '<div class="member-plans" id="memberPlans"></div>' +
        '<div class="member-buy">' +
          '<div class="member-buy-title">如何开通（人工开通，激活码与账号绑定）</div>' +
          '<ol>' +
            '<li>注册 / 登录影剪辑账号</li>' +
            '<li>选择套餐，用微信 / 支付宝转账付款，备注你的邮箱</li>' +
            '<li>把付款凭证和邮箱发送到 <a href="mailto:' + CONTACT + '">' + CONTACT + '</a></li>' +
            '<li>收到激活码后，登录网站在下方输入即可解锁（一个激活码只能绑定一个账号）</li>' +
          '</ol>' +
        '</div>' +
        '<div class="member-code">' +
          '<input id="memberCodeInput" placeholder="粘贴激活码，如 YC-Y-AB12CD-34EF5678" autocomplete="off" spellcheck="false">' +
          '<button id="memberActivateBtn" class="btn">激活</button>' +
        '</div>' +
        '<div class="member-login-cta" id="memberLoginCta" hidden><button class="btn" id="memberLoginBtn">登录领取 +5 次免费额度</button></div>' +
        '<div class="member-msg" id="memberCodeMsg"></div>' +
        '<details class="member-faq"><summary>会员有哪些权益？</summary><p>基础功能永久免费；VIP 功能（AI 抠图、全部视频处理、音频降噪等）免费用户每天可免费使用 ' + FREE_DAILY + ' 次，开通会员后无限使用并优先体验新工具。文件处理始终在你的设备本地完成，不会上传。</p></details>' +
      '</div>';
    body.appendChild(modal);

    renderPlans(modal.querySelector("#memberPlans"));

    modal.addEventListener("click", function (e) {
      var el = e.target;
      if (el && el.getAttribute && el.getAttribute("data-close") !== null) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("show")) closeModal();
    });

    var codeInput = modal.querySelector("#memberCodeInput");
    var activateBtn = modal.querySelector("#memberActivateBtn");
    var codeMsg = modal.querySelector("#memberCodeMsg");
    function doActivate() {
      if (!isLoggedIn()) {
        codeMsg.textContent = "请先登录账号，再激活会员（激活码与账号绑定）";
        codeMsg.className = "member-msg err";
        openLogin();
        return;
      }
      var code = codeInput.value.trim();
      if (!code) { codeMsg.textContent = "请先输入激活码"; codeMsg.className = "member-msg err"; return; }
      activateBtn.disabled = true;
      codeMsg.textContent = "正在验证…";
      codeMsg.className = "member-msg";
      activate(code).then(function (r) {
        activateBtn.disabled = false;
        if (r.ok) {
          codeMsg.textContent = "✅ 激活成功！已解锁 " + r.vip.plan + "，" + fmtDate(r.vip.expiresAt) + " 到期";
          codeMsg.className = "member-msg ok";
          codeInput.value = "";
          refreshBadge();
          refreshModal();
          showToast("👑 会员激活成功，已解锁无限下载");
        } else {
          codeMsg.textContent = "❌ " + r.msg;
          codeMsg.className = "member-msg err";
        }
      });
    }
    activateBtn.addEventListener("click", doActivate);
    codeInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doActivate(); });
    modal.querySelector("#memberLoginBtn").addEventListener("click", function () {
      closeModal();
      openLogin();
    });

    toast = document.createElement("div");
    toast.className = "member-toast";
    body.appendChild(toast);

    refreshBadge();
    injectToolTags();
  }

  /* 首页/分类页卡片与工具页标题上的「基础免费 / VIP 功能」标记 */
  function injectToolTags() {
    var cards = document.querySelectorAll("a.tool-card");
    for (var i = 0; i < cards.length; i++) {
      var href = cards[i].getAttribute("href") || "";
      var base = href.split("/").pop().split("?")[0];
      if (VIP_TOOLS.indexOf(base) > -1) {
        var b = document.createElement("span");
        b.className = "card-tag";
        b.textContent = "VIP";
        cards[i].appendChild(b);
      }
    }
    var h1 = document.querySelector(".tool-page h1");
    if (h1 && document.querySelector(".dropzone")) {
      var tag = document.createElement("span");
      tag.className = "tool-tag" + (isVipTool() ? " vip" : " free");
      tag.textContent = isVipTool() ? "VIP 功能 · 每日免费 " + FREE_DAILY + " 次" : "基础功能 · 永久免费";
      h1.appendChild(tag);
    }
  }

  function renderPlans(container) {
    if (!container) return;
    container.innerHTML = "";
    Object.keys(PLANS).forEach(function (k) {
      var p = PLANS[k];
      var card = document.createElement("div");
      card.className = "plan-card" + (p.hot ? " hot" : "");
      card.dataset.plan = k;
      card.innerHTML =
        (p.hot ? '<span class="plan-tag">最划算</span>' : "") +
        '<div class="plan-name">' + p.name + '</div>' +
        '<div class="plan-price">' + p.price + '<span class="plan-unit">' + p.unit + '</span></div>' +
        '<div class="plan-note">' + p.note + '</div>';
      card.addEventListener("click", function () {
        var subject = encodeURIComponent("购买影剪辑" + p.name + " " + p.price + p.unit);
        var body = encodeURIComponent(
          "你好，我想购买影剪辑" + p.name + "（" + p.price + p.unit + "）。\n\n" +
          "付款方式：\n付款备注：\n我的邮箱：\n\n付款后请发送激活码，谢谢！"
        );
        window.location.href = "mailto:" + CONTACT + "?subject=" + subject + "&body=" + body;
      });
      container.appendChild(card);
    });
  }

  function refreshBadge() {
    if (!badge) return;
    var v = getVip();
    if (v) {
      badge.textContent = "👑 VIP";
      badge.classList.add("is-vip");
      badge.classList.remove("is-out");
    } else if (isVipTool()) {
      var r = remaining();
      badge.textContent = "免费 " + r + " 次";
      badge.classList.remove("is-vip");
      badge.classList.toggle("is-out", r <= 0);
    } else {
      badge.textContent = "基础免费";
      badge.classList.remove("is-vip", "is-out");
    }
  }

  function refreshModal() {
    if (!modal) return;
    var status = modal.querySelector("#memberStatus");
    var fill = modal.querySelector("#memberQuotaFill");
    var text = modal.querySelector("#memberQuotaText");
    var authRow = modal.querySelector("#memberAuthRow");
    var loginCta = modal.querySelector("#memberLoginCta");
    var codeBox = modal.querySelector(".member-code");
    var limit = dailyLimit();
    var v = getVip();

    if (authRow) {
      if (isLoggedIn()) {
        var u = auth().user();
        authRow.innerHTML =
          '<span class="member-auth-ok">✅ 已登录：' + esc(u.email) + "</span>" +
          '<button class="member-logout" id="memberLogoutBtn">退出登录</button>';
        modal.querySelector("#memberLogoutBtn").onclick = function () { auth().logout(); };
      } else {
        authRow.innerHTML =
          "<span>未登录</span>" +
          '<button class="member-login-link" id="memberLoginLinkBtn">登录 / 注册（领 +5 次）</button>';
        modal.querySelector("#memberLoginLinkBtn").onclick = function () { closeModal(); openLogin(); };
      }
    }
    if (loginCta) {
      loginCta.hidden = !(!v && remaining() <= 0 && !isLoggedIn());
    }
    if (codeBox) {
      codeBox.style.display = isLoggedIn() ? "" : "none";
    }

    if (v) {
      status.textContent = "VIP · " + v.plan + " · " + fmtDate(v.expiresAt) + " 到期";
      fill.style.width = "100%";
      text.textContent = "👑 会员有效期内无限使用全部 VIP 功能";
    } else {
      if (isVipTool()) {
        var r = remaining();
        status.textContent = "当前状态：免费用户";
        fill.style.width = Math.min(100, r / limit * 100) + "%";
        text.textContent = "VIP 功能每日免费 " + r + " / " + limit + " 次" + (r <= 0 ? "（今日已用完）" : "");
      } else {
        status.textContent = "当前状态：免费用户";
        fill.style.width = "100%";
        text.textContent = "基础功能永久免费 · VIP 功能每日免费 " + limit + " 次";
      }
    }
  }

  function openLogin() {
    var a = auth();
    if (a && a.openLogin) a.openLogin();
    else if (modal) { refreshModal(); modal.classList.add("show"); }
  }

  function openModal() {
    ensureUI();
    refreshModal();
    modal.classList.add("show");
    var input = modal.querySelector("#memberCodeInput");
    if (input) setTimeout(function () { input.focus(); }, 80);
  }
  function closeModal() {
    if (modal) modal.classList.remove("show");
  }

  function showToast(msg) {
    ensureUI();
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2800);
  }

  /* 拦截处理按钮：VIP 功能次数为 0 时先弹窗，避免浪费处理时间 */
  document.addEventListener("click", function (e) {
    var el = e.target;
    var btn = el && el.closest ? el.closest("#runBtn") : null;
    if (btn && isVipTool() && !isVip() && remaining() <= 0) {
      e.stopImmediatePropagation();
      openModal();
      showToast("今日 VIP 功能免费次数已用完，登录可再领 5 次，或开通会员无限使用");
    }
  }, true);

  function guardDownload() {
    if (!isVipTool()) return true; /* 基础功能完全免费 */
    if (isVip()) return true;
    if (remaining() <= 0) {
      openModal();
      showToast("今日 VIP 功能免费次数已用完，登录可再领 5 次，或开通会员无限使用");
      return false;
    }
    consume();
    var r = remaining();
    refreshBadge();
    showToast("已使用 1 次 VIP 功能免费额度 · 今日剩余 " + r + " 次");
    return true;
  }

  function boot() {
    ensureUI();
    if (!modal) { document.addEventListener("DOMContentLoaded", ensureUI); }
  }
  boot();

  window.YingMember = {
    FREE_DAILY: FREE_DAILY,
    LOGIN_BONUS: (auth() && auth().LOGIN_BONUS) || 5,
    PLANS: PLANS,
    VIP_TOOLS: VIP_TOOLS,
    MEMBER_URL: MEMBER_URL,
    isVip: isVip,
    isLoggedIn: isLoggedIn,
    isVipTool: isVipTool,
    remaining: remaining,
    dailyLimit: dailyLimit,
    validateCode: validateCode,
    activate: activate,
    renderPlans: renderPlans,
    refreshBadge: refreshBadge,
    onAuthRefresh: function () {
      refreshBadge();
      refreshModal();
      var tag = document.querySelector(".tool-page h1 .tool-tag.vip");
      if (tag && tag.textContent.indexOf("每日免费") > -1) {
        tag.textContent = "VIP 功能 · 每日免费 " + dailyLimit() + " 次";
      }
    },
    guardRun: function () {
      if (!isVipTool()) return true;
      if (isVip()) return true;
      if (remaining() <= 0) { openModal(); return false; }
      return true;
    },
    guardDownload: guardDownload,
    openModal: openModal,
    openLogin: openLogin,
    showToast: showToast
  };
})();
