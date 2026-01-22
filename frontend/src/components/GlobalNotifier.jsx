// ✅ client/src/components/GlobalNotifier.jsx
import { useEffect, useState, useRef } from "react";
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
} from "@ant-design/icons";
import { getBorrowHistory, getReviewReminders } from "../api";
import axios from "axios";
import "./GlobalNotifier.css";

const { Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * 🔔 用户端全局通知系统（Drawer + 实时提醒 + 详情弹窗）
 */
function GlobalNotifier() {
  const notifPrefs = (() => {
    try {
      const raw = localStorage.getItem("notification_prefs");
      return raw ? JSON.parse(raw) : { inApp: true };
    } catch { return { inApp: true }; }
  })();
  if (!notifPrefs.inApp) return null;
  const [notifications, setNotifications] = useState(() => {
    const stored = localStorage.getItem("notifications");
    return stored ? JSON.parse(stored) : [];
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, data: null });
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  const initialKnownIds = (() => {
    try {
      const raw = localStorage.getItem("notificationKnownIds");
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  })();
  const lastKnownIds = useRef(initialKnownIds);
  const screens = useBreakpoint();

  // ✅ Drawer auto width (mobile friendly)
  const drawerWidth = screens.lg ? 400 : "90%";

  /* =========================================================
     🌍 Auto-detect backend base URL
     ========================================================= */
  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/$/, "");

  /* =========================================================
     📬 Fetch user request status changes
     ========================================================= */
  const fetchNotifications = async () => {
    if (!token) return;

    try {
      const res = await axios.get(`${API_BASE}/api/library/request/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newReqs = res.data || [];

      // ✅ Filter non-pending (reviewed)
      const reviewed = newReqs.filter((req) => req.status !== "pending");

      // ✅ Find new notifications (compare with last known IDs)
      const newOnes = reviewed.filter((req) => !lastKnownIds.current.has(req._id));

      if (newOnes.length > 0) {
        newOnes.forEach((req) => lastKnownIds.current.add(req._id));
        // ✅ 持久化已知的通知ID，避免刷新后旧通知被再次计为未读
        try {
          localStorage.setItem(
            "notificationKnownIds",
            JSON.stringify(Array.from(lastKnownIds.current))
          );
        } catch {}

        const formatted = newOnes.map((req) => ({
          _id: req._id,
          status: req.status,
          type: req.type,
          bookTitle: req.bookTitle,
          reason: req.reason,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt,
          title:
            req.status === "approved" ? "✅ Request Approved" : "❌ Request Rejected",
          description:
            req.status === "approved"
              ? `Your ${req.type === "renew" ? "renew" : "return"} request ("${req.bookTitle}") has been approved.`
              : `Your ${req.type === "renew" ? "renew" : "return"} request ("${req.bookTitle}") was rejected. Reason: ${
                  req.reason || "No explanation provided by admin"
                }`,
          time: new Date(req.updatedAt || Date.now()).toLocaleString(),
        }));

        // ✅ Show real-time notifications
        formatted.forEach((n) =>
          notification.open({
            message: n.title,
            description: n.description,
            placement: "bottomRight",
            duration: 8,
            style: {
              borderRadius: "10px",
              background:
                n.status === "approved"
                  ? "rgba(82,196,26,0.1)"
                  : "rgba(255,77,79,0.1)",
            },
          })
        );

        // ✅ Update local cache
        const updated = [...formatted, ...notifications].slice(0, 30);
        setNotifications(updated);
        localStorage.setItem("notifications", JSON.stringify(updated));
        setUnreadCount((prev) => prev + formatted.length);
      }

      // 🔔 追加：书评提醒（用户归还但尚未评价）
      try {
        const remRes = await getReviewReminders(token);
        const reminders = remRes?.data || [];

        const newReminders = reminders
          .map((r) => ({
            _id: `review:${r._id}`,
            status: r.status || "info",
            type: r.type || "review",
            bookTitle: r.bookTitle,
            createdAt: r.createdAt,
            title: `📝 Please write a review for "${r.bookTitle}"`,
            description: "You have returned this book. Share your thoughts (max 500 chars).",
            time: new Date(r.createdAt || Date.now()).toLocaleString(),
            isReviewReminder: true,
            bookId: r.bookId || r._id,
          }))
          .filter((item) => !lastKnownIds.current.has(item._id));

        if (newReminders.length > 0) {
          newReminders.forEach((n) => lastKnownIds.current.add(n._id));
          try {
            localStorage.setItem(
              "notificationKnownIds",
              JSON.stringify(Array.from(lastKnownIds.current))
            );
          } catch {}

          newReminders.forEach((n) =>
            notification.open({
              message: n.title,
              description: n.description,
              placement: "bottomRight",
              duration: 8,
              style: {
                borderRadius: "10px",
                background: "rgba(24,144,255,0.1)",
              },
            })
          );

          const updated2 = [...newReminders, ...notifications].slice(0, 30);
          setNotifications(updated2);
          localStorage.setItem("notifications", JSON.stringify(updated2));
          setUnreadCount((prev) => prev + newReminders.length);
        }
      } catch (e) {
        console.warn("⚠️ 获取书评提醒失败:", e?.response?.data || e?.message);
      }
    } catch (err) {
      console.error("❌ Failed to fetch notifications:", err?.response?.data || err.message);
    }
  };

  /* =========================================================
     ⏱️ Polling (refresh every 60s)
     ========================================================= */
  useEffect(() => {
    if (!token) return;
    // 首次进入立刻拉取
    fetchNotifications();

    // 缩短轮询间隔至 15s，加快提醒触达
    const timer = setInterval(fetchNotifications, 15000);

    // 在窗口重新获得焦点或页面从隐藏变为可见时，立即刷新一次
    const onFocus = () => fetchNotifications();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  /* =========================================================
     📨 Open detail modal
     ========================================================= */
  const openDetail = (item) => {
    setDetailModal({ open: true, data: item });
    setUnreadCount(0);
    // ✅ 将当前列表全部记为已知，防止轮询后红点再次出现
    try {
      notifications.forEach((n) => lastKnownIds.current.add(n._id));
      localStorage.setItem(
        "notificationKnownIds",
        JSON.stringify(Array.from(lastKnownIds.current))
      );
    } catch {}
  };

  // 📝 写书评弹窗状态
  const [reviewModal, setReviewModal] = useState({ open: false, bookId: null, bookTitle: "" });

  // ✅ 将书评提醒标记为已读（不填写）
  const markReviewReminderAsRead = (item) => {
    try {
      const key = `review:${item.bookId}`;
      const raw = localStorage.getItem("notificationKnownIds");
      const arr = raw ? JSON.parse(raw) : [];
      if (!arr.includes(key)) arr.push(key);
      localStorage.setItem("notificationKnownIds", JSON.stringify(arr));

      const filtered = (notifications || []).filter(
        (n) => !(n.isReviewReminder && (n.bookId === item.bookId || n._id === key))
      );
      setNotifications(filtered);
      localStorage.setItem("notifications", JSON.stringify(filtered));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
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
    } catch {}
  };

  return (
    <>
      {/* 🔔 Bell icon (fixed top-right) */}
      <div style={{ position: "fixed", top: 18, right: 24, zIndex: 2000 }}>
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
        } catch {}
      }}
    />
  );
}

export default GlobalNotifier;
