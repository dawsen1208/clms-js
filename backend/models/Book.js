// ✅ backend/models/Book.js
import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    // 📖 书名
    title: { type: String, required: true, index: true },

    // ✍️ 作者
    author: { type: String, required: true, index: true },

    // 📂 类型（如 Fiction / Technology / Business / Philosophy）
    category: { type: String, required: true, index: true },

    // 📝 简介
    description: { type: String, default: "" },

    // 📦 剩余库存
    copies: { type: Number, default: 5, min: 0 },

    // 📚 总库存（用于统计）
    totalCopies: { type: Number, default: 5, min: 0 },

    // 🕓 借阅时间（仅用于记录用途）
    borrowDate: { type: Date },

    // 📅 到期时间
    dueDate: { type: Date },

    // 🔢 借阅次数（用于热门榜推荐）
    borrowCount: { type: Number, default: 0, min: 0 },

    // 📖 ISBN编号
    isbn: { type: String, default: "" },

    // 🏢 出版社
    publisher: { type: String, default: "" },

    // 📅 出版日期
    publishDate: { type: Date },

    // 🏷️ 标签（用于分类和搜索）
    tags: [{ type: String }],

    // 📊 评分
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // 🔍 搜索关键词
    keywords: [{ type: String }],

    // 📷 封面图片URL
    coverImage: { type: String, default: "" },
    
    // 📷 多尺寸封面（用于前端 srcset）
    coverImageSet: {
      w160: { type: String, default: "" },
      w240: { type: String, default: "" },
      w360: { type: String, default: "" },
    },

    // 📖 书籍状态
    status: { 
      type: String, 
      enum: ["available", "borrowed", "reserved", "damaged", "lost"], 
      default: "available" 
    },

    // 📝 用户书评（归还后可填写）
    reviews: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        rating: { type: Number, min: 0, max: 5, required: true },
        comment: { type: String, default: "", maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true, // ✅ 自动生成 createdAt / updatedAt
    versionKey: false, // ✅ 去除 "__v"
  }
);

// ✅ 添加复合索引以提高查询性能
bookSchema.index({ title: 1, author: 1 });
bookSchema.index({ category: 1, borrowCount: -1 });
bookSchema.index({ status: 1, copies: 1 });
bookSchema.index({ "reviews.userId": 1 });
bookSchema.index({ isbn: 1 }, { unique: true, sparse: true });

// ✅ 添加实例方法
bookSchema.methods.isAvailable = function() {
  return this.status === "available" && this.copies > 0;
};

bookSchema.methods.borrow = function() {
  if (this.copies > 0) {
    this.copies -= 1;
    this.borrowCount += 1;
    if (this.copies === 0) {
      this.status = "borrowed";
    }
    return true;
  }
  return false;
};

bookSchema.methods.returnBook = function() {
  this.copies += 1;
  if (this.status === "borrowed") {
    this.status = "available";
  }
  return true;
};

// ✅ 计算并更新平均评分（基于 reviews）
bookSchema.methods.recalculateRating = function() {
  if (!this.reviews || this.reviews.length === 0) {
    this.rating = 0;
    return this;
  }
  const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  this.rating = Math.round((sum / this.reviews.length) * 10) / 10; // 保留1位小数
  return this;
};

// ✅ 创建并导出模型
const Book = mongoose.model("Book", bookSchema);
export default Book;
