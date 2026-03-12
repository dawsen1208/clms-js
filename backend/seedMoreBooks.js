/**
 * Seed More Books Script
 * Bulk imports additional book data into the database without clearing existing records.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "./models/Book.js";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";

const categories = [
  "Fiction",
  "Technology",
  "Business",
  "Philosophy",
  "Psychology",
  "Science",
  "History",
  "Education",
  "Art",
  "Travel",
  "Health",
];

const authors = [
  "Alice Walker",
  "Robert Martin",
  "Carol Dweck",
  "Andrew Hunt",
  "Neil Gaiman",
  "Haruki Murakami",
  "Isaac Asimov",
  "Malcolm Gladwell",
  "Daniel Kahneman",
  "Yuval Noah Harari",
  "Stephen Hawking",
  "Carl Sagan",
];

const publishers = [
  "Penguin Books",
  "O'Reilly Media",
  "HarperCollins",
  "Random House",
  "MIT Press",
  "Oxford University Press",
  "Cambridge University Press",
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function genIsbn(i) {
  // 生成伪 ISBN（不保证真实合法，但足够区分）
  const base = String(9780000000000 + i);
  return base.slice(0, 13);
}

function genTitle(i) {
  const adj = [
    "Modern",
    "Practical",
    "Advanced",
    "Essential",
    "Dynamic",
    "Creative",
    "Insightful",
    "Comprehensive",
    "Elegant",
    "Smart",
  ];
  const noun = [
    "Programming",
    "Design",
    "Systems",
    "Psychology",
    "Philosophy",
    "History",
    "Science",
    "Business",
    "Education",
    "Art",
  ];
  // 去除 Vol.**，仅生成主题式标题
  return `${sample(adj)} ${sample(noun)}`;
}

async function main() {
  const countArg = parseInt(process.argv[2] || "500", 10);
  const insertCount = Number.isFinite(countArg) && countArg > 0 ? countArg : 500;

  await mongoose.connect(uri);
  const before = await Book.countDocuments();
  console.log(`📚 当前书籍数量: ${before}`);
  console.log(`🚀 准备追加插入 ${insertCount} 本书籍...`);

  const docs = [];
  for (let i = 1; i <= insertCount; i++) {
    const copies = randInt(1, 12);
    const total = copies + randInt(0, 8);
    const category = sample(categories);
    const author = sample(authors);
    const publisher = sample(publishers);
    const pubYear = randInt(1980, 2024);
    const pubMonth = randInt(1, 12);
    const pubDay = randInt(1, 28);

    docs.push({
      title: genTitle(i),
      author,
      category,
      description: `Auto generated ${category} book ${i}.`,
      copies,
      totalCopies: total,
      borrowCount: randInt(0, 50),
      isbn: genIsbn(i),
      publisher,
      publishDate: new Date(`${pubYear}-${String(pubMonth).padStart(2, "0")}-${String(pubDay).padStart(2, "0")}`),
      tags: [category.toLowerCase(), "generated"],
      rating: parseFloat((Math.random() * 5).toFixed(1)),
      coverImage: "",
      status: "available",
      keywords: [category, author],
    });
  }

  // 使用 insertMany 进行批量写入；不清库且允许部分失败（例如偶发重复）
  const result = await Book.insertMany(docs, { ordered: false });
  console.log(`✅ 追加插入成功: ${result.length} 本书籍`);

  const after = await Book.countDocuments();
  console.log(`📈 插入后书籍总数: ${after}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 批量导入失败:", err);
  process.exit(1);
});
