import React, { useEffect, useState, useMemo } from "react";
import { 
  Typography, 
  Tag, 
  Button, 
  Avatar, 
  Tabs, 
  Upload, 
  Input, 
  message, 
  Space, 
  Row, 
  Col, 
  theme,
  Empty,
  Badge,
  Spin
} from "antd";
import { 
  UserOutlined, 
  MailOutlined, 
  HistoryOutlined, 
  SolutionOutlined, 
  EditOutlined, 
  SaveOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  BookOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import StatCard from "../components/cards/StatCard";
import BookCoverPro from "../components/common/BookCoverPro";
import { stringToWarmColor } from "../utils/hashColor";
import { getCleanImageUrl } from "../utils/imageUtils";
import { 
  getBorrowHistory, 
  getUserRequestsLibrary, 
  updateProfile, 
  uploadAvatar 
} from "../api";

const { Title, Text } = Typography;

export const ProfileLeftPanel = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [history, setHistory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!authToken) return;

      const [histRes, reqRes] = await Promise.allSettled([
        getBorrowHistory(authToken),
        getUserRequestsLibrary(authToken)
      ]);

      if (histRes.status === "fulfilled") setHistory(histRes.value.data || []);
      if (reqRes.status === "fulfilled") setRequests(reqRes.value.data || []);
    } catch (error) {
      console.error("Profile overview error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = dayjs();
    const startOfThisMonth = now.startOf("month");
    const startOfLastMonth = startOfThisMonth.subtract(1, "month");
    const startOfNextMonth = startOfThisMonth.add(1, "month");

    const thisStart = startOfThisMonth.valueOf();
    const thisEnd = startOfNextMonth.valueOf();
    const lastStart = startOfLastMonth.valueOf();
    const lastEnd = startOfThisMonth.valueOf();

    const thisMonthHistory = history.filter((h) => {
      const raw = h?.date || h?.createdAt || h?.borrowDate;
      if (!raw) return false;
      const d = dayjs(raw);
      if (!d.isValid()) return false;
      const ts = d.valueOf();
      return ts >= thisStart && ts < thisEnd;
    });

    const lastMonthHistory = history.filter((h) => {
      const raw = h?.date || h?.createdAt || h?.borrowDate;
      if (!raw) return false;
      const d = dayjs(raw);
      if (!d.isValid()) return false;
      const ts = d.valueOf();
      return ts >= lastStart && ts < lastEnd;
    });

    const thisTotal = thisMonthHistory.length;
    const lastTotal = lastMonthHistory.length;

    const thisReturned = thisMonthHistory.filter((h) => h.action === "return" || !!h.returnDate).length;
    const lastReturned = lastMonthHistory.filter((h) => h.action === "return" || !!h.returnDate).length;

    const thisActive = thisTotal - thisReturned;
    const lastActive = lastTotal - lastReturned;

    const thisPending = requests.filter((r) => {
      if (r.status !== "pending") return false;
      const raw = r?.updatedAt || r?.createdAt;
      if (!raw) return false;
      const d = dayjs(raw);
      if (!d.isValid()) return false;
      const ts = d.valueOf();
      return ts >= thisStart && ts < thisEnd;
    }).length;

    const lastPending = requests.filter((r) => {
      if (r.status !== "pending") return false;
      const raw = r?.updatedAt || r?.createdAt;
      if (!raw) return false;
      const d = dayjs(raw);
      if (!d.isValid()) return false;
      const ts = d.valueOf();
      return ts >= lastStart && ts < lastEnd;
    }).length;

    const calcTrend = (current, last) => {
      if (last === 0) {
        return current > 0 ? 100 : 0;
      }
      return Math.round(((current - last) / last) * 100);
    };

    return {
      total: thisTotal,
      returned: thisReturned,
      active: thisActive,
      pending: thisPending,
      trends: {
        total: calcTrend(thisTotal, lastTotal),
        active: calcTrend(thisActive, lastActive),
        returned: calcTrend(thisReturned, lastReturned),
        pending: calcTrend(thisPending, lastPending),
      },
    };
  }, [history, requests]);

  return (
    <div className="bw-scroll">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
          {t("profile.overviewTitle") || "Reader Snapshot"}
        </Title>
        <Text type="secondary">
          {t("profile.overviewDesc") || "Your recent reading activity and account status at a glance."}
        </Text>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <StatCard
          title={t("profile.totalBooks") || "Total Books"}
          value={stats.total}
          trend={stats.trends.total}
          color={token.colorPrimary}
          loading={loading}
        />
        <StatCard
          title={t("profile.activeLoans") || "Active Loans"}
          value={stats.active}
          trend={stats.trends.active}
          color={token.colorWarning}
          loading={loading}
        />
        <StatCard
          title={t("profile.returned") || "Returned"}
          value={stats.returned}
          trend={stats.trends.returned}
          color={token.colorSuccess}
          loading={loading}
        />
        <StatCard
          title={t("profile.pendingRequests") || "Pending Requests"}
          value={stats.pending}
          trend={stats.trends.pending}
          color={token.colorInfo}
          loading={loading}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ fontFamily: "'Literata', serif", marginBottom: 12 }}>
          {t("profile.recentActivity") || "Recent Activity"}
        </Title>
        {loading ? (
          <Spin />
        ) : history.length === 0 ? (
          <Empty description={t("profile.noActivity") || "No activity yet"} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.slice(0, 3).map((item) => {
              const isReturn = item.action === "return" || !!item.returnDate;
              const date = item.date || item.createdAt;
              const displayDate = dayjs(date).format("MMM D, YYYY");
              const bookTitle = item.title || item.bookTitle || "Unknown Book";
              const bookAuthor = item.author || "Unknown Author";
              return (
                <div
                  key={item._id}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 12,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer
                  }}
                >
                  <div style={{ flexShrink: 0 }}>
                    {item.coverImage ? (
                      <img
                        src={getCleanImageUrl(item.coverImage)}
                        alt={bookTitle}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: 40,
                          height: 60,
                          objectFit: "cover",
                          borderRadius: 4,
                          display: "block",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <BookCoverPro
                        title={bookTitle}
                        author={bookAuthor}
                        width={40}
                        height={60}
                        baseColor={stringToWarmColor(bookTitle)}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: "block" }}>
                      {bookTitle}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {bookAuthor}
                    </Text>
                    <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
                      <Tag color={isReturn ? "success" : "warning"}>
                        {isReturn ? t("profile.returnedTag") || "Returned" : t("profile.borrowedTag") || "Borrowed"}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {displayDate}
                      </Text>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function ProfilePage() {
  const { t } = useLanguage();
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
      const newAvatarUrl = res.data.avatarUrl; 
      
      const updatedUser = { ...user, avatar: newAvatarUrl };
      setUser(updatedUser);
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      if (localStorage.getItem("user")) localStorage.setItem("user", JSON.stringify(updatedUser));
      
      message.success(t("profile.avatarUpdated"));
    } catch {
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
      setEditing(false);
    } catch {
      message.error(t("profile.updateFailed"));
    }
  };

  // Shared List Item Component
  const renderListItem = (item, type) => {
    const isRequest = type === 'request';
    const bookTitle = isRequest ? item.bookTitle : (item.title || item.bookTitle);
    const date = item.createdAt || item.date;
    const status = isRequest ? item.status : (item.action === 'return' || !!item.returnDate ? 'returned' : 'borrowed');
    
    let statusColor = token.colorPrimary;
    let statusIcon = <BookOutlined />;
    let statusText = status;

    if (status === 'returned' || status === 'approved') {
        statusColor = token.colorSuccess;
        statusIcon = <CheckCircleOutlined />;
    } else if (status === 'rejected') {
        statusColor = token.colorError;
        statusIcon = <CloseCircleOutlined />;
    } else if (status === 'pending') {
        statusColor = token.colorWarning;
        statusIcon = <ClockCircleOutlined />;
    }

    return (
        <div 
          key={item._id}
          style={{
            background: '#fff',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: '20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 20
          }}
        >
            <div style={{ flexShrink: 0 }}>
              {type === "history" && item.coverImage ? (
                <img
                  src={getCleanImageUrl(item.coverImage)}
                  alt={bookTitle}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: 48,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 6,
                    display: "block",
                    boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <BookCoverPro 
                  title={bookTitle} 
                  width={48} 
                  height={72} 
                  baseColor={stringToWarmColor(bookTitle || "Book")}
                  style="swiss"
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 16, fontFamily: "'Literata', serif" }}>{bookTitle}</Text>
                    <Tag color={statusColor === token.colorSuccess ? 'success' : (statusColor === token.colorError ? 'error' : 'warning')} style={{ border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {statusIcon} <span style={{ textTransform: 'capitalize' }}>{statusText}</span>
                    </Tag>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                       {dayjs(date).format("MMM D, YYYY")}
                    </Text>
                    {isRequest && (
                        <Text type="secondary" style={{ fontSize: 13 }}>Type: {item.type}</Text>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <EditorialPageShell
      title={null}
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.profile") }
      ]}
      fullWidth
      noPadding
    >
      {/* 1. Profile Hero */}
      <div style={{ 
        background: '#FAF9F6', 
        padding: '64px 24px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
         <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: 24 }}>
                <Badge count={editing ? <EditOutlined style={{ color: '#fff' }} /> : 0} offset={[-10, 110]} style={{ backgroundColor: token.colorPrimary, width: 32, height: 32, lineHeight: '32px', fontSize: 16, borderRadius: '50%' }}>
                  <Avatar 
                    size={128} 
                    src={user.avatar} 
                    icon={<UserOutlined style={{ fontSize: 48 }} />} 
                    style={{ 
                      backgroundColor: token.colorPrimary,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      border: '4px solid #fff'
                    }}
                  />
                </Badge>
                <Upload 
                   showUploadList={false} 
                   customRequest={handleAvatarUpload}
                   disabled={avatarUploading}
                >
                   <Button 
                     shape="circle" 
                     icon={<UploadOutlined />} 
                     size="large"
                     loading={avatarUploading}
                     style={{ 
                       position: 'absolute', 
                       bottom: 0, 
                       right: 0, 
                       boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                       border: 'none'
                     }} 
                   />
                </Upload>
            </div>

            {!editing ? (
                <>
                   <Title level={1} style={{ fontFamily: "'Literata', serif", margin: '0 0 8px' }}>
                      {user.name || user.username || "Reader"}
                   </Title>
                   <Text type="secondary" style={{ fontSize: 16, marginBottom: 24, display: 'block' }}>
                      {user.email || "No email provided"}
                   </Text>
                   <Button onClick={() => setEditing(true)} icon={<EditOutlined />}>Edit Profile</Button>
                </>
            ) : (
                <Space direction="vertical" style={{ width: '100%', maxWidth: 320 }}>
                    <Input size="large" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Name" prefix={<UserOutlined />} />
                    <Input size="large" value={tempEmail} onChange={e => setTempEmail(e.target.value)} placeholder="Email" prefix={<MailOutlined />} />
                    <Space style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                        <Button onClick={() => setEditing(false)}>Cancel</Button>
                        <Button type="primary" onClick={handleSaveProfile} icon={<SaveOutlined />}>Save Changes</Button>
                    </Space>
                </Space>
            )}
         </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <>
            {/* KPI 卡片只保留在左页，右页删除重复 KPI 区块 */}

            <Tabs 
              defaultActiveKey="1" 
              size="large"
              items={[
                {
                  key: '1',
                  label: <span><HistoryOutlined /> History</span>,
                  children: history.length > 0 ? (
                    <div>{history.map(item => renderListItem(item, 'history'))}</div>
                  ) : <Empty description="No history yet" />
                },
                {
                  key: '2',
                  label: <span><SolutionOutlined /> Requests</span>,
                  children: requests.length > 0 ? (
                    <div>{requests.map(item => renderListItem(item, 'request'))}</div>
                  ) : <Empty description="No requests found" />
                }
              ]}
            />
          </>
        )}
      </div>
    </EditorialPageShell>
  );
}

export default ProfilePage;
