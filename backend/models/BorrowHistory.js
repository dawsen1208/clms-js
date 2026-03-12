/**
 * BorrowHistory Model
 * Records all borrowing actions (borrow, renew, return) for auditing and reporting purposes.
 */
import mongoose from "mongoose";

const borrowHistorySchema = new mongoose.Schema({
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
    ref: "Book"
  },
  
  // Book title (redundant storage to prevent data loss if book is deleted)
  bookTitle: { type: String, required: true },
  
  // Book author (redundant storage)
  bookAuthor: { type: String, default: "" },
  
  // User name (redundant storage to prevent data loss if user is deleted)
  userName: { type: String, default: "" },
  
  // Action type
  action: { 
    type: String, 
    enum: ["borrow", "renew", "return", "cancel"], 
    required: true,
    index: true 
  },
  
  // Borrow date
  borrowDate: { type: Date, default: Date.now },
  
  // Due date
  dueDate: { type: Date },
  
  // Actual return date
  returnDate: { type: Date },
  
  // Whether it was renewed
  isRenewed: { type: Boolean, default: false },
  
  // Number of renewals
  renewCount: { type: Number, default: 0, min: 0 },
  
  // Notes
  notes: { type: String, default: "" },
  
  // Record creation time
  createdAt: { type: Date, default: Date.now },
  
  // Record update time
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  versionKey: false
});

// Compound indexes
borrowHistorySchema.index({ userId: 1, action: 1 });
borrowHistorySchema.index({ bookId: 1, action: 1 });
borrowHistorySchema.index({ userId: 1, bookId: 1 });
borrowHistorySchema.index({ borrowDate: -1 });
borrowHistorySchema.index({ createdAt: -1 });

// Static methods
borrowHistorySchema.statics.findByUser = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

borrowHistorySchema.statics.findByBook = function(bookId) {
  return this.find({ bookId }).sort({ createdAt: -1 });
};

borrowHistorySchema.statics.findByUserAndBook = function(userId, bookId) {
  return this.find({ userId, bookId }).sort({ createdAt: -1 });
};

// Compatible ID type conversion (consistent with BorrowRecord)
borrowHistorySchema.statics.formatId = function(id) {
  return typeof id === "object"
    ? id
    : mongoose.Types.ObjectId.isValid(id)
    ? new mongoose.Types.ObjectId(id)
    : String(id);
};

const BorrowHistory = mongoose.model("BorrowHistory", borrowHistorySchema);
export default BorrowHistory;
