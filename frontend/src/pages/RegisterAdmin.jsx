// ✅ client/src/pages/RegisterAdmin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Card, Modal } from "antd";
import "./RegisterAdmin.css";
import { CopyOutlined } from "@ant-design/icons";
import { register } from "../api"; // ✅ 统一使用 API 封装
import axios from "axios"; // 保留 axios 用于认证码扩展（可选）

function RegisterAdmin() {
  const navigate = useNavigate();
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
      return message.warning("Please fill in all required information!");
    }

    try {
      setLoading(true);
      // ✅ 调用统一注册接口（管理员需传入 authCode）
      const res = await register(name, email || "", password, "Administrator", authCode);
      const id = res.data?.user?.userId;

      if (!id) throw new Error("System-assigned user ID not received");
      console.log("🟩 Administrator system-assigned ID:", id);

      // ✅ 存储预填 ID
      localStorage.setItem("prefillUserId", id);

      // ✅ 自动复制到剪贴板（带降级兜底）
      const copied = await copyToClipboard(id);
      if (copied) {
        message.success("System ID copied automatically, you can log in directly!");
      } else {
        message.warning("Automatic copy failed; please copy the ID manually.");
      }

      // ✅ 显示注册成功弹窗
      setAssignedId(id);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Administrator registration failed:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed, please check auth code or network connection";
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
    message.info("Redirecting to login page...");
    setTimeout(() => {
      navigate("/login");
    }, 600);
  };

  return (
    <div className="register-admin-page" style={{ padding: "2rem" }}>
      {/* ✅ 左侧注册表单 */}
      <Card className="register-card" title="Administrator Registration" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", background: "#fff" }}>
        <p style={{ marginBottom: 20, color: "#555" }}>
          Register as an <b>Administrator</b> to manage the Intelligent Library.
        </p>

        <Form layout="vertical" onFinish={handleAdminRegister}>
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: "Please enter your name" },
              { pattern: /^(?!\d+$)[A-Za-z][A-Za-z0-9_]*$/, message: "Start with letter; letters, numbers, underscore; not all digits" }
            ]}
          >
            <Input
              size="large"
              placeholder="Enter your name"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="email" label="Email (optional)">
            <Input
              size="large"
              placeholder="(Optional) Enter your email"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              size="large"
              placeholder="Enter password"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="authCode"
            label="Administrator Auth Code"
            rules={[{ required: true, message: "Please enter administrator auth code (default: admin)" }]}
          >
            <Input
              size="large"
              placeholder="Enter administrator auth code (default: admin)"
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
              Register as Administrator
            </Button>
          </Form.Item>

          <div style={{ marginTop: 10 }}>
            <Button
              type="link"
              block
              style={{ color: "#1677ff" }}
              onClick={() => navigate("/register")}
            >
              👈 Back to Reader Registration
            </Button>
            <Button
              type="link"
              block
              style={{ color: "#555" }}
              onClick={() => navigate("/login")}
            >
              🔐 Back to Login
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
        title="🎉 Administrator registration successful!"
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        cancelText="Cancel"
        okText="Go to Login"
        centered
      >
        <div style={{ textAlign: "center" }}>
          <p>You have been assigned an administrator ID:</p>
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
                if (ok) message.success("Copied!");
                else message.error("Copy failed; please copy manually.");
              }}
            />
          </p>
          <p>The ID has been auto-copied; you can log in directly.</p>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterAdmin;
