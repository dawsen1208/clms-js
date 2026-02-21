// ✅ backend/models/BorrowRecord.js
import mongoose from "mongoose";

const borrowRecordSchema = new mongoose.Schema(
  {
    // ✅ 用户ID（兼容字符串或ObjectId，与User.userId保持一致）
    userId: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true, 
      index: true,
      ref: "User"
    },

    // ✅ 书籍ID（兼容字符串或ObjectId）
    bookId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
      ref: "Book",
    },

    // ✅ 借阅时间信息
    borrowedAt: { type: Date, default: Date.now }, // 借阅时间
    dueDate: { type: Date, required: true }, // 到期时间

    // ✅ 续借信息
    renewed: { type: Boolean, default: false },
    renewedAt: { type: Date, default: null },
    renewCount: { type: Number, default: 0, min: 0 }, // 续借次数

    // ✅ 归还信息
    returned: { type: Boolean, default: false },
    returnedAt: { type: Date, default: null },

    // ✅ 书籍信息（冗余存储，防止书籍被删除）
    bookTitle: { type: String, default: "" },
    bookAuthor: { type: String, default: "" },

    // ✅ 用户信息（冗余存储）
    userName: { type: String, default: "" },

    // ✅ 其他信息
    notes: { type: String, default: "" }, // 备注信息
  },
  {
    timestamps: true, // 自动 createdAt / updatedAt
    versionKey: false,
  }
);

/* =========================================================
   🧩 组合索引
   =========================================================
   - 防止同一用户对同一本书重复借阅未归还；
   - 兼容 bookId 为字符串或 ObjectId；
*/
borrowRecordSchema.index({ userId: 1, bookId: 1, returned: 1 });

// 时间相关索引，便于按时间排序查询
borrowRecordSchema.index({ createdAt: 1 });
borrowRecordSchema.index({ borrowedAt: 1 });

/* =========================================================
   🧠 辅助静态方法（统一 ID 匹配逻辑）
   =========================================================
   在控制器中可以直接使用：
   BorrowRecord.findByBook(userId, bookId)
   ✅ 兼容 userId 和 bookId 为 ObjectId 或 String
*/
// 查找指定用户未归还的指定书籍记录（兼容 ID 类型）
borrowRecordSchema.statics.findActiveByUserAndBook = async function (userId, bookId) {
  // ✅ 处理书籍ID（支持 ObjectId / String）
  const BookId =
    typeof bookId === "object"
      ? bookId
      : mongoose.Types.ObjectId.isValid(bookId)
      ? new mongoose.Types.ObjectId(bookId)
      : String(bookId);

  // ✅ 处理用户ID（支持 ObjectId / String）
  const UserId =
    typeof userId === "object"
      ? userId
      : mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : String(userId);

  // ✅ 构造匹配条件（兼容不同类型）
  const query = {
    returned: false,
    $and: [
      {
        $or: [
          { userId: UserId },
          { userId: String(UserId) },
          { userId: mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined },
        ].filter(Boolean),
      },
      {
        $or: [
          { bookId: BookId },
          { bookId: String(BookId) },
          { bookId: mongoose.Types.ObjectId.isValid(bookId) ? new mongoose.Types.ObjectId(bookId) : undefined },
        ].filter(Boolean),
      },
    ],
  };

  console.log("🔍 BorrowRecord.findActiveByUserAndBook 查询条件 =>", JSON.stringify(query, null, 2));

  return this.findOne(query).sort({ borrowedAt: -1 });
};

/* =========================================================
   📊 更多静态方法
   ========================================================= */
// 查找用户的所有借阅记录
borrowRecordSchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ borrowedAt: -1 });
};

// 查找书籍的所有借阅记录
borrowRecordSchema.statics.findRecordsByBook = function(bookId) {
  return this.find({ bookId }).sort({ borrowedAt: -1 });
};

// 查找用户未归还的借阅记录
borrowRecordSchema.statics.findUserActiveBorrows = function(userId) {
  return this.find({ userId, returned: false }).sort({ borrowedAt: -1 });
};

// 统计用户未归还的书籍数量
borrowRecordSchema.statics.countUserActiveBorrows = function(userId) {
  return this.countDocuments({ userId, returned: false });
};

// 统计书籍被借阅的次数
borrowRecordSchema.statics.countBookBorrows = function(bookId) {
  return this.countDocuments({ bookId });
};

// ✅ 统一ID格式化方法（与 BorrowHistory 保持一致）
borrowRecordSchema.statics.formatId = function(id) {
  return typeof id === "object"
    ? id
    : mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : String(id);
};

/* =========================================================
   🔧 实例方法
   ========================================================= */
// 检查是否逾期
borrowRecordSchema.methods.isOverdue = function() {
  return !this.returned && this.dueDate < new Date();
};

// 获取剩余天数
borrowRecordSchema.methods.getDaysRemaining = function() {
  if (this.returned) return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// 续借
borrowRecordSchema.methods.renew = function(days = 30) {
  this.renewed = true;
  this.renewedAt = new Date();
  this.renewCount += 1;
  
  // 延长到期日期
  const newDueDate = new Date();
  newDueDate.setDate(newDueDate.getDate() + days);
  this.dueDate = newDueDate;
  
  return this.save();
};

// 归还
borrowRecordSchema.methods.returnBook = function() {
  this.returned = true;
  this.returnedAt = new Date();
  return this.save();
};

export default mongoose.model("BorrowRecord", borrowRecordSchema);
