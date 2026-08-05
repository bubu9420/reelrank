# -*- coding: utf-8 -*-
"""影剪辑网站 SEO 批量升级脚本：og 标签、结构化数据、noindex、统计注入、站点地图重建、隐私政策页、ads.txt。"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://reelrank.top"
TOOLS_DIR = os.path.join(ROOT, "tools")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(s)


def head_of(html):
    idx = html.find("</head>")
    return html[:idx] if idx >= 0 else html


def page_info(html):
    head = head_of(html)
    m = re.search(r"<title>(.*?)</title>", head, re.S)
    title = m.group(1).strip() if m else ""
    m = re.search(r'<meta name="description" content="(.*?)"', head, re.S)
    desc = m.group(1).strip() if m else ""
    m = re.search(r'<link rel="canonical" href="(.*?)"', head)
    canon = m.group(1).strip() if m else ""
    return title, desc, canon


def html_attr_escape(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def json_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def og_block(title, desc, url, ld=False):
    parts = [
        "",
        '  <meta property="og:title" content="' + html_attr_escape(title) + '">',
        '  <meta property="og:description" content="' + html_attr_escape(desc) + '">',
        '  <meta property="og:type" content="website">',
        '  <meta property="og:url" content="' + url + '">',
        '  <meta name="twitter:card" content="summary">',
    ]
    if ld:
        parts += [
            '  <script type="application/ld+json">',
            "  {",
            '    "@context": "https://schema.org",',
            '    "@type": "SoftwareApplication",',
            '    "name": "' + json_escape(title) + '",',
            '    "description": "' + json_escape(desc) + '",',
            '    "url": "' + url + '",',
            '    "applicationCategory": "UtilitiesApplication",',
            '    "operatingSystem": "Web",',
            '    "inLanguage": "zh-CN",',
            '    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CNY" }',
            "  }",
            "  </script>",
        ]
    return "\n".join(parts) + "\n"


def upgrade_all():
    changed = []
    html_files = []
    for base, rel in [(ROOT, ""), (TOOLS_DIR, "../")]:
        for f in sorted(os.listdir(base)):
            if f.endswith(".html"):
                html_files.append((os.path.join(base, f), rel))

    for p, rel in html_files:
        html = read(p)
        original = html
        name = os.path.basename(p)
        title, desc, canon = page_info(html)
        url = canon or (SITE + "/" + name)

        # 1) 后台 / 用户中心禁止收录
        if name in ("admin.html", "account.html"):
            if "noindex" not in head_of(html):
                html = html.replace(
                    "</head>",
                    '  <meta name="robots" content="noindex, nofollow">\n</head>',
                    1,
                )

        # 2) 工具页：og + SoftwareApplication 结构化数据
        if p.startswith(TOOLS_DIR) and "og:title" not in html:
            html = html.replace("</head>", og_block(title, desc, url, ld=True) + "</head>", 1)
        # 3) 根页面缺少 og 的补上
        elif "og:title" not in html and name not in ("account.html", "admin.html"):
            html = html.replace("</head>", og_block(title, desc, url, ld=False) + "</head>", 1)

        # 4) 全站注入统计脚本
        if "analytics.js" not in html:
            html = html.replace(
                "</head>",
                '\n  <script defer src="' + rel + 'assets/js/analytics.js"></script>\n</head>',
                1,
            )

        # 5) 页脚加隐私政策链接
        sitemap_pat = re.compile(r'(<li><a href=")(\.\./)?(sitemap\.xml">[^<]*</a></li>)')
        if sitemap_pat.search(html) and "privacy.html" not in html:
            def _ins(m):
                pre, up, tail = m.group(1), m.group(2) or "", m.group(3)
                return (
                    pre
                    + up
                    + tail
                    + "\n"
                    + pre
                    + up
                    + 'privacy.html">隐私政策</a></li>'
                )

            html = sitemap_pat.sub(_ins, html)

        if html != original:
            write(p, html)
            changed.append(os.path.relpath(p, ROOT))
    return changed


def rebuild_sitemap():
    def entry(loc, lastmod, freq, pri):
        return (
            "  <url>\n"
            "    <loc>%s</loc>\n"
            "    <lastmod>%s</lastmod>\n"
            "    <changefreq>%s</changefreq>\n"
            "    <priority>%s</priority>\n"
            "  </url>"
            % (loc, lastmod, freq, pri)
        )

    urls = []
    urls.append(entry(SITE + "/", "2026-08-05", "daily", "1.0"))
    urls.append(entry(SITE + "/discussion.html", "2026-08-05", "daily", "0.8"))
    urls.append(entry(SITE + "/member.html", "2026-08-05", "weekly", "0.7"))
    urls.append(entry(SITE + "/about.html", "2026-08-05", "monthly", "0.5"))
    urls.append(entry(SITE + "/feedback.html", "2026-08-05", "monthly", "0.5"))
    urls.append(entry(SITE + "/privacy.html", "2026-08-05", "monthly", "0.3"))
    for f in sorted(os.listdir(TOOLS_DIR)):
        if f.endswith(".html"):
            urls.append(entry(SITE + "/tools/" + f, "2026-08-05", "weekly", "0.9"))
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )
    write(os.path.join(ROOT, "sitemap.xml"), xml)


def create_privacy():
    p = os.path.join(ROOT, "privacy.html")
    if os.path.exists(p):
        return
    body = read(os.path.join(ROOT, "feedback.html"))
    # 用反馈页外壳，替换主体内容
    start = body.find("<main")
    end = body.find("</main>")
    if start < 0 or end < 0:
        raise RuntimeError("feedback.html 结构异常")
    shell = body[:start]
    tail = body[end:]
    content = """
  <main class="tool-page">
    <div class="container">
      <p class="breadcrumb"><a href="index.html">首页</a> / 隐私政策</p>
      <h1>隐私政策</h1>
      <p class="sub">我们非常重视你的隐私。本页面说明影剪辑（YingClip，reelrank.top）如何收集、使用和保护你的信息。</p>
      <div style="max-width:760px;line-height:1.9;color:var(--ink-soft);">
        <h2 style="color:var(--ink);margin-top:28px;">1. 文件处理</h2>
        <p>所有图片、视频、音频处理都在你的浏览器本地完成，文件不会上传到我们的服务器。关闭页面后文件即被彻底删除，我们无法查看、存储或获取你处理的任何文件。</p>
        <h2 style="color:var(--ink);margin-top:28px;">2. 账号信息</h2>
        <p>当你在本站注册账号时，我们会保存你填写的邮箱地址和密码（密码经过加密存储），用于登录、会员权益和讨论区发言。登录赠送次数、VIP 会员状态等信息与你的账号绑定。</p>
        <h2 style="color:var(--ink);margin-top:28px;">3. 讨论区内容</h2>
        <p>你在讨论区发表的帖子、评论及昵称将公开展示。请勿在公开内容中填写敏感个人信息。</p>
        <h2 style="color:var(--ink);margin-top:28px;">4. Cookie 与本地存储</h2>
        <p>本站使用浏览器本地存储保存你的主题偏好（明亮/暗色）和登录状态。我们不会使用 Cookie 追踪你在其他网站的行为。</p>
        <h2 style="color:var(--ink);margin-top:28px;">5. 统计与分析</h2>
        <p>为改进服务，我们可能接入第三方统计工具（如 Google Analytics、百度统计），它们会以匿名形式收集访问量、来源、设备等基础数据，不包含你处理的文件内容。</p>
        <h2 style="color:var(--ink);margin-top:28px;">6. 第三方服务</h2>
        <p>本站由 GitHub Pages 托管；账号系统由 Supabase 提供；如后续接入广告、支付等服务，将在此页面持续更新。</p>
        <h2 style="color:var(--ink);margin-top:28px;">7. 联系我们</h2>
        <p>如有隐私相关问题，请通过 <a href="feedback.html">反馈页面</a> 或邮箱 yibulayinjiang@gmail.com 联系我们。</p>
        <p style="margin-top:28px;">更新日期：2026-08-05</p>
      </div>
    </div>
  </main>
"""
    html = shell + content + tail
    html = html.replace("<title>" + _title_of(body) + "</title>", "<title>隐私政策 | 影剪辑</title>")
    html = html.replace(
        '<meta name="description" content="' + _desc_of(body) + '"',
        '<meta name="description" content="影剪辑（YingClip）隐私政策：所有文件在浏览器本地处理，不上传服务器；账号、讨论区与统计数据的收集与使用说明。"',
    )
    html = html.replace('<link rel="canonical" href="https://reelrank.top/feedback.html"', '<link rel="canonical" href="https://reelrank.top/privacy.html"')
    write(p, html)


def _title_of(html):
    m = re.search(r"<title>(.*?)</title>", html, re.S)
    return m.group(1).strip() if m else ""


def _desc_of(html):
    m = re.search(r'<meta name="description" content="(.*?)"', html, re.S)
    return m.group(1).strip() if m else ""


def create_ads_txt():
    p = os.path.join(ROOT, "ads.txt")
    if os.path.exists(p):
        return
    write(
        p,
        "# 影剪辑 YingClip 广告位声明\n"
        "# Google AdSense 审核通过后，将下面 pub- 替换为你的真实发布商 ID\n"
        "# 格式示例：google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n"
        "google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n",
    )


def create_analytics_js():
    d = os.path.join(ROOT, "assets", "js")
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, "analytics.js")
    if os.path.exists(p):
        return
    write(
        p,
        """// 影剪辑 YingClip 站点统计
// 1) Google Analytics 4：在 Google Analytics 创建数据流后，把 G-XXXXXX 填到 GA4_MEASUREMENT_ID
// 2) 百度统计：在 tongji.baidu.com 创建站点后，把 hm.js? 后面的 ID 填到 BAIDU_HM_ID
window.YC_ANALYTICS = window.YC_ANALYTICS || {
  GA4_MEASUREMENT_ID: '', // 例如 'G-ABCDEF1234'
  BAIDU_HM_ID: ''         // 例如 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};
(function () {
  var cfg = window.YC_ANALYTICS;
  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  if (cfg.GA4_MEASUREMENT_ID) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + cfg.GA4_MEASUREMENT_ID);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', cfg.GA4_MEASUREMENT_ID);
  }
  if (cfg.BAIDU_HM_ID) {
    var hm = document.createElement('script');
    hm.src = 'https://hm.baidu.com/hm.js?' + cfg.BAIDU_HM_ID;
    document.head.appendChild(hm);
  }
})();
""",
    )


def main():
    create_privacy()
    changed = upgrade_all()
    rebuild_sitemap()
    create_ads_txt()
    create_analytics_js()
    print("changed files: %d" % len(changed))
    for c in changed:
        print("  " + c)


if __name__ == "__main__":
    main()
