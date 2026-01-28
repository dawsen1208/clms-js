import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  email: { type: String, default: "" },
  content: { type: String, required: true },
  adminReply: { type: String, default: "" },
  status: { type: String, enum: ["Unreplied", "Replied"], default: "Unreplied" },
  createdAt: { type: Date, default: Date.now },
  repliedAt: { type: Date }
});

export default mongoose.model("Feedback", feedbackSchema);
