import React, { useEffect, useState } from "react";
import { List, Typography, Spin, Empty, Button, message, Tag } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  MessageOutlined
} from "@ant-design/icons";
import { getNotifications, markNotificationRead } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text } = Typography;

const NotificationPage = () => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchAllNotifications = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getNotifications(token);
      // Assuming res.data is array of notifications
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
      // message.error(t("common.error")); // Avoid spamming error on load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, [token]);

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
        // Ideally backend should have markAllRead endpoint
        // For now we just call it for each (parallel)
        await Promise.all(unread.map(n => markNotificationRead(n._id, token)));
        message.success("All marked as read");
    } catch (err) {
        message.error("Failed to mark some notifications");
        fetchAllNotifications(); // Revert/Refresh
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <Title level={2} style={{ marginBottom: 0 }}>
            <BellOutlined style={{ marginRight: 8 }} /> 
            {t("notifications.title") || "Notification Center"}
        </Title>
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
