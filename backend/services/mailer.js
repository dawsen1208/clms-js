// backend/services/mailer.js
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 0);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const DEFAULT_PUBLIC_URL = "https://clmsf5164136.z1.web.core.windows.net/";
const APP_PUBLIC_URL =
  process.env.APP_PUBLIC_URL ||
  process.env.FRONTEND_URL ||
  process.env.PUBLIC_APP_URL ||
  DEFAULT_PUBLIC_URL;

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn(
      "⚠️ SMTP_USER / SMTP_PASS 未配置，邮件通知功能将被禁用"
    );
    return null;
  }

  if (SMTP_HOST && SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendMail(to, subject, html, text) {
  try {
    const t = getTransporter();
    if (!t) {
      console.warn("⚠️ 邮件发送被跳过（transporter 未初始化或配置缺失）");
      return false;
    }

    const mailOptions = {
      from: `"CLMS Library" <${SMTP_FROM || SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || subject,
    };

    await t.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("❌ 发送邮件失败（不影响主业务）:", err?.message || err);
    return false;
  }
}

export async function sendLibraryNotification(to, title, message, meta = {}) {
  if (!to) return;

  const safeTitle = title || "Library Notification";
  const safeMessage = message || "";

  const time =
    meta.time ||
    new Date().toLocaleString("en-US", {
      hour12: false,
    });

  const bookTitle = meta.bookTitle || "";
  const operation = meta.operation || "";
  const extra = meta.extra || "";

  const buttonUrl = APP_PUBLIC_URL || "#";

  const html = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f5efe6; padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#fff7ec;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #f0e2cf;">
      <div style="background:linear-gradient(90deg,#f5ddba,#f9e9d4);padding:16px 20px;border-bottom:1px solid rgba(0,0,0,0.04);">
        <div style="font-size:20px;font-weight:600;color:#5a4634;">CLMS Library</div>
        <div style="font-size:12px;color:#8b7761;margin-top:2px;">Your CLMS Library activity update</div>
      </div>
      <div style="padding:20px 24px 8px 24px;">
        <div style="font-size:18px;font-weight:600;color:#443226;margin-bottom:8px;">${safeTitle}</div>
        ${
          bookTitle
            ? `<div style="font-size:14px;color:#6b5744;margin-bottom:4px;"><strong>Book:</strong> ${bookTitle}</div>`
            : ""
        }
        ${
          operation
            ? `<div style="font-size:14px;color:#6b5744;margin-bottom:4px;"><strong>Action:</strong> ${operation}</div>`
            : ""
        }
        <div style="font-size:13px;color:#8b7761;margin-bottom:4px;"><strong>Time:</strong> ${time}</div>
        ${
          extra
            ? `<div style="font-size:13px;color:#8b7761;margin:8px 0 4px 0;">${extra}</div>`
            : ""
        }
        ${
          safeMessage
            ? `<div style="font-size:14px;color:#5a4634;margin-top:8px;line-height:1.5;">${safeMessage}</div>`
            : ""
        }
      </div>
      <div style="padding:0 24px 20px 24px;">
        <a href="${buttonUrl}" style="display:inline-block;margin-top:8px;padding:10px 18px;border-radius:999px;background:#e8b980;color:#432a1b;text-decoration:none;font-size:14px;font-weight:600;border:1px solid rgba(0,0,0,0.06);box-shadow:0 3px 8px rgba(0,0,0,0.12);">
          Open Library
        </a>
      </div>
      <div style="padding:12px 24px 16px 24px;border-top:1px dashed rgba(0,0,0,0.05);background:#fcf3e6;font-size:11px;color:#a08b73;">
        This email was sent by the CLMS Library system. If you prefer not to receive these updates, you can turn off email notifications in your account settings.
      </div>
    </div>
  </div>
  `;

  const text =
    `${safeTitle}\n\n` +
    (bookTitle ? `Book: ${bookTitle}\n` : "") +
    (operation ? `Action: ${operation}\n` : "") +
    `Time: ${time}\n\n` +
    (safeMessage ? `${safeMessage}\n\n` : "") +
    (buttonUrl && buttonUrl !== "#"
      ? `Open Library: ${buttonUrl}\n`
      : "");

  await sendMail(to, safeTitle, html, text);
}
