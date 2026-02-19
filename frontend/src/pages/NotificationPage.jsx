import React, { useEffect, useState, useCallback, useMemo } from "react";
import { List, Typography, Spin, Empty, Button, message, Tag, Card } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  SoundOutlined
} from "@ant-design/icons";
import { getNotifications, markNotificationRead, getBookDetail } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ReviewModal from "../components/ReviewModal";

const { Title, Text } = Typography;

export const NotificationLeftPanel = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchAllNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getNotifications(token);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications overview", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  const total = notifications.length;
  const unread = notifications.filter(n => !n.read).length;
  const feedback = notifications.filter(n => n.type === "feedback_reply").length;

  const trendData = useMemo(() => {
    if (!notifications.length) return [];
    const map = new Map();
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    notifications.forEach((n) => {
      const d = new Date(n.createdAt);
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) {
        map.set(key, map.get(key) + 1);
      }
    });
    return Array.from(map.entries()).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [notifications]);

  return (
    <div className="bw-scroll">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
          {t("notifications.overviewTitle") || "Inbox Snapshot"}
        </Title>
        <Text type="secondary">
          {t("notifications.overviewDesc") || "Unread reminders and reply highlights at a glance."}
        </Text>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
        <Card size="small" bordered>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              {t("notifications.total") || "Total"}
            </span>
            <Tag>{total}</Tag>
          </div>
        </Card>
        <Card size="small" bordered>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <CloseCircleOutlined style={{ marginRight: 8, color: "#faad14" }} />
              {t("notifications.unread") || "Unread"}
            </span>
            <Tag color={unread > 0 ? "orange" : "default"}>{unread}</Tag>
          </div>
        </Card>
        <Card size="small" bordered>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <MessageOutlined style={{ marginRight: 8, color: "#1890ff" }} />
              {t("notifications.feedbackReplies") || "Feedback replies"}
            </span>
            <Tag color={feedback > 0 ? "blue" : "default"}>{feedback}</Tag>
          </div>
        </Card>
      </div>
      <Card 
        size="small" 
        bordered
        title={t("notifications.trendTitle") || "This week"}
        style={{ marginBottom: 24 }}
        bodyStyle={{ height: 140, padding: 12 }}
      >
        {trendData.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t("notifications.trendEmpty") || "No activity this week yet."}
          </Text>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="notifTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A65D57" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#A65D57" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={24} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#A65D57"
                strokeWidth={2}
                fill="url(#notifTrend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
      {loading && (
        <div style={{ textAlign: "center" }}>
          <Spin size="small" />
        </div>
      )}
    </div>
  );
};

const NotificationPage = () => {
  const { t } = useLanguage();
  const { ttsEnabled, speak } = useAccessibility();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookTitleMap, setBookTitleMap] = useState({});
  const [reviewModal, setReviewModal] = useState({ open: false, bookId: null, bookTitle: "" });
  const [reviewedMap, setReviewedMap] = useState({});
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const loadBookTitles = useCallback(async (items) => {
    const ids = Array.from(
      new Set(
        (items || [])
          .map((n) => n.relatedId)
          .filter((id) => id && !bookTitleMap[id])
      )
    );
    if (!ids.length) return;
    const newMap = {};
    const reviewed = {};
    let uid = null;
    try {
      const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      uid = user?.userId || user?._id || null;
    } catch {
      console.warn("Failed to parse current user for reviewedMap");
    }
    for (const id of ids) {
      try {
        const res = await getBookDetail(id);
        const data = res?.data;
        if (data && data.title) {
          newMap[id] = data.title;
        }
        if (uid && Array.isArray(data?.reviews)) {
          reviewed[id] = data.reviews.some((r) => String(r.userId) === String(uid));
        }
      } catch (err) {
        console.warn("Failed to load book detail for notification:", id, err?.message || err);
      }
    }
    if (Object.keys(newMap).length > 0) {
      setBookTitleMap((prev) => ({ ...prev, ...newMap }));
    }
    if (Object.keys(reviewed).length > 0) {
      setReviewedMap((prev) => ({ ...prev, ...reviewed }));
    }
  }, [bookTitleMap]);

  const fetchAllNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getNotifications(token);
      const list = res.data || [];
      setNotifications(list);
      loadBookTitles(list);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, [token, loadBookTitles]);

  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  const openReviewForNotification = async (item) => {
    if (!item?.relatedId) {
      message.error("无法定位该归还通知对应的图书");
      return;
    }
    let title = bookTitleMap[item.relatedId];
    if (!title) {
      try {
        const res = await getBookDetail(item.relatedId);
        const data = res?.data;
        title = data?.title || "";
        if (title) {
          setBookTitleMap((prev) => ({ ...prev, [item.relatedId]: title }));
        }
      } catch (err) {
        console.warn("Failed to fetch book title on review open:", err?.message || err);
      }
    }
    setReviewModal({
      open: true,
      bookId: item.relatedId,
      bookTitle: title || "",
    });
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
        await Promise.all(unread.map(n => markNotificationRead(n._id, token)));
        message.success("All marked as read");
    } catch {
        message.error("Failed to mark some notifications");
        fetchAllNotifications();
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "16px" }}>
        <Button onClick={handleMarkAllRead} disabled={!notifications.some(n => !n.read)}>
          {t("notifications.markAllRead") || "Mark all as read"}
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={notifications}
          locale={{ emptyText: <Empty description={t("notifications.noData") || "No notifications"} /> }}
          renderItem={(item) => (
            <List.Item
              actions={[
                ttsEnabled && (
                  <Button 
                    type="text" 
                    icon={<SoundOutlined />} 
                    onClick={() => speak(item.message)} 
                    title="Read"
                  />
                ),
                !item.read && (
                  <Button type="link" onClick={() => handleMarkRead(item._id)}>
                    {t("notifications.markRead") || "Mark Read"}
                  </Button>
                ),
                item.title === "Book Returned Successfully" && item.relatedId && (
                  <Button 
                    type="link" 
                    onClick={() => openReviewForNotification(item)}
                    disabled={!!reviewedMap[item.relatedId]}
                  >
                    {t("bookDetail.submitReview") || "Write Review"}
                  </Button>
                ),
              ].filter(Boolean)}
              style={{ 
                  background: item.read ? "transparent" : "#e6f7ff", 
                  padding: "16px", 
                  borderRadius: "8px", 
                  marginBottom: "12px",
                  border: "1px solid #f0f0f0",
                  transition: "all 0.3s"
              }}
            >
              <List.Item.Meta
                avatar={
                    item.type === 'feedback_reply' ? <MessageOutlined style={{ color: '#1890ff', fontSize: 24 }} /> :
                    <InfoCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />
                }
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong={!item.read} style={{ fontSize: '16px' }}>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </div>
                }
                description={() => {
                  const base = <div style={{ marginTop: 8 }}>{item.message}</div>;
                  if (item.title !== "Book Returned Successfully" || !item.relatedId) return base;
                  const title = bookTitleMap[item.relatedId];
                  if (!title) return base;
                  let rebuilt = "";
                  const msg = item.message || "";
                  if (msg.includes("marked as returned by administrator")) {
                    rebuilt = `Your book "${title}" has been marked as returned by administrator.`;
                  } else if (msg.includes("has been successfully returned")) {
                    rebuilt = `Your book "${title}" has been successfully returned.`;
                  } else {
                    rebuilt = `Your book "${title}" has been returned.`;
                  }
                  return <div style={{ marginTop: 8 }}>{rebuilt}</div>;
                }}
              />
            </List.Item>
          )}
        />
      )}

      {reviewModal.open && (
        <ReviewModal
          open={reviewModal.open}
          onClose={() => setReviewModal({ open: false, bookId: null, bookTitle: "" })}
          bookId={reviewModal.bookId}
          bookTitle={reviewModal.bookTitle}
          token={token}
          onSubmitted={() => {
            message.success(t("bookDetail.reviewSubmitted") || "Review submitted");
            setReviewedMap((prev) => ({ ...prev, [reviewModal.bookId]: true }));
            setReviewModal({ open: false, bookId: null, bookTitle: "" });
          }}
        />
      )}
    </div>
  );
};

export default NotificationPage;
