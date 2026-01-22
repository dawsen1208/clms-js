import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "./models/Book.js";

dotenv.config();

const seedBooks = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db");

  await Book.deleteMany();
  await Book.insertMany([
    { title: "JavaScript 高级程序设计", author: "Nicholas Zakas", copies: 3 },
    { title: "Node.js 实战", author: "Mike Cantelon", copies: 2 },
    { title: "深入浅出 React", author: "Stoyan Stefanov", copies: 5 }
  ]);

  console.log("📚 测试数据已插入");
  process.exit();
};

seedBooks();
