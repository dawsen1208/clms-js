import React, { useEffect, useState, useMemo } from "react";
import { 
  Card, 
  Typography, 
  Tag, 
  Button, 
  Table, 
  Avatar, 
  Tabs, 
  Upload, 
  Input, 
  message, 
  Space, 
  Row, 
  Col, 
  theme,
  Statistic,
  Divider
} from "antd";
import { 
  UserOutlined, 
  MailOutlined, 
  HistoryOutlined, 
  SolutionOutlined, 
  SettingOutlined, 
  UploadOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReadOutlined,
  EditOutlined,
  SaveOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageShell from "../components/common/PageShell";
import Section from "../components/common/Section";
import KPIStatCard from "../components/common/KPIStatCard";
import { 
  getBorrowHistory, 
  getUserRequestsLibrary, 
  updateProfile, 
  uploadAvatar 
} from "../api";

const { Title, Text } = Typography;

function ProfilePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  
  // State
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // Profile Edit State
  const [user, setUser] = useState({});
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  // Initial Data
  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");
    if (sessionUser || localUser) {
      const u = JSON.parse(sessionUser || localUser || "{}");
      setUser(u);
      setTempName(u.name || u.username || "");
      setTempEmail(u.email || "");
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) return;

      const [histRes, reqRes] = await Promise.allSettled([
        getBorrowHistory(token),
        getUserRequestsLibrary(token)
      ]);

      if (histRes.status === 'fulfilled') setHistory(histRes.value.data || []);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data || []);
    } catch (error) {
      console.error("Profile data error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async ({ file }) => {
    const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!authToken) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setAvatarUploading(true);
    try {
      const res = await uploadAvatar(formData, authToken);
      const newAvatarUrl = res.data.avatarUrl; // Adjust based on actual API response
      
      const updatedUser = { ...user, avatar: newAvatarUrl };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updatedUser));
      
      message.success(t("profile.avatarUpdated"));
    } catch (error) {
      message.error(t("profile.avatarFailed"));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!authToken) return;

    try {
      await updateProfile(authToken, { name: tempName, email: tempEmail });
      const updatedUser = { ...user, name: tempName, email: tempEmail };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updatedUser));
      
      message.success(t("profile.updateSuccess"));
    } catch (error) {
      message.error(t("profile.updateFailed"));
    }
  };

  const stats = useMemo(() => {
    const total = history.length;
    const returned = history.filter((h) => h.action === 'return' || !!h.returnDate).length;
    const active = total - returned; // Rough estimate or check borrowedBooks
    const pending = requests.filter((r) => r.status === "pending").length;
    return { total, returned, active, pending };
  }, [history, requests]);

  const historyColumns = [
    { 
      title: t("admin.bookTitle"), 
      dataIndex: "title", 
      key: "title",
      render: (text, record) => (
         <Text strong>{text || record.bookTitle}</Text>
      )
    },
    { 
      title: t("admin.borrowDate"), 
      dataIndex: "date", 
      key: "date",
      render: (t) => t ? dayjs(t).format("YYYY-MM-DD") : "—"
    },
    {
      title: t("admin.status"),
      key: "status",
      render: (_, record) => {
        const isReturned = record.action === 'return' || !!record.returnDate;
        return isReturned ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>{t("history.returned")}</Tag> : 
          <Tag color="processing" icon={<ClockCircleOutlined />}>{t("history.borrowing")}</Tag>;
      }
    }
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
      render: (t) => (t ? dayjs(t).format("YYYY-MM-DD") : "—"),
    },
  ];

  return (
    <PageShell
      title={t("nav.profile")}
      subtitle="Manage your account settings and view activity."
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.profile") }
      ]}
    >
      <Row gutter={[24, 24]}>
        {/* Left Col: Profile Card */}
        <Col xs={24} md={8}>
          <Card 
            bordered={false} 
            style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, textAlign: 'center' }}
          >
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <Avatar 
                size={120} 
                src={user.avatar} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: token.colorPrimary }}
              />
              <Upload 
                showUploadList={false} 
                customRequest={handleAvatarUpload}
                disabled={avatarUploading}
              >
                <Button 
                  shape="circle" 
                  icon={<UploadOutlined />} 
                  size="small"
                  loading={avatarUploading}
                  style={{ position: 'absolute', bottom: 0, right: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} 
                />
              </Upload>
            </div>
            
            {!editing ? (
              <>
                <Title level={3} style={{ margin: 0 }}>{user.name || user.username || "User"}</Title>
                <Text type="secondary">{user.email || "No email set"}</Text>
                <div style={{ marginTop: 24 }}>
                  <Button onClick={() => setEditing(true)} icon={<EditOutlined />}>Edit Profile</Button>
                </div>
              </>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Name" prefix={<UserOutlined />} />
                <Input value={tempEmail} onChange={e => setTempEmail(e.target.value)} placeholder="Email" prefix={<MailOutlined />} />
                <Space>
                  <Button onClick={() => setEditing(false)}>Cancel</Button>
                  <Button type="primary" onClick={handleSaveProfile} icon={<SaveOutlined />}>Save</Button>
                </Space>
              </Space>
            )}

            <Divider />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic title="Total Borrowed" value={stats.total} />
              </Col>
              <Col span={12}>
                <Statistic title="Pending" value={stats.pending} valueStyle={{ color: token.colorWarning }} />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Right Col: Tabs */}
        <Col xs={24} md={16}>
          <Card 
             bordered={false} 
             style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, minHeight: 400 }}
             bodyStyle={{ padding: 0 }}
          >
            <Tabs 
              defaultActiveKey="1" 
              size="large"
              tabBarStyle={{ padding: '0 24px' }}
              items={[
                {
                  key: '1',
                  label: <span><HistoryOutlined /> {t("admin.history")}</span>,
                  children: (
                    <Table 
                      dataSource={history} 
                      columns={historyColumns} 
                      rowKey={record => record._id || Math.random()} // Fallback key
                      pagination={{ pageSize: 5 }} 
                    />
                  )
                },
                {
                  key: '2',
                  label: <span><SolutionOutlined /> {t("admin.requests")}</span>,
                  children: (
                    <Table 
                      dataSource={requests} 
                      columns={requestColumns} 
                      rowKey={record => record._id || Math.random()}
                      pagination={{ pageSize: 5 }}
                      />
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageShell>
  );
}

export default ProfilePage;
