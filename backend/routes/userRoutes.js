// ✅ backend/routes/userRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import BorrowRecord from "../models/BorrowRecord.js"; // ✅ 新增
import Book from "../models/Book.js"; // ✅ 新增
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js"; // ✅ 使用统一认证中间件

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
   📧 邮箱与双重认证 (2FA) 相关接口
   ========================================================= */

// 模拟发送邮件函数
const sendEmailMock = (to, subject, text) => {
  console.log(`\n📨 [MOCK EMAIL] To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text}\n`);
  return true;
};

// 1. 发送验证码 (用于绑定邮箱)
router.post("/send-auth-code", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.userId;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "请输入有效的邮箱地址" });
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存临时验证码 (10分钟有效)
    user.tempAuthCode = code;
    user.tempAuthCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // 发送邮件 (Mock)
    sendEmailMock(
      email,
      "【CLMS】邮箱绑定验证码",
      `您的验证码/授权码是：${code}。\n请在页面输入此代码以完成绑定。\n此代码也将作为您开启双重认证后的登录授权码，请妥善保管。`
    );

    res.json({ message: "验证码已生成 (模拟模式)", code });
  } catch (err) {
    console.error("❌ 发送验证码失败:", err);
    res.status(500).json({ message: "发送验证码失败" });
  }
});

// 2. 确认绑定邮箱 (同时设置 authCode)
router.post("/bind-email", authMiddleware, async (req, res) => {
  try {
    const { email, code } = req.body;
    const userId = req.user.userId;

    if (!code) return res.status(400).json({ message: "请输入验证码" });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 验证代码
    if (
      !user.tempAuthCode || 
      user.tempAuthCode !== code || 
      !user.tempAuthCodeExpires || 
      user.tempAuthCodeExpires < new Date()
    ) {
      return res.status(400).json({ message: "验证码无效或已过期" });
    }

    // 绑定成功
    user.email = email;
    user.authCode = code; // 将验证码固定为授权码
    user.tempAuthCode = ""; // 清除临时码
    user.tempAuthCodeExpires = null;
    
    // 默认开启邮件通知 (根据需求: "邮件通知功能默认处于关闭状态...用户需主动填写...配置完成后...功能才可启用")
    // 实际上用户还需要手动开启开关，这里只绑定邮箱
    // Update: 需求说 "邮件通知功能默认处于关闭状态...仅在用户完成个人邮箱配置后才可启用"
    
    await user.save();

    res.json({ message: "邮箱绑定成功，授权码已保存", email: user.email });
  } catch (err) {
    console.error("❌ 绑定邮箱失败:", err);
    res.status(500).json({ message: "绑定邮箱失败" });
  }
});

// 3. 切换双重认证状态
router.post("/toggle-2fa", authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    if (enabled && !user.authCode) {
      return res.status(400).json({ message: "请先绑定邮箱并获取授权码" });
    }

    user.twoFactorEnabled = enabled;
    await user.save();

    res.json({ message: `双重认证已${enabled ? "开启" : "关闭"}`, twoFactorEnabled: user.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ message: "设置失败" });
  }
});

// 4. 二次验证登录 (2FA)
router.post("/login/2fa", async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) return res.status(400).json({ message: "参数缺失" });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 🚫 检查黑名单
    if (user.isBlacklisted) {
      return res.status(403).json({ 
        message: "您的账号已被列入黑名单，禁止登录。原因: " + (user.blacklistReason || "无") 
      });
    }

    // 验证授权码
    if (user.authCode !== code) {
      return res.status(401).json({ message: "授权码错误" });
    }

    // 登录成功，颁发 Token
    const sessionId = crypto.randomUUID();
    user.sessions.push({
      id: sessionId,
      device: req.headers["user-agent"] || "Unknown Device",
      ip: req.ip || req.connection.remoteAddress || "0.0.0.0",
      loginTime: new Date(),
      lastUsedAt: new Date(),
    });
    // Limit sessions
    if (user.sessions.length > 10) {
       user.sessions.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
       user.sessions = user.sessions.slice(0, 10);
    }
    await user.save();

    const token = jwt.sign(
      { id: user._id, userId: user.userId, name: user.name, role: user.role, sessionId },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "7d" }
    );

    res.json({
      message: "登录成功",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        avatar: user.avatar || "",
        email: user.email,
        preferences: user.preferences
      },
    });

  } catch (err) {
    console.error("❌ 2FA登录失败:", err);
    res.status(500).json({ message: "验证失败" });
  }
});

/* =========================================================
   🧾 用户注册
   ========================================================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, authCode } = req.body;

    if (!name || !password)
      return res.status(400).json({ message: "请填写姓名和密码" });

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const nameStr = String(name).trim();
    const valid = /^(?!\d+$)[A-Za-z][A-Za-z0-9_ ]*$/.test(nameStr);
    if (!valid) return res.status(400).json({ message: "用户名不合法：需以字母开头，仅允许字母、数字、下划线、空格，且不能为纯数字" });
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
      status: "APPROVED", // ✅ 默认自动通过审核，无需管理员手动批准
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

    // 验证当前密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "密码错误" });

    // 🚫 检查黑名单
    if (user.isBlacklisted) {
      return res.status(403).json({ 
        message: "您的账号已被列入黑名单，禁止登录。原因: " + (user.blacklistReason || "无") 
      });
    }

    // ⏳ 检查审核状态
    if (user.status === "PENDING") {
      return res.status(403).json({ message: "账号审核中，请耐心等待管理员批准" });
    }
    if (user.status === "REJECTED") {
      return res.status(403).json({ message: "账号审核未通过，请联系管理员" });
    }

    // 🔐 检查双重认证 (2FA)
    if (user.twoFactorEnabled) {
      return res.json({
        require2FA: true,
        userId: user.userId,
        message: "请输入双重认证授权码"
      });
    }

    // ✅ Record Session
    const sessionId = crypto.randomUUID();
    user.sessions = user.sessions || [];
    user.sessions.push({
      id: sessionId,
      device: req.headers["user-agent"] || "Unknown Device",
      ip: req.ip || req.connection.remoteAddress || "0.0.0.0",
      loginTime: new Date(),
      lastUsedAt: new Date(),
    });
    // Limit sessions to 10
    if (user.sessions.length > 10) {
       user.sessions.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
       user.sessions = user.sessions.slice(0, 10);
    }
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        userId: user.userId,
        name: user.name,
        role: user.role,
        sessionId // ✅ Include sessionId
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
    const { name, email, preferences } = req.body;
    const userId = req.user.userId;

    if (!name && email === undefined && !preferences)
      return res.status(400).json({ message: "没有需要更新的字段" });

    const updateData = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    
    // ✅ Handle preferences update (merge deeply if possible, or replace)
    // Here we use $set to update specific fields if provided, or replace the whole object if that's the strategy.
    // Given the structure, simple assignment works for top-level keys if passed fully.
    if (preferences) {
      for (const key in preferences) {
        updateData[`preferences.${key}`] = preferences[key];
      }
    }

    const updated = await User.findOneAndUpdate(
      { userId },
      { $set: updateData },
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
const isAzure = !!process.env.WEBSITE_SITE_NAME;
const uploadDir = isAzure 
  ? "/home/site/uploads" 
  : path.join(__dirname, "../uploads");

console.log(`📂 UserRoutes uploadDir: ${uploadDir}`);

// 确保上传目录存在
try {
  if (!fs.existsSync(uploadDir)) {
    console.log(`📁 创建上传目录: ${uploadDir}`);
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error("❌ 无法创建上传目录:", err);
  // 在 Azure 上如果无法创建，可能是权限问题，或者父目录不存在
  // 但 /home/site/uploads 应该是可写的
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    // 再次检查确保目录存在
    if (!fs.existsSync(uploadDir)) {
      try {
        console.log(`⚠️ Re-creating upload dir inside multer: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (e) {
        console.error(`❌ Multer mkdir failed: ${e.message}`);
        // 如果是 Azure，可能因为父目录不存在，尝试逐级创建或忽略（如果已挂载）
        return cb(new Error("无法创建上传目录: " + e.message));
      }
    }
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    // 使用时间戳+随机数防止文件名冲突
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
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
   ✅ 管理员审核用户 (批准/拒绝)
   ========================================================= */
router.put("/approve/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ message: "无效的状态" });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    if (user.role === "Administrator") {
      return res.status(400).json({ message: "管理员账号无需审核" });
    }

    user.status = status;
    await user.save();

    res.json({ 
      message: `用户状态已更新为 ${status}`,
      user: { userId: user.userId, status: user.status }
    });
  } catch (err) {
    console.error("❌ 审核操作失败:", err);
    res.status(500).json({ message: "操作失败" });
  }
});

/* =========================================================
   🚫 管理员设置黑名单接口
   ========================================================= */
router.put("/blacklist/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { isBlacklisted, reason } = req.body;

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    if (user.role === "Administrator") {
      return res.status(400).json({ message: "无法拉黑管理员账号" });
    }

    user.isBlacklisted = isBlacklisted;
    user.blacklistReason = reason || "";
    
    await user.save();

    res.json({ 
      message: isBlacklisted ? "已将用户加入黑名单" : "已解除用户黑名单",
      user: { userId: user.userId, isBlacklisted, blacklistReason: user.blacklistReason }
    });
  } catch (err) {
    console.error("❌ 黑名单操作失败:", err);
    res.status(500).json({ message: "操作失败" });
  }
});

/* =========================================================
   📊 管理员用户借阅画像分析接口（兼容 ObjectId 与字符串 userId）
   ========================================================= */
router.get("/manage", authMiddleware, requireAdmin, async (req, res) => {
  try {
    console.log("📢 管理员分析接口被访问");
    console.log("当前用户身份:", req.user);

    const users = await User.find().select("userId name email role status isBlacklisted blacklistReason createdAt").lean();

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

/* =========================================================
   🔐 修改密码
   ========================================================= */
router.put("/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "请提供当前密码和新密码" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "新密码长度至少为8位" });
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.warn(`⚠️ 用户 ${userId} 修改密码失败: 当前密码错误`);
      return res.status(400).json({ message: "当前密码错误" });
    }

    // 更新密码 (User model pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    console.log(`✅ 用户 ${userId} 密码修改成功`);
    res.json({ message: "密码修改成功" });
  } catch (err) {
    console.error("❌ 修改密码失败:", err);
    res.status(500).json({ message: "修改密码失败: " + err.message });
  }
});

/* =========================================================
   📱 会话管理 (设备管理)
   ========================================================= */
router.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select("sessions");
    if (!user) return res.status(404).json({ message: "用户不存在" });
    res.json(user.sessions || []);
  } catch (err) {
    res.status(500).json({ message: "获取会话列表失败" });
  }
});

router.delete("/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    user.sessions = (user.sessions || []).filter(s => s.id !== sessionId);
    await user.save();

    res.json({ message: "会话已移除" });
  } catch (err) {
    res.status(500).json({ message: "移除会话失败" });
  }
});

router.delete("/sessions", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 保留当前会话
    const currentSessionId = req.user.sessionId;
    if (currentSessionId) {
      user.sessions = (user.sessions || []).filter(s => s.id === currentSessionId);
    } else {
       user.sessions = [];
    }
    await user.save();

    res.json({ message: "已退出其他所有设备" });
  } catch (err) {
    res.status(500).json({ message: "操作失败" });
  }
});

/* =========================================================
   🚫 管理员设置黑名单接口
   ========================================================= */
router.put("/blacklist/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { isBlacklisted, reason } = req.body;

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "用户不存在" });

    // 不允许拉黑管理员自己或其它管理员
    if (user.role === "Administrator") {
      return res.status(400).json({ message: "无法拉黑管理员账号" });
    }

    user.isBlacklisted = isBlacklisted;
    user.blacklistReason = reason || "";
    await user.save();

    res.json({ 
      message: isBlacklisted ? "已将用户加入黑名单" : "已解除用户黑名单",
      user: { userId: user.userId, isBlacklisted, blacklistReason: user.blacklistReason }
    });
  } catch (err) {
    console.error("❌ 黑名单操作失败:", err);
    res.status(500).json({ message: "操作失败" });
  }
});

/* =========================================================
   ✅ 管理员审批用户
   ========================================================= */
router.put("/approve/:userId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body; // APPROVED or REJECTED
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = status;
    await user.save();

    // Send Notification
    try {
        const Notification = (await import("../models/Notification.js")).default;
        await Notification.create({
            userId: user.userId,
            type: "system",
            title: "Account Status Update",
            message: status === "APPROVED" ? "Your account has been approved." : "Your account has been rejected."
        });
    } catch (e) {
        console.error("Failed to create notification:", e);
    }

    res.json({ message: `User status updated to ${status}`, user });
  } catch (err) {
    console.error("❌ Approval failed:", err);
    res.status(500).json({ message: "Approval failed" });
  }
});

export default router;
