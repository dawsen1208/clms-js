/**
 * BorrowRecord Model
 * Stores active borrowing transactions, tracking due dates, renewals, and return status.
 */
import mongoose from "mongoose";

const borrowRecordSchema = new mongoose.Schema(
  {
    // User ID (compatible with String or ObjectId, consistent with User.userId)
    userId: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true, 
      index: true,
      ref: "User"
    },

    // Book ID (compatible with String or ObjectId)
    bookId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
      ref: "Book",
    },

    // Borrowing time information
    borrowedAt: { type: Date, default: Date.now }, // Borrow date
    dueDate: { type: Date, required: true }, // Due date

    // Renewal information
    renewed: { type: Boolean, default: false },
    renewedAt: { type: Date, default: null },
    renewCount: { type: Number, default: 0, min: 0 }, // Number of renewals

    // Return information
    returned: { type: Boolean, default: false },
    returnedAt: { type: Date, default: null },

    // Book info (redundant storage to prevent loss if book is deleted)
    bookTitle: { type: String, default: "" },
    bookAuthor: { type: String, default: "" },

    // User info (redundant storage)
    userName: { type: String, default: "" },

    // Other information
    notes: { type: String, default: "" }, // Notes
  },
  {
    timestamps: true, // Automatic createdAt / updatedAt
    versionKey: false,
  }
);

/* =========================================================
   🧩 Compound Indexes
   =========================================================
   - Prevents multiple unreturned borrows of the same book by the same user.
   - Compatible with bookId as String or ObjectId.
*/
borrowRecordSchema.index({ userId: 1, bookId: 1, returned: 1 });

// Time-based indexes for sorting
borrowRecordSchema.index({ createdAt: 1 });
borrowRecordSchema.index({ borrowedAt: 1 });

/* =========================================================
   🧠 Helper Static Methods (Unified ID matching logic)
   =========================================================
   Can be used directly in controllers:
   BorrowRecord.findByBook(userId, bookId)
   ✅ Compatible with userId and bookId as ObjectId or String
*/
// Find active (unreturned) record for a specific user and book
borrowRecordSchema.statics.findActiveByUserAndBook = async function (userId, bookId) {
  // Handle Book ID (Support ObjectId / String)
  const BookId =
    typeof bookId === "object"
      ? bookId
      : mongoose.Types.ObjectId.isValid(bookId)
      ? new mongoose.Types.ObjectId(bookId)
      : String(bookId);

  // Handle User ID (Support ObjectId / String)
  const UserId =
    typeof userId === "object"
      ? userId
      : mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : String(userId);

  // Construct match conditions (Compatible with different types)
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

// 续借：在原 dueDate 的基础上顺延指定天数（默认 30）
borrowRecordSchema.methods.renew = function(days = 30) {
  this.renewed = true;
  this.renewedAt = new Date();
  this.renewCount += 1;
  
  // 延长到期日期（以当前记录的 dueDate 为基准）
  const base = this.dueDate ? new Date(this.dueDate) : new Date();
  const newDueDate = new Date(base.getTime());
  newDueDate.setDate(newDueDate.getDate() + Number(days || 0));
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
