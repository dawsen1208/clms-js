import "dotenv/config";
import { sendMail } from "./services/mailer.js";

async function main() {
  try {
    const to = process.env.SMTP_TO || process.env.SMTP_USER || process.env.GMAIL_USER;
    if (!to) {
      console.error("NO_SMTP_TO_OR_USER_ENV");
      process.exit(1);
    }
    await sendMail(
      to,
      "CLMS SMTP Test",
      "<p>This is an SMTP test from CLMS.</p>"
    );
    console.log("MAIL_SENT");
  } catch (err) {
    console.error("MAIL_ERR", err?.message || err);
    process.exit(1);
  }
}

main();
