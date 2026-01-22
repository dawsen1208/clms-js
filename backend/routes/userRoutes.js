// ✅ backend/routes/userRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import BorrowRecord from "../models/BorrowRecord.js"; // ✅ 新增
import Book from "../models/Book.js"; // ✅ 新增
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js"; // ✅ 使用统一认证中间件

const router = express.Router();

/* =========================================================
   🧩 调试接口
   ========================================================= */
router.get("/debug", (_, res) => res.send("✅ userRoutes 路由文件正在生效"));

/* =========================================================
   🔐 身份验证中间件（已移至统一认证中间件）
   ========================================================= */
// 使用统一的认证中间件，已在文件顶部导入
// const authMiddleware = ...

/* =========================================================
   🧱 工具函数：生成系统用户ID
   ========================================================= */
const genUserId = async (role = "Reader") => {
  const prefix = role === "Administrator" ? "a" : "r";
  const lastUser = await User.findOne({ role }).sort({ userId: -1 }).exec();
  let newIdNum = 100001;
  if (lastUser && lastUser.userId) {
    const match = lastUser.userId.match(/\d+/);
    if (match) newIdNum = parseInt(match[0]) + 1;
  }
  return `${prefix}${newIdNum}`;
};

/* =========================================================
   🧾 用户注册
   ========================================================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, authCode } = req.body;

    if (!name || !password)
      return res.status(400).json({ message: "请填写姓名和密码" });

    const nameStr = String(name).trim();
    const valid = /^(?!\d+$)[A-Za-z][A-Za-z0-9_]*$/.test(nameStr);
    if (!valid) return res.status(400).json({ message: "用户名不合法：需以字母开头，仅允许字母、数字、下划线，且不能为纯数字" });
    const exists = await User.findOne({ name: nameStr }).lean();
    if (exists) return res.status(400).json({ message: "用户名已存在，请更换" });

    let finalRole = role;
    if (role === "Administrator") {
      const adminCode = process.env.ADMIN_REGISTER_CODE || "admin";
      if (authCode?.trim().toLowerCase() !== adminCode.toLowerCase()) {
        return res.status(403).json({ message: "管理员注册授权码错误" });
      }
    } else {
      finalRole = "Reader";
    }

    const userId = await genUserId(finalRole);

    const newUser = new User({
      userId,
      name: nameStr,
      email: email || "",
      password,
      role: finalRole,
    });

    await newUser.save();
    console.log(`✅ 成功注册: ${userId} (${finalRole})`);

    res.json({
      message: "注册成功",
      user: { userId, name, role: finalRole },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ message: `该${field}已被使用，请更换后重试` });
    }
    console.error("❌ 注册失败详细信息:", err);
    res.status(500).json({ message: "服务器内部错误", error: err.message });
  }
});

/* =========================================================
   🔑 登录（增强版：Token 包含完整用户信息）
   ========================================================= */
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ message: "请输入用户ID和密码" });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "密码错误" });

    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "7d" }
    );

    console.log(`✅ 登录成功：${user.userId} (${user.role})`);

    res.json({
      message: "登录成功",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        avatar: user.avatar || "",
      },
    });
  } catch (err) {
    console.error("❌ 登录失败:", err);
    res.status(500).json({ message: "登录失败", error: err.message });
  }
});

/* =========================================================
   👤 获取用户信息
   ========================================================= */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select("-password");
    if (!user) return res.status(404).json({ message: "用户不存在" });
    res.json(user);
  } catch (err) {
    console.error("❌ 获取用户信息失败:", err);
    res.status(500).json({ message: "获取用户信息失败" });
  }
});

/* =========================================================
   ✏️ 更新用户信息
   ========================================================= */
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;

    if (!name && email === undefined)
      return res.status(400).json({ message: "没有需要更新的字段" });

    const updated = await User.findOneAndUpdate(
      { userId },
      { name, email: email ?? "" },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "用户不存在" });

    res.json({ message: "用户信息更新成功", user: updated });
  } catch (err) {
    console.error("❌ 更新用户信息失败:", err);
    res.status(500).json({ message: "更新用户信息失败" });
  }
});

/* =========================================================
   📸 上传头像
   ========================================================= */
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage });

router.post("/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 使用相对路径，确保在本地与公网同源下都能加载
    const avatarUrl = `/uploads/${req.file.filename}`;

    if (user.avatar?.includes("/uploads/")) {
      const oldFile = path.join(uploadDir, path.basename(user.avatar));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    user.avatar = avatarUrl;
    await user.save();

    res.json({ message: "头像更新成功", avatarUrl });
  } catch (err) {
    console.error("❌ 头像上传失败:", err);
    res.status(500).json({ message: "头像上传失败" });
  }
});

/* =========================================================
   📊 管理员用户借阅画像分析接口（兼容 ObjectId 与字符串 userId）
   ========================================================= */
router.get("/manage", authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log("📢 管理员分析接口被访问");
    console.log("当前用户身份:", req.user);

    const users = await User.find().select("userId name email role").lean();

    // ✅ 获取所有借阅记录并包含 userId 和书籍分类
    const records = await BorrowRecord.find()
      .populate("bookId", "category title")
      .lean();

    console.log("📚 用户数量:", users.length);
    console.log("📘 借阅记录数量:", records.length);

    if (!records || records.length === 0) {
      console.log("📭 没有借阅记录");
      return res.json([]);
    }

    const results = users.map((u) => {
      // ✅ 兼容两种 userId 存储格式
      const userRecords = records.filter((r) => {
        const uid = String(u.userId).trim();
        const rid = String(r.userId?._id || r.userId || "").trim();
        return uid === rid || rid.endsWith(uid); // 兼容 r.userId=ObjectId(user)
      });

      const total = userRecords.length;
      const returned = userRecords.filter((r) => r.returned).length;
      const overdue = userRecords.filter(
        (r) => !r.returned && new Date(r.dueDate) < new Date()
      ).length;

      // 分类统计
      const categoryMap = {};
      userRecords.forEach((r) => {
        const c = r.bookId?.category;
        if (c) categoryMap[c] = (categoryMap[c] || 0) + 1;
      });

      const topCategory =
        Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "未知";

      let persona = "普通读者 📘";
      if (/心理|哲学/i.test(topCategory)) persona = "思考型读者 🤔";
      if (/科学|技术|计算机|工程/i.test(topCategory)) persona = "理工型读者 💻";
      if (/小说|文学|艺术/i.test(topCategory)) persona = "文艺型读者 🎨";
      if (userRecords.filter((r) => r.renewed).length > 3)
        persona += " · 深度阅读者 📚";

      const onTimeRate =
        total === 0 ? 0 : Math.max(0, Math.round(((returned - overdue) / total) * 100));

      const personaDescription =
        persona.includes("理工")
          ? "偏好科技与工程类书籍，逻辑性强。"
          : persona.includes("文艺")
          ? "喜好文学与艺术作品，情感细腻。"
          : persona.includes("思考")
          ? "常读心理、哲学类书籍，善于反思。"
          : "阅读类型多样，兴趣广泛。";

      return {
        ...u,
        totalBorrows: total,
        returnedCount: returned,
        overdueCount: overdue,
        onTimeRate,
        topCategory,
        persona,
        personaDescription,
      };
    });

    res.json(results);
  } catch (err) {
    console.error("❌ 用户管理接口失败:", err);
    res.status(500).json({ message: "查询用户借阅分析失败", error: err.message });
  }
});


/* =========================================================
   📈 全馆阅读偏好统计接口（饼图）
   ========================================================= */
router.get("/analytics/categories", authMiddleware, requireAdmin, async (req, res) => {
  try {

    const records = await BorrowRecord.find().populate("bookId", "category").lean();
    const categoryMap = {};

    records.forEach((r) => {
      const c = r.bookId?.category || "未知";
      categoryMap[c] = (categoryMap[c] || 0) + 1;
    });

    const stats = Object.entries(categoryMap).map(([category, borrowCount]) => ({
      category,
      borrowCount,
    }));

    res.json(stats);
  } catch (err) {
    console.error("❌ 阅读偏好统计失败:", err);
    res.status(500).json({ message: "统计失败", error: err.message });
  }
});

export default router;
