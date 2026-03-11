// ✅ client/src/pages/RegisterReader.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Modal, theme, Grid, Typography } from "antd";
import { CopyOutlined, UserOutlined, MailOutlined, LockOutlined, ArrowRightOutlined, CheckCircleFilled, GlobalOutlined } from "@ant-design/icons";
import { register } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text, Paragraph } = Typography;

function RegisterReader() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [assignedId, setAssignedId] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  /** 📘 Reader registration logic */
  const handleReaderRegister = async (values) => {
    try {
      setLoading(true);
      const { name, email, password } = values;

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

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
        return true;
      }
    } catch (e) {
      console.warn("clipboard.writeText failed, fallback:", e);
    }
    // Fallback
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
    } catch {
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
      background: token.colorBgLayout,
      overflow: "hidden"
    }}>
      {/* 🖼️ Left Side - Editorial Visual */}
      <div style={{
        flex: screens.md ? "0 0 50%" : "0 0 0",
        background: "#E8F5E9", // Soft Sage Green background
        position: "relative",
        display: screens.md ? "flex" : "none",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "80px",
        overflow: "hidden"
      }}>
         {/* Abstract Background Shapes */}
         <div style={{
          position: "absolute",
          top: "-15%",
          left: "-15%",
          width: "70%",
          paddingBottom: "70%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, transparent 70%)",
        }} />
        
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <div style={{ 
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(10px)",
            borderRadius: "30px",
            color: token.colorTextSecondary,
            marginBottom: "32px",
            fontFamily: token.fontFamilyCode,
            fontSize: "12px",
            letterSpacing: "1px",
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
          }}>
            <span style={{ width: 8, height: 8, background: "#4CAF50", borderRadius: "50%" }} />
            JOIN THE COMMUNITY
          </div>
          <Title level={1} style={{ 
            fontFamily: "'Literata', serif", 
            fontSize: "3.5rem", 
            color: "#1B5E20", // Dark green text
            lineHeight: 1.1,
            marginBottom: 24,
            fontWeight: 400
          }}>
            Your next great idea <br/> starts here.
          </Title>
          <Paragraph style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.125rem",
            color: token.colorTextSecondary,
            lineHeight: 1.6,
            maxWidth: 400
          }}>
            Create an account to track your reading, reserve books, and get personalized recommendations.
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
        background: token.colorBgLayout
      }}>
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
        <div style={{ 
          width: "100%", 
          maxWidth: "480px",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(20px)",
          padding: screens.md ? "56px" : "32px",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.04)",
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
           {/* Header */}
           <div style={{ marginBottom: "40px", textAlign: "center" }}>
            <Title level={2} style={{ 
              margin: "0 0 8px 0", 
              fontFamily: "'Literata', serif",
              color: token.colorTextHeading,
              fontWeight: 600
            }}>
              {t("titles.registerReader")}
            </Title>
            <Text type="secondary" style={{ fontSize: "16px", fontFamily: "'Inter', sans-serif" }}>
              {t("register.readerDesc")}
            </Text>
          </div>

          <Form 
            layout="vertical" 
            size="large"
            onFinish={handleReaderRegister}
            requiredMark={false}
          >
            <Form.Item 
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.name")}</span>}
              name="name" 
              rules={[
                { required: true, message: t("register.nameReq") },
                {
                  pattern: /^(?!\d+$)[\p{L}][\p{L}\p{N}_ ]*$/u,
                  message: t("register.nameInvalid"),
                },
              ]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />} 
                placeholder={t("register.namePlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item 
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.email")}</span>}
              name="email"
              rules={[{ type: "email", message: "Please enter a valid email" }]}
            >
              <Input 
                prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />} 
                placeholder={t("register.emailPlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item 
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("register.password")}</span>}
              name="password" 
              rules={[
                { required: true, message: t("register.pwdReq") },
                { min: 6, message: t("register.passwordMin6") },
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />} 
                placeholder={t("register.passwordPlaceholder")}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Button 
              type="primary" 
              htmlType="submit"
              block 
              size="large"
              loading={loading}
              style={{ 
                height: 52, 
                borderRadius: 26, 
                fontSize: 16, 
                fontWeight: 600,
                marginTop: "16px",
                background: "#4CAF50", // Green for reader registration
                boxShadow: "0 8px 20px rgba(76, 175, 80, 0.25)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {t("register.registerReaderBtn")} <ArrowRightOutlined />
            </Button>
          </Form>

          <div style={{ marginTop: "32px", textAlign: "center" }}>
            <Text type="secondary">{t("login.haveAccount")}</Text>
            <a 
              onClick={() => navigate("/login")} 
              style={{ 
                color: "#4CAF50", 
                fontWeight: 600, 
                cursor: "pointer",
                marginLeft: "4px"
              }}
            >
              {t("titles.login")}
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div style={{ 
          position: "absolute", 
          bottom: "24px", 
          color: token.colorTextQuaternary,
          fontSize: "12px",
          textAlign: "center",
          width: "100%",
          fontFamily: token.fontFamilyCode
        }}>
          © 2024 CLMS. Terms & Privacy.
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalOk}
        footer={[
          <Button key="login" type="primary" onClick={handleModalOk} size="large" block>
            {t("register.goToLogin")}
          </Button>
        ]}
        centered
        width={400}
        closable={false}
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <CheckCircleFilled style={{ fontSize: 64, color: token.colorSuccess, marginBottom: 24 }} />
          <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
            {t("register.regSuccessTitle")}
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
            {t("register.idCopiedMsg")}
          </Text>
          
          <div style={{ 
            background: token.colorBgLayout, 
            padding: '16px', 
            borderRadius: '12px',
            border: `1px solid ${token.colorBorderSecondary}`,
            marginBottom: '8px'
          }}>
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
              {t("register.assignedId")}
            </Text>
            <Title level={2} style={{ margin: 0, color: token.colorPrimary, fontFamily: 'monospace' }}>
              {assignedId}
            </Title>
          </div>
          
          <Button 
            type="text" 
            icon={<CopyOutlined />} 
            onClick={() => {
              copyToClipboard(assignedId);
              message.success(t("register.copySuccess"));
            }}
          >
            {t("register.copyIdBtn")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterReader;
