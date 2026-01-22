// ✅ backend/models/BorrowHistory.js - 借阅历史记录
import mongoose from "mongoose";

const borrowHistorySchema = new mongoose.Schema({
  // 👤 用户ID（兼容字符串或ObjectId，与User.userId保持一致）
  userId: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true, 
    index: true,
    ref: "User"
  },
  
  // 📚 书籍ID（兼容字符串或ObjectId）
  bookId: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true, 
    index: true,
    ref: "Book"
  },
  
  // 📖 书籍标题（冗余存储，防止书籍被删除后丢失信息）
  bookTitle: { type: String, required: true },
  
  // 📖 书籍作者（冗余存储）
  bookAuthor: { type: String, default: "" },
  
  // 🧑 用户姓名（冗余存储，防止用户被删除后丢失信息）
  userName: { type: String, default: "" },
  
  // 🔁 操作类型
  action: { 
    type: String, 
    enum: ["borrow", "renew", "return"], 
    required: true,
    index: true 
  },
  
  // 📅 借阅日期
  borrowDate: { type: Date, default: Date.now },
  
  // 📅 应还日期
  dueDate: { type: Date },
  
  // 📅 实际归还日期
  returnDate: { type: Date },
  
  // 🔄 是否续借过
  isRenewed: { type: Boolean, default: false },
  
  // 🔄 续借次数
  renewCount: { type: Number, default: 0, min: 0 },
  
  // 📝 备注信息
  notes: { type: String, default: "" },
  
  // 🕐 记录创建时间
  createdAt: { type: Date, default: Date.now },
  
  // 🕐 记录更新时间
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

// ✅ 添加复合索引
borrowHistorySchema.index({ userId: 1, action: 1 });
borrowHistorySchema.index({ bookId: 1, action: 1 });
borrowHistorySchema.index({ userId: 1, bookId: 1 });
borrowHistorySchema.index({ borrowDate: -1 });

// ✅ 添加静态方法
borrowHistorySchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ borrowDate: -1 });
};

borrowHistorySchema.statics.findByBook = function(bookId) {
  return this.find({ bookId }).sort({ borrowDate: -1 });
};

borrowHistorySchema.statics.findByUserAndBook = function(userId, bookId) {
  return this.find({ userId, bookId }).sort({ borrowDate: -1 });
};

// ✅ 兼容ID类型转换（与BorrowRecord保持一致）
borrowHistorySchema.statics.formatId = function(id) {
  return typeof id === "object"
    ? id
    : mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : String(id);
};

const BorrowHistory = mongoose.model("BorrowHistory", borrowHistorySchema);
export default BorrowHistory;
