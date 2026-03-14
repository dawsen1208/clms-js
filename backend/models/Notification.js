/**
 * Notification Model
 * Manages in-app notifications for users, including system messages and borrow/return updates.
 */
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["info", "warning", "success", "error", "system", "feedback_reply"], default: "info" },
  relatedId: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);
