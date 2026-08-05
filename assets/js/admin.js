/* 影剪辑管理后台（仅管理员） */
(function () {
  var Auth = window.YingAuth;
  var guard = document.getElementById("adminGuard");
  var noPerm = document.getElementById("adminNoPerm");
  var content = document.getElementById("adminContent");
  var loginBtn = document.getElementById("adminLoginBtn");
  var state = { tab: "stats" };

  var TOOL_NAMES = {
    "image-compress.html": "图片压缩", "image-convert.html": "图片格式转换",
    "image-crop.html": "图片裁剪", "image-resize.html": "图片改尺寸",
    "image-rotate.html": "图片旋转翻转", "image-watermark.html": "图片加水印",
    "image-nineslice.html": "九宫格切图", "image-bg.html": "一键抠图",
    "image-idphoto.html": "证件照制作", "image-merge.html": "图片拼接",
    "video-compress.html": "视频压缩", "video-to-gif.html": "视频转GIF",
    "video-convert.html": "视频格式转换", "video-trim.html": "视频裁剪",
    "video-vertical.html": "竖屏9:16", "video-watermark.html": "视频加水印",
    "video-speed.html": "视频变速", "video-extract-audio.html": "提取音频",
    "video-merge.html": "视频拼接", "video-mute.html": "视频静音",
    "video-snapshot.html": "视频截图", "audio-convert.html": "音频转换",
    "audio-trim.html": "音频剪切", "audio-merge.html": "音频拼接",
    "audio-volume.html": "音量调节", "audio-speed.html": "音频变速",
    "audio-ringtone.html": "铃声制作", "audio-denoise.html": "音频降噪",
    "audio-compress.html": "音频压缩"
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function fmtDate(ts) {
    if (!ts) return "-";
    try { return new Date(ts).toLocaleString("zh-CN", { hour12: false }); } catch (e) { return "-"; }
  }
  function vipText(u) {
    if (u.vip_expires_at && new Date(u.vip_expires_at) > new Date()) {
      var p = u.vip_plan === "M" ? "月卡" : u.vip_plan === "Y" ? "年卡" : u.vip_plan === "L" ? "终身" : "VIP";
      return p + " · " + fmtDate(u.vip_expires_at).slice(0, 16);
    }
    return "无";
  }

  async function rpc(name, args) {
    var r = await Auth.getClient().rpc(name, args || {});
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async function refresh() {
    if (!Auth.isLoggedIn()) {
      guard.hidden = false;
      noPerm.hidden = true;
      content.hidden = true;
      return;
    }
    var admin = await Auth.isAdmin();
    if (!admin) {
      guard.hidden = true;
      noPerm.hidden = false;
      content.hidden = true;
      return;
    }
    guard.hidden = true;
    noPerm.hidden = true;
    content.hidden = false;
    loadTab(state.tab);
  }

  function loadTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".admin-tab").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    document.querySelectorAll(".admin-panel").forEach(function (p) {
      p.hidden = p.id !== "tab-" + tab;
    });
    if (tab === "stats") loadStats();
    if (tab === "users") loadUsers();
    if (tab === "codes") loadCodes();
    if (tab === "posts") loadPosts();
  }

  async function loadStats() {
    var box = document.getElementById("statCards");
    try {
      var d = await rpc("admin_stats");
      var items = [
        ["注册用户", d.data.users], ["VIP 用户", d.data.vip_users],
        ["帖子", d.data.posts], ["回复", d.data.replies],
        ["未用激活码", d.data.codes_unused], ["已用激活码", d.data.codes_used]
      ];
      box.innerHTML = items.map(function (it) {
        return '<div class="admin-stat"><b>' + it[1] + '</b><span>' + esc(it[0]) + "</span></div>";
      }).join("");
    } catch (e) {
      box.innerHTML = '<p class="admin-err">' + esc(e.message) + "</p>";
    }
  }

  async function loadUsers() {
    var box = document.getElementById("usersTable");
    var cnt = document.getElementById("usersCount");
    try {
      var d = await rpc("admin_list_users");
      var users = d.data || [];
      cnt.textContent = "共 " + users.length + " 个用户";
      box.innerHTML =
        "<tr><th>邮箱</th><th>昵称</th><th>注册时间</th><th>VIP</th><th>发帖</th><th>操作</th></tr>" +
        users.map(function (u) {
          return (
            "<tr>" +
            "<td>" + esc(u.email) + "</td>" +
            "<td>" + esc(u.nickname || "-") + "</td>" +
            "<td>" + fmtDate(u.created_at).slice(0, 16) + "</td>" +
            "<td>" + vipText(u) + "</td>" +
            "<td>" + (u.posts || 0) + "</td>" +
            '<td class="admin-ops">' +
              '<button data-act="vip" data-plan="M" data-days="30" data-uid="' + u.id + '">+月卡</button>' +
              '<button data-act="vip" data-plan="Y" data-days="365" data-uid="' + u.id + '">+年卡</button>' +
              '<button data-act="del" data-uid="' + u.id + '" data-email="' + esc(u.email) + '">删除</button>' +
            "</td>" +
            "</tr>"
          );
        }).join("");
    } catch (e) {
      box.innerHTML = '<tr><td class="admin-err">' + esc(e.message) + "</td></tr>";
    }
  }

  async function loadCodes() {
    var box = document.getElementById("codesTable");
    try {
      var d = await rpc("admin_list_codes");
      var codes = d.data || [];
      box.innerHTML =
        "<tr><th>校验码</th><th>套餐</th><th>状态</th><th>绑定邮箱</th><th>激活时间</th></tr>" +
        codes.map(function (c) {
          return (
            "<tr>" +
            "<td><code>" + esc(c.code_hash) + "</code></td>" +
            "<td>" + (c.plan === "M" ? "月卡" : c.plan === "Y" ? "年卡" : "终身") + "</td>" +
            "<td>" + (c.status === "used" ? "已使用" : "未使用") + "</td>" +
            "<td>" + esc(c.bound_email || "-") + "</td>" +
            "<td>" + fmtDate(c.activated_at).slice(0, 16) + "</td>" +
            "</tr>"
          );
        }).join("");
    } catch (e) {
      box.innerHTML = '<tr><td class="admin-err">' + esc(e.message) + "</td></tr>";
    }
  }

  async function loadPosts() {
    var box = document.getElementById("postsTable");
    var cnt = document.getElementById("postsCount");
    try {
      var d = await rpc("admin_list_posts", { p_limit: 200 });
      var posts = d.data || [];
      cnt.textContent = "最新 " + posts.length + " 条";
      box.innerHTML =
        "<tr><th>作者</th><th>工具</th><th>内容</th><th>时间</th><th>操作</th></tr>" +
        posts.map(function (p) {
          return (
            "<tr>" +
            "<td>" + esc(p.author_name) + "</td>" +
            "<td>" + esc(TOOL_NAMES[p.tool] || p.tool) + "</td>" +
            '<td class="admin-post-content">' + esc(p.content) + "</td>" +
            "<td>" + fmtDate(p.created_at).slice(0, 16) + "</td>" +
            '<td class="admin-ops"><button data-act="delpost" data-id="' + p.id + '">删除</button></td>' +
            "</tr>"
          );
        }).join("");
    } catch (e) {
      box.innerHTML = '<tr><td class="admin-err">' + esc(e.message) + "</td></tr>";
    }
  }

  document.getElementById("adminContent").addEventListener("click", async function (e) {
    var btn = e.target.closest("button[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    try {
      if (act === "vip") {
        await rpc("admin_set_vip", {
          p_user_id: btn.getAttribute("data-uid"),
          p_plan: btn.getAttribute("data-plan"),
          p_days: +btn.getAttribute("data-days")
        });
        alert("已开通 VIP");
        loadUsers();
      } else if (act === "del") {
        if (!confirm("确定删除用户 " + btn.getAttribute("data-email") + "？其帖子也会被删除。")) return;
        await rpc("admin_delete_user", { p_user_id: btn.getAttribute("data-uid") });
        alert("已删除");
        loadUsers();
      } else if (act === "delpost") {
        if (!confirm("确定删除这条帖子？")) return;
        await rpc("admin_delete_post", { p_post_id: btn.getAttribute("data-id") });
        loadPosts();
      }
    } catch (err) {
      alert("操作失败：" + err.message);
    }
  });

  document.querySelectorAll(".admin-tab").forEach(function (b) {
    b.addEventListener("click", function () { loadTab(b.dataset.tab); });
  });
  var refreshPostsBtn = document.getElementById("refreshPostsBtn");
  if (refreshPostsBtn) refreshPostsBtn.addEventListener("click", loadPosts);

  loginBtn.addEventListener("click", function () {
    if (window.YingMember && YingMember.openLogin) YingMember.openLogin();
    else Auth.openLogin();
  });

  if (Auth && Auth.onAuthChange) Auth.onAuthChange(refresh);
  refresh();
})();
