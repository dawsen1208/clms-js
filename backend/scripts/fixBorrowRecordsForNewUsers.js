// ✅ backend/scripts/fixBorrowRecordsForNewUsers.js
// 场景：新注册账号却继承了旧账号的借阅记录
// 策略：删除「用户创建时间之前」的 BorrowRecord / BorrowHistory

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowHistory from "../models/BorrowHistory.js";

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ 缺少 MONGO_URI / MONGODB_URI 环境变量");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB");

  const users = await User.find({}, { userId: 1, createdAt: 1 }).lean();
  console.log(`🔍 Loaded users: ${users.length}`);

  let totalRecords = 0;
  let totalHistories = 0;

  for (const u of users) {
    if (!u.userId || !u.createdAt) continue;

    const uid = u.userId;
    const createdAt = u.createdAt;

    // 1) 借阅记录：在用户创建时间之前的，认为属于旧账号，删除
    const recRes = await BorrowRecord.deleteMany({
      userId: uid,
      createdAt: { $lt: createdAt },
    });

    // 2) 借阅历史：同样规则
    const histRes = await BorrowHistory.deleteMany({
      userId: uid,
      createdAt: { $lt: createdAt },
    });

    if ((recRes.deletedCount || 0) > 0 || (histRes.deletedCount || 0) > 0) {
      console.log(
        `🧹 User ${uid} fixed: records=${recRes.deletedCount || 0}, history=${
          histRes.deletedCount || 0
        } (createdAt=${createdAt.toISOString()})`
      );
    }

    totalRecords += recRes.deletedCount || 0;
    totalHistories += histRes.deletedCount || 0;
  }

  console.log(
    `✅ Done. Removed BorrowRecord=${totalRecords}, BorrowHistory=${totalHistories} created before user accounts.`
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ fixBorrowRecordsForNewUsers failed:", e);
  process.exit(1);
});

