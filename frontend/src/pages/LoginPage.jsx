// ✅ client/src/pages/LoginPage.jsx
/**
 * Login Page
 * Handles user authentication with 2FA support and role-based redirection.
 */
import React, { useState, useEffect } from "react";
import { Form, Input, Button, Checkbox, Typography, message, theme, Grid, Layout, Space, Modal } from "antd";
import { UserOutlined, LockOutlined, ArrowRightOutlined, GlobalOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { login as apiLogin, login2FA as apiLogin2FA } from "../api";
import { LoginBookAnimation } from "./public/LoginPage/LoginBookAnimation";

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  
  const navigate = useNavigate();
  const { token } = useToken();
  const screens = useBreakpoint();
  const { t, language, setLanguage } = useLanguage();

  const [animating, setAnimating] = useState(false);
  const [animStatus, setAnimStatus] = useState("idle");
  const [twoFAModalOpen, setTwoFAModalOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [errorKey, setErrorKey] = useState("");
  const handleLogin = async () => {
    if (loading) return;
    const clickAt = Date.now();
    const closingMs = 900;
    const signingMs = 1200;
    const openingMs = 900;
    const minAnimMs = closingMs + signingMs + openingMs;

    setLoading(true);
    setAnimating(true);
    setAnimStatus("signing");
    try {
      if (!userId || !password) {
        const key = "login.errorEmpty";
        setErrorKey(key);
        message.error(t(key));
        setLoading(false);
        setAnimating(false);
        return;
      }
      const res = await apiLogin(userId, password);
      const data = res?.data || {};

      if (data.require2FA) {
        setPendingUserId(data.userId || userId);
        setTwoFACode("");
        setTwoFAModalOpen(true);
        setAnimating(false);
        setAnimStatus("idle");
        const msg = data.message || t("login.twoFactorAuth");
        message.info(msg);
        return;
      }

      const tokenStr = data.token || data.accessToken || data.jwt || "";
      const rawUser = data.user || {};
      const normalizedUser = {
        ...rawUser,
        role: rawUser.role === "Admin" ? "Administrator" : rawUser.role,
      };
      if (!tokenStr || !normalizedUser) {
        throw new Error(data.message || t("login.errorToken"));
      }
      const elapsed = Date.now() - clickAt;
      const delay = Math.max(0, minAnimMs - elapsed);
      const proceed = () => {
        setAnimStatus("opening");
        onLogin(tokenStr, normalizedUser);
        message.success(t("login.welcomeBack"));
        navigate(
          normalizedUser.role === "Administrator"
            ? "/admin/dashboard"
            : "/home"
        );
        setAnimating(false);
      };
      if (delay > 0) {
        setTimeout(proceed, delay);
      } else {
        proceed();
      }
    } catch (err) {
      const backendMsg = err?.response?.data?.message || "";
      let key = "login.errorUnknown";
      let extra = "";

      if (!backendMsg) {
        key = "login.errorUnknown";
      } else if (backendMsg.includes("User not found")) {
        key = "login.errorUserNotFound";
      } else if (backendMsg.includes("Incorrect password")) {
        key = "login.errorIncorrectPassword";
      } else if (backendMsg.includes("blacklisted")) {
        key = "login.errorBlacklisted";
        const idx = backendMsg.indexOf("Reason:");
        if (idx >= 0) {
          extra = backendMsg.slice(idx + 7).trim();
        }
      } else if (backendMsg.includes("pending approval")) {
        key = "login.errorPending";
      } else if (backendMsg.includes("rejected")) {
        key = "login.errorRejected";
      } else if (backendMsg.includes("Please enter User ID and password")) {
        key = "login.errorEmpty";
      } else {
        key = "login.errorInvalid";
      }

      setErrorKey(key);
      const baseMsg = t(key);
      const finalMsg = extra ? `${baseMsg}：${extra}` : baseMsg;
      message.error(finalMsg);
      setAnimStatus("error");
      setTimeout(() => {
        setAnimating(false);
      }, 200);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const handleVerify2FA = async () => {
    if (!pendingUserId) {
      message.error(t("login.errorInvalid"));
      return;
    }
    if (!twoFACode) {
      message.error(t("login.enterCode"));
      return;
    }
    if (twoFALoading) return;
    setTwoFALoading(true);
    try {
      const res = await apiLogin2FA(pendingUserId, twoFACode.trim());
      const data = res?.data || {};
      const tokenStr = data.token || data.accessToken || data.jwt || "";
      const rawUser = data.user || {};
      const normalizedUser = {
        ...rawUser,
        role: rawUser.role === "Admin" ? "Administrator" : rawUser.role,
      };
      if (!tokenStr || !normalizedUser) {
        throw new Error(data.message || t("login.errorToken"));
      }
      onLogin(tokenStr, normalizedUser);
      message.success(t("login.welcomeBack"));
      setTwoFAModalOpen(false);
      setTwoFACode("");
      setPendingUserId("");
      navigate(
        normalizedUser.role === "Administrator"
          ? "/admin/dashboard"
          : "/home"
      );
    } catch (err) {
      const backendMsg = err?.response?.data?.message || "";
      let key = "login.invalidCode";
      if (backendMsg.includes("expired")) {
        key = "login.invalidCode";
      }
      message.error(t(key));
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <>
    <div style={{ 
      display: "flex", 
      minHeight: "100vh",
      background: "#FAF9F6", // Warm paper background
      fontFamily: "'Inter', sans-serif"
    }}>
      <LoginBookAnimation running={animating} status={animStatus} />
      {/* 🎨 Left Side - Editorial / Brand */}
      <div style={{
        flex: screens.md ? "0 0 45%" : "0 0 0",
        background: "#2C3E50", // Deep slate for contrast
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
          backgroundImage: "url('https://images.unsplash.com/photo-1507842217121-9e96e4430330?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')",
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
        <div style={{ position: "relative", zIndex: 10 }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "12px", 
            padding: "8px 16px", 
            background: "rgba(255, 255, 255, 0.1)", 
            backdropFilter: "blur(10px)",
            borderRadius: "30px",
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: "32px",
            fontFamily: token.fontFamilyCode,
            fontSize: "12px",
            letterSpacing: "1px",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <span style={{ width: 8, height: 8, background: "#E67E22", borderRadius: "50%" }} />
            LIBRARY MANAGEMENT SYSTEM
          </div>
          <Title level={1} style={{ 
            fontFamily: "'Literata', serif", 
            fontSize: "3.5rem", 
            color: "#fff",
            lineHeight: 1.1,
            marginBottom: 24,
            fontWeight: 400
          }}>
            Discover the world <br/> through pages.
          </Title>
          <Paragraph style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: "1.125rem",
            color: "rgba(255, 255, 255, 0.8)",
            lineHeight: 1.6,
            maxWidth: 400
          }}>
            Access thousands of resources, manage your reading journey, and connect with a community of learners.
          </Paragraph>
        </div>
      </div>

      {/* 📝 Right Side - Login Form */}
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
             {language === 'en' ? 'EN' : '中文'}
           </Button>
        </div>

        <div style={{ 
          width: "100%", 
          maxWidth: "420px",
          background: "#fff",
          padding: screens.md ? "48px" : "32px",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.04)", // Soft warm shadow
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
          <div style={{ marginBottom: "32px", textAlign: "center" }}>
            <div style={{
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorWarning})`,
              borderRadius: 12,
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 24,
              fontFamily: "'Literata', serif",
              fontWeight: 700,
              boxShadow: "0 8px 16px rgba(230, 126, 34, 0.2)"
            }}>
              C
            </div>
            <Title level={2} style={{ 
              marginBottom: "8px", 
              fontFamily: "'Literata', serif",
              color: token.colorTextHeading 
            }}>
              {t("login.welcomeBack")}
            </Title>
            <Text type="secondary" style={{ fontSize: "16px" }}>
              {t("login.signInToContinue")}
            </Text>
          </div>

            <Form
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("login.userIdLabel")}</span>}
              required
              validateStatus={errorKey ? "error" : ""}
            >
              <Input 
                prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />} 
                placeholder={t("login.userIdPlaceholder")}
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  if (errorKey) setErrorKey("");
                }}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("login.passwordLabel")}</span>}
              required
              validateStatus={errorKey ? "error" : ""}
              help={
                errorKey
                  ? t(errorKey)
                  : ""
              }
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />} 
                placeholder={t("login.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorKey) setErrorKey("");
                }}
                style={{ borderRadius: 8, height: 48, background: "#fff" }}
              />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <Checkbox 
                checked={remember} 
                onChange={(e) => setRemember(e.target.checked)}
                style={{ color: token.colorTextSecondary }}
              >
                {t("login.rememberMe")}
              </Checkbox>
              <a href="#" style={{ color: token.colorPrimary, fontWeight: 500 }}>
                Forgot password?
              </a>
            </div>

            <Button 
              type="primary" 
              block 
              size="large"
              onClick={handleLogin}
              loading={loading}
              style={{ 
                height: 52, 
                borderRadius: 26, 
                fontSize: 16, 
                fontWeight: 600,
                boxShadow: "0 8px 20px rgba(230, 126, 34, 0.25)", // Warm shadow
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
            >
              {t("login.loginBtn")} <ArrowRightOutlined />
            </Button>
          </Form>

          <div style={{ marginTop: "32px", textAlign: "center" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <div>
                <Text type="secondary">{t("login.needAccount")}</Text>
                <a 
                  onClick={() => navigate("/register")} 
                  style={{ 
                    color: token.colorTextHeading, 
                    fontWeight: 600, 
                    cursor: "pointer",
                    marginLeft: "4px",
                    textDecoration: "underline",
                    textDecorationColor: token.colorPrimary
                  }}
                >
                  {t("login.registerReader")}
                </a>
              </div>
              <div>
                <Text type="secondary">{t("login.adminOnboarding")}</Text>
                <a 
                  onClick={() => navigate("/register-admin")} 
                  style={{ 
                    color: token.colorTextHeading, 
                    fontWeight: 600, 
                    cursor: "pointer",
                    marginLeft: "4px",
                    textDecoration: "underline",
                    textDecorationColor: token.colorPrimary
                  }}
                >
                  {t("login.registerAdmin")}
                </a>
              </div>
            </Space>
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
          © 2024 CLMS. All rights reserved.
        </div>
      </div>
    </div>
    <Modal
      open={twoFAModalOpen}
      title={t("login.twoFactorAuth")}
      onOk={handleVerify2FA}
      onCancel={() => {
        setTwoFAModalOpen(false);
        setTwoFACode("");
        setPendingUserId("");
      }}
      confirmLoading={twoFALoading}
      okText={t("login.verify")}
    >
      <Input
        placeholder={t("login.authCodePlaceholder")}
        value={twoFACode}
        onChange={(e) => setTwoFACode(e.target.value)}
      />
    </Modal>
    </>
  );
};

export default LoginPage;
