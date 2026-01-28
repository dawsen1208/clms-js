import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ["system", "personal"], default: "personal" },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  relatedId: { type: String }, // e.g. feedbackId, bookId
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);
