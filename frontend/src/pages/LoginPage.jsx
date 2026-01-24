// ✅ client/src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Checkbox, message, Typography, FloatButton, Modal, QRCode, Tooltip } from "antd";
import { QrcodeOutlined } from "@ant-design/icons";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { login as apiLogin } from "../api.js";

/**
 * 🔐 登录页面（支持 sessionStorage 隔离 + 局域网兼容）
 */
function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [remember, setRemember] = useState(false); // ✅ “记住我”开关
  const [qrModalOpen, setQrModalOpen] = useState(false); // 📱 QR Code Modal state
  const navigate = useNavigate();

  // API 基础地址由全局 api.js 管理，避免 https 页面访问 http 导致的 CSP/Mixed-Content

  /** ✅ 登录逻辑 */
  const handleLogin = async () => {
    if (!userId || !password) {
      setLoginError("Please enter User ID and password");
      return;
    }

    try {
      setLoading(true);
      setLoginError("");

      const res = await apiLogin(userId, password);

      const { token, user } = res.data;

      /* =========================================================
         ✨ 登录数据保存：根治 token 丢失 / jwt malformed
         ========================================================= */
      if (!token || typeof token !== "string") {
        message.error("Login failed: server did not return a valid token");
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

      message.success(`Welcome back, ${user.name}!`);

      // ✅ 跳转到不同主页
      if (user.role === "Administrator") {
        navigate("/admin/dashboard");
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("❌ Login failed:", err);
      setLoginError("Login failed, please check your User ID or password");
    } finally {
      setLoading(false);
    }
  };

  /** ✅ 自动预填注册后生成的 UserID */
  useEffect(() => {
    const prefill = localStorage.getItem("prefillUserId");
    if (prefill) {
      setUserId(prefill);
      message.info({
        content: `Your registration ID has been prefilled: ${prefill}`,
        duration: 3,
      });
      setTimeout(() => localStorage.removeItem("prefillUserId"), 1500);
    }
  }, []);

  return (
    <div className="login-page">
      {/* ✅ 左侧登录卡片 */}
      <Card className="login-card" title={
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "60px", 
            height: "60px", 
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", 
            borderRadius: "50%", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            margin: "0 auto 1rem auto",
            fontSize: "24px",
            color: "white"
          }}>📚</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#1e293b" }}>Welcome Back</div>
          <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Sign in to continue</div>
        </div>
      } style={{ width: "420px", maxWidth: "90vw", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", background: "#fff" }}>
        <p style={{ marginBottom: 24, color: "#64748b", textAlign: "center", fontSize: "14px" }}>
          Please log in with your system-assigned <b>User ID</b> and password.
        </p>

        {loginError && (
          <p
            style={{
              color: "red",
              fontWeight: 500,
              marginBottom: 15,
              textAlign: "center",
            }}
          >
            {loginError}
          </p>
        )}

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item
            label="User ID"
            name="userId"
            rules={[{ required: true, message: "Please enter User ID" }]}
          >
            <Input
              size="large"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. r10001 / a10001"
              style={{ 
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
              prefix={<span style={{ color: '#3b82f6' }}>👤</span>}
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter password" }]}
          >
            <Input.Password
              size="large"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ 
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
              }}
              prefix={<span style={{ color: '#3b82f6' }}>🔒</span>}
            />
          </Form.Item>

          {/* ✅ 记住我 */}
          <Form.Item>
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ float: "left" }}
            >
              Remember me
            </Checkbox>
          </Form.Item>

          {/* ✅ 登录按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                transition: "all 0.3s ease",
                transform: "translateY(0)",
                background: "linear-gradient(90deg, #667eea, #764ba2)",
                fontWeight: "bold",
              }}
            >
              🔐 Login
            </Button>
          </Form.Item>

          {/* ✅ 跳转按钮 */}
          <div style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
            <Button
              type="link"
              block
              style={{ 
                color: "#3b82f6", 
                fontWeight: 500,
                marginBottom: 8,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#1d4ed8"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#3b82f6"}
              onClick={() => navigate("/register")}
            >
              👉 Register as Reader
            </Button>
            <Button
              type="link"
              block
              style={{ 
                color: "#8b5cf6", 
                fontWeight: 500,
                marginBottom: 8,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#7c3aed"}
              onMouseLeave={(e) => e.currentTarget.style.color = "#8b5cf6"}
              onClick={() => navigate("/register-admin")}
            >
              🧑‍💼 Register as Administrator
            </Button>
            
          </div>
        </Form>
      </Card>

      {/* ✅ 右侧插图 */}
      <div className="login-illustration">
        <img
          src="/icons/app-icon-512.png"
          alt="app logo"
          onError={(e) => {
            e.currentTarget.src = "/icons/manifest-icon-512.maskable.png";
            e.currentTarget.onerror = null;
          }}
          className="login-logo"
        />
      </div>

      {/* 📱 Mobile Access QR Code Float Button */}
      <Tooltip title="Scan to open on mobile" placement="left">
        <FloatButton 
          icon={<QrcodeOutlined />} 
          type="primary" 
          style={{ right: 24, bottom: 24, width: 56, height: 56 }}
          onClick={() => setQrModalOpen(true)}
        />
      </Tooltip>

      {/* 📱 QR Code Modal */}
      <Modal
        open={qrModalOpen}
        footer={null}
        onCancel={() => setQrModalOpen(false)}
        centered
        width={360}
        title={<div style={{ textAlign: "center" }}>📱 Mobile Experience</div>}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
          <QRCode 
            value="https://clmsf5164136.z1.web.core.windows.net/" 
            size={250} 
            icon="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg"
            errorLevel="H"
          />
          <div style={{ marginTop: "24px", textAlign: "center", color: "#64748b" }}>
            <p style={{ margin: 0, fontWeight: 500 }}>Scan with your phone camera</p>
            <p style={{ margin: "4px 0 0", fontSize: "13px" }}>to access the low-density mobile view</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default LoginPage;
