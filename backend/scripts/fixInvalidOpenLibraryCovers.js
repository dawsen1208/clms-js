// ✅ backend/scripts/fixInvalidOpenLibraryCovers.js
// Replace invalid Open Library ISBN cover links (fake/404) using OL search or Google Books.
import https from "https";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

const isLikelyIsbn = (s) => typeof s === "string" && /^\d{10}(\d{3})?$/.test(s?.trim?.() || "");
const isFakeOpenLibIsbnCover = (url = "") =>
  /https:\/\/covers\.openlibrary\.org\/b\/isbn\/978000000/i.test(url);

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

const buildIsbnCoverUrl = (isbn, size = "L") =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;
const buildCoverIdUrl = (coverId, size = "L") =>
  `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`;

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[\s\-_:;.,'"`~!@#$%^&*(){}\[\]\\\/|]+/g, " ")
    .trim();

async function findCoverByOpenLibSearch(title, author) {
  if (!title) return null;
  const qTitle = encodeURIComponent(title.trim());
  const qAuthor = author ? encodeURIComponent(author.trim()) : "";
  const nTitle = norm(title);
  const nAuthor = norm(author || "");
  const url = `https://openlibrary.org/search.json?title=${qTitle}${qAuthor ? `&author=${qAuthor}` : ""}&limit=5`;
  try {
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.docs) || data.docs.length === 0) return null;
    const scored = data.docs
      .map((d) => {
        const t = norm(d.title || d.title_suggest || "");
        const a = norm(Array.isArray(d.author_name) ? d.author_name.join(" ") : d.author_name || "");
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

const pickBestImage = (imageLinks = {}) => {
  const order = ["extraLarge", "large", "medium", "small", "thumbnail", "smallThumbnail"];
  for (const key of order) {
    if (imageLinks[key]) {
      let url = imageLinks[key];
      if (url.startsWith("http://")) url = url.replace("http://", "https://");
      return url;
    }
  }
  return null;
};

async function findByGoogleBooks(title, author) {
  if (!title) return null;
  const q = encodeURIComponent(`intitle:${title} ${author ? "inauthor:" + author : ""}`.trim());
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5`;
  try {
    const data = await fetchJson(url);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) return null;
    for (const it of data.items) {
      const img = pickBestImage(it.volumeInfo?.imageLinks || {});
      if (img) return img;
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

  const books = await Book.find(
    { coverImage: { $type: "string" } },
    { _id: 1, title: 1, author: 1, coverImage: 1 }
  ).lean();

  let checked = 0, fixed = 0, cleared = 0;
  for (const b of books) {
    checked++;
    const url = b.coverImage || "";
    const isAbsolute = /^https?:\/\//i.test(url);
    if (!isAbsolute) {
      // Relative/local URLs are managed by our app/CDN; skip
      continue;
    }
    const looksFake = isFakeOpenLibIsbnCover(url);
    const exists = await urlExists(url);
    if (!url || (!exists && looksFake)) {
      let newUrl = await findCoverByOpenLibSearch(b.title, b.author);
      if (!newUrl) newUrl = await findByGoogleBooks(b.title, b.author);
      if (newUrl) {
        await Book.updateOne({ _id: b._id }, { $set: { coverImage: newUrl } });
        fixed++;
      } else {
        await Book.updateOne({ _id: b._id }, { $set: { coverImage: "" } });
        cleared++;
      }
    }
  }

  console.log(`✅ Fix invalid covers done. checked=${checked}, fixed=${fixed}, cleared=${cleared}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("❌ fixInvalidOpenLibraryCovers failed:", e);
  process.exit(1);
});
