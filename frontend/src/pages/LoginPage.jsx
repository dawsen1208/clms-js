// ✅ client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { Form, Input, Button, Checkbox, message, QRCode, Modal, theme, Grid } from "antd";
import { QrcodeOutlined, ScanOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, login2FA } from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

/**
 * 🔐 登录页面（支持 sessionStorage 隔离 + 局域网兼容）
 */
function LoginPage({ onLogin }) {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [remember, setRemember] = useState(false); // ✅ “记住我”开关
  const [isFlipped, setIsFlipped] = useState(false); // 🔄 Card flip state
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempUserId, setTempUserId] = useState("");
  const navigate = useNavigate();

  // API 基础地址由全局 api.js 管理，避免 https 页面访问 http 导致的 CSP/Mixed-Content

  /** ✅ 登录逻辑 */
  const handleLogin = async () => {
    if (!userId || !password) {
      setLoginError(t("login.errorEmpty"));
      return;
    }

    try {
      setLoading(true);
      setLoginError("");

      const res = await apiLogin(userId, password);

      // Check for pending status
      if (res.data.status === 'pending') {
         message.warning(t("login.accountPending") || "Your account is pending approval.");
         setLoading(false);
         return;
      }

      if (res.data.status === 'rejected') {
         message.error(t("login.accountRejected") || "Your account has been rejected.");
         setLoading(false);
         return;
      }

      if (res.data.require2FA) {
        setTempUserId(userId);
        setIs2FAModalOpen(true);
        setLoading(false);
        return;
      }

      const { token, user } = res.data;
      finalizeLogin(token, user);

    } catch (err) {
      console.error("❌ Login failed:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setLoginError(err.response.data.message);
      } else {
        setLoginError(t("login.errorInvalid"));
      }
      setLoading(false);
    }
  };

  const finalizeLogin = (token, user) => {
    if (!token || typeof token !== "string") {
      message.error(t("login.errorToken"));
      return;
    }

    // ✅ 永远保存一份到 localStorage（供 axios 读取）
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    // ✅ 同步一份到 sessionStorage
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("user", JSON.stringify(user));

    // ✅ 如果未勾选“记住我”，只使用 sessionStorage（关闭浏览器后自动失效）
    if (!remember) {
      console.log("ℹ️ 临时登录：关闭浏览器后自动登出");
    }
    
    // ✅ 更新全局状态
    if (onLogin) {
      onLogin(token, user);
      // onLogin 内部已经处理了 navigate，所以这里不需要再 navigate
      return; 
    }

    message.success(t("login.welcomeBackUser", { name: user.name }));

    // ✅ 跳转到不同主页
    if (user.role === "Administrator") {
      navigate("/admin/dashboard");
    } else {
      navigate("/home");
    }
    setLoading(false);
  };

  const handle2FASubmit = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      message.error(t("login.enterCode"));
      return;
    }
    try {
      setLoading(true);
      const res = await login2FA(tempUserId, twoFactorCode);
      const { token, user } = res.data;
      setIs2FAModalOpen(false);
      finalizeLogin(token, user);
    } catch (err) {
      console.error("❌ 2FA failed:", err);
      message.error(t("login.invalidCode"));
      setLoading(false);
    }
  };

  /** ✅ 自动预填注册后生成的 UserID */
  useEffect(() => {
    const prefill = localStorage.getItem("prefillUserId");
    if (prefill) {
      setUserId(prefill);
      message.info({
        content: t("login.prefillInfo", { id: prefill }),
        duration: 3,
      });
      setTimeout(() => localStorage.removeItem("prefillUserId"), 1500);
    }
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorInfo})`,
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
        {/* Left Side - Login Form */}
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
                background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryActive})`, 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                margin: "0 auto 1rem auto",
                fontSize: "24px",
                color: "#fff",
                boxShadow: token.boxShadow
              }}>📚</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: token.colorTextHeading }}>{t("login.welcomeBack")}</div>
              <div style={{ fontSize: "14px", color: token.colorTextSecondary, marginTop: "4px" }}>{t("login.signInToContinue")}</div>
            </div>

            {loginError && (
              <div style={{
                background: token.colorErrorBg,
                border: `1px solid ${token.colorErrorBorder}`,
                borderRadius: token.borderRadius,
                padding: '10px 16px',
                marginBottom: 24,
                color: token.colorError,
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}

            <Form layout="vertical" onFinish={handleLogin} size="large">
              <Form.Item
                label={t("login.userIdLabel")}
                name="userId"
                rules={[{ required: true, message: t("login.enterUserId") }]}
              >
                <Input
                  prefix={<span style={{ color: token.colorPrimary }}>👤</span>}
                  placeholder={t("login.userIdPlaceholder")}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item
                label={t("login.passwordLabel")}
                name="password"
                rules={[{ required: true, message: t("login.enterPassword") }]}
              >
                <Input.Password
                  prefix={<span style={{ color: token.colorPrimary }}>🔒</span>}
                  placeholder={t("login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ borderRadius: token.borderRadius }}
                />
              </Form.Item>

              <Form.Item>
                <Checkbox
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                >
                  {t("login.rememberMe")}
                </Checkbox>
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
                    boxShadow: `0 4px 15px ${token.colorPrimary}4D`
                  }}
                >
                  {t("login.loginBtn")}
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
                <Button type="link" onClick={() => navigate("/register")}>
                  {t("login.registerReader")}
                </Button>
                <Button type="link" onClick={() => navigate("/register-admin")} style={{ color: token.colorTextSecondary }}>
                  {t("login.registerAdmin")}
                </Button>
              </div>
            </Form>
        </div>

        {/* Right Side - Illustration (Hidden on mobile) */}
        {screens.md && (
          <div style={{ 
            width: '45%', 
            background: `linear-gradient(135deg, ${token.colorPrimary}1A, ${token.colorInfo}1A)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            borderLeft: `1px solid ${token.colorBorderSecondary}`
          }}>
             <div 
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ 
                  width: 280, 
                  height: 280,
                  perspective: "1000px",
                  cursor: "pointer"
                }} 
              >
                <div style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                  transformStyle: "preserve-3d",
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                }}>
                  {/* Front: Logo */}
                  <div style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2
                  }}>
                    <img
                      src="/icons/app-icon-512.png"
                      alt="app logo"
                      onError={(e) => {
                        e.currentTarget.src = "/icons/manifest-icon-512.maskable.png";
                        e.currentTarget.onerror = null;
                      }}
                      className="login-logo"
                      style={{ 
                        width: '80%', 
                        maxWidth: 200, 
                        filter: `drop-shadow(0 10px 20px ${token.colorPrimary}4D)`,
                        transition: "transform 0.3s ease"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                    />
                    <div style={{ 
                      color: token.colorTextSecondary, 
                      marginTop: 24,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <ScanOutlined style={{ marginRight: 8 }} />
                      {t("login.scanMobile")}
                    </div>
                  </div>
                  
                  {/* Back: QR Code */}
                  <div style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <div style={{ 
                      background: token.colorBgContainer, 
                      padding: 20, 
                      borderRadius: token.borderRadiusLG, 
                      boxShadow: token.boxShadow 
                    }}>
                      <QRCode 
                        value="https://clmsf5164136.z1.web.core.windows.net/" 
                        size={200} 
                        icon="/icons/app-icon-192.png"
                        errorLevel="H"
                        bordered={false}
                      />
                    </div>
                    <div style={{ 
                      color: token.colorTextSecondary, 
                      marginTop: 24,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <QrcodeOutlined style={{ marginRight: 8 }} />
                      {t("login.scanToOpen")}
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>

      {/* ✅ 2FA Modal */}
      <Modal
        title={t("login.twoFactorAuth")}
        open={is2FAModalOpen}
        onOk={handle2FASubmit}
        onCancel={() => setIs2FAModalOpen(false)}
        confirmLoading={loading}
        okText={t("login.verify")}
        cancelText={t("common.cancel")}
        centered
      >
        <p style={{ marginBottom: 16 }}>{t("login.enterCode")}</p>
        <Input 
          placeholder="000000"
          value={twoFactorCode} 
          onChange={(e) => setTwoFactorCode(e.target.value)} 
          maxLength={6}
          style={{ 
            textAlign: 'center', 
            letterSpacing: '8px', 
            fontSize: '24px', 
            height: '60px',
            borderRadius: token.borderRadiusLG
          }}
        />
      </Modal>

    </div>
  );
}

export default LoginPage;
