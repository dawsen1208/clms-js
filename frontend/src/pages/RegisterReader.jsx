// ✅ client/src/pages/RegisterReader.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Card, Modal } from "antd";
import "./RegisterReader.css";
import { CopyOutlined } from "@ant-design/icons";
import { register } from "../api"; // ✅ Use unified register API
import { useLanguage } from "../context/LanguageContext";

function RegisterReader() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedId, setAssignedId] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Auto-read .env API base, support LAN access
  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/$/, "");

  /** 📘 Reader registration logic */
  const handleReaderRegister = async (values) => {
    try {
      setLoading(true);
      const { name, email, password } = values;

      // ✅ Use unified register() helper (no authCode for Reader)
      const res = await register(name, email || "", password, "Reader");
      const id = res.data?.user?.userId;

      if (!id) throw new Error(t("register.noId"));

      console.log("🟩 System-assigned Reader ID:", id);
      localStorage.setItem("prefillUserId", id);

      const copied = await copyToClipboard(id);
      if (copied) {
        message.success(t("register.copySuccess"));
      } else {
        message.warning(t("register.copyFail"));
      }

      // ✅ Open success modal
      setAssignedId(id);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Registration failed:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        t("register.regFail");
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reusable clipboard helper at component scope
  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
        return true;
      }
    } catch (e) {
      console.warn("clipboard.writeText failed, fallback:", e);
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = String(text);
      textarea.style.position = "fixed";
      textarea.style.top = "-1000px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (e) {
      console.warn("Fallback copy failed:", e);
      return false;
    }
  };

  /** ✅ Modal: click OK to go to login */
  const handleModalOk = () => {
    setModalVisible(false);
    message.info(t("register.redirectLogin"));
    setTimeout(() => {
      navigate("/login");
    }, 600);
  };

  return (
    <div className="register-reader-page">
      {/* ✅ Left: registration form */}
      <Card className="register-card" title={t("titles.registerReader")} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", background: "#fff" }}>
        <p style={{ marginBottom: 20, color: "#555" }}>
          {t("register.readerDesc")}
        </p>

        <Form layout="vertical" onFinish={handleReaderRegister}>
          <Form.Item
            name="name"
            label={t("register.name")}
            rules={[
              { required: true, message: t("register.enterName") },
              { pattern: /^(?!\d+$)[A-Za-z][A-Za-z0-9_]*$/, message: t("register.nameInvalid") }
            ]}
          >
            <Input
              size="large"
              placeholder={t("register.namePlaceholder")}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="email" label={t("register.email")}>
            <Input
              size="large"
              placeholder={t("register.emailPlaceholder")}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={t("register.password")}
            rules={[{ required: true, message: t("register.enterPass") }]}
          >
            <Input.Password
              size="large"
              placeholder={t("register.passwordPlaceholder")}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                borderRadius: 8,
                background: "linear-gradient(90deg, #1677ff, #36cfc9)",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(24, 144, 255, 0.3)",
              }}
            >
              {t("register.registerReaderBtn")}
            </Button>
          </Form.Item>

          <div style={{ marginTop: 10 }}>
            <Button
              type="link"
              block
              style={{ color: "#722ed1" }}
              onClick={() => navigate("/register-admin")}
            >
              👉 {t("register.registerAdminBtn")}
            </Button>
            <Button
              type="link"
              block
              style={{ color: "#555" }}
              onClick={() => navigate("/login")}
            >
              🔐 {t("register.backToLogin")}
            </Button>
          </div>
        </Form>
      </Card>

      {/* ✅ Right: illustration */}
      <div className="register-illustration reader">
        <img
          src="/icons/app-icon-512.png"
          alt="app logo"
          onError={(e) => {
            e.currentTarget.src = "/icons/manifest-icon-512.maskable.png";
            e.currentTarget.onerror = null;
          }}
          className="register-logo"
        />
      </div>

      {/* ✅ Registration success modal */}
      <Modal
        title={t("register.regSuccessTitle")}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        cancelText={t("register.cancel")}
        okText={t("register.goToLogin")}
        centered
      >
        <div style={{ textAlign: "center" }}>
          <p>{t("register.assignedId")}</p>
          <p
            style={{
              fontSize: "1.3rem",
              fontWeight: "bold",
              color: "#1677ff",
              userSelect: "text",
            }}
          >
            {assignedId}
            <CopyOutlined
              style={{ marginLeft: 10, color: "#1677ff", cursor: "pointer" }}
              onClick={async () => {
                const ok = await copyToClipboard(assignedId);
                if (ok) message.success(t("register.copySuccess"));
                else message.warning(t("register.manualCopyFail"));
              }}
            />
          </p>
          <p>{t("register.idCopiedMsg")}</p>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterReader;
