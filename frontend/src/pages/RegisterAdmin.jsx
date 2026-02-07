// ✅ client/src/pages/RegisterAdmin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Modal, theme, Grid } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { purple } from "@ant-design/colors";
import { register } from "../api"; // ✅ 统一使用 API 封装
import axios from "axios"; // 保留 axios 用于认证码扩展（可选）
import { useLanguage } from "../contexts/LanguageContext";

function RegisterAdmin() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  
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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${purple[5]})`,
      padding: screens.md ? "2rem" : "1rem"
    }}>
      {/* Split Card Container */}
      <div style={{ 
        display: 'flex', 
        width: '100%', 
        maxWidth: '900px', 
        minHeight: '600px',
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        boxShadow: token.boxShadowSecondary,
        flexDirection: screens.md ? 'row' : 'column'
      }}>
        {/* Left Side - Form */}
        <div style={{ 
          flex: 1, 
          padding: screens.md ? '40px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
           <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ 
                width: "60px", 
                height: "60px", 
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${purple[5]})`, 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                fontSize: "24px",
                color: "#fff",
                boxShadow: token.boxShadow
              }}>🛡️</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: token.colorTextHeading }}>{t("titles.registerAdmin")}</div>
              <div style={{ fontSize: "14px", color: token.colorTextSecondary, marginTop: "4px" }}>{t("register.adminDesc")}</div>
            </div>

            <Form layout="vertical" onFinish={handleAdminRegister} size="large">
              <Form.Item
                name="name"
                label={t("register.name")}
                rules={[
                  { required: true, message: t("register.enterName") },
                  { pattern: /^(?!\d+$)[A-Za-z][A-Za-z0-9_ ]*$/, message: t("register.nameInvalid") }
                ]}
              >
                <Input
                  placeholder={t("register.namePlaceholder")}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item name="email" label={t("register.email")}>
                <Input
                  placeholder={t("register.emailPlaceholder")}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={t("register.password")}
                rules={[
                  { required: true, message: t("register.enterPass") },
                  { min: 8, message: t("register.passwordRequirements") }
                ]}
              >
                <Input.Password
                  placeholder={t("register.passwordPlaceholder")}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item
                name="authCode"
                label={t("register.authCode")}
                rules={[{ required: true, message: t("register.enterAuth") }]}
              >
                <Input
                  placeholder={t("register.authCodePlaceholder")}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  style={{
                    borderRadius: token.borderRadius,
                    background: `linear-gradient(90deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`,
                    border: 'none',
                    height: 48,
                    fontSize: 16,
                    fontWeight: 'bold',
                    boxShadow: `0 4px 10px ${token.colorPrimary}4D`,
                  }}
                >
                  {t("register.registerAdminBtn")}
                </Button>
              </Form.Item>

              <div style={{ 
                marginTop: 16, 
                borderTop: `1px solid ${token.colorBorderSecondary}`, 
                paddingTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <Button type="link" onClick={() => navigate("/register")} style={{ color: token.colorInfo }}>
                  👈 {t("register.backToReader")}
                </Button>
                <Button type="link" onClick={() => navigate("/login")} style={{ color: token.colorTextSecondary }}>
                  🔐 {t("register.backToLogin")}
                </Button>
              </div>
            </Form>
        </div>

        {/* Right Side - Illustration (Hidden on mobile) */}
        {screens.md && (
          <div style={{ 
            width: '45%', 
            background: `linear-gradient(135deg, ${token.colorPrimary}1A, ${purple.primary}1A)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderLeft: `1px solid ${token.colorBorderSecondary}`
          }}>
             <img
                src="/icons/app-icon-512.png"
                alt="app logo"
                onError={(e) => {
                  e.currentTarget.src = "/icons/manifest-icon-512.maskable.png";
                  e.currentTarget.onerror = null;
                }}
                style={{ width: '80%', maxWidth: 280, filter: `drop-shadow(0 10px 20px ${token.colorPrimary}4D)` }}
              />
          </div>
        )}
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
              color: token.colorPrimary,
              userSelect: "text",
            }}
          >
            {assignedId}
            <CopyOutlined
              style={{ marginLeft: 10, color: token.colorPrimary, cursor: "pointer" }}
              onClick={async () => {
                const ok = await copyToClipboard(assignedId);
                if (ok) message.success(t("register.copySuccess"));
                else message.error(t("register.manualCopyFail"));
              }}
            />
          </p>
          <p style={{ color: token.colorWarning, marginTop: 10 }}>
            {t("register.pendingApproval") || "Your account is pending approval. Please wait for an administrator to approve your registration."}
          </p>
          <p>{t("register.idCopiedMsg")}</p>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterAdmin;
