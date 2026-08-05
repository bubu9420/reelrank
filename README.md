# 影剪辑 YingClip

免费在线图片 / 视频 / 音频处理工具箱，部署在 GitHub Pages：<https://reelrank.top>

## 特点

- 所有处理都在浏览器本地完成，文件不上传服务器，保护隐私
- 图片工具基于 Canvas，视频/音频工具基于 FFmpeg.wasm（本地化部署），AI 抠图基于 RMBG-1.4 量化模型（本地化部署）
- 无任何外部 CDN 依赖，国内可直接访问
- 基础功能永久免费；VIP 功能（AI 抠图、视频处理、音频降噪等）每日 3 次免费额度，会员无限使用
- 会员体系：月卡 / 年卡 / 终身卡，激活码解锁（账号系统接入中）

## 目录结构

```
index.html                首页
member.html               会员页
discussion.html           工具讨论区
about.html / feedback.html
tools/                    29 个工具页面（图片 10 / 视频 11 / 音频 8）
assets/js/toolkit.js      共享工具库（FFmpeg 加载、下载、进度等）
assets/js/rmbg.js         共享 AI 抠图模块
assets/js/main.js         主题、导航、会员体系
assets/js/discussion.js   讨论区逻辑
assets/bg-removal/        AI 抠图模型 + onnxruntime（本地同源）
assets/ffmpeg/            FFmpeg.wasm 引擎（本地同源）
member/gen_codes.cjs      激活码生成脚本（管理员本地使用）
```

## 会员/激活码

- 激活码格式：`YC-<M|Y|L>-XXXXXX-XXXXXXXX`
- 生成：`node member/gen_codes.cjs Y 5`
- 注意：激活码校验逻辑在客户端，仅适合现阶段小额人工售卖；接入正式支付后需后端校验
