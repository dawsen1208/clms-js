// ✅ client/src/pages/RegisterAdmin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Card, Modal } from "antd";
import "./RegisterAdmin.css";
import { CopyOutlined } from "@ant-design/icons";
import { register } from "../api"; // ✅ 统一使用 API 封装
import axios from "axios"; // 保留 axios 用于认证码扩展（可选）
import { useLanguage } from "../context/LanguageContext";

function RegisterAdmin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedId, setAssignedId] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ 自动读取 .env 环境变量，兼容手机访问
  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/$/, "");

  /** 🧩 管理员注册逻辑 */
  const handleAdminRegister = async (values) => {
    const { name, email, password, authCode } = values;
    if (!name || !password || !authCode) {
      return message.warning(t("register.fillAll"));
    }

    try {
      setLoading(true);
      // ✅ 调用统一注册接口（管理员需传入 authCode）
      const res = await register(name, email || "", password, "Administrator", authCode);
      const id = res.data?.user?.userId;

      if (!id) throw new Error(t("register.noId"));
      console.log("🟩 Administrator system-assigned ID:", id);

      // ✅ 存储预填 ID
      localStorage.setItem("prefillUserId", id);

      // ✅ 自动复制到剪贴板（带降级兜底）
      const copied = await copyToClipboard(id);
      if (copied) {
        message.success(t("register.copySuccess"));
      } else {
        message.warning(t("register.copyFail"));
      }

      // ✅ 显示注册成功弹窗
      setAssignedId(id);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Administrator registration failed:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        t("register.regFail");
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 复用的复制函数（clipboard API + execCommand 降级）
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

  /** ✅ Modal: go to login */
  const handleModalOk = () => {
    setModalVisible(false);
    message.info(t("register.redirectLogin"));
    setTimeout(() => {
      navigate("/login");
    }, 600);
  };

  return (
    <div className="register-admin-page" style={{ padding: "2rem" }}>
      {/* ✅ 左侧注册表单 */}
      <Card className="register-card" title={t("titles.registerAdmin")} style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", background: "#fff" }}>
        <p style={{ marginBottom: 20, color: "#555" }}>
          {t("register.adminDesc")}
        </p>

        <Form layout="vertical" onFinish={handleAdminRegister}>
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

          <Form.Item
            name="authCode"
            label={t("register.authCode")}
            rules={[{ required: true, message: t("register.enterAuth") }]}
          >
            <Input
              size="large"
              placeholder={t("register.authCodePlaceholder")}
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
                background: "linear-gradient(90deg, #667eea, #764ba2)",
                fontWeight: "bold",
                boxShadow: "0 4px 10px rgba(118,75,162,0.3)",
              }}
            >
              {t("register.registerAdminBtn")}
            </Button>
          </Form.Item>

          <div style={{ marginTop: 10 }}>
            <Button
              type="link"
              block
              style={{ color: "#1677ff" }}
              onClick={() => navigate("/register")}
            >
              👈 {t("register.backToReader")}
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

      {/* ✅ 右侧插图 */}
      <div className="register-illustration admin">
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
          <p>{t("register.assignedAdminId")}</p>
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
                else message.error(t("register.manualCopyFail"));
              }}
            />
          </p>
          <p>{t("register.idCopiedMsg")}</p>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterAdmin;
