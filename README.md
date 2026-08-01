# ReelRank — AI 视频工具测评站

一个英文独立测评站：真实测试 AI 视频生成/编辑工具，输出可信对比和评分，靠联盟佣金 + 广告 + 后续会员付费变现。

## 目录结构

```
reelrank/
├── index.html                        # 首页（SEO 落地页）
├── about.html                        # 方法论 / 披露 / 联系
├── feedback.html                     # 用户反馈页（beta 期走邮件客户端）
├── robots.txt                        # 搜索引擎规则
├── sitemap.xml                       # 站点地图（换域名后更新）
├── assets/
│   ├── css/style.css                 # 全站样式
│   └── js/main.js                    # 移动端菜单等
└── reviews/
    ├── best-ai-video-generators-2026.html  # 年度对比榜（流量入口）
    ├── veo-3-review.html             # Veo 3.1 评测
    ├── kling-3-review.html           # Kling 3.0 评测
    ├── runway-gen-4-review.html      # Runway Gen-4 评测
    └── capcut-director-mode-review.html    # CapCut 导演模式评测
```

## 本地预览

直接双击 `index.html` 即可。更接近线上效果的话，在 `reelrank` 目录下启动一个本地服务器：

```powershell
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000`。

## 怎么加一篇新评测

1. 复制 `REVIEW_TEMPLATE.md` 或现有评测页，改文件名如 `reviews/grok-video-review.html`。
2. 按模板填内容：结论、实测结果、规格、定价、优劣势、替代品、FAQ。
3. 真实使用工具（免费额度即可）跑一遍我们统一的 5 项测试：画质、提示词遵循度、音频、速度/成本、工作流。
4. 把状态徽章从 `Draft` 改成 `Tested`，更新日期。
5. 更新首页卡片、对比榜表格、`sitemap.xml`。

## 明暗模式

- 右上角 ☾/☀ 按钮切换明亮/暗色模式，选择会保存在浏览器本地。
- 新访客默认跟随系统偏好（`prefers-color-scheme`）。
- 所有页面共用 `assets/css/style.css` 里的 CSS 变量，新增页面时保留 `<head>` 里那行主题初始化脚本即可。

## 反馈页说明

- `feedback.html` 提供分类反馈表单（纠错/建议/测试申请/合作）。
- 网站上线前没有后端，提交按钮会打开邮件客户端并预填内容；正式上线后可换成 Formspree 等免费表单服务。

## 部署（免费）

1. 注册 GitHub 账号，新建一个仓库（如 `reelrank`），把整个 `reelrank` 文件夹内容上传。
2. 注册 Vercel（或 Netlify / Cloudflare Pages），导入该 GitHub 仓库。
3. 平台会自动部署并给你一个 `xxx.vercel.app` 链接。
4. 买域名（Namecheap 等，约 10–15 美元/年），在托管平台后台绑定域名、配置 DNS，2 分钟可生效。

## 上线前必做清单

- [ ] 买真实域名，把全站 `canonical`、`sitemap.xml`、`robots.txt` 里的 `reelrank.com` 替换成真实域名
- [ ] 注册 Google Search Console 提交站点地图，申请 Google AdSense（需内容充实且原创，建议先发 10+ 篇）
- [ ] 逐个真实测试工具，把 `Draft` 改成 `Tested`，补上测试截图/视频
- [ ] 注册工具联盟计划（Veo/Google、Kling、Runway、CapCut 等）拿到推广链接，替换正文链接
- [ ] 更新 `about.html` 的邮箱和披露文案
- [ ] 建立内容更新节奏：每周至少 1 篇新评测或更新

## 变现路线（分阶段）

1. **联盟佣金**（最快）：用户通过你的链接购买工具订阅，你拿 5–30% 佣金。
2. **广告**（需流量）：AdSense 等，英文站千次曝光收入较高。
3. **付费产品**（后期）：高级对比报告、专属工具筛选、会员数据库。

## 内容质量红线

- 不写没测过的工具，不编造评分。
- 所有评测页必须带状态徽章（Draft/Tested）。
- 价格经常变，每篇都要标注“核对日期”并在更新时修正。
- 有联盟链接就如实披露——信任是这个站的唯一资产。
