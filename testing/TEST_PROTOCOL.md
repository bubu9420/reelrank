# ReelRank 真实测试协议

每篇评测的测试必须按本协议执行，保证所有工具的评分可横向对比。

## 一、测试环境

- 测试日期：2026 年 8 月
- 测试方式：浏览器自动化 + 人工视觉复核
- 网络：通过本地代理访问工具官网
- 账号：见下表（由站主提供，密码不写入本文件）

| 工具 | 测试账号 | 额度来源 | 备注 |
|---|---|---|---|
| Google Veo 3.1 | （待定） | Gemini 付费订阅 | 需约 $20–30/月，待站主确认 |
| Kling 3.0 | （待定） | 每日免费积分 | 免费可测 |
| Runway Gen-4 | （待定） | 125 一次性免费积分 | 免费可测，注意省着用 |
| CapCut Director Mode | （待定） | 免费版 | 免费可测 |

## 二、统一提示词集（每个工具都跑这 5 条）

1. **人物特写**：`Cinematic close-up of a woman looking at a sunset, soft golden light on her face, shallow depth of field, photorealistic, 4k`
2. **电影级场景**：`Aerial drone shot flying over a misty mountain valley at dawn, volumetric light, epic scale, film grain, cinematic color grade`
3. **产品展示**：`Product commercial of a sleek black smartwatch rotating on a reflective surface, studio lighting, sharp focus, premium feel`
4. **动物/物理**：`A golden retriever puppy chasing a red ball across a grassy lawn, slow motion, natural movement, shallow depth of field`
5. **文字/一致性**：`A neon sign reading "REELRANK" glowing on a brick wall at night, rain on the ground, reflections, cinematic`

## 三、五项评分标准（每项 1–5 分）

| 维度 | 怎么评 |
|---|---|
| 输出质量 | 真实感、穿帮/变形、物理合理性、细节保真 |
| 提示词遵循度 | 是否完全执行了提示要求，有无自由发挥跑偏 |
| 音频 | 音画同步、人声自然度、环境音（仅支持音频的模型） |
| 速度与成本 | 每条视频生成耗时、消耗积分/点数、折算单条成本 |
| 工作流适配 | 界面易用性、编辑/导出能力、批量生成友好度 |

## 四、每条测试记录模板

```text
工具：Kling 3.0
提示词编号：#1 人物特写
生成参数：4K 60fps / 10s
耗时：1 分 42 秒
消耗：18 积分（约 $0.12）
结果：成功 2 次 / 失败 0 次
视觉观察（人工）：
- 画质：
- 穿帮/变形：
- 运动自然度：
截图/视频文件名：kling-01-a.mp4, kling-01-a.png
评分：输出质量 4 / 提示词遵循 5 / 音频 N/A / 速度成本 4 / 工作流 3
```

## 五、测试产物归档

所有产物统一存到 `testing/output/<工具名>/`：

- 每个提示词至少保存 1 条视频 + 1 张封面截图
- 截图命名规则：`<工具>-<提示词编号>-<尝试次数>.png`
- 生成失败的尝试也要记录（失败率和原因是有价值的信息）

## 六、视觉复核流程（站主执行，约 15 分钟）

1. 看每个工具的 5 条视频 + 截图
2. 按上表"视觉观察"栏填画质、穿帮、运动自然度
3. 对每条视频给一个总印象分（1–5）
4. 把记录发回给 Codex，Codex 负责写入正式评测并更新评分

## 七、注意事项

- 自动化操作保持人类节奏（页面操作间隔 3–8 秒），避免触发风控
- 免费额度有限，Runway 先跑提示词 #1 和 #2 确认效果，再决定是否测满 5 条
- 所有价格记录以测试当日页面显示为准
- 评测上线前必须把页面状态徽章从 `Draft` 改成 `Tested` 并更新日期
