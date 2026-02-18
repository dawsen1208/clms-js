// ✅ backend/controllers/libraryController.js
import BorrowRequest from "../models/BorrowRequest.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowHistory from "../models/BorrowHistory.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import { sendLibraryNotification } from "../services/mailer.js";

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

    // ✅ 预取书籍标题（用于邮件文本与兜底）
    const rawBookIdAll = (record?.bookId?._id || record?.bookId || request.bookId);
    let mailBookTitle = request.bookTitle || record?.bookTitle || "";
    if ((!mailBookTitle) && rawBookIdAll && mongoose.Types.ObjectId.isValid(rawBookIdAll)) {
      try {
        const b = await Book.findById(rawBookIdAll).select("title");
        if (b?.title) mailBookTitle = b.title;
      } catch { /* ignore */ }
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
      // 🔍 统一获取书籍标题/作者，用于历史记录与通知（兼容旧数据）
      const rawBookId = record.bookId?._id || record.bookId || request.bookId;
      let finalBookTitle = request.bookTitle || record.bookTitle || "";
      let finalBookAuthor = request.bookAuthor || record.bookAuthor || "";
      if ((!finalBookTitle || !finalBookAuthor) && rawBookId && mongoose.Types.ObjectId.isValid(rawBookId)) {
        try {
          const bookDoc = await Book.findById(rawBookId).select("title author");
          if (bookDoc) {
            if (!finalBookTitle) finalBookTitle = bookDoc.title;
            if (!finalBookAuthor) finalBookAuthor = bookDoc.author || "";
          }
        } catch (e) {
          console.warn("⚠️ 获取书籍信息失败（不影响审批）:", e?.message || e);
        }
      }

      await record.returnBook(); // 使用模型的returnBook方法
      
      // 📚 更新库存（使用 record.bookId 确保是书籍ID，而非可能的记录ID）
      const updateBookId = record.bookId?._id || record.bookId;
      await Book.findByIdAndUpdate(updateBookId, { $inc: { copies: 1 } });

      // 🚫 检查逾期并处理自动拉黑
      const now = new Date();
      const dueDate = new Date(record.dueDate);
      if (now > dueDate) {
        try {
          // 注意：request.userId 通常是字符串ID (如 "r10001")
          const user = await User.findOne({ userId: request.userId });
          if (user) {
            user.overdueCount = (user.overdueCount || 0) + 1;
            console.log(`⚠️ 用户 ${user.userId} 逾期还书，当前逾期次数: ${user.overdueCount}`);
            
            // 阈值设为 3 次
            if (user.overdueCount > 3 && !user.isBlacklisted) {
              user.isBlacklisted = true;
              user.blacklistReason = "系统自动拉黑：经常逾期还书 (逾期超过3次)";
              console.log(`🚫 用户 ${user.userId} 因频繁逾期已被自动拉黑`);
            }
            await user.save();
          }
        } catch (e) {
          console.error("❌ 更新用户逾期状态失败:", e);
        }
      }
      
      // 📝 更新或创建归还历史记录
      const existingHistory = await BorrowHistory.findOne({
         userId: request.userId,
         bookId: request.bookId,
         action: "borrow",
         returnDate: { $exists: false }
      }).sort({ createdAt: -1 });

      if (existingHistory) {
          existingHistory.returnDate = new Date();
          existingHistory.action = "return"; // 标记为已归还
          if (!existingHistory.bookTitle && finalBookTitle) {
            existingHistory.bookTitle = finalBookTitle;
          }
          if (!existingHistory.bookAuthor && finalBookAuthor) {
            existingHistory.bookAuthor = finalBookAuthor;
          }
          await existingHistory.save();
      } else {
          await BorrowHistory.create({
            userId: request.userId,
            bookId: request.bookId,
            bookTitle: finalBookTitle || request.bookTitle || "",
            bookAuthor: finalBookAuthor || request.bookAuthor || record.bookAuthor || "",
            action: "return",
            borrowDate: record.borrowedAt,
            dueDate: record.dueDate,
            returnDate: new Date(),
            isRenewed: record.renewed,
            userName: request.userName,
            renewCount: record.renewCount,
          });
      }

      // 🔔 创建归还成功通知
      try {
        await Notification.create({
          userId: request.userId,
          type: "system",
          title: "Book Returned Successfully",
          message: `Your book "${finalBookTitle || request.bookTitle || "Unknown Book"}" has been successfully returned.`,
          relatedId: rawBookId || request.bookId,
          read: false
        });
      } catch (notifErr) {
        console.error("❌ Failed to create return notification:", notifErr);
      }

  // 📧 异步邮件通知（归还成功），不阻塞
  (async () => {
    try {
      const user = await User.findOne({ userId: request.userId });
      if (
        user &&
        user.externalEmailNotifyEnabled &&
        user.gmailVerified &&
        user.gmailAddress &&
        (user.externalEmailNotifyEvents?.return ?? false)
      ) {
        await sendLibraryNotification(user.gmailAddress, "📗 Return Successful", `You returned “${finalBookTitle || request.bookTitle || "Unknown Book"}”.`, {
          bookTitle: finalBookTitle || request.bookTitle || "",
          operation: "Return",
          time: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("❌ 发送归还邮件失败（忽略）:", e?.message || e);
    }
  })();
    }

    // ✅ 更新申请状态
    request.status = "approved";
    request.handledAt = new Date();
    await request.save();

  // 📧 异步邮件通知（申请通过），不阻塞
  (async () => {
    try {
      const user = await User.findOne({ userId: request.userId });
      if (
        user &&
        user.externalEmailNotifyEnabled &&
        user.gmailVerified &&
        user.gmailAddress &&
        (user.externalEmailNotifyEvents?.requestApproved ?? false)
      ) {
        const op = request.type === "renew" ? "Renew Approved" : "Return Approved";
        const msg =
          request.type === "renew"
            ? `Your renew request for “${mailBookTitle || "Unknown Book"}” has been approved.`
            : `Your return request for “${mailBookTitle || "Unknown Book"}” has been approved.`;
        await sendLibraryNotification(user.gmailAddress, "✅ Request Approved", msg, {
          bookTitle: mailBookTitle || request.bookTitle || "",
          operation: op,
          time: new Date().toISOString(),
          extra: request?.reason ? `Note: ${request.reason}` : "",
        });
      }
    } catch (e) {
      console.error("❌ 发送申请通过邮件失败（忽略）:", e?.message || e);
    }
  })();

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

/* =========================================================
   📚 管理员直接归还（无需申请）
   ========================================================= */
export const markBookReturned = async (req, res) => {
  try {
    const { borrowRecordId, userId, bookId } = req.body;
    console.log("📥 归还请求:", { borrowRecordId, userId, bookId });

    let record;
    if (borrowRecordId) {
      record = await BorrowRecord.findById(borrowRecordId);
    } else if (userId && bookId) {
      const UserId = BorrowRecord.formatId(userId);
      const BookId = BorrowRecord.formatId(bookId);
      record = await BorrowRecord.findOne({ _id: BookId, userId: UserId, returned: false });
      if (!record) {
        record = await BorrowRecord.findActiveByUserAndBook(UserId, BookId);
      }
    }

    if (!record) {
      return res.status(404).json({ message: "未找到活跃的借阅记录" });
    }

    if (record.returned) {
      return res.status(400).json({ message: "该书籍已归还" });
    }

    // 1. 补全书籍信息（兼容旧记录）
    const rawBookId = record.bookId?._id || record.bookId;
    let finalBookTitle = record.bookTitle || "";
    let finalBookAuthor = record.bookAuthor || "";
    if ((!finalBookTitle || !finalBookAuthor) && rawBookId && mongoose.Types.ObjectId.isValid(rawBookId)) {
      try {
        const bookDoc = await Book.findById(rawBookId).select("title author");
        if (bookDoc) {
          if (!finalBookTitle) finalBookTitle = bookDoc.title;
          if (!finalBookAuthor) finalBookAuthor = bookDoc.author || "";
        }
      } catch (e) {
        console.warn("⚠️ 获取书籍信息失败（不影响归还）:", e?.message || e);
      }
    }

    // 2. 更新借阅记录
    record.returned = true;
    record.returnedAt = new Date();
    await record.save();

    // 3. 更新库存 (防御性编程)
    if (record.bookId) {
        try {
            const bookUpdateId = mongoose.Types.ObjectId.isValid(record.bookId) ? record.bookId : record.bookId;
            await Book.findByIdAndUpdate(bookUpdateId, { $inc: { copies: 1 } });
        } catch (bookErr) {
            console.error("⚠️ 更新库存失败 (非致命):", bookErr);
        }
    } else {
        console.warn("⚠️ 借阅记录无 bookId, 跳过库存更新:", record._id);
    }

    // 4. 检查逾期并更新用户信用
    const now = new Date();
    const dueDate = new Date(record.dueDate);
    let isOverdue = now > dueDate;
    
    if (isOverdue) {
        try {
            const user = await User.findOne({ userId: record.userId });
            if (user) {
                user.overdueCount = (user.overdueCount || 0) + 1;
                if (user.overdueCount > 3 && !user.isBlacklisted) {
                    user.isBlacklisted = true;
                    user.blacklistReason = "系统自动拉黑：经常逾期还书 (逾期超过3次)";
                }
                await user.save();
            }
        } catch (e) {
            console.error("❌ 更新用户逾期状态失败:", e);
        }
    }

    // 5. 更新或创建历史记录
    try {
        const existingHistory = await BorrowHistory.findOne({
            userId: record.userId,
            bookId: record.bookId,
            action: "borrow",
            returnDate: { $exists: false }
        }).sort({ createdAt: -1 });

        if (existingHistory) {
            existingHistory.returnDate = now;
            existingHistory.action = "return";
            await existingHistory.save();
        } else {
            await BorrowHistory.create({
                userId: record.userId,
                bookId: record.bookId,
                bookTitle: finalBookTitle || record.bookTitle,
                bookAuthor: finalBookAuthor || record.bookAuthor,
                action: "return",
                borrowDate: record.borrowedAt,
                dueDate: record.dueDate,
                returnDate: now,
                isRenewed: record.renewed,
                userName: record.userName,
                renewCount: record.renewCount
            });
        }
    } catch (histErr) {
        console.error("❌ 创建历史记录失败 (非致命):", histErr);
    }

    // 🔔 创建归还成功通知
    try {
      await Notification.create({
        userId: record.userId,
        type: "system",
        title: "Book Returned Successfully",
        message: `Your book "${finalBookTitle || "Unknown Book"}" has been marked as returned by administrator.`,
        relatedId: rawBookId || record.bookId,
        read: false
      });
    } catch (notifErr) {
      console.error("❌ Failed to create return notification:", notifErr);
    }

    // 📧 异步邮件通知（管理员直接归还），不阻塞
    (async () => {
      try {
        const user = await User.findOne({ userId: record.userId });
        if (
          user &&
          user.externalEmailNotifyEnabled &&
          user.gmailVerified &&
          user.gmailAddress &&
          (user.externalEmailNotifyEvents?.return ?? false)
        ) {
          await sendLibraryNotification(user.gmailAddress, "📗 Return Successful", `Your book “${finalBookTitle || "Unknown Book"}” has been returned.`, {
            bookTitle: finalBookTitle,
            operation: "Return",
            time: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("❌ 发送归还邮件失败（忽略）:", e?.message || e);
      }
    })();

    res.json({ message: "归还成功", record });

  } catch (err) {
    console.error("❌ 归还失败:", err);
    res.status(500).json({ message: "归还失败", error: err.message });
  }
};

/* =========================================================
   📋 获取所有活跃借阅记录（管理员用）
   ========================================================= */
export const getActiveBorrowRecords = async (req, res) => {
    try {
        const records = await BorrowRecord.find({ returned: false }).sort({ dueDate: 1 });
        res.json(records);
    } catch (err) {
        console.error("❌ 获取借阅记录失败:", err);
        res.status(500).json({ message: "获取借阅记录失败" });
    }
};
