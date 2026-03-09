/**
 * Notification Email Routes
 * Handles email binding, verification codes, and external notification settings.
 */
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/authUnified.js";
import { sendMail } from "../services/mailer.js";

const router = express.Router();

const isAllowedEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  return /^\S+@\S+\.\S+$/.test(trimmed);
};

router.post("/bind", authMiddleware, async (req, res) => {
  try {
    const { gmail } = req.body || {};
    if (!gmail || !isAllowedEmail(gmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    user.gmailAddress = gmail.trim().toLowerCase();
    user.gmailVerified = false;
    user.gmailVerifyCodeHash = null;
    user.gmailVerifyCodeExpiresAt = null;
    user.externalEmailNotifyEnabled = false;
    user.externalEmailNotifyEvents = {
      borrow: false,
      return: false,
      requestApproved: false,
    };
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ bind gmail failed:", err);
    res.status(500).json({ message: "Bind gmail failed" });
  }
});

router.post("/send-code", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.gmailAddress || !isAllowedEmail(user.gmailAddress)) {
      return res.status(400).json({ message: "Notification email not bound" });
    }
    const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(code, salt);
    user.gmailVerifyCodeHash = hash;
    user.gmailVerifyCodeExpiresAt = expires;
    await user.save();

    const subject = "Your verification code";
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif;">
        <p>Your verification code is:</p>
        <div style="font-size:24px;letter-spacing:4px;font-weight:700">${code}</div>
        <p>This code is valid for 10 minutes.</p>
      </div>
    `;
    const mailSent = await sendMail(user.gmailAddress, subject, html);

    res.json({ ok: true, expiresInSec: 600, mailSent: !!mailSent });
  } catch (err) {
    console.error("❌ send verify code failed:", err);
    res.status(500).json({ message: "Send code failed" });
  }
});

router.post("/verify", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code || typeof code !== "string" || code.length < 6) {
      return res.status(400).json({ message: "Invalid code" });
    }
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.gmailVerifyCodeExpiresAt || user.gmailVerifyCodeExpiresAt < new Date()) {
      return res.status(400).json({ message: "Code expired" });
    }
    if (!user.gmailVerifyCodeHash) {
      return res.status(400).json({ message: "No code requested" });
    }
    const ok = await bcrypt.compare(code, user.gmailVerifyCodeHash);
    if (!ok) return res.status(400).json({ message: "Code mismatch" });

    user.gmailVerified = true;
    user.gmailVerifyCodeHash = null;
    user.gmailVerifyCodeExpiresAt = null;

    if (!user.email) {
      user.email = user.gmailAddress || "";
    }
    user.authCode = code;

    await user.save();
    res.json({
      ok: true,
      gmailVerified: true,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (err) {
    console.error("❌ verify gmail failed:", err);
    res.status(500).json({ message: "Verify failed" });
  }
});

router.patch("/preferences", authMiddleware, async (req, res) => {
  try {
    const { externalEmailNotifyEnabled, events } = req.body || {};
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (typeof externalEmailNotifyEnabled === "boolean") {
      if (externalEmailNotifyEnabled && !user.gmailVerified) {
        return res.status(400).json({ message: "Notification email not verified" });
      }
      user.externalEmailNotifyEnabled = externalEmailNotifyEnabled;
    }
    if (events && typeof events === "object") {
      user.externalEmailNotifyEvents = {
        ...user.externalEmailNotifyEvents,
        ...events,
      };
    }
    await user.save();

    res.json({
      ok: true,
      preferences: {
        externalEmailNotifyEnabled: user.externalEmailNotifyEnabled,
        externalEmailNotifyEvents: user.externalEmailNotifyEvents,
        gmailAddress: user.gmailAddress,
        gmailVerified: user.gmailVerified,
      },
    });
  } catch (err) {
    console.error("❌ update email preferences failed:", err);
    res.status(500).json({ message: "Update preferences failed" });
  }
});

export default router;
