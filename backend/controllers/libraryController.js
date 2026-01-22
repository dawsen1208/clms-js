// ✅ backend/controllers/libraryController.js
import BorrowRequest from "../models/BorrowRequest.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowHistory from "../models/BorrowHistory.js";
import Book from "../models/Book.js";
import mongoose from "mongoose";

/* =========================================================
   📬 获取所有借阅申请（管理员查看）
   ========================================================= */
export const getAllRequests = async (req, res) => {
  try {
    const requests = await BorrowRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("❌ 获取申请失败:", err);
    res.status(500).json({ message: "获取申请失败" });
  }
};

/* =========================================================
   ✅ 审批通过
   ========================================================= */
export const approveRequestLibrary = async (req, res) => {
  try {
    // 🛡️ 权限验证
    if (req.user.role !== "Administrator") {
      return res.status(403).json({ message: "无权限操作" });
    }

    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "申请不存在" });

    console.log("📩 审批申请详情:", request);

    // 🧩 使用统一的ID格式化处理
    const UserId = BorrowRecord.formatId(request.userId);
    const BookId = BorrowRecord.formatId(request.bookId);

    // 🔍 查找对应的借阅记录：先按记录ID匹配（部分前端会传借阅记录ID），再按用户+书籍ID匹配
    let record = await BorrowRecord.findOne({ _id: BookId, userId: UserId, returned: false });
    if (!record) {
      record = await BorrowRecord.findActiveByUserAndBook(UserId, BookId);
    }

    if (!record) {
      console.warn("⚠️ 未找到对应借阅记录:", {
        userId: request.userId,
        bookId: request.bookId,
        formattedUserId: UserId,
        formattedBookId: BookId,
      });

      // ✅ 按需求：将该申请标记为无效并视为已处理
      request.status = "invalid";
      request.handledAt = new Date();
      await request.save();

      return res.status(200).json({
        message: "该申请已标记为无效并已处理（未找到对应借阅记录）",
        request,
      });
    }

    // ✅ 更新记录逻辑
    if (request.type === "renew") {
      await record.renew(); // 使用模型的renew方法
      
      // 📝 创建续借历史记录
      await BorrowHistory.create({
        userId: request.userId,
        bookId: request.bookId,
        bookTitle: request.bookTitle,
        bookAuthor: request.bookAuthor || record.bookAuthor || "",
        action: "renew",
        borrowDate: record.borrowedAt,
        dueDate: record.dueDate, // 更新后的到期日期
        isRenewed: true,
        userName: request.userName,
        renewCount: record.renewCount + 1,
      });
      
    } else if (request.type === "return") {
      await record.returnBook(); // 使用模型的returnBook方法
      
      // 📚 更新库存（使用格式化的bookId）
      await Book.findByIdAndUpdate(BookId, { $inc: { copies: 1 } });
      
      // 📝 创建归还历史记录
      await BorrowHistory.create({
        userId: request.userId,
        bookId: request.bookId,
        bookTitle: request.bookTitle,
        bookAuthor: request.bookAuthor || record.bookAuthor || "",
        action: "return",
        borrowDate: record.borrowedAt,
        dueDate: record.dueDate,
        returnDate: new Date(),
        isRenewed: record.renewed,
        userName: request.userName,
        renewCount: record.renewCount,
      });
    }

    // ✅ 更新申请状态
    request.status = "approved";
    request.handledAt = new Date();
    await request.save();

    res.json({ message: "✅ 审批成功", request, record });
  } catch (err) {
    console.error("❌ 审批失败:", err);
    res.status(500).json({ message: "审批失败", error: err.message });
  }
};

/* =========================================================
   ❌ 审批拒绝
   ========================================================= */
export const rejectRequestLibrary = async (req, res) => {
  try {
    const request = await BorrowRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "申请不存在" });
    
    if (request.status !== "pending") {
      return res.status(400).json({ message: "该申请已处理" });
    }

    const { reason } = req.body;
    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "请提供拒绝理由" });
    }

    request.status = "rejected";
    request.reason = reason.trim();
    request.handledAt = new Date();
    await request.save();

    res.json({ message: "已拒绝申请", request });
  } catch (err) {
    console.error("❌ 拒绝失败:", err);
    res.status(500).json({ message: "拒绝失败", error: err.message });
  }
};
