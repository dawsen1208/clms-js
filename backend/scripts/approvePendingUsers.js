// ✅ backend/scripts/approvePendingUsers.js
// 批量将所有 PENDING 用户审批为 APPROVED（保留黑名单状态）
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ 缺少 MONGO_URI 环境变量");
    process.exit(1);
  }
  await mongoose.connect(uri);

  // 仅把 PENDING 改为 APPROVED；REJECTED 保持不变；黑名单保持不变
  const res = await User.updateMany(
    { status: "PENDING" },
    { $set: { status: "APPROVED" } }
  );

  console.log(`✅ 审批完成：匹配 ${res.matchedCount || 0}，修改 ${res.modifiedCount || 0}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ 审批脚本失败：", e);
  process.exit(1);
});
