// ✅ backend/scripts/purgeBooksWithoutCover.js
// Remove books that do not have a valid coverImage, keeping DB integrity.
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowRequest from "../models/BorrowRequest.js";

dotenv.config();

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);

  // 1) 找出无封面的书（coverImage 为空或不存在）
  const candidates = await Book.find(
    {
      $or: [
        { coverImage: { $exists: false } },
        { coverImage: "" },
      ],
    },
    { _id: 1, title: 1, author: 1 }
  ).lean();

  if (!candidates.length) {
    console.log("✅ No books without cover found. Nothing to purge.");
    await mongoose.disconnect();
    return;
  }

  const candidateIds = candidates.map((b) => b._id);

  // 2) 过滤掉仍在被借阅的书（有活跃借阅记录）
  const activeAgg = await BorrowRecord.aggregate([
    { $match: { returned: false, bookId: { $in: candidateIds } } },
    { $group: { _id: "$bookId", count: { $sum: 1 } } },
  ]);
  const activeSet = new Set(activeAgg.map((d) => String(d._id)));

  const toDelete = candidates.filter((b) => !activeSet.has(String(b._id)));
  const toKeep = candidates.filter((b) => activeSet.has(String(b._id)));

  // 3) 清理与将删除书籍相关的 BorrowRequest（全部状态）
  let removedRequests = 0;
  if (toDelete.length) {
    const delIds = toDelete.map((b) => b._id);
    const reqRes = await BorrowRequest.deleteMany({ bookId: { $in: delIds } });
    removedRequests = reqRes.deletedCount || 0;
  }

  // 4) 删除已归还的 BorrowRecord（保持历史整洁；BorrowHistory 保留）
  let removedReturnedRecords = 0;
  if (toDelete.length) {
    const delIds = toDelete.map((b) => b._id);
    const recRes = await BorrowRecord.deleteMany({ bookId: { $in: delIds }, returned: true });
    removedReturnedRecords = recRes.deletedCount || 0;
  }

  // 5) 删除书籍
  let removedBooks = 0;
  if (toDelete.length) {
    const delIds = toDelete.map((b) => b._id);
    const res = await Book.deleteMany({ _id: { $in: delIds } });
    removedBooks = res.deletedCount || 0;
  }

  console.log(
    `✅ Purge completed. candidates=${candidates.length}, ` +
    `deletedBooks=${removedBooks}, removedRequests=${removedRequests}, removedReturnedRecords=${removedReturnedRecords}, ` +
    `keptDueToActiveBorrows=${toKeep.length}`
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ purgeBooksWithoutCover failed:", e);
  process.exit(1);
});
