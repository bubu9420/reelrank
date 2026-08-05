/**
 * 生成新激活码 + 对应的 SQL 插入语句（把 INSERT 粘到 Supabase SQL Editor 执行）
 *
 * 用法：node member/gen_codes_sql.cjs Y 3
 * 会输出 3 个年卡激活码，以及可复制的 INSERT 语句。
 */
const crypto = require("crypto");

const SECRET = "yingclip-vip-s2f9a7c4";
const PLANS = { M: "月卡", Y: "年卡", L: "终身" };

function gen(plan) {
  const payload = Math.random().toString(36).slice(2, 8).toUpperCase();
  const sum = crypto
    .createHash("sha256")
    .update(SECRET + plan + payload)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return { code: "YC-" + plan + "-" + payload + "-" + sum, hash: sum, plan };
}

const plan = String(process.argv[2] || "Y").toUpperCase();
const count = parseInt(process.argv[3] || "1", 10);
if (!PLANS[plan] || !(count > 0)) {
  console.error("用法: node member/gen_codes_sql.cjs <M|Y|L> [数量]");
  process.exit(1);
}

const codes = [];
for (let i = 0; i < count; i++) codes.push(gen(plan));

console.log("=== 激活码 ===");
codes.forEach((c) => console.log(c.code + "  (" + PLANS[c.plan] + ")"));
console.log("\n=== SQL（粘贴到 Supabase SQL Editor 执行） ===");
console.log("insert into public.codes (code_hash, plan) values");
console.log(codes.map((c, i) => "  ('" + c.hash + "', '" + c.plan + "')" + (i < codes.length - 1 ? "," : ";")).join("\n"));
