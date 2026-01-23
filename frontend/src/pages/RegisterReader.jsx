// ✅ client/src/pages/RegisterReader.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Card, Modal } from "antd";
import "./RegisterReader.css";
import { CopyOutlined } from "@ant-design/icons";
import { register } from "../api"; // ✅ Use unified register API

function RegisterReader() {
  const navigate = useNavigate();
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

      if (!id) throw new Error("No assigned user ID received");

      console.log("🟩 System-assigned Reader ID:", id);
      localStorage.setItem("prefillUserId", id);

      const copied = await copyToClipboard(id);
      if (copied) {
        message.success("User ID copied to clipboard; you can log in directly!");
      } else {
        message.warning("Automatic copy failed; please copy the ID manually.");
      }

      // ✅ Open success modal
      setAssignedId(id);
      setModalVisible(true);
    } catch (err) {
      console.error("❌ Registration failed:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed; please check input or network.";
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
  message.info("Redirecting to login...");
    setTimeout(() => {
      navigate("/login");
    }, 600);
  };

  return (
    <div className="register-reader-page">
      {/* ✅ Left: registration form */}
      <Card className="register-card" title="Reader Registration" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", background: "#fff" }}>
        <p style={{ marginBottom: 20, color: "#555" }}>
          Create your <b>Reader</b> account to start borrowing books.
        </p>

        <Form layout="vertical" onFinish={handleReaderRegister}>
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

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              style={{
                borderRadius: 8,
                background: "linear-gradient(90deg, #ff9966, #ff5e62)",
                fontWeight: "bold",
              }}
            >
              Register as Reader
            </Button>
          </Form.Item>

          <div style={{ marginTop: 10 }}>
            <Button
              type="link"
              block
              style={{ color: "#1677ff" }}
              onClick={() => navigate("/register-admin")}
            >
              🧑‍💼 Register as Administrator
            </Button>
            <Button
              type="link"
              block
              style={{ color: "#555" }}
              onClick={() => navigate("/login")}
            >
              👈 Back to Login
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
        title="🎉 Registration Successful!"
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        cancelText="Cancel"
        okText="Go to Login"
        centered
      >
        <div style={{ textAlign: "center" }}>
          <p>Your assigned user ID:</p>
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
                if (ok) message.success("Copied to clipboard");
                else message.warning("Copy failed; please copy manually");
              }}
            />
          </p>
          <p>This ID has been copied automatically; use it to log in.</p>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterReader;
