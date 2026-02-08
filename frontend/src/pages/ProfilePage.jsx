import { useEffect, useState, useMemo } from "react";
import { 
  Card, message, Typography, Tag, Avatar, Upload, Button, Input, 
  Space, Table, Modal, Row, Col, Tabs, Statistic, Divider, Form, theme 
} from "antd";
import { 
  UserOutlined, 
  UploadOutlined, 
  SaveOutlined, 
  LogoutOutlined,
  ReadOutlined,
  SolutionOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  EditOutlined,
  MailOutlined
} from "@ant-design/icons";
import { blue, gold, purple } from "@ant-design/colors";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate, Link } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getBorrowHistoryLibrary,
  getUserRequestsLibrary,
} from "../api.js";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";
import { motion } from "framer-motion";
import { getCleanImageUrl } from "../utils/imageUtils";

const { Title, Text } = Typography;

function ProfilePage({ appearance }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { token: themeToken } = theme.useToken();
  
  // State
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [email, setEmail] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);
  const [name, setName] = useState("");
  const [nameEditing, setNameEditing] = useState(false);

  // User Data from Storage
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userLS = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");

  // Derived Stats
  const stats = useMemo(() => {
    const totalHistory = history.length;
    const returned = history.filter((h) => h.isReturned).length;
    const active = history.filter((h) => !h.isReturned).length;
    const pending = requests.filter((r) => r.status === "pending").length;
    return { totalHistory, returned, active, pending };
  }, [history, requests]);

  // Actions
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem("logout_event", Date.now());
    message.success(t("common.logoutSuccess"));
    navigate("/login");
  };

  const fetchUserProfile = async () => {
    try {
      const res = await getProfile(token);
      const u = res.data;
      if (!u) throw new Error("Empty response");

      setEmail(u.email || "");
      setName(u.name || t("profile.unnamedUser"));

      const fullAvatar = getCleanImageUrl(u.avatar);
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
      // message.error("Failed to load user info"); // Suppress initial error to avoid spam
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      setLoading(true);
      const res = await getBorrowHistoryLibrary(token);
      const list = res.data || [];

      // Logic: Aggregate by book ID, keep latest status
      const normalizeTime = (it) => new Date(it.returnDate || it.borrowDate || it.dueDate || 0).getTime();
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
        let dueDiff = 0;
        let dueStatus = "normal";

        if (due) {
          dueDiff = due.diff(now, "day");
          if (dueDiff >= 10) dueStatus = "normal";
          else if (dueDiff >= 1) dueStatus = "warning";
          else dueStatus = "overdue";
        }

        const isReturned = Boolean(item.returnDate || item.action === "return");
        const isRenewed = Boolean(item.isRenewed || item.action === "renew");

        return {
          key: item._id || index,
          bookId: item.bookId, // Added for navigation
          title: item.title,
          borrowDate: item.borrowDate,
          dueDate: item.dueDate,
          dueDiff,
          dueStatus,
          renewDate: isRenewed && item.dueDate ? item.dueDate : null,
          isRenewed,
          returnDate: item.returnDate,
          isReturned,
        };
      });

      setHistory(mapped);
    } catch (err) {
      console.error("❌ Failed to fetch borrow history:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await getUserRequestsLibrary(token);
      const list = res.data || [];
      const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(sorted);
    } catch (err) {
      console.error("❌ Failed to fetch request records:", err);
    }
  };

  const handleUpload = async ({ file }) => {
    if (!file) return;
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);
      
      const res = await uploadAvatar(token, formData);
      const rawUrl = res.data?.avatarUrl;
      
      if (rawUrl) {
        const fullRawUrl = getCleanAvatarUrl(rawUrl);
        const newUrl = `${fullRawUrl}?t=${Date.now()}`;
        setAvatarUrl(newUrl);
        const updatedUser = { ...userLS, avatar: rawUrl };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        message.success(t("profile.uploadSuccess") || "Avatar updated successfully!");
      } else {
        message.error("Avatar upload failed - no URL returned");
      }
      await fetchUserProfile();
    } catch (err) {
      console.error("❌ Failed to upload avatar:", err);
      message.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (!name.trim()) return message.warning(t("profile.nameEmpty"));
    try {
      const res = await updateProfile(token, { name });
      const u = res.data?.user || {};
      const updatedUser = { ...userLS, name: u.name || name };
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setName(u.name || name);
      setNameEditing(false);
      message.success(t("profile.nameUpdated"));
      await fetchUserProfile();
    } catch (err) {
      console.error("❌ Failed to update name:", err);
      message.error(t("profile.nameUpdateFailed"));
    }
  };

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

  useEffect(() => {
    setAvatarUrl(userLS.avatar ? `${userLS.avatar}?t=${Date.now()}` : null);
    setEmail(userLS.email || "");
    setName(userLS.name || "");
    fetchUserProfile();
    fetchBorrowHistory();
    fetchMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Columns for Tables
  const historyColumns = [
    { 
      title: t("admin.bookTitle"), 
      dataIndex: "title", 
      key: "title",
      render: (text, record) => (
        <Link to={`/book/${record.bookId}`} style={{ fontWeight: 'bold' }}>
          {text}
        </Link>
      )
    },
    { 
      title: t("admin.borrowDate"), 
      dataIndex: "borrowDate", 
      key: "borrowDate",
      responsive: ['md'],
      render: (t) => t ? dayjs(t).format("YYYY-MM-DD") : "-"
    },
    { 
      title: t("borrow.dueDate"), 
      dataIndex: "dueDate", 
      key: "dueDate",
      render: (dateValue, record) => {
        if (record.isReturned) return <Tag color="default">{t("history.returned")}</Tag>;
        const dateStr = dateValue ? dayjs(dateValue).format("YYYY-MM-DD") : "-";
        if (record.dueStatus === "overdue") return <Tag color="error">{dateStr}</Tag>;
        if (record.dueStatus === "warning") return <Tag color="warning">{dateStr}</Tag>;
        return <Text>{dateStr}</Text>;
      }
    },
    { 
      title: t("admin.status"), 
      key: "status",
      render: (_, record) => {
        if (record.isReturned) return <Tag icon={<CheckCircleOutlined />} color="success">{t("history.returned")}</Tag>;
        if (record.isRenewed) return <Tag icon={<SyncOutlined />} color="blue">{t("history.renewed")}</Tag>;
        if (record.dueStatus === "overdue") return <Tag icon={<ClockCircleOutlined />} color="error">{t("history.overdue")}</Tag>;
        return <Tag color="processing">{t("history.borrowing")}</Tag>;
      }
    },
  ];

  const requestColumns = [
    { title: t("admin.bookTitle"), dataIndex: "bookTitle", key: "bookTitle", render: (text) => <Text strong>{text}</Text> },
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
      render: (status) => {
        if (status === "approved") return <Tag color="success" icon={<CheckCircleOutlined />}>Approved</Tag>;
        if (status === "rejected") return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
        return <Tag color="gold" icon={<ClockCircleOutlined />}>Pending</Tag>;
      },
    },
    {
      title: t("profile.requestTime"),
      dataIndex: "createdAt",
      key: "createdAt",
      responsive: ['md'],
      render: (t) => (t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "—"),
    },
  ];

  const items = [
    {
      key: '1',
      label: (
        <span>
          <ReadOutlined />
          {t("admin.history")}
        </span>
      ),
      children: (
        <Table 
          columns={historyColumns} 
          dataSource={history} 
          pagination={{ pageSize: 5 }} 
          rowKey="key"
          loading={loading}
        />
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <SolutionOutlined />
          {t("profile.myRequests")}
        </span>
      ),
      children: (
        <Table 
          columns={requestColumns} 
          dataSource={requests} 
          pagination={{ pageSize: 5 }} 
          rowKey="_id"
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader 
        title={t("profile.myProfile")}
        subtitle={t("profile.subtitle")}
        breadcrumbs={[
          { title: t("nav.home"), path: "/" },
          { title: t("profile.myProfile") }
        ]}
      />

      <Row gutter={[24, 24]}>
        {/* Left Column: Profile Card */}
        <Col xs={24} lg={8}>
          <Card 
            className="card-shadow"
            bordered={false} 
            style={{ borderRadius: 16, textAlign: 'center', height: '100%' }}
          >
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
              <Avatar 
                size={120} 
                src={avatarUrl} 
                icon={<UserOutlined />} 
                style={{ 
                  border: '4px solid white', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                }} 
              />
              <Upload 
                showUploadList={false} 
                customRequest={handleUpload} 
                accept="image/*"
              >
                <Button 
                  type="primary" 
                  shape="circle" 
                  icon={<UploadOutlined />} 
                  size="small"
                  loading={avatarUploading}
                  style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    right: 0, 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
                  }}
                />
              </Upload>
            </div>

            {/* Name Section */}
            <div style={{ marginBottom: 16 }}>
              {nameEditing ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    onPressEnter={handleSaveName}
                  />
                  <Space>
                    <Button type="primary" size="small" onClick={handleSaveName} icon={<SaveOutlined />}>Save</Button>
                    <Button size="small" onClick={() => setNameEditing(false)}>Cancel</Button>
                  </Space>
                </Space>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Title level={3} style={{ margin: 0 }}>{name || t("profile.unnamedUser")}</Title>
                  <Button type="text" icon={<EditOutlined />} onClick={() => setNameEditing(true)} />
                </div>
              )}
              <Tag color="blue" style={{ marginTop: 8 }}>
                {userLS.role === "admin" ? t("role.libraryAdmin") : t("role.libraryReader")}
              </Tag>
            </div>

            <Divider />

            {/* Email Section */}
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {t("profile.emailAddress")}
              </Text>
              {emailEditing ? (
                 <Space.Compact style={{ width: '100%', marginTop: 8 }}>
                  <Input 
                    prefix={<MailOutlined />} 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                  <Button type="primary" onClick={handleSaveEmail} icon={<SaveOutlined />} />
                  <Button onClick={() => setEmailEditing(false)}>X</Button>
                </Space.Compact>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Space>
                    <MailOutlined style={{ color: themeToken.colorTextSecondary }} />
                    <Text strong>{email || t("profile.notSet")}</Text>
                  </Space>
                  <Button type="link" size="small" onClick={() => setEmailEditing(true)}>{t("common.edit")}</Button>
                </div>
              )}
            </div>

            <Button 
              danger 
              block 
              size="large" 
              icon={<LogoutOutlined />} 
              onClick={handleLogout}
              style={{ borderRadius: 12, height: 48 }}
            >
              {t("common.logout")}
            </Button>
          </Card>
        </Col>

        {/* Right Column: Stats & Data */}
        <Col xs={24} lg={16}>
          {/* KPI Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8}>
              <KPIStatCard 
                title={t("profile.borrowed")} 
                value={stats.totalHistory} 
                icon={<ReadOutlined />} 
                color={blue[5]} 
              />
            </Col>
            <Col xs={12} sm={8}>
              <KPIStatCard 
                title={t("common.activeLoans")} 
                value={stats.active} 
                icon={<ClockCircleOutlined />} 
                color={gold[5]} 
              />
            </Col>
            <Col xs={24} sm={8}>
              <KPIStatCard 
                title={t("profile.activeRequests")} 
                value={stats.pending} 
                icon={<SolutionOutlined />} 
                color={purple[5]} 
              />
            </Col>
          </Row>

          {/* Tabs for History and Requests */}
          <Card className="card-shadow" bordered={false} style={{ borderRadius: 16 }}>
            <Tabs defaultActiveKey="1" items={items} size="large" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}

export default ProfilePage;
