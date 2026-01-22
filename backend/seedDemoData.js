// ✅ backend/seedDemoData.js — 批量生成演示数据（用户、借阅记录、历史、申请）
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Book from "./models/Book.js";
import BorrowRecord from "./models/BorrowRecord.js";
import BorrowHistory from "./models/BorrowHistory.js";
import BorrowRequest from "./models/BorrowRequest.js";

dotenv.config();

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = (arr, n = 1) => {
  const copy = arr.slice();
  const res = [];
  n = Math.min(n, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    res.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return res;
};

async function ensureReaders(count = 30, startId = 200001) {
  const created = [];
  for (let i = 0; i < count; i++) {
    const userId = `r${startId + i}`;
    const name = `测试读者${i + 1}`;
    const exists = await User.findOne({ userId });
    if (exists) continue;
    const u = await User.create({
      userId,
      name,
      password: "test123",
      role: "Reader",
      email: "",
      avatar: "",
    });
    created.push(u);
  }
  // 为现有测试账号补充信息（如果存在）
  const knownIds = ["r100003", "r100004", "r100005", "r100006", "r100007"];
  for (const kid of knownIds) {
    const u = await User.findOne({ userId: kid });
    if (u && !u.name) {
      u.name = `测试读者${kid.slice(-3)}`;
      await u.save();
    }
  }
  return created;
}

async function seedBorrowsHistoriesRequests(targetUserIds, books) {
  const now = new Date();

  let createdRecords = 0;
  let createdHistories = 0;
  let createdRequests = 0;

  for (const userId of targetUserIds) {
    const user = await User.findOne({ userId });
    if (!user) continue;

    const picks = sample(books, randInt(3, 6));
    for (const book of picks) {
      // 借阅日期：过去 60 天内任意一天
      const borrowedAt = new Date(now.getTime() - randInt(1, 60) * 24 * 60 * 60 * 1000);
      // 到期日期：借阅后 15~45 天
      const dueDate = new Date(borrowedAt.getTime() + randInt(15, 45) * 24 * 60 * 60 * 1000);

      const returned = Math.random() < 0.6; // 60% 已归还
      const record = await BorrowRecord.create({
        userId,
        bookId: book._id,
        borrowedAt,
        dueDate,
        renewed: false,
        renewCount: 0,
        returned,
        returnedAt: returned ? new Date(dueDate.getTime() - randInt(0, 5) * 24 * 60 * 60 * 1000) : null,
        bookTitle: book.title,
        bookAuthor: book.author,
        userName: user.name || user.userId,
        notes: "",
      });
      createdRecords++;

      // 历史：借阅
      await BorrowHistory.create({
        userId,
        bookId: book._id,
        bookTitle: book.title,
        bookAuthor: book.author,
        userName: user.name || user.userId,
        action: "borrow",
        borrowDate: borrowedAt,
        dueDate,
        isRenewed: false,
        renewCount: 0,
      });
      createdHistories++;

      // 30% 续借一次（仅未归还的）
      if (!returned && Math.random() < 0.3) {
        const addedDays = randInt(7, 30);
        const newDue = new Date(dueDate.getTime() + addedDays * 24 * 60 * 60 * 1000);
        record.renewed = true;
        record.renewCount = 1;
        record.dueDate = newDue;
        await record.save();

        await BorrowHistory.create({
          userId,
          bookId: book._id,
          bookTitle: book.title,
          bookAuthor: book.author,
          userName: user.name || user.userId,
          action: "renew",
          borrowDate: borrowedAt,
          dueDate: newDue,
          isRenewed: true,
          renewCount: 1,
        });
        createdHistories++;
      }

      // 若已归还，写入归还历史
      if (returned) {
        await BorrowHistory.create({
          userId,
          bookId: book._id,
          bookTitle: book.title,
          bookAuthor: book.author,
          userName: user.name || user.userId,
          action: "return",
          borrowDate: borrowedAt,
          dueDate,
          returnDate: record.returnedAt,
          isRenewed: record.renewed,
          renewCount: record.renewCount,
        });
        createdHistories++;
      }

      // 申请：为部分未归还记录生成待审批续借/归还申请
      if (!returned && Math.random() < 0.4) {
        const type = Math.random() < 0.5 ? "renew" : "return";
        const statusPool = ["pending", "approved", "rejected"];
        const status = statusPool[randInt(0, statusPool.length - 1)];
        await BorrowRequest.create({
          userId,
          userName: user.name || user.userId,
          bookId: book._id,
          bookTitle: book.title,
          bookAuthor: book.author,
          type,
          status,
          reason: status === "rejected" ? "不符合续借条件" : "",
        });
        createdRequests++;
      }

      // 更新书籍借阅次数与库存（避免库存负数）
      try {
        const incCopies = returned ? 0 : -1;
        const update = {
          $inc: { borrowCount: 1, copies: incCopies },
        };
        const updated = await Book.findByIdAndUpdate(book._id, update, { new: true });
        if (updated && updated.copies < 0) {
          // 矫正库存
          updated.copies = 0;
          await updated.save();
        }
      } catch {}
    }
  }

  return { createdRecords, createdHistories, createdRequests };
}

async function main() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";
  await mongoose.connect(uri);

  const bookCount = await Book.countDocuments();
  console.log(`📚 现有书籍数量: ${bookCount}`);
  if (bookCount < 30) {
    console.log("⚠️ 书籍太少，建议先运行: node seedBooks.js 以导入大量书籍。");
  }

  // 1) 创建读者账号（不删除已有账号）
  const newReaders = await ensureReaders(30, 200001);
  console.log(`👥 新增读者数量: ${newReaders.length}`);

  // 2) 选择目标用户（包含已存在测试账号）
  const targetUserIds = [
    "r100003",
    "r100004",
    "r100005",
    "r100006",
    "r100007",
    ...newReaders.map((u) => u.userId),
  ];

  const books = await Book.find().lean();
  const { createdRecords, createdHistories, createdRequests } = await seedBorrowsHistoriesRequests(
    targetUserIds,
    books
  );

  console.log("✅ 批量造数完成:");
  console.log(`   • 借阅记录: ${createdRecords}`);
  console.log(`   • 历史记录: ${createdHistories}`);
  console.log(`   • 申请记录: ${createdRequests}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 造数失败:", err);
  process.exit(1);
});