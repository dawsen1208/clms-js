// ✅ backend/models/BorrowRequest.js
import mongoose from "mongoose";

/* =========================================================
   📦 BorrowRequest — 用户的续借 / 归还申请
   ========================================================= */
const borrowRequestSchema = new mongoose.Schema(
  {
    // 👤 用户ID（兼容字符串或ObjectId，与User.userId保持一致）
    userId: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true, 
      index: true,
      ref: "User"
    },

    // 🧑 用户姓名（展示用，冗余存储）
    userName: { type: String, required: true },

    // 📚 书籍ID（兼容字符串或ObjectId）
    bookId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
      ref: "Book",
    },

    // 📘 书籍标题（防止书籍被删除后丢失展示名称）
    bookTitle: { type: String, required: true },

    // ✍️ 书籍作者（冗余存储）
    bookAuthor: { type: String, default: "" },

    // 🔁 申请类型
    type: { type: String, enum: ["renew", "return"], required: true },

    // 🕓 当前状态
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "invalid"],
      default: "pending",
      index: true,
    },

    // 🧩 拒绝理由（仅拒绝时使用）
    reason: { type: String, default: "" },

    // 🧭 审批时间（自动填充）
    handledAt: { type: Date, default: null },
    
    // ⏳ 续借天数（可选，默认 7 天；仅 type=renew 有意义）
    days: { type: Number, min: 1, max: 30, default: 7 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
   ⚙️ 中间件：审批状态变化时自动写入 handledAt
   ========================================================= */
borrowRequestSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status !== "pending") {
    this.handledAt = new Date();
  }
  next();
});

/* =========================================================
   🧠 索引优化
   ========================================================= */
borrowRequestSchema.index({ status: 1, type: 1 });
borrowRequestSchema.index({ userId: 1, bookId: 1, type: 1, status: 1 });

/* =========================================================
   ✅ 辅助方法：快速查找用户待审批申请
   =========================================================
   - 自动兼容 userId / bookId 为 ObjectId 或 String；
   - 用于防止重复提交；
   - 与 BorrowRecord 的兼容逻辑保持一致；
*/
borrowRequestSchema.statics.findPending = async function (userId, bookId, type) {
  // ✅ 统一格式化 ID
  const UserId =
    typeof userId === "object"
      ? userId
      : mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : String(userId);

  const BookId =
    typeof bookId === "object"
      ? bookId
      : mongoose.Types.ObjectId.isValid(bookId)
      ? new mongoose.Types.ObjectId(bookId)
      : String(bookId);

  const query = {
    type,
    status: "pending",
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

  console.log("🔍 BorrowRequest.findPending 查询条件 =>", JSON.stringify(query, null, 2));

  return this.findOne(query).sort({ createdAt: -1 });
};

/* =========================================================
   🧾 导出模型
   ========================================================= */
const BorrowRequest = mongoose.model("BorrowRequest", borrowRequestSchema);
export default BorrowRequest;
