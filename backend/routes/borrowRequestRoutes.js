// ✅ backend/routes/borrowRequestRoutes.js
import express from "express";
import {
  approveRequestLibrary,
  rejectRequestLibrary,
  getAllRequests,
} from "../controllers/libraryController.js";
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js";

const router = express.Router();

// 管理员获取所有申请（你前端用的 /requests/admin 实际应是这里的 "/admin"）
router.get("/admin", authMiddleware, requireAdmin, getAllRequests);

// 审批通过
router.post("/approve/:id", authMiddleware, requireAdmin, approveRequestLibrary);

// 审批拒绝
router.post("/reject/:id", authMiddleware, requireAdmin, rejectRequestLibrary);

export default router;
