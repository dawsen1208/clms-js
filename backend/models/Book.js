/**
 * Book Model
 * Defines the schema for books in the library, including inventory, metadata, and user reviews.
 */
import mongoose from "mongoose";

const bookSchema = new mongoose.Schema(
  {
    // Book title
    title: { type: String, required: true, index: true },

    // Author
    author: { type: String, required: true, index: true },

    // Category (e.g., Fiction / Technology / Business / Philosophy)
    category: { type: String, required: true, index: true },

    // Description
    description: { type: String, default: "" },

    // Available copies
    copies: { type: Number, default: 5, min: 0 },

    // Total copies (for statistics)
    totalCopies: { type: Number, default: 5, min: 0 },

    // Borrow time (for record purposes)
    borrowDate: { type: Date },

    // Due date
    dueDate: { type: Date },

    // Borrow count (for popularity recommendation)
    borrowCount: { type: Number, default: 0, min: 0 },

    // ISBN number
    isbn: { type: String, default: "" },

    // Publisher
    publisher: { type: String, default: "" },

    // Publication date
    publishDate: { type: Date },

    // Tags (for classification and search)
    tags: [{ type: String }],

    // Rating
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // Search keywords
    keywords: [{ type: String }],

    // Cover image URL
    coverImage: { type: String, default: "" },
    
    // Multi-size covers (for frontend srcset)
    coverImageSet: {
      w160: { type: String, default: "" },
      w240: { type: String, default: "" },
      w360: { type: String, default: "" },
    },

    // Book status
    status: { 
      type: String, 
      enum: ["available", "borrowed", "reserved", "damaged", "lost"], 
      default: "available" 
    },

    // User reviews
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
    timestamps: true, // Automatically generate createdAt / updatedAt
    versionKey: false, // Remove "__v"
  }
);

// Compound indexes for performance
bookSchema.index({ title: 1, author: 1 });
bookSchema.index({ category: 1, borrowCount: -1 });
bookSchema.index({ status: 1, copies: 1 });
bookSchema.index({ "reviews.userId": 1 });
bookSchema.index({ isbn: 1 }, { unique: true, sparse: true });

// Instance methods
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

bookSchema.methods.return = function() {
  this.copies += 1;
  this.status = "available";
};

export default mongoose.model("Book", bookSchema);
