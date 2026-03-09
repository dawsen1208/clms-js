/**
 * Borrow Request Routes
 * Handles administrator actions for approving or rejecting borrowing/renewal requests.
 */
import express from "express";
import {
  approveRequestLibrary,
  rejectRequestLibrary,
  getAllRequests,
} from "../controllers/libraryController.js";
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js";

const router = express.Router();

// Get all requests (Admin)
router.get("/admin", authMiddleware, requireAdmin, getAllRequests);

// Approve request
router.post("/approve/:id", authMiddleware, requireAdmin, approveRequestLibrary);

// Reject request
router.post("/reject/:id", authMiddleware, requireAdmin, rejectRequestLibrary);

export default router;
