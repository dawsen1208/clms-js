// ✅ client/src/pages/ProfilePage.jsx
import { useEffect, useState, useMemo } from "react";
import { Card, message, Spin, Typography, Statistic, Tag, Avatar, Upload, Button, Input, Space, Descriptions, Table, Pagination, Modal } from "antd";
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UploadOutlined, SaveOutlined, LogoutOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "./ProfilePage.css";
import { theme, themeUtils } from "../styles/theme";
import { Grid } from "antd";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getBorrowHistoryLibrary,
  getUserRequestsLibrary,
} from "../api.js";
import ProfileHeader from "../components/Profile/ProfileHeader";
import ProfileStats from "../components/Profile/ProfileStats";
import ProfileInfo from "../components/Profile/ProfileInfo";
import ProfileTabs from "../components/Profile/ProfileTabs";

function ProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { Title, Text } = Typography;
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [email, setEmail] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [name, setName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);

  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const userLS = JSON.parse(
    sessionStorage.getItem("user") || localStorage.getItem("user") || "{}"
  );

  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/+$/, "");
  const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

  // 🧹 清理头像 URL (处理旧数据中的 localhost)
  const getCleanAvatarUrl = (url) => {
    if (!url) return null;
    if (url.includes("localhost:5000")) {
      return url.replace(/http(s)?:\/\/localhost:5000/, API_ROOT);
    }
    if (url.startsWith("http")) return url;
    return `${API_ROOT}${url}`;
  };

  const stats = useMemo(() => {
    const totalHistory = history.length;
    const returned = history.filter((h) => h.returned.includes("Yes")).length;
    const renewed = history.filter((h) => h.renewed.includes("Yes")).length;
    const pending = requests.filter((r) => r.status === "pending").length;
    return { totalHistory, returned, renewed, pending };
  }, [history, requests]);

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem("logout_event", Date.now());
    message.success(t("common.logoutSuccess") || "Logged out successfully");
    navigate("/login");
  };

  /* =========================================================
     👤 获取用户信息
     ========================================================= */
  const fetchUserProfile = async () => {
    try {
      const res = await getProfile(token);
      const u = res.data;
      if (!u) throw new Error("Empty response");

      setEmail(u.email || "");
      setName(u.name || t("profile.unnamedUser"));

      const fullAvatar = getCleanAvatarUrl(u.avatar);
      setAvatarUrl(fullAvatar ? `${fullAvatar}?t=${Date.now()}` : null);

      const updatedUser = {
        ...userLS,
        id: u._id || userLS.id,
        name: u.name,
        email: u.email,
        role: u.role || userLS.role,
        avatar: u.avatar || null,
      };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("❌ Failed to fetch user info:", err);
      message.error("Failed to load user info");
    }
  };

  /* =========================================================
     📚 获取借阅历史
     ========================================================= */
  const fetchBorrowHistory = async () => {
    try {
      setLoading(true);
      const res = await getBorrowHistoryLibrary(token);
      const list = res.data || [];

      // ✅ 去重：按书籍ID聚合，仅保留该书籍的最新状态（优先 return，其次 renew，再次 borrow）
      const normalizeTime = (it) =>
        new Date(it.returnDate || it.borrowDate || it.dueDate || 0).getTime();
      const sorted = [...list].sort((a, b) => normalizeTime(b) - normalizeTime(a));

      const byBook = new Map();
      for (const item of sorted) {
        const bookKey = String(item.bookId || "");
        if (!bookKey) continue;
        if (!byBook.has(bookKey)) byBook.set(bookKey, item);
      }

      const now = dayjs();
      const mapped = Array.from(byBook.values()).map((item, index) => {
        const due = item.dueDate ? dayjs(item.dueDate) : null;
        let color = "#1677ff";
        let status = "—";
        if (due) {
          const diff = due.diff(now, "day");
          if (diff >= 10) {
            color = "green";
            status = `Remaining ${diff} days`;
          } else if (diff >= 1) {
            color = "orange";
            status = `Remaining ${diff} days`;
          } else {
            color = "red";
            status = `Overdue ${Math.abs(diff)} days`;
          }
        }

        const isReturned = Boolean(item.returnDate || item.action === "return");
        const isRenewed = Boolean(item.isRenewed || item.action === "renew");

        return {
          key: index,
          title: item.title || "Unknown book",
          borrowDate: item.borrowDate ? dayjs(item.borrowDate).format("YYYY-MM-DD") : "—",
          dueDate: item.dueDate ? (
            <span>
              {dayjs(item.dueDate).format("YYYY-MM-DD")}
              <br />
              <span style={{ color, fontSize: "0.85em" }}>{status}</span>
            </span>
          ) : (
            "—"
          ),
          // 若已续借，显示更新后的到期日
          renewDate: isRenewed && item.dueDate ? dayjs(item.dueDate).format("YYYY-MM-DD") : "—",
          renewed: isRenewed ? "✅ Yes" : "❌ No",
          returnDate: item.returnDate ? dayjs(item.returnDate).format("YYYY-MM-DD") : "—",
          returned: isReturned ? "✅ Yes" : "❌ No",
        };
      });

      setHistory(mapped);
    } catch (err) {
      console.error("❌ Failed to fetch borrow history:", err);
      message.error("Failed to load borrow history");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     📨 获取我的续借/归还申请
     ========================================================= */
  const fetchMyRequests = async () => {
    try {
      const res = await getUserRequestsLibrary(token);
      const list = res.data || [];
      const sorted = list.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setRequests(sorted);
    } catch (err) {
      console.error("❌ Failed to fetch request records:", err);
    }
  };

  /* =========================================================
     🖼️ 上传头像
     ========================================================= */
  const handleUpload = async ({ file }) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      console.log("📤 Uploading avatar file:", file);
      
      const formData = new FormData();
      formData.append("avatar", file);
      
      // Debug: Check FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(`FormData ${key}:`, value);
      }

      const res = await uploadAvatar(token, formData);
      console.log("📥 Avatar upload response:", res);
      
      const rawUrl = res.data?.avatarUrl;
      if (rawUrl) {
        const fullRawUrl = getCleanAvatarUrl(rawUrl);
        const newUrl = `${fullRawUrl}?t=${Date.now()}`;
        setAvatarUrl(newUrl);
        const updatedUser = { ...userLS, avatar: rawUrl };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        message.success("Avatar updated successfully!");
      } else {
        console.warn("⚠️ No avatarUrl in response:", res.data);
        message.error("Avatar upload failed - no URL returned");
      }
      await fetchUserProfile();
    } catch (err) {
      console.error("❌ Failed to upload avatar:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      message.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  /* =========================================================
     ✉️ 更新邮箱
     ========================================================= */
  const handleSaveEmail = async () => {
    if (!email.trim()) return message.warning("Email cannot be empty");
    try {
      const res = await updateProfile(token, { email });
      const u = res.data?.user || {};
      const updatedUser = { ...userLS, email: u.email || email };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setEmail(u.email || email);
      setEmailEditing(false);
      message.success("Email updated successfully!");
      await fetchUserProfile();
    } catch (err) {
      console.error("❌ Failed to update email:", err);
      message.error("Failed to update email");
    }
  };

  /* =========================================================
     🚀 初始化加载
     ========================================================= */
  useEffect(() => {
    setAvatarUrl(userLS.avatar ? `${userLS.avatar}?t=${Date.now()}` : null);
    setEmail(userLS.email || "");
    setName(userLS.name || "");

    fetchUserProfile();
    fetchBorrowHistory();
    fetchMyRequests();

    // ❌ 移除自动刷新定时器，避免页面每几秒自动刷新
    // 如需手动刷新，可在页面上添加按钮触发 fetchBorrowHistory()/fetchMyRequests()
    return () => {}; // 无需清理定时器
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /* =========================================================
     🏷️ 申请状态渲染
     ========================================================= */
  const renderStatusTag = (status) => {
    switch (status) {
      case "approved":
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Approved
          </Tag>
        );
      case "rejected":
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Rejected
          </Tag>
        );
      default:
        return (
          <Tag color="gold" icon={<ClockCircleOutlined />}>
            Pending
          </Tag>
        );
    }
  };

  /* =========================================================
     📋 借阅历史表
     ========================================================= */
  const historyColumns = [
    { title: t("admin.bookTitle"), dataIndex: "title", key: "title" },
    { title: t("admin.borrowDate"), dataIndex: "borrowDate", key: "borrowDate" },
    { title: t("borrow.dueDate"), dataIndex: "dueDate", key: "dueDate" },
    { title: t("admin.renewDate"), dataIndex: "renewDate", key: "renewDate" },
    { title: t("admin.renewed"), dataIndex: "renewed", key: "renewed" },
    { title: t("admin.returnDate"), dataIndex: "returnDate", key: "returnDate" },
    { title: t("admin.returned"), dataIndex: "returned", key: "returned" },
  ];

  /* =========================================================
     📨 我的申请记录表
     ========================================================= */
  const requestColumns = [
    { title: t("admin.bookTitle"), dataIndex: "bookTitle", key: "bookTitle" },
    {
      title: t("admin.type"),
      dataIndex: "type",
      key: "type",
      render: (tVal) =>
        tVal === "renew" ? <Tag color="blue">{t("admin.renew")}</Tag> : <Tag color="purple">{t("admin.return")}</Tag>,
    },
    {
      title: t("admin.status"),
      dataIndex: "status",
      key: "status",
      render: renderStatusTag,
    },
    {
      title: t("profile.requestTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => (t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "—"),
    },
    {
      title: t("admin.handledAt"),
      dataIndex: "handledAt",
      key: "handledAt",
      render: (t) =>
        t ? dayjs(t).format("YYYY-MM-DD HH:mm") : <span style={{ color: "#999" }}>—</span>,
    },
  ];

  const paginatedData = history.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  /* =========================================================
     🧱 渲染
     ========================================================= */
  if (isMobile) {
    return (
      <div className="profile-page-mobile page-container" style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <Title level={4} style={{ marginBottom: "16px" }}>{t("profile.myProfile")}</Title>
        
        {/* Avatar Section */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", textAlign: "center", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <Avatar 
            size={100} 
            src={avatarUrl} 
            icon={<UserOutlined />} 
            style={{ marginBottom: "12px", border: "2px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} 
          />
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e293b" }}>{name || t("profile.unnamedUser")}</div>
          <Tag color="blue" style={{ marginTop: "8px" }}>{userLS.role === "admin" ? t("role.libraryAdmin") : t("role.libraryReader")}</Tag>
          
          <div style={{ marginTop: "20px" }}>
             <Upload showUploadList={false} customRequest={handleUpload} accept="image/*">
               <Button icon={<UploadOutlined />} style={{ borderRadius: "20px", height: "40px", padding: "0 24px" }}>{t("profile.uploadAvatar")}</Button>
             </Upload>
          </div>
        </div>

        {/* Email Section */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "8px" }}>{t("profile.emailAddress")}</div>
          {emailEditing ? (
              <div style={{ display: "flex", gap: "8px" }}>
                  <Input value={email} onChange={e => setEmail(e.target.value)} style={{ height: "40px", flex: 1 }} />
                  <Button type="primary" onClick={handleSaveEmail} style={{ height: "40px" }}>{t("admin.save")}</Button>
              </div>
          ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "16px", color: "#333" }}>{email || t("profile.notSet")}</span>
                  <Button type="text" onClick={() => setEmailEditing(true)} style={{ color: "#3b82f6" }}>{t("admin.edit")}</Button>
              </div>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "#3b82f6", borderRadius: "12px", padding: "16px", color: "#fff", boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)" }}>
             <div style={{ fontSize: "12px", opacity: 0.9 }}>{t("profile.borrowed")}</div>
             <div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats.totalHistory}</div>
          </div>
          <div style={{ background: "#8b5cf6", borderRadius: "12px", padding: "16px", color: "#fff", boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)" }}>
             <div style={{ fontSize: "12px", opacity: 0.9 }}>{t("profile.activeRequests")}</div>
             <div style={{ fontSize: "24px", fontWeight: "bold" }}>{stats.pending}</div>
          </div>
        </div>

        {/* Action List */}
        <div style={{ background: "#fff", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
           <div onClick={() => setHistoryModalVisible(true)} style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                 <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>📚</div>
                 <span style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>{t("admin.history")}</span>
              </div>
              <span style={{ color: "#cbd5e1" }}>&gt;</span>
           </div>
           <div onClick={() => setRequestsModalVisible(true)} style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                 <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>📨</div>
                 <span style={{ fontSize: "16px", fontWeight: "500", color: "#333" }}>{t("profile.myRequests")}</span>
              </div>
              <span style={{ color: "#cbd5e1" }}>&gt;</span>
           </div>
        </div>

        <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={handleLogout} 
            style={{ marginTop: '20px', height: '48px', fontSize: '16px', borderRadius: '12px', fontWeight: 'bold' }} 
            block
        >
            {t("common.logout") || "Logout"}
        </Button>

        {/* Modals (Mobile Optimized) */}
        <Modal
          title={t("admin.history")}
          open={historyModalVisible}
          onCancel={() => setHistoryModalVisible(false)}
          footer={null}
          width="100%"
          style={{ top: 0, margin: 0, padding: 0 }}
          styles={{ body: { padding: "16px", height: "calc(100vh - 55px)", overflowY: "auto" } }}
          wrapClassName="full-screen-modal"
        >
             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <Card key={item.key} size="small" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "16px", color: "#333" }}>{item.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", color: "#666" }}>
                        <div><span style={{ color: "#94a3b8" }}>{t("admin.borrowDate")}:</span> <br/>{item.borrowDate}</div>
                        <div><span style={{ color: "#94a3b8" }}>{t("borrow.dueDate")}:</span> <br/>{item.dueDate}</div>
                        <div><span style={{ color: "#94a3b8" }}>{t("admin.returnDate")}:</span> <br/>{item.returnDate}</div>
                        <div><span style={{ color: "#94a3b8" }}>{t("admin.status")}:</span> <br/>{item.returned === "✅ Yes" ? <Tag color="green">{t("admin.returned")}</Tag> : <Tag color="orange">{t("profile.borrowed")}</Tag>}</div>
                      </div>
                    </Card>
                  )) : <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>{t("borrow.noBorrowRecords")}</div>}
             </div>
             {history.length > pageSize && (
                <div style={{ textAlign: "center", marginTop: "20px", paddingBottom: "20px" }}>
                  <Pagination
                    simple
                    current={currentPage}
                    pageSize={pageSize}
                    total={history.length}
                    onChange={(page) => setCurrentPage(page)}
                  />
                </div>
              )}
        </Modal>

        <Modal
          title={t("profile.myRequests")}
          open={requestsModalVisible}
          onCancel={() => setRequestsModalVisible(false)}
          footer={null}
          width="100%"
          style={{ top: 0, margin: 0, padding: 0 }}
          styles={{ body: { padding: "16px", height: "calc(100vh - 55px)", overflowY: "auto" } }}
          wrapClassName="full-screen-modal"
        >
             <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {requests.length > 0 ? requests.map((req) => (
                    <Card key={req._id} size="small" style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: "bold", fontSize: "16px", color: "#333", flex: 1, marginRight: "8px" }} className="text-clamp-2">{req.bookTitle || t("admin.unknownBook")}</div>
                          {renderStatusTag(req.status)}
                       </div>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#666" }}>
                          <div>
                            {req.type === "renew" ? <Tag color="blue">{t("admin.renew")}</Tag> : <Tag color="purple">{t("admin.return")}</Tag>}
                          </div>
                          <div>{req.createdAt ? dayjs(req.createdAt).format("YYYY-MM-DD") : "-"}</div>
                       </div>
                    </Card>
                  )) : <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>{t("profile.noRequestRecords")}</div>}
             </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="profile-page" style={themeUtils.getPageContainerStyle()}>
      <Title level={2} className="page-modern-title" style={{ marginBottom: "20px" }}>{t("titles.profile")}</Title>
      <Card
        style={{
          ...themeUtils.getGlassStyle(),
          borderRadius: theme.borderRadius.xxl,
          boxShadow: theme.shadows.xl
        }}
      >
        {/* =========================================================
           🖼️ 第一张图部分：用户头像和基本信息 (TOP)
           ========================================================= */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ 
            background: theme.colors.background.card,
            borderRadius: theme.borderRadius.xxl, 
            padding: theme.spacing.xl, 
            marginBottom: theme.spacing.xl,
            border: "1px solid rgba(255, 255, 255, 0.3)"
          }}>
            <Avatar
              size={120}
              icon={<UserOutlined />}
              src={avatarUrl || undefined}
              style={{
                background: theme.colors.primary.gradient,
                marginBottom: theme.spacing.md,
                boxShadow: theme.shadows.lg,
                border: `3px solid ${theme.colors.neutral.white}`
              }}
            />
            <h2 style={{ margin: 0, color: theme.colors.neutral.black, fontSize: theme.typography.fontSize.xxxl, fontWeight: theme.typography.fontWeight.bold, fontFamily: theme.typography.fontFamily.primary }}>
              {name || "Unnamed user"}
            </h2>
            <Text type="secondary" style={{ fontSize: theme.typography.fontSize.md, color: theme.colors.neutral.darkGray, marginTop: "4px", marginBottom: theme.spacing.lg, display: "block", fontFamily: theme.typography.fontFamily.primary }}>
              {userLS.role || "Reader"}
            </Text>
            
            <Upload
              showUploadList={false}
              customRequest={handleUpload}
              accept="image/*"
            >
              <Button
                type="primary"
                size="middle"
                icon={<UploadOutlined />}
                loading={avatarUploading}
                style={{ 
                  ...themeUtils.getPrimaryButtonStyle(),
                  marginTop: theme.spacing.sm
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
                }}
              >
                📷 {t("profile.uploadAvatar")}
              </Button>
            </Upload>
          </div>

          {/* Email and Role Information */}
          <Descriptions bordered column={1} style={{ marginBottom: theme.spacing.xl, borderRadius: theme.borderRadius.lg, overflow: "hidden", textAlign: "left" }}>
            <Descriptions.Item label={<span style={{ fontWeight: 600, color: "#374151" }}>📧 {t("profile.emailAddress")}</span>}>
              {emailEditing ? (
                <Space>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter new email"
                    style={{ 
                      width: "240px",
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.neutral.gray}`,
                      boxShadow: theme.shadows.sm
                    }}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    onClick={handleSaveEmail}
                    style={{
                      ...themeUtils.getPrimaryButtonStyle(),
                      background: `linear-gradient(90deg, ${theme.colors.status.success}, #059669)`
                    }}
                  >
                    💾 {t("admin.save")}
                  </Button>
                </Space>
              ) : (
                <Space>
                  <span style={{ color: theme.colors.neutral.darkGray, fontFamily: theme.typography.fontFamily.primary }}>{email || t("profile.notSet")}</span>
                  <Button 
                    size="small" 
                    onClick={() => setEmailEditing(true)}
                    style={{
                      ...themeUtils.getPrimaryButtonStyle()
                    }}
                  >
                    ✏️ {t("admin.edit")}
                  </Button>
                </Space>
              )}
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.neutral.darkerGray, fontFamily: theme.typography.fontFamily.primary }}>👤 {t("admin.role")}</span>}>
              <Tag color={theme.colors.primary.main} style={{ borderRadius: theme.borderRadius.md, fontWeight: theme.typography.fontWeight.medium }}>
                {userLS.role || "Reader"}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* =========================================================
           🧑‍💼 用户画像部分 (MIDDLE)
           ========================================================= */}
        <div style={{ marginBottom: theme.spacing.xl }}>
          <Title level={2} className="page-modern-title" style={{ margin: "0 0 1rem 0", fontFamily: theme.typography.fontFamily.primary }}>
            {t("titles.profile")}
          </Title>
          <div style={{ 
            background: theme.colors.primary.gradient, 
            borderRadius: theme.borderRadius.lg, 
            padding: theme.spacing.lg, 
            color: theme.colors.neutral.white,
            boxShadow: theme.shadows.lg
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>Member Since</Text>
                <div style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>
                  {userLS.createdAt ? dayjs(userLS.createdAt).format("YYYY-MM-DD") : "Recently"}
                </div>
              </div>
              <div>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>{t("admin.totalBorrows")}</Text>
                <div style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>{stats.totalHistory}</div>
              </div>
              <div>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>{t("profile.activeRequests")}</Text>
                <div style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>{stats.pending}</div>
              </div>
              <div>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>{t("admin.onTimeRate")}</Text>
                <div style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold }}>
                  {stats.totalHistory > 0 ? Math.round((stats.returned / stats.totalHistory) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
           📈 第二张图部分：Borrow History 和 My Requests 卡片 (BOTTOM)
           ========================================================= */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
            {/* Borrow History Card */}
            <Card 
              style={{ 
                borderRadius: theme.borderRadius.lg, 
                background: theme.colors.primary.gradient, 
                border: "none", 
                boxShadow: theme.shadows.lg,
                color: theme.colors.neutral.white,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.shadows.lg;
              }}
              onClick={() => setHistoryModalVisible(true)}
            >
              <Statistic 
                title={<span style={{ color: theme.colors.neutral.white, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.medium, fontFamily: theme.typography.fontFamily.primary }}>Borrow History</span>} 
                value={history.length} 
                valueStyle={{ color: theme.colors.neutral.white, fontWeight: theme.typography.fontWeight.bold, fontSize: theme.typography.fontSize.xxl }}
                prefix={<span style={{ fontSize: theme.typography.fontSize.xl }}>📚</span>}
              />
              <div style={{ marginTop: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: "rgba(255,255,255,0.8)", fontFamily: theme.typography.fontFamily.primary }}>
                Total {history.length} books borrowed
              </div>
            </Card>

            {/* My Requests Card */}
            <Card 
              style={{ 
                borderRadius: theme.borderRadius.lg, 
                background: theme.colors.secondary.gradient, 
                border: "none", 
                boxShadow: theme.shadows.lg,
                color: theme.colors.neutral.white,
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.shadows.lg;
              }}
              onClick={() => setRequestsModalVisible(true)}
            >
              <Statistic 
                title={<span style={{ color: theme.colors.neutral.white, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.medium, fontFamily: theme.typography.fontFamily.primary }}>My Requests</span>} 
                value={requests.length} 
                valueStyle={{ color: theme.colors.neutral.white, fontWeight: theme.typography.fontWeight.bold, fontSize: theme.typography.fontSize.xxl }}
                prefix={<span style={{ fontSize: theme.typography.fontSize.xl }}>📨</span>}
              />
              <div style={{ marginTop: theme.spacing.sm, fontSize: theme.typography.fontSize.sm, color: "rgba(255,255,255,0.8)", fontFamily: theme.typography.fontFamily.primary }}>
                {stats.pending} pending, {stats.approved} approved
              </div>
            </Card>
          </div>
        </div>

        {/* =========================================================
           📋 Modal for Borrow History Details
           ========================================================= */}
        <Modal
          title={<span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.neutral.darkerGray, fontFamily: theme.typography.fontFamily.primary }}>📚 Borrow History Details</span>}
          open={historyModalVisible}
          onCancel={() => setHistoryModalVisible(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
          styles={{ 
            body: {
              background: theme.colors.background.main,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg
            }
          }}
        >
          {loading ? (
            <Spin size="large" style={{ display: "block", margin: `${theme.spacing.xl} auto` }} />
          ) : (
            <Card
              style={{
                borderRadius: theme.borderRadius.lg,
                boxShadow: theme.shadows.md,
                background: theme.colors.background.glass,
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {paginatedData.length > 0 ? paginatedData.map((item) => (
                    <Card key={item.key} size="small" style={{ background: "#fff", borderRadius: "8px", border: "1px solid #f0f0f0" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", fontSize: "15px", color: "#333" }}>{item.title}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", color: "#666" }}>
                        <div><span style={{ color: "#999" }}>Borrow:</span> <br/>{item.borrowDate}</div>
                        <div><span style={{ color: "#999" }}>Due:</span> <br/>{item.dueDate}</div>
                        <div><span style={{ color: "#999" }}>Return:</span> <br/>{item.returnDate}</div>
                        <div><span style={{ color: "#999" }}>Status:</span> <br/>{item.returned === "✅ Yes" ? <Tag color="green">Returned</Tag> : <Tag color="orange">Borrowed</Tag>}</div>
                      </div>
                    </Card>
                  )) : <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>No borrow records</div>}
                </div>
              ) : (
                <Table
                  dataSource={paginatedData}
                  columns={historyColumns}
                  pagination={false}
                  locale={{ emptyText: "No borrow records" }}
                  style={{ borderRadius: 8, overflow: "hidden" }}
                />
              )}
              {history.length > pageSize && (
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={history.length}
                    onChange={(page) => setCurrentPage(page)}
                    showSizeChanger={false}
                    style={{ display: "inline-block" }}
                  />
                </div>
              )}
            </Card>
          )}
        </Modal>

        {/* =========================================================
           📋 Modal for My Requests Details
           ========================================================= */}
        <Modal
          title={<span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.neutral.darkerGray, fontFamily: theme.typography.fontFamily.primary }}>📨 {t("profile.myRequests")}</span>}
          open={requestsModalVisible}
          onCancel={() => setRequestsModalVisible(false)}
          footer={null}
          width={800}
          style={{ top: 20 }}
          styles={{ 
            body: {
              background: theme.colors.background.main,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg
            }
          }}
        >
          {loading ? (
            <Spin size="large" style={{ display: "block", margin: `${theme.spacing.xl} auto` }} />
          ) : (
            <Card
              style={{
                borderRadius: theme.borderRadius.lg,
                boxShadow: theme.shadows.md,
                background: theme.colors.background.glass,
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
            >
              {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {requests.length > 0 ? requests.map((req) => (
                    <Card key={req._id} size="small" style={{ background: "#fff", borderRadius: "8px", border: "1px solid #f0f0f0" }}>
                       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "flex-start" }}>
                          <div style={{ fontWeight: "bold", fontSize: "15px", color: "#333", flex: 1, marginRight: "8px" }}>{req.bookTitle || t("admin.unknownBook")}</div>
                          {renderStatusTag(req.status)}
                       </div>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#666" }}>
                          <div>
                            {req.type === "renew" ? <Tag color="blue">{t("admin.renew")}</Tag> : <Tag color="purple">{t("admin.return")}</Tag>}
                          </div>
                          <div>{req.createdAt ? dayjs(req.createdAt).format("YYYY-MM-DD") : "-"}</div>
                       </div>
                    </Card>
                  )) : <div style={{ textAlign: "center", padding: "20px", color: "#999" }}>{t("profile.noRequestRecords")}</div>}
                </div>
              ) : (
                <Table
                  dataSource={requests}
                  columns={requestColumns}
                  rowKey="_id"
                  pagination={{ pageSize: 5 }}
                  locale={{ emptyText: t("profile.noRequestRecords") }}
                  style={{ borderRadius: 8, overflow: "hidden" }}
                />
              )}
            </Card>
          )}
        </Modal>
      </Card>
    </div>
  );
}

export default ProfilePage;
