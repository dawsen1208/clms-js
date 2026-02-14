// ✅ backend/scripts/populateCoversFromOpenLibrary.js
import mongoose from "mongoose";
import https from "https";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

const isLikelyIsbn = (s) => typeof s === "string" && /^\d{10}(\d{3})?$/.test(s.trim());

const buildIsbnCoverUrl = (isbn, size = "L") =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;
const buildCoverIdUrl = (coverId, size = "L") =>
  `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;

const urlExists = (url) =>
  new Promise((resolve) => {
    https
      .get(url, (res) => {
        resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300);
        res.resume();
      })
      .on("error", () => resolve(false));
  });

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if ((res.statusCode || 0) >= 400) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[\s\-_:;.,'"`~!@#$%^&*(){}\[\]\\\/|]+/g, " ")
    .trim();

async function findCoverBySearch(title, author) {
  if (!title) return null;
  const qTitle = encodeURIComponent(title.trim());
  const qAuthor = author ? encodeURIComponent(author.trim()) : "";
  const nTitle = norm(title);
  const nAuthor = norm(author || "");
  const url = `https://openlibrary.org/search.json?title=${qTitle}${
    qAuthor ? `&author=${qAuthor}` : ""
  }&limit=5`;
  try {
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.docs) || data.docs.length === 0) return null;
    // 排序：标题完全匹配+作者相近 > 有 cover_i > 有 isbn
    const scored = data.docs
      .map((d) => {
        const t = norm(d.title || d.title_suggest || "");
        const a = norm(
          Array.isArray(d.author_name) ? d.author_name.join(" ") : d.author_name || ""
        );
        let score = 0;
        if (t === nTitle) score += 5;
        if (a && nAuthor && a.includes(nAuthor)) score += 2;
        if (typeof d.cover_i === "number") score += 3;
        if (Array.isArray(d.isbn) && d.isbn.length > 0) score += 1;
        return { d, score };
      })
      .sort((x, y) => y.score - x.score);

    for (const { d } of scored) {
      if (typeof d.cover_i === "number") {
        const tryUrl = buildCoverIdUrl(d.cover_i, "L");
        if (await urlExists(tryUrl)) return tryUrl;
      }
    }
    for (const { d } of scored) {
      if (Array.isArray(d.isbn) && d.isbn.length) {
        const isbn = d.isbn.find((s) => isLikelyIsbn(s));
        if (isbn) {
          const tryUrl = buildIsbnCoverUrl(isbn, "L");
          if (await urlExists(tryUrl)) return tryUrl;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGO_URI in env");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const cur = Book.find({}, { _id: 1, title: 1, author: 1, isbn: 1, coverImage: 1 }).lean().cursor();
  let updated = 0;
  let total = 0;
  let viaIsbn = 0;
  let viaSearch = 0;

  for (let doc = await cur.next(); doc != null; doc = await cur.next()) {
    total++;
    const { _id, title, author, isbn, coverImage } = doc;
    if (coverImage && coverImage.startsWith("http")) continue;

    let url = null;
    if (isLikelyIsbn(isbn)) {
      const tryUrl = buildIsbnCoverUrl(isbn, "L");
      if (await urlExists(tryUrl)) {
        url = tryUrl;
        viaIsbn++;
      }
    }
    if (!url) {
      const found = await findCoverBySearch(title, author);
      if (found) {
        url = found;
        viaSearch++;
      }
    }
    if (!url) continue;
    try {
      await Book.updateOne({ _id }, { $set: { coverImage: url } });
      updated++;
    } catch (e) {
      // ignore
    }
  }

  console.log(`✅ Done. Scanned: ${total}, Updated: ${updated}, viaIsbn: ${viaIsbn}, viaSearch: ${viaSearch}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ populateCovers failed:", e);
  process.exit(1);
});
