/* 影剪辑账号系统（Supabase 后端）
   配置：创建 Supabase 项目后，把 URL 和 anon key 填入下方两个常量。 */
(function () {
  var SUPABASE_URL = "https://pjqzxespdzrofrwwwsdl.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcXp4ZXNwZHpyb2Zyd3d3c2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTgwMzUsImV4cCI6MjEwMTQ5NDAzNX0.M2gwb9Nikka7Jpr9v8JKbdl6_8YE_hitBGKjYF4EYQg";

  var LOGIN_BONUS = 5;
  var configured = SUPABASE_URL.indexOf("YOUR-") === -1 && SUPABASE_ANON_KEY.indexOf("YOUR-") === -1;

  var sb = null;
  var cachedUser = null;   // { id, email }
  var cachedProfile = null; // { nickname, vip_plan, vip_expires_at, last_bonus_date }
  var listeners = [];

  function storageKey() {
    try {
      var host = SUPABASE_URL.replace(/^https?:\/\//, "").split("/")[0];
      var ref = host.split(".")[0];
      return "sb-" + ref + "-auth-token";
    } catch (e) { return "sb-auth-token"; }
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function setUser(u) {
    cachedUser = u ? { id: u.id, email: u.email } : null;
    if (!cachedUser) cachedProfile = null;
    listeners.forEach(function (fn) { try { fn(cachedUser); } catch (e) {} });
    document.dispatchEvent(new CustomEvent("yingclip:auth", { detail: { user: cachedUser } }));
    if (window.YingMember && YingMember.onAuthRefresh) YingMember.onAuthRefresh();
  }

  function init() {
    if (!configured || !window.supabase) return;
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    try {
      var raw = localStorage.getItem(storageKey());
      if (raw) {
        var t = JSON.parse(raw);
        if (t && t.user) cachedUser = { id: t.user.id, email: t.user.email };
      }
    } catch (e) {}
    sb.auth.getSession().then(function (r) {
      if (r.error) return;
      setUser(r.data && r.data.session ? r.data.session.user : null);
      if (cachedUser) syncProfile();
    }).catch(function () {});
    sb.auth.onAuthStateChange(function (ev, session) {
      setUser(session ? session.user : null);
      if (ev === "SIGNED_IN" || ev === "TOKEN_REFRESHED") {
        syncProfile().then(function () {
          claimBonus();
        });
      }
    });
  }

  function isLoggedIn() { return !!cachedUser; }
  function user() { return cachedUser; }
  function profile() { return cachedProfile; }
  function bonusClaimedToday() {
    if (cachedProfile && cachedProfile.last_bonus_date) return cachedProfile.last_bonus_date === todayStr();
    try { return localStorage.getItem("yingclip_bonus_date") === todayStr(); } catch (e) { return false; }
  }
  function serverVipActive() {
    if (!cachedProfile || !cachedProfile.vip_expires_at) return false;
    return Date.parse(cachedProfile.vip_expires_at) > Date.now();
  }
  function serverVipPlan() {
    return cachedProfile ? cachedProfile.vip_plan : null;
  }

  function onAuthChange(fn) {
    listeners.push(fn);
    if (cachedUser) setTimeout(function () { fn(cachedUser); }, 0);
  }

  function api(fnName, args) {
    if (!sb) return Promise.resolve({ ok: false, msg: "账号系统未配置" });
    return sb.rpc(fnName, args || {}).then(function (r) {
      if (r.error) return { ok: false, msg: r.error.message };
      return r.data || { ok: false, msg: "无返回" };
    });
  }

  async function syncProfile() {
    if (!sb || !cachedUser) return;
    try {
      var r = await sb.rpc("my_profile");
      if (!r.error && r.data) {
        cachedProfile = r.data;
        try {
          if (r.data.last_bonus_date) localStorage.setItem("yingclip_bonus_date", r.data.last_bonus_date);
        } catch (e) {}
        document.dispatchEvent(new CustomEvent("yingclip:auth"));
        if (window.YingMember && YingMember.onAuthRefresh) YingMember.onAuthRefresh();
      } else if (r.error && r.error.code === "PGRST116") {
        // 还没有 profile：登录时创建
        await sb.from("profiles").upsert({
          id: cachedUser.id,
          email: cachedUser.email,
          nickname: ""
        });
        await syncProfile();
      }
    } catch (e) {}
  }

  async function login(email, password) {
    if (!sb) return { error: { message: "账号系统未配置" } };
    return sb.auth.signInWithPassword({ email: email.trim(), password: password });
  }

  async function register(email, password, nickname) {
    if (!sb) return { error: { message: "账号系统未配置" } };
    var r = await sb.auth.signUp({ email: email.trim(), password: password });
    if (r.error) return r;
    if (r.data && r.data.session && r.data.session.user) {
      await sb.from("profiles").upsert({
        id: r.data.session.user.id,
        email: r.data.session.user.email,
        nickname: (nickname || "").trim()
      });
      await syncProfile();
    }
    return r;
  }

  async function logout() {
    if (!sb) return;
    await sb.auth.signOut();
    cachedUser = null; cachedProfile = null;
    setUser(null);
  }

  function claimBonus() {
    return api("claim_bonus").then(function (r) {
      if (r.ok) {
        try { localStorage.setItem("yingclip_bonus_date", r.date); } catch (e) {}
        syncProfile();
      }
      return r;
    });
  }

  function activateCode(code) {
    return api("activate_code", { p_code: String(code || "").trim().toUpperCase() }).then(function (r) {
      if (r.ok) return syncProfile().then(function () { return r; });
      return r;
    });
  }

  /* ============ 登录/注册弹窗 ============ */
  var modal = null, authMsg = null;

  function ensureUI() {
    if (modal || !document.body) return;
    modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.innerHTML =
      '<div class="auth-overlay" data-close></div>' +
      '<div class="auth-panel" role="dialog" aria-modal="true" aria-label="登录注册">' +
        '<button class="auth-close" data-close aria-label="关闭">×</button>' +
        '<div class="auth-title">登录 / 注册影剪辑账号</div>' +
        '<div class="auth-tabs"><button type="button" data-tab="login" class="active">登录</button><button type="button" data-tab="register">注册</button></div>' +
        '<div class="auth-body">' +
          '<input id="authNick" type="text" placeholder="昵称（注册时填写，可选）" hidden autocomplete="nickname">' +
          '<input id="authEmail" type="email" placeholder="邮箱" autocomplete="email">' +
          '<input id="authPass" type="password" placeholder="密码（至少 6 位）" autocomplete="current-password">' +
          '<button class="btn" id="authSubmit" style="width:100%;">登录</button>' +
          '<div class="auth-msg" id="authMsg"></div>' +
        "</div>" +
        '<div class="auth-note">登录后每天可领取 +5 次 VIP 功能免费额度；购买会员需登录后输入激活码，激活码与账号绑定，一个激活码只能绑定一个账号。发帖和评论也需要登录。</div>' +
      "</div>";
    document.body.appendChild(modal);
    authMsg = modal.querySelector("#authMsg");

    var tabs = modal.querySelectorAll("[data-tab]");
    tabs.forEach(function (b) {
      b.addEventListener("click", function () {
        tabs.forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var reg = b.getAttribute("data-tab") === "register";
        modal.querySelector("#authNick").hidden = !reg;
        modal.querySelector("#authSubmit").textContent = reg ? "注册" : "登录";
        authMsg.textContent = "";
      });
    });

    modal.querySelector("[data-close]").addEventListener("click", closeLogin);
    modal.querySelector(".auth-overlay").addEventListener("click", closeLogin);
    modal.querySelector(".auth-close").addEventListener("click", closeLogin);
    modal.querySelector(".auth-body").addEventListener("submit", function (e) { e.preventDefault(); doSubmit(); });
    modal.querySelector("#authSubmit").addEventListener("click", doSubmit);
  }

  function setMsg(t, ok) {
    if (!authMsg) return;
    authMsg.textContent = t;
    authMsg.className = "auth-msg" + (ok ? " ok" : " err");
  }

  async function doSubmit() {
    var email = modal.querySelector("#authEmail").value.trim();
    var pass = modal.querySelector("#authPass").value;
    var nick = modal.querySelector("#authNick").value.trim();
    var isReg = modal.querySelector("[data-tab].active").getAttribute("data-tab") === "register";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setMsg("请输入有效的邮箱"); return; }
    if (pass.length < 6) { setMsg("密码至少 6 位"); return; }
    var btn = modal.querySelector("#authSubmit");
    btn.disabled = true;
    setMsg(isReg ? "注册中…" : "登录中…");
    var r = isReg ? await register(email, pass, nick) : await login(email, pass);
    btn.disabled = false;
    if (r && r.error) {
      setMsg(r.error.message || "操作失败，请重试");
      return;
    }
    if (isReg && r && r.data && !r.data.session) {
      setMsg("注册成功！请到邮箱查收确认邮件后登录。");
      return;
    }
    setMsg("✅ " + (isReg ? "注册" : "登录") + "成功，已为你领取今日 +5 次免费额度", true);
    setTimeout(closeLogin, 900);
  }

  function openLogin() {
    ensureUI();
    if (!configured) { setMsg("账号系统正在接入中，稍后开放"); }
    if (isLoggedIn()) { setMsg("你已登录，当前账号：" + (user().email || ""), true); }
    modal.classList.add("show");
    setTimeout(function () { modal.querySelector("#authEmail").focus(); }, 80);
  }
  function closeLogin() { if (modal) modal.classList.remove("show"); }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.classList.contains("show")) closeLogin();
  });

  /* ============ 讨论区数据层 ============ */
  window.YingForum = {
    async listPosts(filter) {
      if (!sb) return [];
      filter = filter || {};
      var q = sb
        .from("posts")
        .select("id,user_id,author_name,tool,content,created_at")
        .order("created_at", { ascending: false })
        .limit(filter.limit || 100);
      if (filter.tools && filter.tools.length) {
        q = q.in("tool", filter.tools);
      }
      var postsRes = await q;
      if (postsRes.error) throw new Error(postsRes.error.message);
      var repliesRes = await sb
        .from("replies")
        .select("post_id,author_name,content,created_at")
        .order("created_at", { ascending: true })
        .limit(500);
      if (repliesRes.error) throw new Error(repliesRes.error.message);
      var byPost = {};
      (repliesRes.data || []).forEach(function (r) {
        (byPost[r.post_id] = byPost[r.post_id] || []).push(r);
      });
      return (postsRes.data || []).map(function (p) {
        return { id: p.id, author: p.author_name, tool: p.tool, content: p.content, created_at: p.created_at, replies: byPost[p.id] || [] };
      });
    },
    async createPost(input) {
      if (!sb || !cachedUser) throw new Error("请先登录");
      var r = await sb.from("posts").insert({
        user_id: cachedUser.id,
        tool: input.tool,
        content: input.content
      });
      if (r.error) throw new Error(r.error.message);
    },
    async createReply(input) {
      if (!sb || !cachedUser) throw new Error("请先登录");
      var r = await sb.from("replies").insert({
        post_id: input.postId,
        user_id: cachedUser.id,
        content: input.content
      });
      if (r.error) throw new Error(r.error.message);
    }
  };

  window.YingAuth = {
    configured: configured,
    LOGIN_BONUS: LOGIN_BONUS,
    isLoggedIn: isLoggedIn,
    user: user,
    profile: profile,
    bonusClaimedToday: bonusClaimedToday,
    serverVipActive: serverVipActive,
    serverVipPlan: serverVipPlan,
    onAuthChange: onAuthChange,
    login: login,
    register: register,
    logout: logout,
    claimBonus: claimBonus,
    activateCode: activateCode,
    syncProfile: syncProfile,
    openLogin: openLogin,
    closeLogin: closeLogin,
    getClient: function () { return sb; }
  };

  init();
  ensureUI();
})();
