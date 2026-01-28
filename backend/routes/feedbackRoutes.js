import express from "express";
import Feedback from "../models/Feedback.js";
import Notification from "../models/Notification.js";
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js";

const router = express.Router();

// Submit feedback
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { content, email } = req.body;
        const feedback = new Feedback({
            userId: req.user.userId,
            userName: req.user.name,
            email: email || "",
            content
        });
        await feedback.save();
        res.status(201).json({ message: "Feedback submitted successfully" });
    } catch (err) {
        console.error("Feedback submit error:", err);
        res.status(500).json({ message: "Failed to submit feedback" });
    }
});

// Admin: Get all feedback
router.get("/", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (err) {
        console.error("Feedback fetch error:", err);
        res.status(500).json({ message: "Failed to fetch feedback" });
    }
});

// User: Get my feedback
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (err) {
        console.error("My feedback fetch error:", err);
        res.status(500).json({ message: "Failed to fetch your feedback" });
    }
});

// Admin: Reply
router.put("/:id/reply", authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { reply } = req.body;
        const feedback = await Feedback.findById(req.params.id);
        if (!feedback) return res.status(404).json({ message: "Feedback not found" });

        feedback.adminReply = reply;
        feedback.status = "Replied";
        feedback.repliedAt = new Date();
        await feedback.save();

        // Notify User
        try {
             await Notification.create({
                userId: feedback.userId,
                type: "system",
                title: "Admin Replied to Feedback",
                message: "Admin replied to your feedback.",
                relatedId: feedback._id
            });
        } catch (e) {
            console.error("Notification error:", e);
        }

        res.json({ message: "Reply submitted", feedback });
    } catch (err) {
        console.error("Feedback reply error:", err);
        res.status(500).json({ message: "Failed to reply" });
    }
});

export default router;
