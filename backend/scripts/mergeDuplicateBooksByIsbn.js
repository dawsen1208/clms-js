import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowHistory from "../models/BorrowHistory.js";
import BorrowRequest from "../models/BorrowRequest.js";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const mergeGroup = async (isbn, ids) => {
  const books = await Book.find({ _id: { $in: ids } }).sort({ createdAt: 1 });
  if (!books.length) return;

  const primary = books[0];
  const duplicates = books.slice(1);

  let copies = toNumber(primary.copies);
  let totalCopies = primary.totalCopies != null ? toNumber(primary.totalCopies) : copies;
  let borrowCount = toNumber(primary.borrowCount);

  for (const dup of duplicates) {
    const c = toNumber(dup.copies);
    const t = dup.totalCopies != null ? toNumber(dup.totalCopies) : c;
    const bc = toNumber(dup.borrowCount);
    copies += c;
    totalCopies += t;
    borrowCount += bc;

    if (!primary.coverImage && dup.coverImage) primary.coverImage = dup.coverImage;
    if (!primary.coverImageSet && dup.coverImageSet) primary.coverImageSet = dup.coverImageSet;
    if (!primary.publisher && dup.publisher) primary.publisher = dup.publisher;
    if (!primary.publishDate && dup.publishDate) primary.publishDate = dup.publishDate;

    const tagsA = Array.isArray(primary.tags) ? primary.tags : [];
    const tagsB = Array.isArray(dup.tags) ? dup.tags : [];
    primary.tags = Array.from(new Set([...tagsA, ...tagsB]));

    const kwA = Array.isArray(primary.keywords) ? primary.keywords : [];
    const kwB = Array.isArray(dup.keywords) ? dup.keywords : [];
    primary.keywords = Array.from(new Set([...kwA, ...kwB]));
  }

  primary.copies = copies;
  primary.totalCopies = totalCopies;
  primary.borrowCount = borrowCount;
  await primary.save();

  for (const dup of duplicates) {
    const fromId = dup._id;
    const variants = [fromId, String(fromId)];

    await BorrowRecord.updateMany(
      { bookId: { $in: variants } },
      { $set: { bookId: primary._id } }
    );

    await BorrowHistory.updateMany(
      { bookId: { $in: variants } },
      { $set: { bookId: primary._id } }
    );

    await BorrowRequest.updateMany(
      { bookId: { $in: variants } },
      { $set: { bookId: primary._id } }
    );

    await Book.deleteOne({ _id: fromId });
  }

  console.log(
    `Merged ISBN ${isbn} into book ${primary._id.toString()}, totalCopies=${primary.totalCopies}, copies=${primary.copies}`
  );
};

const main = async () => {
  await mongoose.connect(uri);

  const groups = await Book.aggregate([
    { $match: { isbn: { $exists: true, $ne: "" } } },
    { $group: { _id: "$isbn", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (!groups.length) {
    console.log("No duplicate ISBN groups found.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${groups.length} ISBN groups with duplicates.`);

  for (const group of groups) {
    await mergeGroup(group._id, group.ids);
  }

  await mongoose.disconnect();
  console.log("Finished merging duplicate books by ISBN.");
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

