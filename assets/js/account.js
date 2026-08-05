/* 影剪辑用户中心 */
(function () {
  var Auth = window.YingAuth;
  var YM = window.YingMember;
  var guard = document.getElementById("accGuard");
  var content = document.getElementById("accContent");
  var loginBtn = document.getElementById("accLoginBtn");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function fmtDate(ts) {
    if (!ts) return "-";
    try { return new Date(ts).toLocaleString("zh-CN", { hour12: false }); } catch (e) { return "-"; }
  }
  function setMsg(el, t, ok) {
    el.textContent = t;
    el.className = "member-msg" + (ok ? " ok" : " err");
  }

  async function refresh() {
    if (!Auth.isLoggedIn()) {
      guard.hidden = false;
      content.hidden = true;
      return;
    }
    guard.hidden = true;
    content.hidden = false;
    var u = Auth.user();
    var p = Auth.profile() || null;
    if (!p) {
      document.getElementById("accNick").textContent = "加载中…";
      document.getElementById("accVip").textContent = "加载中…";
      document.getElementById("accQuota").textContent = "…";
      return;
    }
    p = p || {};
    document.getElementById("accAvatar").textContent = (p.nickname || u.email || "用").slice(0, 1);
    document.getElementById("accNick").textContent = p.nickname || "-";
    document.getElementById("accEmail").textContent = u.email || "-";

    var vip = Auth.serverVipActive && Auth.serverVipActive()
      ? {
          plan: (Auth.serverVipPlan && Auth.serverVipPlan()) || "VIP",
          expiresAt: p.vip_expires_at
        }
      : null;
    var vipEl = document.getElementById("accVip");
    if (vip) {
      var planName = vip.plan === "M" ? "月卡" : vip.plan === "Y" ? "年卡" : vip.plan === "L" ? "终身" : "VIP";
      vipEl.textContent = planName + " · " + fmtDate(vip.expiresAt).slice(0, 16) + " 到期";
      document.getElementById("accVipBox").innerHTML = '<p class="acc-note" style="color:var(--ok);">👑 会员有效期内，VIP 功能无限使用。</p>';
    } else {
      vipEl.textContent = "未开通";
    }

    var q = YM.getQuotaInfo ? YM.getQuotaInfo() : null;
    var quotaEl = document.getElementById("accQuota");
    if (q && q.isVip) {
      quotaEl.textContent = "∞ 无限";
    } else if (q) {
      quotaEl.innerHTML = q.remaining + " / " + q.limit + " 次";
    }

    // 注册时间
    try {
      var meta = await Auth.getClient().auth.getUser();
      if (meta.data && meta.data.user && meta.data.user.created_at) {
        document.getElementById("accCreated").textContent = fmtDate(meta.data.user.created_at).slice(0, 16);
      }
    } catch (e) {}

    // 管理员入口
    var admin = await Auth.isAdmin();
    document.getElementById("accAdminLink").hidden = !admin;

    loadMyPosts();
  }

  async function loadMyPosts() {
    var box = document.getElementById("accPosts");
    try {
      var r = await Auth.getClient()
        .from("posts")
        .select("id,tool,content,created_at")
        .eq("user_id", Auth.user().id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (r.error) throw new Error(r.error.message);
      var posts = r.data || [];
      if (!posts.length) {
        box.innerHTML = '<p class="acc-note">还没有发过帖子，去<a href="discussion.html">讨论区</a>分享你的使用体验吧。</p>';
        return;
      }
      box.innerHTML = posts.map(function (p) {
        return (
          '<div class="acc-post">' +
            '<div class="acc-post-text">' + esc(p.content) + "</div>" +
            '<div class="acc-post-meta"><span>' + fmtDate(p.created_at).slice(0, 16) + "</span>" +
            '<button data-del="' + p.id + '">删除</button></div>' +
          "</div>"
        );
      }).join("");
    } catch (e) {
      box.innerHTML = '<p class="acc-note">加载失败：' + esc(e.message) + "</p>";
    }
  }

  document.getElementById("accPosts").addEventListener("click", async function (e) {
    var btn = e.target.closest("button[data-del]");
    if (!btn) return;
    if (!confirm("确定删除这条帖子？")) return;
    try {
      var r = await Auth.getClient().from("posts").delete().eq("id", btn.getAttribute("data-del"));
      if (r.error) throw new Error(r.error.message);
      loadMyPosts();
    } catch (err) {
      alert("删除失败：" + err.message);
    }
  });

  document.getElementById("accActivateBtn").addEventListener("click", async function () {
    var input = document.getElementById("accCodeInput");
    var msg = document.getElementById("accCodeMsg");
    var code = input.value.trim();
    if (!code) { setMsg(msg, "请先输入激活码"); return; }
    var btn = this;
    btn.disabled = true;
    setMsg(msg, "正在验证…");
    var r = await Auth.activateCode(code);
    btn.disabled = false;
    if (r.ok) {
      setMsg(msg, "✅ 激活成功！已解锁 " + (r.plan === "M" ? "月卡" : r.plan === "Y" ? "年卡" : "终身") + "，" + fmtDate(r.expires_at).slice(0, 16) + " 到期", true);
      input.value = "";
      refresh();
    } else {
      setMsg(msg, "❌ " + (r.msg || "激活失败"));
    }
  });
  document.getElementById("accCodeInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("accActivateBtn").click();
  });

  loginBtn.addEventListener("click", function () {
    if (YM && YM.openLogin) YM.openLogin();
    else Auth.openLogin();
  });
  document.getElementById("accLogoutBtn").addEventListener("click", async function () {
    await Auth.logout();
    refresh();
  });

  if (Auth && Auth.onAuthChange) Auth.onAuthChange(refresh);
  refresh();
})();
