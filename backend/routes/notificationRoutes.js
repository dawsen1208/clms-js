import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/authUnified.js";

const router = express.Router();

// Get all notifications for user
router.get("/", authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        console.error("Notification fetch error:", err);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// Mark as read
router.put("/:id/read", authMiddleware, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ message: "Marked as read" });
    } catch (err) {
        console.error("Notification update error:", err);
        res.status(500).json({ message: "Failed to update notification" });
    }
});

export default router;
