/**
 * 影剪辑激活码生成器（管理员本地使用，不部署到页面）
 *
 * 用法：
 *   node member/gen_codes.cjs M     # 生成 1 张月卡
 *   node member/gen_codes.cjs Y 5   # 生成 5 张年卡
 *   node member/gen_codes.cjs L 1   # 生成 1 张终身卡
 *
 * 注意：SECRET 必须与 assets/js/main.js 中的 SECRET 完全一致，否则激活码无法通过校验。
 * 当前为无后端方案，客户端可被逆向，仅适合内测/小额人工售卖；接入正式支付时务必换后端校验。
 */
const crypto = require("crypto");

const SECRET = "yingclip-vip-s2f9a7c4";
const PLANS = { M: "月卡（30 天）", Y: "年卡（365 天）", L: "终身" };

function genCode(plan) {
  const payload = Math.random().toString(36).slice(2, 8).toUpperCase();
  const sum = crypto
    .createHash("sha256")
    .update(SECRET + plan + payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return "YC-" + plan + "-" + payload + "-" + sum;
}

const plan = String(process.argv[2] || "Y").toUpperCase();
const count = parseInt(process.argv[3] || "1", 10);
if (!PLANS[plan] || !(count > 0)) {
  console.error("用法: node member/gen_codes.cjs <M|Y|L> [数量]");
  process.exit(1);
}

for (let i = 0; i < count; i++) {
  console.log(genCode(plan) + "  (" + PLANS[plan] + ")");
}
