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
import { getNotifications, markNotificationRead } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

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
  const unread = notifications.filter(n => !n.isRead).length;
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
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchAllNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getNotifications(token);
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id, token);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

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
        <Button onClick={handleMarkAllRead} disabled={!notifications.some(n => !n.isRead)}>
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
                !item.isRead && <Button type="link" onClick={() => handleMarkRead(item._id)}>{t("notifications.markRead") || "Mark Read"}</Button>
              ].filter(Boolean)}
              style={{ 
                  background: item.isRead ? "transparent" : "#e6f7ff", 
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
                        <Text strong={!item.isRead} style={{ fontSize: '16px' }}>{item.title}</Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </div>
                }
                description={<div style={{ marginTop: 8 }}>{item.message}</div>}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default NotificationPage;
