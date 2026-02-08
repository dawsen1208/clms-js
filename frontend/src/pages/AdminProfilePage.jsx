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
  Grid,
  theme
} from "antd";
import { UserOutlined, MailOutlined, EditOutlined, SaveOutlined, CloseOutlined, UploadOutlined, ClockCircleOutlined, LogoutOutlined } from "@ant-design/icons";
import { getProfile, updateProfile, getPendingRequestsLibrary, uploadAvatar } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { getCleanImageUrl } from "../utils/imageUtils";

const { Title } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const AdminProfilePage = () => {
  const { t } = useLanguage();
  const { token } = useToken();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const authToken =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  /* =========================================================
     🧩 Fetch admin profile
     ========================================================= */
  const fetchProfile = async () => {
    try {
      const res = await getProfile(authToken);
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
      const res = await getPendingRequestsLibrary(authToken);

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
      await updateProfile(authToken, { email });
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
      await uploadAvatar(authToken, formData);
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
    <PageContainer>
      <PageHeader
        title={t("admin.profileTitle") || t("common.profile")}
        subtitle={t("admin.profileSubtitle") || "Manage your account and view requests"}
      />
      
      {/* 🧑‍💼 Top avatar + basic info */}
      <Card
        bordered={false}
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
          background: token.colorBgContainer,
          marginBottom: 24,
          textAlign: "center"
        }}
      >
        <div
          style={{
            paddingBottom: 20,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            marginBottom: 20
          }}
        >
          <Avatar
            size={120}
            src={getCleanImageUrl(profile.avatar) || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            style={{ marginBottom: 20, border: `4px solid ${token.colorBgContainer}`, boxShadow: token.boxShadow }}
          />
          <Title level={3} style={{ marginBottom: 4 }}>
            {profile.name || t("admin.administrator")}
          </Title>
          <div style={{ marginBottom: 12 }}>
            <Tag color="purple" style={{ fontSize: '14px', padding: '4px 12px', borderRadius: token.borderRadius }}>
              {profile.role === "Administrator" ? t("admin.administrator") : profile.role}
            </Tag>
          </div>

          <Upload
            showUploadList={false}
            customRequest={handleUpload}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} type="primary" style={{ borderRadius: token.borderRadiusLG }}>
              {t("admin.changeAvatar")}
            </Button>
          </Upload>
        </div>

        {/* 📋 Email Section */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 1rem",
            maxWidth: 600,
            margin: "0 auto"
          }}
        >
          <span style={{ fontWeight: 500, color: token.colorTextSecondary }}>{t("admin.email")}</span>
          <Space>
            {editing ? (
              <>
                <Input
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: 200 }}
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
                <span style={{ color: token.colorText, fontWeight: 500 }}>{profile.email || t("admin.noEmail")}</span>
                <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(true)} />
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* 📨 Pending requests card */}
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            {t("admin.pendingRequests")} <span style={{ color: token.colorTextSecondary, fontSize: '0.9em' }}>({t("admin.total")} {requests.length})</span>
          </span>
        }
        bordered={false}
        style={{
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowSecondary,
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
                  style={{ width: "100%", borderRadius: token.borderRadiusLG, border: `1px solid ${token.colorBorderSecondary}` }}
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
            marginTop: 24, 
            height: '48px', 
            fontSize: '16px', 
            borderRadius: token.borderRadiusLG,
            fontWeight: 'bold'
          }}
        >
          {t("common.logout") || "Logout"}
        </Button>
      )}
    </PageContainer>
  );
};

export default AdminProfilePage;
