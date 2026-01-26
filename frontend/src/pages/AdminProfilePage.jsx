// ✅ client/src/pages/AdminProfilePage.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Avatar,
  Typography,
  Descriptions,
  Button,
  Tag,
  List,
  Space,
  Input,
  message,
  Table,
  Upload,
  Spin,
  Grid
} from "antd";
import { UserOutlined, MailOutlined, EditOutlined, SaveOutlined, CloseOutlined, UploadOutlined, ClockCircleOutlined, LogoutOutlined } from "@ant-design/icons";
import { getProfile, updateProfile, getPendingRequestsLibrary, uploadAvatar } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const { Title } = Typography;
const { useBreakpoint } = Grid;

const AdminProfilePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/$/, "");

  // 计算后端根域名（去除 /api 后缀）
  const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

  // 🧹 清理头像 URL (处理旧数据中的 localhost)
  const getCleanAvatarUrl = (url) => {
    if (!url) return "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    if (url.includes("localhost:5000")) {
      return url.replace(/http(s)?:\/\/localhost:5000/, API_ROOT);
    }
    if (url.startsWith("http")) return url;
    return `${API_ROOT}${url}`;
  };

  /* =========================================================
     🧩 Fetch admin profile
     ========================================================= */
  const fetchProfile = async () => {
    try {
      const res = await getProfile(token);
      setProfile(res.data);
      setEmail(res.data.email || "");
    } catch (err) {
      console.error("❌ Failed to fetch admin info:", err);
      message.error("Failed to load profile, please re-login");
    }
  };

  /* =========================================================
     📨 Fetch pending requests (✅ /library/requests/admin)
     ========================================================= */
  const fetchRequests = async () => {
    try {
      const res = await getPendingRequestsLibrary(token);

      // ✅ Backend returns BorrowRecord; normalize to BorrowRequest-like structure
      const pending = (res.data || [])
        .filter((r) => r.status === "pending" || r.returned === false)
        .map((r) => ({
          _id: r._id,
          userId: r.userId,
          userName: r.userName || t("admin.unknownUser"),
          bookTitle: r.bookTitle || r.bookId?.title || t("admin.unknownBook"),
          type: r.type || (r.returned === false ? "return" : "renew"),
          status: r.status || (r.returned === false ? "pending" : "approved"),
          createdAt: r.createdAt || r.borrowedAt,
          time: r.updatedAt || r.returnedAt || r.createdAt,
        }));

      setRequests(pending);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
      message.error(t("admin.requestsLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchRequests();
  }, []);

  /* =========================================================
     ✏️ Update email
     ========================================================= */
  const handleUpdateEmail = async () => {
    try {
      await updateProfile(token, { email });
      message.success(t("admin.emailUpdated"));
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error("❌ Failed to update email:", err);
      message.error(t("admin.emailUpdateFailed"));
    }
  };

  /* =========================================================
     📸 Upload avatar
     ========================================================= */
  const handleUpload = async ({ file }) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await uploadAvatar(token, formData);
      message.success(t("admin.avatarUpdated"));
      fetchProfile();
    } catch (err) {
      console.error("❌ Failed to upload avatar:", err);
      message.error(t("admin.avatarUpdateFailed"));
    }
  };

  /* =========================================================
     📋 Pending requests table (with handled time)
     ========================================================= */
  const columns = [
    { title: t("admin.username"), dataIndex: "userName", key: "userName" },
    { title: t("admin.userId"), dataIndex: "userId", key: "userId" },
    {
      title: t("admin.bookTitle"),
      dataIndex: "bookTitle",
      key: "bookTitle",
      render: (v) => v || t("admin.unknownBook"),
    },
    {
      title: t("admin.type"),
      dataIndex: "type",
      key: "type",
      render: (v) =>
        v === "renew" ? (
          <Tag color="blue">{t("admin.renew")}</Tag>
        ) : (
          <Tag color="purple">{t("admin.return")}</Tag>
        ),
    },
    {
      title: t("admin.requestedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: t("admin.handledAt"),
      dataIndex: "time",
      key: "time",
      render: (v) =>
        v ? (
          <span>{new Date(v).toLocaleString()}</span>
        ) : (
          <span style={{ color: "#aaa" }}>{t("admin.notHandled")}</span>
        ),
    },
    {
      title: t("admin.status"),
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Tag
          color={
            v === "pending"
              ? "orange"
              : v === "approved"
              ? "green"
              : "red"
          }
        >
          {v === "pending"
            ? t("admin.pending")
            : v === "approved"
            ? t("admin.approved")
            : t("admin.rejected")}
        </Tag>
      ),
    },
  ];

  /* =========================================================
     🚪 Logout (Mobile)
     ========================================================= */
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    localStorage.setItem("logout_event", Date.now());
    message.success(t("common.logoutSuccess") || "Logged out successfully");
    navigate("/login");
  };

  if (!profile) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <Spin size="large" />
      </div>
    );
  }

  /* =========================================================
     🎨 页面结构渲染
     ========================================================= */
  return (
    <Card
      bordered={false}
      style={{
        maxWidth: 960,
        margin: isMobile ? "1rem auto" : "2rem auto",
        borderRadius: 20,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        background: "#fff",
        padding: isMobile ? "1.5rem" : "2.5rem 3rem",
      }}
    >
      {/* 🧑‍💼 Top avatar + basic info */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 30,
          paddingBottom: 20,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Avatar
          size={120}
          src={getCleanAvatarUrl(profile.avatar)}
          style={{ marginBottom: 20 }}
        />
        <Title level={3} style={{ marginBottom: 4 }}>
          {profile.name || t("admin.administrator")}
        </Title>
        <div style={{ marginBottom: 12 }}>
          <Tag color="purple" style={{ fontSize: '14px', padding: '4px 12px' }}>
            {profile.role === "Administrator" ? t("admin.administrator") : profile.role}
          </Tag>
        </div>

        <Upload
          showUploadList={false}
          customRequest={handleUpload}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} type="primary">
            {t("admin.changeAvatar")}
          </Button>
        </Upload>
      </div>

      {/* 📋 Email card */}
      <Card
        bordered
        style={{
          textAlign: "left",
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          marginBottom: 30,
          padding: "1rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 500 }}>{t("admin.email")}</span>
          <Space>
            {editing ? (
              <>
                <Input
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: 180 }}
                />
                <Button size="small" type="primary" onClick={handleUpdateEmail}>
                  {t("admin.save")}
                </Button>
                <Button size="small" onClick={() => setEditing(false)}>
                  {t("admin.cancel")}
                </Button>
              </>
            ) : (
              <>
                <span>{profile.email || t("admin.noEmail")}</span>
                <Button size="small" onClick={() => setEditing(true)}>
                  {t("admin.edit")}
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* 📨 Pending requests card */}
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {t("admin.pendingRequests")} ({t("admin.total")} {requests.length})
          </span>
        }
        bordered
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {loading ? (
          <Spin
            size="large"
            style={{ display: "block", margin: "2rem auto" }}
          />
        ) : isMobile ? (
          <List
            dataSource={requests}
            pagination={{ pageSize: 5 }}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 16 }}>
                <Card
                  hoverable
                  style={{ width: "100%", borderRadius: 12 }}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", fontSize: "16px", maxWidth: "70%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.bookTitle}
                        </span>
                        <Tag
                          color={
                            item.status === "pending"
                              ? "orange"
                              : item.status === "approved"
                              ? "green"
                              : "red"
                          }
                        >
                          {item.status === "pending"
                            ? t("admin.pending")
                            : item.status === "approved"
                            ? t("admin.approved")
                            : t("admin.rejected")}
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 4 }}>
                          👤 {t("admin.username")}: {item.userName}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          📌 {t("admin.type")}:{" "}
                          {item.type === "renew" ? (
                            <Tag color="blue">{t("admin.renew")}</Tag>
                          ) : (
                            <Tag color="purple">{t("admin.return")}</Tag>
                          )}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          🕒 {t("admin.requestedAt")}:{" "}
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            dataSource={requests}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: t("admin.noPendingRequests") }}
          />
        )}
      </Card>

      {/* 📱 Mobile Logout Button */}
      {isMobile && (
        <Button
          type="primary"
          danger
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          block
          style={{ 
            marginTop: '1rem', 
            height: '48px', 
            fontSize: '16px', 
            borderRadius: '12px',
            fontWeight: 'bold'
          }}
        >
          {t("common.logout") || "Logout"}
        </Button>
      )}
    </Card>
  );
};

export default AdminProfilePage;
