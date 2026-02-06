import { useEffect, useState, useMemo } from "react";
import { 
  Card, message, Spin, Typography, Statistic, Tag, Avatar, Upload, Button, Input, Space, Table, Modal, Row, Col, Tabs, List, Divider, theme, Grid 
} from "antd";
import { 
  UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UploadOutlined, SaveOutlined, LogoutOutlined,
  EditOutlined, MailOutlined, BookOutlined, HistoryOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  getBorrowHistoryLibrary,
  getUserRequestsLibrary,
} from "../api";

const { Title, Text } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

function ProfilePage({ appearance }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { token: themeToken } = useToken();
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
  const [nameEditing, setNameEditing] = useState(false);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const userLS = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");

  const API_BASE = (import.meta.env.VITE_API_BASE?.trim() || window.location.origin).replace(/\/+$/, "");
  const API_ROOT = API_BASE.replace(/\/api\/?$/, "");

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
    const returned = history.filter((h) => h.isReturned).length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    return { totalHistory, returned, pending, approved };
  }, [history, requests]);

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
      console.error("Failed to fetch user info:", err);
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      setLoading(true);
      const res = await getBorrowHistoryLibrary(token);
      const list = res.data || [];
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

        return {
          key: item._id || index,
          title: item.title,
          borrowDate: item.borrowDate,
          dueDate: item.dueDate,
          dueDiff: dueDiff,
          dueStatus: dueStatus,
          renewDate: (item.isRenewed || item.action === "renew") && item.dueDate ? item.dueDate : null,
          isRenewed: Boolean(item.isRenewed || item.action === "renew"),
          returnDate: item.returnDate,
          isReturned: Boolean(item.returnDate || item.action === "return"),
        };
      });

      setHistory(mapped);
    } catch (err) {
      console.error("Failed to fetch borrow history:", err);
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
      console.error("Failed to fetch requests:", err);
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
        setAvatarUrl(`${fullRawUrl}?t=${Date.now()}`);
        const updatedUser = { ...userLS, avatar: rawUrl };
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
        localStorage.setItem("user", JSON.stringify(updatedUser));
        message.success("Avatar updated successfully!");
      }
      await fetchUserProfile();
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      message.error("Failed to update email");
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchBorrowHistory();
      fetchMyRequests();
    }
  }, [token]);

  // Columns definition
  const historyColumns = [
    { title: t("admin.bookTitle"), dataIndex: "title", key: "title", render: t => <span style={{fontWeight: 600}}>{t}</span> },
    { title: t("admin.borrowDate"), dataIndex: "borrowDate", key: "borrowDate", render: d => d ? dayjs(d).format("YYYY-MM-DD") : "-", responsive: ['md'] },
    { title: t("borrow.dueDate"), dataIndex: "dueDate", key: "dueDate", render: d => d ? dayjs(d).format("YYYY-MM-DD") : "-", responsive: ['md'] },
    { 
      title: t("admin.status"), 
      key: "status", 
      render: (_, r) => r.isReturned ? <Tag color="green">{t("admin.returned")}</Tag> : <Tag color="orange">{t("profile.borrowed")}</Tag> 
    },
  ];

  const requestColumns = [
    { title: t("admin.bookTitle"), dataIndex: "bookTitle", key: "bookTitle", render: t => <span style={{fontWeight: 600}}>{t}</span> },
    { 
      title: t("admin.type"), 
      dataIndex: "type", 
      key: "type", 
      render: t => t === "renew" ? <Tag color="blue">{t("admin.renew")}</Tag> : <Tag color="purple">{t("admin.return")}</Tag> 
    },
    { 
      title: t("admin.status"), 
      dataIndex: "status", 
      key: "status", 
      render: s => {
        if (s === 'approved') return <Tag color="green" icon={<CheckCircleOutlined />}>Approved</Tag>;
        if (s === 'rejected') return <Tag color="red" icon={<CloseCircleOutlined />}>Rejected</Tag>;
        return <Tag color="gold" icon={<ClockCircleOutlined />}>Pending</Tag>;
      } 
    },
    { title: t("profile.requestTime"), dataIndex: "createdAt", key: "createdAt", render: t => t ? dayjs(t).format("YYYY-MM-DD") : "-", responsive: ['md'] },
  ];

  const renderStatCard = (title, value, icon, color) => (
    <Card className="card-clean" bodyStyle={{ padding: 16 }}>
      <Statistic 
        title={<span style={{ fontSize: 13, color: '#8c8c8c' }}>{title}</span>}
        value={value}
        valueStyle={{ fontWeight: 600, color: themeToken.colorText }}
        prefix={<span style={{ color: color, marginRight: 8, fontSize: 18 }}>{icon}</span>}
      />
    </Card>
  );

  const renderHistoryContent = () => {
    if (isMobile) {
      return (
        <List
          dataSource={history}
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
          rowKey="key"
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0' }}>
              <Card className="card-clean" bodyStyle={{ padding: 16 }} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                  {item.isReturned ? <Tag color="green">{t("admin.returned")}</Tag> : <Tag color="orange">{t("profile.borrowed")}</Tag>}
                </div>
                <Space direction="vertical" size={8} style={{ width: '100%', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t("admin.borrowDate")}</Text>
                    <Text>{item.borrowDate ? dayjs(item.borrowDate).format("YYYY-MM-DD") : "-"}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t("borrow.dueDate")}</Text>
                    <Text>{item.dueDate ? dayjs(item.dueDate).format("YYYY-MM-DD") : "-"}</Text>
                  </div>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      );
    }
    return (
      <Table 
        dataSource={history} 
        columns={historyColumns} 
        pagination={{ pageSize: 5, hideOnSinglePage: true }} 
        rowKey="key"
        size="middle"
      />
    );
  };

  const renderRequestsContent = () => {
    if (isMobile) {
      return (
        <List
          dataSource={requests}
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
          rowKey="_id"
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 0' }}>
              <Card className="card-clean" bodyStyle={{ padding: 16 }} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 16 }}>{item.bookTitle}</Text>
                  {(() => {
                    if (item.status === 'approved') return <Tag color="green" icon={<CheckCircleOutlined />}>Approved</Tag>;
                    if (item.status === 'rejected') return <Tag color="red" icon={<CloseCircleOutlined />}>Rejected</Tag>;
                    return <Tag color="gold" icon={<ClockCircleOutlined />}>Pending</Tag>;
                  })()}
                </div>
                <Space direction="vertical" size={8} style={{ width: '100%', fontSize: 13 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t("admin.type")}</Text>
                    {item.type === "renew" ? <Tag color="blue">{t("admin.renew")}</Tag> : <Tag color="purple">{t("admin.return")}</Tag>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{t("profile.requestTime")}</Text>
                    <Text>{item.createdAt ? dayjs(item.createdAt).format("YYYY-MM-DD") : "-"}</Text>
                  </div>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      );
    }
    return (
      <Table 
        dataSource={requests} 
        columns={requestColumns} 
        pagination={{ pageSize: 5, hideOnSinglePage: true }} 
        rowKey="_id"
        size="middle"
      />
    );
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 600 }}>{t("titles.profile")}</Title>
        <Text type="secondary">{t("profile.myProfile")}</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Left: Profile Card */}
        <Col xs={24} lg={8}>
          <Card className="card-clean" bodyStyle={{ padding: 32, textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <Avatar size={100} src={avatarUrl} icon={<UserOutlined />} style={{ border: `1px solid ${themeToken.colorBorderSecondary}` }} />
              <Upload showUploadList={false} customRequest={handleUpload} accept="image/*">
                <Button 
                  type="primary" shape="circle" icon={<UploadOutlined />} size="small" 
                  style={{ position: 'absolute', bottom: 0, right: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} 
                  loading={avatarUploading}
                />
              </Upload>
            </div>

            <div style={{ marginBottom: 24 }}>
              {nameEditing ? (
                 <Space>
                   <Input value={name} onChange={e => setName(e.target.value)} />
                   <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveName} />
                 </Space>
              ) : (
                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                   <Title level={4} style={{ margin: 0 }}>{name}</Title>
                   <EditOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} onClick={() => setNameEditing(true)} />
                 </div>
              )}
              <Tag color="blue" style={{ marginTop: 8 }}>{userLS.role === "admin" ? t("role.libraryAdmin") : t("role.libraryReader")}</Tag>
            </div>

            <Divider />

            <div style={{ textAlign: 'left', marginBottom: 32 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>EMAIL</Text>
              {emailEditing ? (
                <Space style={{ width: '100%' }}>
                  <Input value={email} onChange={e => setEmail(e.target.value)} />
                  <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveEmail} />
                </Space>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space><MailOutlined style={{ color: '#8c8c8c' }} /> <Text>{email || "Not set"}</Text></Space>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => setEmailEditing(true)} />
                </div>
              )}
            </div>

            <Button block danger size="large" icon={<LogoutOutlined />} onClick={handleLogout}>
              {t("common.logout")}
            </Button>
          </Card>
        </Col>

        {/* Right: Stats & History */}
        <Col xs={24} lg={16}>
          {/* Stats */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>{renderStatCard(t("admin.totalBorrows"), stats.totalHistory, <BookOutlined />, '#1677ff')}</Col>
            <Col xs={12} sm={6}>{renderStatCard(t("profile.activeRequests"), stats.pending, <ClockCircleOutlined />, '#faad14')}</Col>
            <Col xs={12} sm={6}>{renderStatCard(t("admin.returned"), stats.returned, <CheckCircleOutlined />, '#52c41a')}</Col>
            <Col xs={12} sm={6}>{renderStatCard("Approved", stats.approved, <CheckCircleOutlined />, '#13c2c2')}</Col>
          </Row>

          {/* Tabs */}
          <Card className="card-clean" bodyStyle={{ padding: 0 }}>
             <Tabs 
               defaultActiveKey="1" 
               tabBarStyle={{ padding: '0 24px', margin: 0 }}
               items={[
                 {
                   key: '1',
                   label: <span><HistoryOutlined /> {t("profile.borrowHistory")}</span>,
                   children: <div style={{ padding: isMobile ? 16 : 0 }}>{renderHistoryContent()}</div>
                 },
                 {
                   key: '2',
                   label: <span><MailOutlined /> {t("profile.myRequests")}</span>,
                   children: <div style={{ padding: isMobile ? 16 : 0 }}>{renderRequestsContent()}</div>
                 }
               ]}
             />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ProfilePage;
