import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Modal, Grid, Typography, theme } from "antd";
import { CopyOutlined, UserOutlined, MailOutlined, LockOutlined, KeyOutlined, CheckCircleFilled, GlobalOutlined } from "@ant-design/icons";
import { register } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

function RegisterAdmin() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { token } = useToken();
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedId, setAssignedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameTaken, setNameTaken] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  /** 🧩 Admin registration logic */
  const handleAdminRegister = async (values) => {
    const { name, email, password, authCode } = values;
    if (!name || !password || !authCode) {
      return message.warning(t("register.fillAll"));
    }

    try {
      setLoading(true);
      // Admin registration requires authCode
      const res = await register(name, email || "", password, "Administrator", authCode);
      const id = res.data?.user?.userId;

      if (!id) throw new Error(t("register.noId"));
      console.log("🟩 Administrator system-assigned ID:", id);

      localStorage.setItem("prefillUserId", id);

      const copied = await copyToClipboard(id);
      if (copied) {
        message.success(t("register.copySuccess"));
      } else {
        message.warning(t("register.copyFail"));
      }

      setAssignedId(id);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Administrator registration failed:", err);
      const code = err?.response?.data?.code;
      const backendMsg = err?.response?.data?.message || "";
      const isNameTaken =
        code === "NAME_TAKEN" ||
        /username.*exists/i.test(backendMsg) ||
        (/already taken/i.test(backendMsg) && /name/i.test(backendMsg));

      if (isNameTaken) {
        setNameTaken(true);
        form.setFields([
          { name: "name", errors: [t("register.nameTaken") || "This name is already taken."] },
        ]);
      } else {
        const msg = backendMsg || err.message || t("register.regFail");
        message.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
      alignItems: "stretch",
      background: "#FAF9F6", // Warm paper background
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden"
    }}>
      {/* 🖼️ Left Side - Editorial Visual for Admin */}
      <div style={{
        flex: screens.md ? "0 0 45%" : "0 0 0",
        background: "#2C3E50", // Deep slate for admin authority
        position: "relative",
        display: screens.md ? "flex" : "none",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "80px",
        overflow: "hidden"
      }}>
        {/* Background Image / Texture */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')", // Tech/Admin feel
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.4,
          mixBlendMode: "overlay"
        }} />
        
        {/* Gradient Overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom, rgba(44, 62, 80, 0.2), rgba(44, 62, 80, 0.9))"
        }} />
        
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <div style={{ 
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "30px",
            color: "rgba(255,255,255,0.9)",
            marginBottom: "32px",
            fontFamily: token.fontFamilyCode,
            fontSize: "12px",
            letterSpacing: "1px",
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <span style={{ width: 8, height: 8, background: "#4CAF50", borderRadius: "50%" }} />
            ADMINISTRATION
          </div>
          
          <Title level={1} style={{ 
            fontFamily: "'Literata', serif", 
            fontSize: "3.5rem", 
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 24,
            fontWeight: 400
          }}>
            Curate the <br/> knowledge.
          </Title>
          <Paragraph style={{ 
            fontSize: "1.125rem", 
            color: "rgba(255,255,255,0.8)", 
            lineHeight: 1.6,
            fontFamily: "'Inter', sans-serif",
            maxWidth: 400
          }}>
            Manage the library ecosystem, curate collections, and ensure a seamless experience for all readers.
          </Paragraph>
        </div>
      </div>

      {/* 📝 Right Side - Registration Form */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: screens.md ? "80px" : "24px",
        position: "relative",
        background: "#FAF9F6" // Match global warm background
      }}>
        {/* Language Switcher */}
        <div style={{ position: "absolute", top: 24, right: 24 }}>
          <Button
            type="text"
            icon={<GlobalOutlined />}
            onClick={toggleLanguage}
            style={{ color: token.colorTextSecondary }}
          >
            {language === "en" ? "EN" : "中文"}
          </Button>
        </div>

        {/* Mobile Header */}
        {!screens.md && (
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <Title level={3} style={{ fontFamily: "'Literata', serif", margin: 0 }}>CLMS Admin</Title>
          </div>
        )}

        <div style={{ 
          width: "100%", 
          maxWidth: "480px",
          background: "#fff",
          padding: screens.md ? "48px" : "32px",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.04)", // Soft warm shadow
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${token.colorTextHeading}, ${token.colorPrimary})`,
              borderRadius: 12,
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 24,
              fontFamily: "'Literata', serif",
              fontWeight: 700,
              boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)"
            }}>
              A
            </div>
            <Title level={2} style={{ 
              marginBottom: "8px", 
              fontFamily: "'Literata', serif",
              color: token.colorTextHeading 
            }}>
              {t("register.registerAdminBtn")}
            </Title>
            <Text type="secondary" style={{ fontSize: "16px" }}>
              {t("register.adminDesc") || "Create your administrative account"}
            </Text>
          </div>

          <Form 
            layout="vertical" 
            onFinish={handleAdminRegister} 
            size="large"
            requiredMark={false}
            form={form}
            onValuesChange={(changed) => {
              if (Object.prototype.hasOwnProperty.call(changed || {}, "name") && nameTaken) {
                setNameTaken(false);
                form.setFields([{ name: "name", errors: [] }]);
              }
            }}
          >
            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.name")}</span>}
              rules={[
                { required: true, message: t("register.enterName") },
                { pattern: /^(?!\d+$)[\p{L}][\p{L}\p{N}_ ]*$/u, message: t("register.nameInvalid") }
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />}
                placeholder={t("register.namePlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>
            
            <Form.Item 
              name="email" 
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.email")}</span>}
            >
              <Input
                prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />}
                placeholder={t("register.emailPlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.password")}</span>}
              rules={[
                { required: true, message: t("register.enterPass") },
                { min: 6, message: t("register.passwordMin6") }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />}
                placeholder={t("register.passwordPlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item
              name="authCode"
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.authCode")}</span>}
              rules={[{ required: true, message: t("register.enterAuth") }]}
              style={{ marginBottom: 32 }}
            >
              <Input.Password
                prefix={<KeyOutlined style={{ color: token.colorTextQuaternary }} />}
                placeholder={t("register.authCodePlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                style={{
                  height: 52, 
                  borderRadius: 26, 
                  fontSize: 16, 
                  fontWeight: 600,
                  background: "#2C3E50", // Match admin theme
                  boxShadow: "0 8px 20px rgba(44, 62, 80, 0.25)",
                  border: "none"
                }}
              >
                {t("register.registerAdminBtn")}
              </Button>
            </Form.Item>

            <div style={{ 
              marginTop: 24, 
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              textAlign: 'center'
            }}>
              <Button type="link" onClick={() => navigate("/register")} style={{ color: token.colorTextSecondary }}>
                {t("register.backToReader")}
              </Button>
              <Text type="secondary">
                 {t("login.haveAccount")} <Button type="link" onClick={() => navigate("/login")} style={{ padding: 0, fontWeight: 600, color: "#2C3E50" }}>{t("register.backToLogin")}</Button>
              </Text>
            </div>
          </Form>
        </div>
      </div>

      {/* ✅ Registration success modal */}
      <Modal
        title={null}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        footer={null}
        centered
        width={420}
        bodyStyle={{ padding: "40px 32px", textAlign: "center" }}
      >
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: "50%", 
          background: "#E8F5E9", 
          color: "#4CAF50", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          fontSize: 40,
          margin: "0 auto 24px auto"
        }}>
          <CheckCircleFilled />
        </div>
        <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 16 }}>
          {t("register.regSuccessTitle")}
        </Title>
        <Paragraph style={{ color: token.colorTextSecondary, marginBottom: 32 }}>
          {t("register.pendingApproval") || "Your account is pending approval. Please save your Admin ID below."}
        </Paragraph>
        
        <div style={{ 
          background: token.colorFillAlter, 
          padding: "20px", 
          borderRadius: 12, 
          marginBottom: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          border: `1px dashed ${token.colorBorder}`
        }}>
          <Text copyable={{ text: assignedId, tooltips: ['Copy', 'Copied!'] }} style={{ 
            fontSize: "1.75rem", 
            fontWeight: "bold", 
            color: "#2C3E50", 
            fontFamily: token.fontFamilyCode 
          }}>
            {assignedId}
          </Text>
        </div>
        
        <Button 
          type="primary" 
          onClick={handleModalOk}
          block
          size="large"
          style={{ 
            height: 48, 
            borderRadius: 24,
            background: "#2C3E50" 
          }}
        >
          {t("register.goToLogin")}
        </Button>
      </Modal>
    </div>
  );
}

export default RegisterAdmin;
