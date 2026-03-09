/**
 * Seed Demo Data Script
 * Generates bulk demo data including users, borrow records, history, and requests for testing.
 */
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
    const name = `Test Reader ${i + 1}`;
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
  // Complement info for existing test accounts
  const knownIds = ["r100003", "r100004", "r100005", "r100006", "r100007"];
  for (const kid of knownIds) {
    const u = await User.findOne({ userId: kid });
    if (u && !u.name) {
      u.name = `Test Reader ${kid.slice(-3)}`;
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
      // Borrow date: random day within the past 60 days
      const borrowedAt = new Date(now.getTime() - randInt(1, 60) * 24 * 60 * 60 * 1000);
      // Due date: 15-45 days after borrowing
      const dueDate = new Date(borrowedAt.getTime() + randInt(15, 45) * 24 * 60 * 60 * 1000);

      const returned = Math.random() < 0.6; // 60% returned
      const record = await BorrowRecord.create({        userId,
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

      // History: borrow
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

      if (returned) {
        // History: return
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
          isRenewed: false,
          renewCount: 0,
        });
        createdHistories++;
      } else {
        // If not returned, 30% chance of a pending request
        if (Math.random() < 0.3) {
          const type = Math.random() < 0.5 ? "renew" : "return";
          await BorrowRequest.create({
            userId,
            userName: user.name || user.userId,
            bookId: book._id,
            bookTitle: book.title,
            bookAuthor: book.author,
            type,
            status: "pending",
            days: type === "renew" ? 7 : undefined,
          });
          createdRequests++;
        }
      }
    }
  }
  return { createdRecords, createdHistories, createdRequests };
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI");
    process.exit(1);
  }

  console.log("🚀 Connecting to DB...");
  await mongoose.connect(uri);

  const books = await Book.find().limit(50);
  if (books.length === 0) {
    console.error("❌ No books found, please seed books first");
    process.exit(1);
  }

  console.log("👤 Ensuring test readers...");
  const newReaders = await ensureReaders(30);
  console.log(`✅ Created ${newReaders.length} new readers`);

  const allReaderIds = (await User.find({ role: "Reader" })).map(u => u.userId);
  
  console.log("📚 Seeding borrowing data...");
  const stats = await seedBorrowsHistoriesRequests(allReaderIds, books);
  
  console.log(`🎉 Seed completed!`);
  console.log(`   - Records: ${stats.createdRecords}`);
  console.log(`   - Histories: ${stats.createdHistories}`);
  console.log(`   - Requests: ${stats.createdRequests}`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});