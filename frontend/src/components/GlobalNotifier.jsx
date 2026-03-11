/**
 * Global Notifier Component
 * Provides a comprehensive notification system for users, including a drawer for message history,
 * real-time alerts, and detail modals for borrow/return updates.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Badge,
  Button,
  Tooltip,
  Drawer,
  List,
  notification,
  Empty,
  Typography,
  Modal,
  Tag,
  Grid,
} from "antd";
import {
  BellOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ClockCircleTwoTone,
  MessageTwoTone,
} from "@ant-design/icons";
import { 
  getReviewReminders, 
  getUserRequestsLibrary,
  getNotifications,
  dismissReviewReminder,
  getProfile,
} from "../api";
import "./GlobalNotifier.css";

const { Text } = Typography;

/**
 * Global notification system for the user side (Drawer + real-time alerts + detail modals)
 */
function GlobalNotifier() {
  const { useBreakpoint } = Grid;
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem("notifications");
    return stored ? JSON.parse(stored) : [];
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, data: null });
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const lastKnownIds = useRef(new Set());
  const screens = useBreakpoint();

  // Drawer auto width (mobile friendly)
  const drawerWidth = screens.lg ? 400 : "90%";

  useEffect(() => {
    const tokenLocal =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    (async () => {
      // Try to read notification preferences from the server
      if (tokenLocal) {
        try {
          const res = await getProfile(tokenLocal);
          const user = res?.data || res;
          const inApp =
            user?.preferences?.notifications?.inApp !== undefined
              ? !!user.preferences.notifications.inApp
              : true;
          setNotifEnabled(inApp);
        } catch (err) {
          console.warn("Load server notification prefs failed, fallback to local:", err?.message);
          try {
            const rawPrefs = localStorage.getItem("notification_prefs");
            const prefs = rawPrefs ? JSON.parse(rawPrefs) : { inApp: true };
            setNotifEnabled(prefs.inApp !== false);
          } catch {
            setNotifEnabled(true);
          }
        }
      } else {
        // Default to enabled if not logged in
        setNotifEnabled(true);
      }
      // Initialize known ID set
      try {
        const rawIds = localStorage.getItem("notificationKnownIds");
        const arr = rawIds ? JSON.parse(rawIds) : [];
        lastKnownIds.current = new Set(arr);
      } catch {
        lastKnownIds.current = new Set();
      }
    })();
  }, []);

  /* =========================================================
     📬 Fetch all notifications (Requests, Reminders, System)
     ========================================================= */
  const refreshNotifications = useCallback(async () => {
    if (!token || !notifEnabled) return;

    try {
      const [requestsRes, remindersRes, systemRes] = await Promise.all([
        getUserRequestsLibrary(token),
        getReviewReminders(token),
        getNotifications(token),
      ]);

      const all = [];

      // 1. Requests
      if (Array.isArray(requestsRes.data)) {
        requestsRes.data.forEach((r) => {
          if (r.status === "pending") return; // Skip pending
          all.push({
            id: `req-${r._id}`,
            type: r.status === "approved" ? "success" : "error",
            title: r.status === "approved" ? "Request Approved" : "Request Rejected",
            message:
              r.type === "renew"
                ? `Your renewal request for "${r.bookTitle}" was ${r.status}.`
                : `Your return request for "${r.bookTitle}" was ${r.status}.`,
            time: r.handledAt || r.updatedAt,
            data: r,
          });
        });
      }

      // 2. Review Reminders
      if (Array.isArray(remindersRes.data)) {
        remindersRes.data.forEach((rem) => {
          all.push({
            id: `rem-${rem.bookId}`,
            type: "info",
            title: "Book Review Reminder",
            message: `You recently returned "${rem.bookTitle}". Would you like to leave a review?`,
            time: rem.returnDate,
            data: rem,
            isReview: true,
          });
        });
      }

      // 3. System Notifications
      if (Array.isArray(systemRes.data)) {
        systemRes.data.forEach((sn) => {
          all.push({
            id: `sys-${sn._id}`,
            type: sn.type || "info",
            title: sn.title || "System Message",
            message: sn.message,
            time: sn.createdAt,
            data: sn,
            read: sn.isRead,
          });
        });
      }

      // Sort by time descending
      all.sort((a, b) => new Date(b.time) - new Date(a.time));

      // Check for new notifications to trigger popups
      all.forEach((n) => {
        if (!lastKnownIds.current.has(n.id)) {
          notification[n.type === "success" ? "success" : "info"]({
            message: n.title,
            description: n.message,
            placement: "topRight",
          });
          lastKnownIds.current.add(n.id);
        }
      });

      setNotifications(all);
      setUnreadCount(all.filter((n) => !n.read).length);

      // Persist to local storage
      localStorage.setItem("notifications", JSON.stringify(all));
      localStorage.setItem(
        "notificationKnownIds",
        JSON.stringify(Array.from(lastKnownIds.current))
      );
    } catch (err) {
      console.error("Refresh notifications failed:", err);
    }
  }, [token, notifEnabled]);

  /* =========================================================
     ⏱️ Polling (refresh every 60s)
     ========================================================= */
  useEffect(() => {
    if (!token || !notifEnabled) return;
    // 首次进入立刻拉取
    refreshNotifications();

    // 缩短轮询间隔至 15s，加快提醒触达
    const timer = setInterval(refreshNotifications, 15000);

    // 在窗口重新获得焦点或页面从隐藏变为可见时，立即刷新一次
    const onFocus = () => refreshNotifications();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshNotifications();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token, notifEnabled, refreshNotifications]);

  /* =========================================================
     📨 Open detail modal
     ========================================================= */
  const openDetail = (item) => {
    setDetailModal({ open: true, data: item });
    setUnreadCount(0);
    // ✅ 关闭列表 Drawer，实现“互斥弹窗”体验
    setDrawerOpen(false);

    // ✅ 将当前列表全部记为已知，防止轮询后红点再次出现
    try {
      notifications.forEach((n) => lastKnownIds.current.add(n._id));
      localStorage.setItem(
        "notificationKnownIds",
        JSON.stringify(Array.from(lastKnownIds.current))
      );
    } catch (err) {
      console.error("Failed to persist notification known ids on openDetail", err);
    }
  };

  // 📝 写书评弹窗状态
  const [reviewModal, setReviewModal] = useState({ open: false, bookId: null, bookTitle: "" });

  // ✅ 将书评提醒标记为已读（不填写）
  const markReviewReminderAsRead = async (item) => {
    try {
      if (token && item?.bookId) {
        await dismissReviewReminder(item.bookId, token);
      }
    } catch (err) {
      console.warn("Server-side dismiss failed, falling back to local mark:", err?.response?.data || err?.message);
      try {
        const key = `review:${item.bookId}`;
        const raw = localStorage.getItem("notificationKnownIds");
        const arr = raw ? JSON.parse(raw) : [];
        if (!arr.includes(key)) arr.push(key);
        localStorage.setItem("notificationKnownIds", JSON.stringify(arr));
      } catch { /* ignore */ }
    }
    try {
      const filtered = (notifications || []).filter(
        (n) => !(n.isReviewReminder && (n.bookId === item.bookId))
      );
      setNotifications(filtered);
      localStorage.setItem("notifications", JSON.stringify(filtered));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to update local notification state after dismiss", err);
    }
  };

  /* =========================================================
     🧩 Drawer content
     ========================================================= */
  const renderDrawerContent = () => {
    if (!notifications.length) {
      return (
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: "15px" }}>
                No new notifications 📭
              </Text>
            }
          />
        </div>
      );
    }

    return (
      <List
        className="notif-list"
        dataSource={notifications}
        renderItem={(item) => (
          <List.Item
            className={`notif-item ${item.status || "pending"}`}
            key={item._id}
            onClick={() => openDetail(item)}
            style={{
              background:
                item.status === "approved"
                  ? "rgba(82,196,26,0.05)"
                  : item.status === "rejected"
                  ? "rgba(255,77,79,0.05)"
                  : "rgba(250,173,20,0.05)",
              borderRadius: "8px",
              marginBottom: "10px",
              padding: "12px",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            {(() => {
              // System Notification
              if (item.isSystemNotification) {
                return (
                  <List.Item.Meta
                    avatar={
                      <MessageTwoTone twoToneColor="#1890ff" style={{ fontSize: 22 }} />
                    }
                    title={<b>{item.title}</b>}
                    description={
                      <>
                        <div>{item.description}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#999",
                            marginTop: 4,
                          }}
                        >
                          {item.time}
                        </div>
                      </>
                    }
                  />
                );
              }

              // 强制英文显示（如果是旧的本地存储中文提醒）
              const displayTitle = item.isReviewReminder
                ? `📝 Please write a review for "${item.bookTitle}"`
                : item.title;
              const displayDescription = item.isReviewReminder
                ? "You have returned this book. Share your thoughts (max 500 chars)."
                : item.description;
              return (
                <List.Item.Meta
                  avatar={
                    item.status === "approved" ? (
                      <CheckCircleTwoTone twoToneColor="#52c41a" style={{ fontSize: 22 }} />
                    ) : item.status === "rejected" ? (
                      <CloseCircleTwoTone twoToneColor="#ff4d4f" style={{ fontSize: 22 }} />
                    ) : (
                      <ClockCircleTwoTone twoToneColor="#faad14" style={{ fontSize: 22 }} />
                    )
                  }
                  title={<b>{displayTitle}</b>}
                  description={
                    <>
                      <div>{displayDescription}</div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#999",
                          marginTop: 4,
                        }}
                      >
                        {item.time}
                      </div>
                      {item.isReviewReminder && (
                        <div style={{ marginTop: 8 }}>
                          <Button
                            type="link"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReviewModal({
                                open: true,
                                bookId: item.bookId,
                                bookTitle: item.bookTitle,
                              });
                              setUnreadCount(0);
                            }}
                          >
                            Write a review now
                          </Button>
                          <Button
                            type="link"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReviewReminderAsRead(item);
                            }}
                          >
                            Skip (mark as read)
                          </Button>
                        </div>
                      )}
                    </>
                  }
                />
              );
            })()}
          </List.Item>
        )}
      />
    );
  };

  /* =========================================================
     📄 Notification detail modal
     ========================================================= */
  const renderDetailModal = () => {
    const n = detailModal.data;
    if (!n) return null;

    if (n.isSystemNotification) {
      return (
        <Modal
          open={detailModal.open}
          title="🔔 Notification Details"
          onCancel={() => setDetailModal({ open: false, data: null })}
          footer={[
            <Button
              key="close"
              type="primary"
              onClick={() => setDetailModal({ open: false, data: null })}
            >
              Close
            </Button>,
          ]}
          centered
        >
          <p>
            <b>Title:</b> {n.title}
          </p>
          <p>
            <b>Message:</b> {n.description}
          </p>
          <p>
            <b>Received At:</b> {new Date(n.createdAt || n.time).toLocaleString()}
          </p>
        </Modal>
      );
    }

    return (
      <Modal
        open={detailModal.open}
        title="📄 Request Details"
        onCancel={() => setDetailModal({ open: false, data: null })}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setDetailModal({ open: false, data: null })}
          >
            Close
          </Button>,
        ]}
        centered
      >
        <p>
          <b>Book:</b> {n.bookTitle}
        </p>
        <p>
          <b>Type:</b>{" "}
          {n.type === "renew" ? (
            <Tag color="blue">Renew Request</Tag>
          ) : (
            <Tag color="purple">Return Request</Tag>
          )}
        </p>
        <p>
          <b>Status:</b>{" "}
          {n.status === "approved" ? (
            <Tag color="green">Approved</Tag>
          ) : n.status === "rejected" ? (
            <Tag color="red">Rejected</Tag>
          ) : (
            <Tag color="default">Pending</Tag>
          )}
        </p>
        <p>
          <b>Requested At:</b>{" "}
          {new Date(n.createdAt || n.time).toLocaleString()}
        </p>
        <p>
          <b>Updated At:</b>{" "}
          {new Date(n.updatedAt || n.time).toLocaleString()}
        </p>
        {n.reason && (
          <p style={{ color: "#ff4d4f" }}>
            <b>Rejection Reason:</b> {n.reason}
          </p>
        )}
      </Modal>
    );
  };

  // ✅ 统一的“全部标为已读”逻辑
  const markAllAsRead = () => {
    setUnreadCount(0);
    try {
      notifications.forEach((n) => lastKnownIds.current.add(n._id));
      localStorage.setItem(
        "notificationKnownIds",
        JSON.stringify(Array.from(lastKnownIds.current))
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  if (!notifEnabled) {
    return null;
  }

  return (
    <>
      {/* 🔔 Bell icon */}
      <div className="global-notifier-bell" style={{ zIndex: 2000 }}>
        <Tooltip title="System Notifications">
          <Badge count={unreadCount} overflowCount={9}>
            <Button
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 18 }} />}
              onClick={() => {
                setDrawerOpen(true);
                // 仅清零计数，不持久化已读ID
                setUnreadCount(0);
              }}
            />
          </Badge>
        </Tooltip>
      </div>

      {/* 🧭 Drawer notification list */}
      <Drawer
        title="📢 Notification Center"
        placement="right"
        width={drawerWidth}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          // 仅清零计数，不持久化已读ID
          setUnreadCount(0);
        }}
        destroyOnClose
      >
        {renderDrawerContent()}
        {notifications.length > 0 && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Button type="link" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          </div>
        )}
      </Drawer>

      {/* 📄 Notification detail modal */}
      {renderDetailModal()}

      {/* 📝 Review modal */}
      {reviewModal.open && (
        <ModalPortal
          reviewModal={reviewModal}
          setReviewModal={setReviewModal}
          token={token}
          notifications={notifications}
          setNotifications={setNotifications}
          setUnreadCount={setUnreadCount}
        />
      )}
    </>
  );
}

// 将 ReviewModal 以简易 Portal 使用，避免循环导入
import ReviewModal from "./ReviewModal";
function ModalPortal({ reviewModal, setReviewModal, token, notifications, setNotifications, setUnreadCount }) {
  return (
    <ReviewModal
      open={reviewModal.open}
      onClose={() => setReviewModal({ open: false, bookId: null, bookTitle: "" })}
      bookId={reviewModal.bookId}
      bookTitle={reviewModal.bookTitle}
      token={token}
      onSubmitted={() => {
        // 书评提交后，移除该提醒项（防止再次出现），并立即更新列表
        try {
          const key = `review:${reviewModal.bookId}`;
          const raw = localStorage.getItem("notificationKnownIds");
          const arr = raw ? JSON.parse(raw) : [];
          if (!arr.includes(key)) arr.push(key);
          localStorage.setItem("notificationKnownIds", JSON.stringify(arr));

          const filtered = (notifications || []).filter(
            (n) => !(n.isReviewReminder && (n.bookId === reviewModal.bookId || n._id === key))
          );
          setNotifications(filtered);
          localStorage.setItem("notifications", JSON.stringify(filtered));
          setUnreadCount(0);
        } catch (err) {
          console.error("Failed to handle review submit notification cleanup", err);
        }
      }}
    />
  );
}

export default GlobalNotifier;
