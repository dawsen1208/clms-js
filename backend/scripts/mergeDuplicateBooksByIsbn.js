/**
 * Merge Duplicate Books Script
 * Identifies and merges duplicate book records based on ISBN or metadata (title, author, cover).
 */
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

const mergeGroup = async (label, ids) => {
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
    `Merged group ${label} into book ${primary._id.toString()}, totalCopies=${primary.totalCopies}, copies=${primary.copies}`
  );
};

const normalizeText = (value) => {
  if (!value) return "";
  const s = String(value);
  const normalized = s.normalize ? s.normalize("NFKC") : s;
  return normalized
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .trim();
};

const normalizeCover = (book) => {
  const raw = book.coverImage || book.cover_image || book.cover || "";
  if (!raw) return "";
  const base = String(raw).split("?")[0];
  return base.toLowerCase();
};

const buildMetaKey = (book) => {
  const title = normalizeText(book.title);
  const author = normalizeText(book.author);
  const cover = normalizeCover(book);
  if (title && author) return `ta:${title}|${author}`;
  if (cover && author) return `ca:${cover}|${author}`;
  return null;
};

const main = async () => {
  await mongoose.connect(uri);

  const groups = await Book.aggregate([
    { $match: { isbn: { $exists: true, $ne: "" } } },
    { $group: { _id: "$isbn", ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (groups.length) {
    console.log(`Found ${groups.length} ISBN groups with duplicates.`);
    for (const group of groups) {
      await mergeGroup(`isbn:${group._id}`, group.ids);
    }
  } else {
    console.log("No duplicate ISBN groups found.");
  }

  const allBooks = await Book.find({});
  const metaMap = new Map();
  for (const book of allBooks) {
    const key = buildMetaKey(book);
    if (!key) continue;
    const list = metaMap.get(key) || [];
    list.push(book._id);
    metaMap.set(key, list);
  }

  const metaGroups = Array.from(metaMap.entries()).filter(
    ([, ids]) => ids.length > 1
  );

  if (metaGroups.length) {
    console.log(`Found ${metaGroups.length} metadata groups with duplicates.`);
    for (const [key, ids] of metaGroups) {
      await mergeGroup(key, ids);
    }
  } else {
    console.log("No metadata-based duplicate groups found.");
  }

  await mongoose.disconnect();
  console.log("Finished merging duplicate books.");
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
