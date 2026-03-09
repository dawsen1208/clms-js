/**
 * BorrowRequest Model
 * Manages user requests for renewals and returns, requiring administrator approval.
 */
import mongoose from "mongoose";

const borrowRequestSchema = new mongoose.Schema(
  {
    // User ID (compatible with String or ObjectId, consistent with User.userId)
    userId: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true, 
      index: true,
      ref: "User"
    },

    // User name (redundant storage for display)
    userName: { type: String, required: true },

    // Book ID (compatible with String or ObjectId)
    bookId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      index: true,
      ref: "Book",
    },

    // Book title (prevent loss of name if book is deleted)
    bookTitle: { type: String, required: true },

    // Book author (redundant storage)
    bookAuthor: { type: String, default: "" },

    // Application type
    type: { type: String, enum: ["renew", "return"], required: true },

    // Current status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "invalid"],
      default: "pending",
      index: true,
    },

    // Rejection reason (used only when status is rejected)
    reason: { type: String, default: "" },

    // Approval time (automatically filled)
    handledAt: { type: Date, default: null },
    
    // Renewal days (optional, default 7 days; only meaningful for type=renew)
    days: { type: Number, min: 1, max: 30, default: 7 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* =========================================================
   ⚙️ Middleware: Automatically set handledAt when status changes
   ========================================================= */
borrowRequestSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status !== "pending") {
    this.handledAt = new Date();
  }
  next();
});

/* =========================================================
   🧠 Index Optimization
   ========================================================= */
borrowRequestSchema.index({ status: 1, type: 1 });
borrowRequestSchema.index({ userId: 1, bookId: 1, type: 1, status: 1 });

/* =========================================================
   ✅ Helper Methods: Quick find pending applications
   =========================================================
   - Automatically handles userId / bookId as ObjectId or String.
   - Used to prevent duplicate submissions.
*/
borrowRequestSchema.statics.findPending = async function (userId, bookId, type) {
  // Unified ID formatting
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

  return this.findOne(query).sort({ createdAt: -1 });
};

/* =========================================================
   🧾 Export Model
   ========================================================= */
const BorrowRequest = mongoose.model("BorrowRequest", borrowRequestSchema);
export default BorrowRequest;
