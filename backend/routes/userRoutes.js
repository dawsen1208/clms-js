/**
 * User Routes
 * Handles user authentication, profile management, and session control.
 */
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import User from "../models/User.js";
import BorrowRecord from "../models/BorrowRecord.js";
import Book from "../models/Book.js";
import { authMiddleware, requireAdmin } from "../middleware/authUnified.js";
import { sendMail } from "../services/mailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/* =========================================================
   🧩 Debug Interface
   ========================================================= */
router.get("/debug", (_, res) => res.send("✅ userRoutes is active"));

/* =========================================================
   🧱 Helper Functions: Generate System User ID
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
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存临时验证码 (10分钟有效)
    user.tempAuthCode = code;
    user.tempAuthCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // 发送邮件 (Mock)
    sendEmailMock(
      email,
      "[CLMS] Email Verification Code",
      `Your verification/auth code is: ${code}.\nPlease enter this code on the page to complete binding.\nThis code will also serve as your login auth code after enabling 2FA, please keep it safe.`
    );

    res.json({ message: "Verification code sent (mock mode)", code });
  } catch (err) {
    console.error("❌ 发送验证码失败:", err);
    res.status(500).json({ message: "Failed to send verification code." });
  }
});

// 2. 确认绑定邮箱 (同时设置 authCode)
router.post("/bind-email", authMiddleware, async (req, res) => {
  try {
    const { email, code } = req.body;
    const userId = req.user.userId;

    if (!code) return res.status(400).json({ message: "Please enter verification code." });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    // 验证代码
    if (
      !user.tempAuthCode || 
      user.tempAuthCode !== code || 
      !user.tempAuthCodeExpires || 
      user.tempAuthCodeExpires < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
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

    res.json({ message: "Email bound successfully, auth code saved.", email: user.email });
  } catch (err) {
    console.error("❌ 绑定邮箱失败:", err);
    res.status(500).json({ message: "Failed to bind email." });
  }
});

// 3. 切换双重认证状态
router.post("/toggle-2fa", authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    const userId = req.user.userId;

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (enabled && !user.authCode) {
      return res.status(400).json({ message: "Please bind email and get auth code first." });
    }

    user.twoFactorEnabled = enabled;
    await user.save();

    res.json({ message: `2FA ${enabled ? "enabled" : "disabled"}`, twoFactorEnabled: user.twoFactorEnabled });
  } catch (err) {
    res.status(500).json({ message: "Setup failed." });
  }
});

// 4. 二次验证登录 (2FA)
router.post("/login/2fa", async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) return res.status(400).json({ message: "Missing parameters." });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    // 🚫 检查黑名单
    if (user.isBlacklisted) {
      return res.status(403).json({ 
        message: "Your account is blacklisted. Reason: " + (user.blacklistReason || "None") 
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA is not enabled for this account." });
    }

    if (!user.login2faCodeExpiresAt || user.login2faCodeExpiresAt < new Date()) {
      return res.status(400).json({ message: "Auth code expired, please login again to request a new code." });
    }

    if (!user.login2faCodeHash) {
      return res.status(400).json({ message: "No auth code requested, please login again." });
    }

    const ok = await bcrypt.compare(code, user.login2faCodeHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid auth code." });
    }

    user.login2faCodeHash = null;
    user.login2faCodeExpiresAt = null;

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
      message: "Login successful.",
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
    res.status(500).json({ message: "Verification failed." });
  }
});

/* =========================================================
   🧾 用户注册
   ========================================================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, authCode } = req.body;

    if (!name || !password)
      return res.status(400).json({ message: "Please provide name and password." });

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const nameStr = String(name).trim();
    const valid = /^(?!\p{N}+$)\p{L}[\p{L}\p{N}_ ]*$/u.test(nameStr);
    if (!valid) {
      return res.status(400).json({
        message:
          "Invalid username: Must start with a letter (any language), contain only letters, numbers, underscores, spaces, and cannot be purely numeric.",
      });
    }
    const exists = await User.findOne({ name: nameStr }).lean();
    if (exists) return res.status(400).json({ message: "Username already exists, please choose another." });

    let finalRole = role;
    if (role === "Administrator") {
      const adminCode = process.env.ADMIN_REGISTER_CODE || "admin";
      if (authCode?.trim().toLowerCase() !== adminCode.toLowerCase()) {
        return res.status(403).json({ message: "Invalid admin registration code." });
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
      message: "Registration successful.",
      user: { userId, name, role: finalRole },
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({ message: `This ${field} is already taken, please try another.` });
    }
    console.error("❌ 注册失败详细信息:", err);
    res.status(500).json({ message: "Internal server error.", error: err.message });
  }
});

/* =========================================================
   🔑 登录（增强版：Token 包含完整用户信息）
   ========================================================= */
router.post("/login", async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ message: "Please enter User ID and password." });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ message: "User not found." });

    // 验证当前密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

    // 🚫 检查黑名单
    if (user.isBlacklisted) {
      return res.status(403).json({ 
        message: "Your account is blacklisted. Reason: " + (user.blacklistReason || "None") 
      });
    }

    // ⏳ 检查审核状态
    if (user.status === "PENDING") {
      return res.status(403).json({ message: "Account pending approval, please wait for admin." });
    }
    if (user.status === "REJECTED") {
      return res.status(403).json({ message: "Account rejected, please contact admin." });
    }

    // 🔐 检查双重认证 (2FA)
    if (user.twoFactorEnabled) {
      const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
      const expires = new Date(Date.now() + 10 * 60 * 1000);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(code, salt);

      user.login2faCodeHash = hash;
      user.login2faCodeExpiresAt = expires;
      await user.save();

      const targetEmail = user.gmailAddress || user.email || "";
      if (targetEmail) {
        const subject = "[CLMS] Login Verification Code";
        const html = `
          <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif;">
            <p>Your login verification code is:</p>
            <div style="font-size:24px;letter-spacing:4px;font-weight:700">${code}</div>
            <p>This code is valid for 10 minutes. If this was not you, please change your password immediately.</p>
          </div>
        `;
        sendMail(targetEmail, subject, html).catch(() => {});
      }

      return res.json({
        require2FA: true,
        userId: user.userId,
        message: "2FA code has been sent to your email.",
        expiresInSec: 600,
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
      message: "Login successful.",
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
    res.status(500).json({ message: "Login failed.", error: err.message });
  }
});

/* =========================================================
   👤 获取用户信息
   ========================================================= */
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json(user);
  } catch (err) {
    console.error("❌ 获取用户信息失败:", err);
    res.status(500).json({ message: "Failed to fetch user info." });
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
      return res.status(400).json({ message: "No fields to update." });

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

    if (!updated) return res.status(404).json({ message: "User not found." });

    res.json({ message: "User info updated successfully.", user: updated });
  } catch (err) {
    console.error("❌ 更新用户信息失败:", err);
    res.status(500).json({ message: "Failed to update user info." });
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
        return cb(new Error("Cannot create upload dir: " + e.message));
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
    if (!user) return res.status(404).json({ message: "User not found." });

    // 使用相对路径，确保在本地与公网同源下都能加载
    const avatarUrl = `/uploads/${req.file.filename}`;

    if (user.avatar?.includes("/uploads/")) {
      const oldFile = path.join(uploadDir, path.basename(user.avatar));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    user.avatar = avatarUrl;
    await user.save();

    res.json({ message: "Avatar updated successfully.", avatarUrl });
  } catch (err) {
    console.error("❌ 头像上传失败:", err);
    res.status(500).json({ message: "Avatar upload failed." });
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
      return res.status(400).json({ message: "Invalid status." });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "Administrator") {
      return res.status(400).json({ message: "Admin account does not require approval." });
    }

    user.status = status;
    await user.save();

    res.json({ 
      message: `User status updated to ${status}`,
      user: { userId: user.userId, status: user.status }
    });
  } catch (err) {
    console.error("❌ 审核操作失败:", err);
    res.status(500).json({ message: "Operation failed." });
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
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "Administrator") {
      return res.status(400).json({ message: "Cannot blacklist admin account." });
    }

    user.isBlacklisted = isBlacklisted;
    user.blacklistReason = reason || "";
    
    await user.save();

    res.json({ 
      message: isBlacklisted ? "User blacklisted" : "User removed from blacklist",
      user: { userId: user.userId, isBlacklisted, blacklistReason: user.blacklistReason }
    });
  } catch (err) {
    console.error("❌ 黑名单操作失败:", err);
    res.status(500).json({ message: "Operation failed." });
  }
});

router.get("/all", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find()
      .select("userId name email role status isBlacklisted blacklistReason createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

router.put("/status/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { status } = req.body || {};

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.role === "Administrator") {
      return res.status(400).json({ message: "Cannot change administrator status." });
    }

    user.status = status;
    await user.save();

    res.json({
      message: `User status updated to ${status}`,
      user: { userId: user.userId, status: user.status },
    });
  } catch (err) {
    res.status(500).json({ message: "Operation failed.", error: err.message });
  }
});

router.put("/role/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const { role } = req.body || {};
    if (!["Reader", "Administrator"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "User not found." });

    user.role = role;
    await user.save();

    res.json({
      message: "User role updated",
      user: { userId: user.userId, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Operation failed.", error: err.message });
  }
});

router.delete("/:targetUserId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    if (String(targetUserId) === String(req.user?.userId)) {
      return res.status(400).json({ message: "Cannot delete current user." });
    }

    const user = await User.findOne({ userId: targetUserId });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Administrator") {
      return res.status(400).json({ message: "Cannot delete administrator." });
    }

    await User.deleteOne({ userId: targetUserId });
    res.json({ message: "User deleted", userId: targetUserId });
  } catch (err) {
    res.status(500).json({ message: "Delete failed.", error: err.message });
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
