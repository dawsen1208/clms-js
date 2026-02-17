// ✅ backend/routes/bookRoutes.js
import express from "express";
import Book from "../models/Book.js";
import BorrowRecord from "../models/BorrowRecord.js";
import BorrowRequest from "../models/BorrowRequest.js";
import BorrowHistory from "../models/BorrowHistory.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import mongoose from "mongoose";
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js"; // ✅ 使用统一认证中间件
import { markBookReturned, getActiveBorrowRecords } from "../controllers/libraryController.js";
import { sendLibraryNotification } from "../services/mailer.js";
import User from "../models/User.js";

console.log("📁 当前运行的 bookRoutes 文件路径:", import.meta.url);

const router = express.Router();
// 🧮 默认权重（评分、热度、可借性、出版新旧、匹配度）
const DEFAULT_WEIGHTS = {
  rating: 0.3,
  popularity: 0.25,
  availability: 0.25,
  recency: 0.1,
  match: 0.1,
};

/* =========================================================
   🔐 JWT 验证中间件（已移至统一认证中间件）
   ========================================================= */
// 使用统一的认证中间件，已在文件顶部导入
// const authMiddleware = ...

/* =========================================================
   🧩 调试接口
   ========================================================= */
router.get("/debug", (_, res) => res.send("✅ bookRoutes 路由文件正在生效"));

/* =========================================================
   📚 获取所有书籍 / 管理员添加 / 删除书籍
   ========================================================= */
router.get("/books", async (_, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 }).lean();
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: "获取书籍失败", error: err.message });
  }
});

/* =========================================================
   📊 管理员仪表盘统计
   ========================================================= */
router.get("/stats", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [totalBooks, totalBorrowed, pendingRequests, overdueBooks, activeReaders] = await Promise.all([
      Book.countDocuments({}),
      BorrowRecord.countDocuments({ returned: false }),
      BorrowRequest.countDocuments({ status: "pending" }),
      BorrowRecord.countDocuments({ returned: false, dueDate: { $lt: new Date() } }),
      User.countDocuments({ role: "Reader" }),
    ]);

    // 计算按时归还率：BorrowHistory 中 returnDate <= dueDate
    const returns = await BorrowHistory.find({ action: "return" }).select("returnDate dueDate").lean();
    const returnCount = returns.length;
    const onTimeCount = returns.filter((r) => r.returnDate && r.dueDate && new Date(r.returnDate) <= new Date(r.dueDate)).length;
    const onTimeRate = returnCount ? Math.round((onTimeCount / returnCount) * 100) : 0;

    res.json({ totalBooks, totalBorrowed, pendingRequests, overdueBooks, activeReaders, onTimeRate });
  } catch (err) {
    res.status(500).json({ message: "获取统计失败", error: err.message });
  }
});

/* =========================================================
   📚 管理员归还管理
   ========================================================= */
// 获取活跃借阅记录
router.get("/active-borrows", authMiddleware, requireAdmin, getActiveBorrowRecords);

// 直接归还
router.post("/return", authMiddleware, requireAdmin, markBookReturned);

// ✅ 为避免与 /books/:id 路由冲突，提前注册 /books/compare
router.get("/books/compare", async (req, res) => {
  try {
    const idsParam = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const windowDays = Number(req.query.windowDays || 30);

    if (idsParam.length < 2 || idsParam.length > 6) {
      return res.status(400).json({ message: "请提供 2-6 个书籍ID 进行对比" });
    }

    const objectIds = idsParam
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length !== idsParam.length) {
      console.warn("⚠️ compare 接收的部分 ID 非 ObjectId，将按 String 兼容处理。");
    }

    const books = await Book.find({ _id: { $in: objectIds } }).lean();
    if (!books || books.length !== idsParam.length) {
      return res.status(404).json({ message: "部分书籍未找到，请检查 ID 是否正确" });
    }

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const matchBookIdOr = [
      { bookId: { $in: objectIds } },
      { bookId: { $in: idsParam } },
    ];
    const borrowAgg = await BorrowHistory.aggregate([
      { $match: { action: "borrow", borrowDate: { $gte: since }, $or: matchBookIdOr } },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);
    const returnAgg = await BorrowHistory.aggregate([
      {
        $match: {
          action: "return",
          $or: [ { returnDate: { $gte: since } }, { createdAt: { $gte: since } } ],
          $or: matchBookIdOr,
        },
      },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);

    const borrow30dMap = new Map();
    const return30dMap = new Map();
    borrowAgg.forEach((d) => borrow30dMap.set(String(d._id), d.count));
    returnAgg.forEach((d) => return30dMap.set(String(d._id), d.count));

    const activeAgg = await BorrowRecord.aggregate([
      { $match: { returned: false, $or: [ { bookId: { $in: objectIds } }, { bookId: { $in: idsParam } } ] } },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);
    const activeMap = new Map();
    activeAgg.forEach((d) => activeMap.set(String(d._id), d.count));

    let categoryScoreMap = new Map();
    try {
      const token = req.headers?.authorization?.split(" ")[1];
      let userId = null;
      if (token) {
        const decoded = jwt.decode(token);
        userId = decoded?.userId || decoded?.id || null;
      }
      if (userId) {
        const userRecords = await BorrowRecord.find({ userId })
          .populate("bookId", "category")
          .lean();
        const categoryCount = {};
        userRecords.forEach((r) => {
          const c = r.bookId?.category;
          if (c) categoryCount[c] = (categoryCount[c] || 0) + 1;
        });
        const maxCnt = Object.values(categoryCount).reduce((m, v) => Math.max(m, v), 0) || 0;
        books.forEach((b) => {
          const freq = categoryCount[b.category] || 0;
          categoryScoreMap.set(String(b._id), maxCnt ? freq / maxCnt : 0);
        });
      }
    } catch (e) {
      console.warn("⚠️ match 计算失败，按 0 处理：", e?.message || e);
      categoryScoreMap = new Map();
    }

    const minMaxNormalize = (arr) => {
      const vals = arr.filter((v) => typeof v === "number");
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      return (x) => {
        if (!vals.length) return 0;
        if (min === max) return x > 0 ? 1 : 0;
        return (x - min) / (max - min);
      };
    };

    const ratingRaw = books.map((b) => {
      const reviewCount = Array.isArray(b.reviews) ? b.reviews.length : 0;
      const avgRating = reviewCount
        ? Math.round(
            (b.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount) * 10
          ) / 10
        : Number(b.rating || 0);
      return avgRating;
    });
    const ratingNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0) / 5));

    const popRaw = books.map((b) => borrow30dMap.get(String(b._id)) || 0);
    const popNormFn = minMaxNormalize(popRaw);

    const availRaw = books.map((b) => {
      const active = activeMap.get(String(b._id)) || 0;
      const total = Number(b.totalCopies || 0);
      const copies = Number(b.copies || 0);
      if (total > 0) return Math.max(0, Math.min(1, copies / total));
      return copies + active > 0 ? copies / (copies + active) : 0;
    });
    const availNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0)));

    const nowTs = Date.now();
    const recencyRaw = books.map((b) => {
      const ts = b.publishDate ? new Date(b.publishDate).getTime() : 0;
      return ts ? (nowTs - ts) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY;
    });
    const recencyNormSource = recencyRaw.map((d) => (Number.isFinite(d) ? d : 0));
    const recencyMin = recencyNormSource.length ? Math.min(...recencyNormSource) : 0;
    const recencyMax = recencyNormSource.length ? Math.max(...recencyNormSource) : 0;
    const recencyNormFn = (d) => {
      if (!recencyNormSource.length) return 0;
      if (!Number.isFinite(d)) return 0;
      if (recencyMin === recencyMax) return 1;
      return 1 - (d - recencyMin) / (recencyMax - recencyMin);
    };

    const matchRaw = books.map((b) => categoryScoreMap.get(String(b._id)) || 0);
    const matchNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0)));

    const results = books.map((b, idx) => {
      const idStr = String(b._id);
      const reviewCount = Array.isArray(b.reviews) ? b.reviews.length : 0;

      const rating = ratingNormFn(ratingRaw[idx]);
      const popularity = popNormFn(popRaw[idx]);
      const availability = availNormFn(availRaw[idx]);
      const recency = recencyNormFn(recencyRaw[idx]);
      const match = matchNormFn(matchRaw[idx]);

      const score =
        DEFAULT_WEIGHTS.rating * rating +
        DEFAULT_WEIGHTS.popularity * popularity +
        DEFAULT_WEIGHTS.availability * availability +
        DEFAULT_WEIGHTS.recency * recency +
        DEFAULT_WEIGHTS.match * match;

      return {
        book: {
          _id: b._id,
          title: b.title,
          author: b.author,
          category: b.category,
          copies: b.copies,
          totalCopies: b.totalCopies,
          publishDate: b.publishDate || null,
          ratingAvg: Number((ratingRaw[idx] || 0).toFixed?.(1) ?? ratingRaw[idx] ?? 0),
          ratingCount: reviewCount,
        },
        metrics: {
          rating,
          popularity,
          availability,
          recency,
          match,
          borrow30d: borrow30dMap.get(idStr) || 0,
          return30d: return30dMap.get(idStr) || 0,
        },
        score: Math.round(score * 1000) / 1000,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return res.json({
      weights: DEFAULT_WEIGHTS,
      windowDays,
      count: results.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ message: "图书对比计算失败", error: err?.message || String(err) });
  }
});

// 📖 获取单本书详情（含用户书评统计）
router.get("/books/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "无效的书籍ID" });
    }
    const book = await Book.findById(id).lean();
    if (!book) return res.status(404).json({ message: "未找到该书籍" });

    const reviewCount = Array.isArray(book.reviews) ? book.reviews.length : 0;
    const avgRating = reviewCount
      ? Math.round(
          (book.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount) *
            10
        ) / 10
      : 0;

    res.json({ ...book, rating: avgRating, reviewCount });
  } catch (err) {
    res.status(500).json({ message: "获取书籍详情失败", error: err.message });
  }
});

router.post("/books/add", authMiddleware, requireAdmin, async (req, res) => {
  try {

    const { title, author, category, description, copies } = req.body;
    if (!title || !author || !category || !copies)
      return res.status(400).json({ message: "请填写完整的书籍信息" });

    const newBook = await Book.create({
      title,
      author,
      category,
      description: description || "",
      copies,
      borrowCount: 0,
    });

    res.json({ message: "书籍添加成功！", book: newBook });
  } catch (err) {
    res.status(500).json({ message: "添加书籍失败", error: err.message });
  }
});

// 📝 提交书评（0-5星 + 最多500字）
router.post("/books/:id/reviews", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    // 使用 MongoDB ObjectId（req.user.id）以匹配 Book.reviews.userId 的类型
    const userObjectId = req.user.id;
    const { rating, comment } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "无效的书籍ID" });
    }

    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
      return res.status(400).json({ message: "评分需在0-5之间" });
    }
    const text = String(comment || "").trim();
    if (text.length > 500) {
      return res.status(400).json({ message: "书评最多500字" });
    }

    const book = await Book.findById(id);
    if (!book) return res.status(404).json({ message: "未找到该书籍" });

    // 可选：避免重复评价（同一用户只保留一条，若前端允许重复可去掉）
    const existingIndex = (book.reviews || []).findIndex(
      (rev) => String(rev.userId) === String(userObjectId)
    );
    if (existingIndex >= 0) {
      book.reviews[existingIndex].rating = numericRating;
      book.reviews[existingIndex].comment = text;
      book.reviews[existingIndex].createdAt = new Date();
    } else {
      book.reviews.push({ userId: userObjectId, rating: numericRating, comment: text });
    }
    book.recalculateRating();
    await book.save();

    res.json({ message: "书评提交成功", rating: book.rating, reviews: book.reviews });
  } catch (err) {
    res.status(500).json({ message: "提交书评失败", error: err.message });
  }
});

router.delete("/books/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {

    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: "未找到该书籍" });
    res.json({ message: "书籍删除成功" });
  } catch (err) {
    res.status(500).json({ message: "删除失败", error: err.message });
  }
});

/* =========================================================
   🤖 智能推荐系统
   ========================================================= */
router.get("/recommend", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const records = await BorrowRecord.find({ userId })
      .populate("bookId", "title category borrowCount")
      .lean();

    if (!records.length) {
      const popular = await Book.find().sort({ borrowCount: -1 }).limit(3).lean();
      return res.json({
        strategy: "未借阅用户推荐：全馆最热TOP3 📈",
        recommended: popular,
      });
    }

    const categoryCount = {};
    records.forEach((r) => {
      const c = r.bookId?.category;
      if (c) categoryCount[c] = (categoryCount[c] || 0) + 1;
    });

    const topCategory = Object.keys(categoryCount).sort(
      (a, b) => categoryCount[b] - categoryCount[a]
    )[0];

    const borrowedIds = records.map((r) => r.bookId?._id);
    let recommended = await Book.find({
      category: topCategory,
      _id: { $nin: borrowedIds },
    })
      .sort({ borrowCount: -1 })
      .limit(3)
      .lean();

    if (recommended.length < 3) {
      const fill = await Book.find({ _id: { $nin: borrowedIds } })
        .sort({ borrowCount: -1 })
        .limit(3 - recommended.length)
        .lean();
      recommended.push(...fill);
    }

    res.json({
      strategy: `基于您常借类别 ${topCategory} 推荐 📚`,
      recommended,
    });
  } catch (err) {
    res.status(500).json({ message: "推荐失败", error: err.message });
  }
});

/* =========================================================
   📊 图书对比（默认权重计算）
   ---------------------------------------------------------
   GET /compare?ids=<id1,id2,...>&windowDays=30
   - 支持 2-6 本书进行对比
   - 计算以下指标并按默认权重生成综合评分：
     rating(评分)、popularity(30天借阅热度)、availability(可借性)、
     recency(出版新旧)、match(用户偏好匹配)
   - 若用户未登录或无借阅记录，match 记为 0
   - 路由在 /api/library/compare 与 /api/books/compare 下均可访问
   ========================================================= */
const compareHandler = async (req, res) => {
  try {
    const idsParam = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const windowDays = Number(req.query.windowDays || 30);

    if (idsParam.length < 2 || idsParam.length > 6) {
      return res.status(400).json({ message: "请提供 2-6 个书籍ID 进行对比" });
    }

    const objectIds = idsParam
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (objectIds.length !== idsParam.length) {
      // Mixed 类型兼容：后续统计会使用 $or 同时匹配 ObjectId 与 String
      console.warn("⚠️ compare 接收的部分 ID 非 ObjectId，将按 String 兼容处理。");
    }

    const books = await Book.find({ _id: { $in: objectIds } }).lean();
    if (!books || books.length !== idsParam.length) {
      return res.status(404).json({ message: "部分书籍未找到，请检查 ID 是否正确" });
    }

    // 统计窗口
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // 30天借阅热度（BorrowHistory.action == 'borrow'）
    const matchBookIdOr = [
      { bookId: { $in: objectIds } },
      { bookId: { $in: idsParam } },
    ];
    const borrowAgg = await BorrowHistory.aggregate([
      {
        $match: {
          action: "borrow",
          borrowDate: { $gte: since },
          $or: matchBookIdOr,
        },
      },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);
    const returnAgg = await BorrowHistory.aggregate([
      {
        $match: {
          action: "return",
          $or: [
            { returnDate: { $gte: since } },
            { createdAt: { $gte: since } },
          ],
          $or: matchBookIdOr,
        },
      },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);

    const borrow30dMap = new Map();
    const return30dMap = new Map();
    borrowAgg.forEach((d) => borrow30dMap.set(String(d._id), d.count));
    returnAgg.forEach((d) => return30dMap.set(String(d._id), d.count));

    // 当前未归还数量（用于可借性估算：copies / (copies + activeBorrows)）
    const activeAgg = await BorrowRecord.aggregate([
      {
        $match: {
          returned: false,
          $or: [
            { bookId: { $in: objectIds } },
            { bookId: { $in: idsParam } },
          ],
        },
      },
      { $group: { _id: "$bookId", count: { $sum: 1 } } },
    ]);
    const activeMap = new Map();
    activeAgg.forEach((d) => activeMap.set(String(d._id), d.count));

    // 用户偏好匹配（未登录或无记录则 0）
    let categoryScoreMap = new Map();
    try {
      const token = req.headers?.authorization?.split(" ")[1];
      let userId = null;
      if (token) {
        const decoded = jwt.decode(token);
        userId = decoded?.userId || decoded?.id || null;
      }
      if (userId) {
        const userRecords = await BorrowRecord.find({ userId })
          .populate("bookId", "category")
          .lean();
        const categoryCount = {};
        userRecords.forEach((r) => {
          const c = r.bookId?.category;
          if (c) categoryCount[c] = (categoryCount[c] || 0) + 1;
        });
        const maxCnt = Object.values(categoryCount).reduce((m, v) => Math.max(m, v), 0) || 0;
        books.forEach((b) => {
          const freq = categoryCount[b.category] || 0;
          categoryScoreMap.set(String(b._id), maxCnt ? freq / maxCnt : 0);
        });
      }
    } catch (e) {
      console.warn("⚠️ match 计算失败，按 0 处理：", e?.message || e);
      categoryScoreMap = new Map();
    }

    // 归一化工具
    const minMaxNormalize = (arr) => {
      const vals = arr.filter((v) => typeof v === "number");
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      return (x) => {
        if (!vals.length) return 0;
        if (min === max) return x > 0 ? 1 : 0; // 全相等且非零时记 1
        return (x - min) / (max - min);
      };
    };

    // 预计算各维度
    const ratingRaw = books.map((b) => {
      const reviewCount = Array.isArray(b.reviews) ? b.reviews.length : 0;
      const avgRating = reviewCount
        ? Math.round(
            (b.reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount) * 10
          ) / 10
        : Number(b.rating || 0);
      return avgRating;
    });
    const ratingNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0) / 5));

    const popRaw = books.map((b) => borrow30dMap.get(String(b._id)) || 0);
    const popNormFn = minMaxNormalize(popRaw);

    const availRaw = books.map((b) => {
      const active = activeMap.get(String(b._id)) || 0;
      const total = Number(b.totalCopies || 0);
      const copies = Number(b.copies || 0);
      if (total > 0) return Math.max(0, Math.min(1, copies / total));
      // 若 totalCopies 不可用，则根据活动借阅估算：copies/(copies+active)
      return copies + active > 0 ? copies / (copies + active) : 0;
    });
    const availNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0)));

    const nowTs = Date.now();
    const recencyRaw = books.map((b) => {
      const ts = b.publishDate ? new Date(b.publishDate).getTime() : 0;
      return ts ? (nowTs - ts) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY; // 天数差，越小越新
    });
    const recencyNormSource = recencyRaw.map((d) => (Number.isFinite(d) ? d : 0));
    const recencyMin = recencyNormSource.length ? Math.min(...recencyNormSource) : 0;
    const recencyMax = recencyNormSource.length ? Math.max(...recencyNormSource) : 0;
    const recencyNormFn = (d) => {
      if (!recencyNormSource.length) return 0;
      if (!Number.isFinite(d)) return 0;
      if (recencyMin === recencyMax) return 1; // 全相等则都视为新旧一致
      // 越新（天数越小）得分越高
      return 1 - (d - recencyMin) / (recencyMax - recencyMin);
    };

    const matchRaw = books.map((b) => categoryScoreMap.get(String(b._id)) || 0);
    const matchNormFn = (x) => Math.max(0, Math.min(1, Number(x || 0)));

    // 组合结果
    const results = books.map((b, idx) => {
      const idStr = String(b._id);
      const reviewCount = Array.isArray(b.reviews) ? b.reviews.length : 0;

      const rating = ratingNormFn(ratingRaw[idx]);
      const popularity = popNormFn(popRaw[idx]);
      const availability = availNormFn(availRaw[idx]);
      const recency = recencyNormFn(recencyRaw[idx]);
      const match = matchNormFn(matchRaw[idx]);

      const score =
        DEFAULT_WEIGHTS.rating * rating +
        DEFAULT_WEIGHTS.popularity * popularity +
        DEFAULT_WEIGHTS.availability * availability +
        DEFAULT_WEIGHTS.recency * recency +
        DEFAULT_WEIGHTS.match * match;

      return {
        book: {
          _id: b._id,
          title: b.title,
          author: b.author,
          category: b.category,
          copies: b.copies,
          totalCopies: b.totalCopies,
          publishDate: b.publishDate || null,
          ratingAvg: Number((ratingRaw[idx] || 0).toFixed?.(1) ?? ratingRaw[idx] ?? 0),
          ratingCount: reviewCount,
        },
        metrics: {
          rating,
          popularity,
          availability,
          recency,
          match,
          borrow30d: borrow30dMap.get(idStr) || 0,
          return30d: return30dMap.get(idStr) || 0,
        },
        score: Math.round(score * 1000) / 1000, // 保留 3 位小数
      };
    });

    // 按综合得分降序
    results.sort((a, b) => b.score - a.score);

    return res.json({
      weights: DEFAULT_WEIGHTS,
      windowDays,
      count: results.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ message: "图书对比计算失败", error: err?.message || String(err) });
  }
};

// 原始路径：/api/library/compare 或 /api/books/compare
router.get("/compare", compareHandler);
// 兼容：/api/library/books/compare（多数书籍相关接口在 /books 前缀下）
router.get("/books/compare", compareHandler);
// 兼容：/api/library/compare/books，避免与 /books/:id 路由冲突
router.get("/compare/books", compareHandler);

/* =========================================================
   📘 借阅书籍
   ========================================================= */
router.post("/borrow/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userName = req.user.name || "未知用户";

    // 限制每个用户最多只能同时借5本书（按未归还计算）
    const borrowCount = await BorrowRecord.countDocuments({
      userId,
      returned: false,
    });
    if (borrowCount >= 5) {
      return res.status(400).json({
        message: "您当前已借阅 5 本书，达到同时借阅上限。请先归还部分书籍 📚",
      });
    }

    // ✅ 并发控制：原子操作扣减库存
    const book = await Book.findOneAndUpdate(
      { _id: req.params.id, copies: { $gt: 0 } },
      { $inc: { copies: -1, borrowCount: 1 } },
      { new: true }
    );

    if (!book) {
       const exists = await Book.findById(req.params.id);
       if (!exists) return res.status(404).json({ message: "未找到该书籍" });
       return res.status(400).json({ message: "库存不足" });
    }

    // 🕒 获取用户偏好借阅天数
    const user = await User.findOne({ userId });
    const duration = user?.preferences?.borrowing?.defaultDuration || 30;

    const record = await BorrowRecord.create({
      userId,
      bookId: book._id,
      borrowedAt: new Date(),
      dueDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
    });

    // ✅ 记录到借阅历史（BorrowHistory），便于用户在 Profile 查看“Borrow History”
    try {
      await BorrowHistory.create({
        userId,
        bookId: book._id,
        bookTitle: book.title,
        bookAuthor: book.author || "",
        userName,
        action: "borrow",
        borrowDate: record.borrowedAt,
        dueDate: record.dueDate,
        isRenewed: false,
        renewCount: 0,
      });
    } catch (e) {
      console.warn("⚠️ 借阅历史记录写入失败（不影响借阅成功）:", e?.message || e);
    }

    // 📧 异步触发外部邮件通知（不阻塞主流程）
    (async () => {
      try {
        const u = await User.findOne({ userId });
        if (
          u &&
          u.externalEmailNotifyEnabled &&
          u.gmailVerified &&
          u.gmailAddress &&
          (u.externalEmailNotifyEvents?.borrow ?? false)
        ) {
          await sendLibraryNotification(u.gmailAddress, "📚 Borrow Successful", `You borrowed “${book.title}”.`, {
            bookTitle: book.title,
            operation: "Borrow",
            time: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("❌ 发送借阅邮件失败（忽略）:", e?.message || e);
      }
    })();

    res.json({
      message: "借阅成功",
      record: await record.populate("bookId", "title author category"),
    });
  } catch (err) {
    res.status(500).json({ message: "借阅失败", error: err.message });
  }
});

/* =========================================================
   📨 用户提交续借 / 归还申请
   ========================================================= */
router.post("/request", authMiddleware, async (req, res) => {
  try {
    const { type, bookId, bookTitle, bookAuthor } = req.body || {};
    const userId = req.user.userId || req.user.id;
    const userName = req.user.name || "未知用户";

    if (!["renew", "return"].includes(type))
      return res.status(400).json({ message: "非法的申请类型" });

    if (!bookId) 
      return res.status(400).json({ message: "书籍ID不能为空" });

    const safeBookId = String(bookId || "");
    
    // 🔍 检查是否已有相同类型的待处理申请
    const duplicate = await BorrowRequest.findPending(userId, safeBookId, type);
    if (duplicate)
      return res.status(400).json({ message: "您已有相同类型的待处理申请" });

    // 📚 获取书籍信息（如果可能）
    let finalBookTitle = bookTitle || "未知书籍";
    let finalBookAuthor = bookAuthor || "";
    
    if (mongoose.Types.ObjectId.isValid(safeBookId)) {
      const book = await Book.findById(safeBookId);
      if (book) {
        finalBookTitle = book.title;
        finalBookAuthor = book.author;
      }
    }

    const request = await BorrowRequest.create({
      userId,
      userName,
      bookId: safeBookId,
      bookTitle: finalBookTitle,
      bookAuthor: finalBookAuthor,
      type,
      status: "pending",
    });

    res.json({ message: "申请已提交，等待管理员审核", request });
  } catch (err) {
    console.error("❌ 提交申请失败:", err);
    res.status(500).json({ message: "提交申请失败", error: err.message });
  }
});

/* =========================================================
   ✅ 管理员审批 - 重定向到统一的审批路由
   ========================================================= */
router.post("/admin/requests/approve/:id", authMiddleware, requireAdmin, (req, res) => {
  // 重定向到统一的审批路由（修正为 /api/library/requests 前缀）
  res.redirect(307, `/api/library/requests/approve/${req.params.id}`);
});

/* =========================================================
   🔔 用户查看自己的申请
   ========================================================= */
router.get("/request/user", authMiddleware, async (req, res) => {
  try {
    // ✅ 兼容 BorrowRequest.userId 为 String 或 ObjectId，严格按当前用户过滤
    const rawUserId = req.user.userId || req.user.id;
    const UserId =
      typeof rawUserId === "object"
        ? rawUserId
        : mongoose.Types.ObjectId.isValid(rawUserId)
        ? new mongoose.Types.ObjectId(rawUserId)
        : String(rawUserId);

    const requests = await BorrowRequest.find({
      $or: [
        { userId: UserId },
        { userId: String(UserId) },
        // 如果是有效的 ObjectId，则再匹配一次原始 ObjectId（防御式）
        {
          userId: mongoose.Types.ObjectId.isValid(rawUserId)
            ? new mongoose.Types.ObjectId(rawUserId)
            : undefined,
        },
      ].filter(Boolean),
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "获取申请状态失败", error: err.message });
  }
});

/* =========================================================
   📜 借阅历史（使用统一的BorrowHistory模型）
   ========================================================= */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("🔍 /api/library/history BorrowHistory typeof:", typeof BorrowHistory);
    
    // 使用BorrowHistory模型的静态方法查询
    const history = await BorrowHistory.findByUser(userId)
      .lean();

    const formatted = history.map((r) => ({
      _id: r._id,
      userId: r.userId,
      bookId: r.bookId,
      title: r.bookTitle || "未知书籍",
      author: r.bookAuthor || "未知作者",
      action: r.action,
      date: r.createdAt, // ✅ 统一使用记录创建时间作为发生时间
      borrowDate: r.borrowDate,
      dueDate: r.dueDate,
      returnDate: r.returnDate,
      isRenewed: r.isRenewed,
      renewCount: r.renewCount,
      userName: r.userName,
      notes: r.notes,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "查询借阅历史失败", error: err.message });
  }
});

/* =========================================================
   📜 当前借阅（使用优化的BorrowRecord模型）
   ========================================================= */
router.get("/borrowed", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 使用BorrowRecord模型的静态方法查询未归还记录
    const records = await BorrowRecord.findUserActiveBorrows(userId)
      .populate("bookId", "title author category copies")
      .lean();

    const formatted = records.map((r) => ({
      _id: r._id,
      userId: r.userId,
      // ✅ 明确返回书籍ID，前端用于链接与 Pending 判断
      bookId: r.bookId?._id || r.bookId,
      title: r.bookTitle || r.bookId?.title || "未知书籍",
      author: r.bookAuthor || r.bookId?.author || "未知作者",
      category: r.bookId?.category || "未知类别",
      borrowDate: r.borrowedAt,
      dueDate: r.dueDate,
      renewed: r.renewed,
      returned: r.returned,
      daysRemaining: r.getDaysRemaining ? r.getDaysRemaining() : 0,
      overdue: r.isOverdue ? r.isOverdue() : false,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "查询借阅记录失败", error: err.message });
  }
});

/* =========================================================
   🔔 书评提醒（用户归还后且尚未评价的书籍）
   ========================================================= */
router.get("/review/reminders", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 找到该用户归还过的书籍
    const returns = await BorrowHistory.find({
      userId,
      action: "return",
    })
      .sort({ returnDate: -1 })
      .limit(10)
      .lean();

    // 过滤掉已评价的书籍
    const reminders = [];
    for (const r of returns) {
      const bookId = r.bookId;
      if (!bookId) continue;
      const book = await Book.findById(bookId).select("title author reviews");
      if (!book) continue;

      const hasReviewed = (book.reviews || []).some(
        (rev) => String(rev.userId) === String(req.user.id)
      );
      if (!hasReviewed) {
        reminders.push({
          _id: String(book._id),
          bookId: String(book._id),
          bookTitle: book.title,
          bookAuthor: book.author,
          type: "review",
          status: "info",
          createdAt: r.returnDate || r.updatedAt || r.borrowDate,
        });
      }
    }

    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: "获取书评提醒失败", error: err.message });
  }
});

/* =========================================================
   🧾 管理员查看所有续借/归还申请
   ========================================================= */
router.get("/requests", authMiddleware, requireAdmin, async (req, res) => {
  try {

    console.log("🧭 管理员访问 /api/library/requests");

    const allRequests = await BorrowRequest.find().sort({ createdAt: -1 }).lean();
    res.json(allRequests);
  } catch (err) {
    console.error("❌ 获取所有申请失败:", err);
    res.status(500).json({ message: "获取申请失败", error: err.message });
  }
});

/* =========================================================
   🧾 管理员查看全馆借阅记录
   ========================================================= */
router.get("/history/all", authMiddleware, requireAdmin, async (req, res) => {
  try {const records = await BorrowRecord.find()
      .populate("bookId", "title author category")
      .sort({ borrowedAt: -1 })
      .lean();

    const users = await User.find({}, "userId name").lean();
    const userMap = Object.fromEntries(users.map((u) => [u.userId, u.name]));

    const formatted = records.map((r) => ({
      _id: r._id,
      userId: r.userId,
      userName: userMap[r.userId] || "未知用户",
      bookTitle: r.bookId?.title || "未知书籍",
      author: r.bookId?.author || "未知作者",
      category: r.bookId?.category || "未知类别",
      borrowDate: r.borrowedAt,
      dueDate: r.dueDate,
      renewDate: r.renewedAt,
      returnDate: r.returnedAt,
      renewed: r.renewed || false,
      returned: r.returned || false,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "获取借阅记录失败", error: err.message });
  }
});


export default router;
