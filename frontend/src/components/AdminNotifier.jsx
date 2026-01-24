// ✅ client/src/components/AdminNotifier.jsx
import { useEffect, useState, useRef } from "react";
import {
  Badge,
  Button,
  Tooltip,
  notification,
  Drawer,
  List,
  Empty,
  Avatar,
  Typography,
  Modal,
  Tag,
  Grid,
  QRCode,
} from "antd";
import {
  BellOutlined,
  ExclamationCircleTwoTone,
  UserOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { getAllRequests } from "../api";
import dayjs from "dayjs";
import "./AdminNotifier.css";

const { Text } = Typography;
const { useBreakpoint } = Grid;

function AdminNotifier() {
  const notifPrefs = (() => {
    try {
      const raw = localStorage.getItem("notification_prefs");
      return raw ? JSON.parse(raw) : { inApp: true };
    } catch { return { inApp: true }; }
  })();
  if (!notifPrefs.inApp) return null;
  const [requests, setRequests] = useState([]);
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastCountRef = useRef(0);
  const screens = useBreakpoint();

  /* =========================================================
     🧩 Get admin token and verify role
     ========================================================= */
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    const user =
      JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}") || {};
    setIsAdmin(user?.role === "Administrator");
  }, []);

  /* =========================================================
     📬 Fetch pending requests (admins only)
     ========================================================= */
  const fetchRequests = async () => {
    if (!token || !isAdmin) return;

    try {
      const res = await getAllRequests(token);
      const data = res.data || [];
      const pending = data.filter((r) => r.status === "pending");

      // ✅ If there are new requests, show a notification (only when count increases)
      if (pending.length > lastCountRef.current) {
        const newCount = pending.length - lastCountRef.current;
        notification.open({
          message: "📬 New user requests",
          description: `Added ${newCount} pending requests (total ${pending.length})`,
          placement: "bottomRight",
          duration: 5,
          icon: <ExclamationCircleTwoTone twoToneColor="#faad14" />,
          onClose: () => notification.destroy(),
        });
      }

      lastCountRef.current = pending.length;
      setRequests(pending);
      setUnread(pending.length);
    } catch (err) {
      // ✅ Not admin or insufficient permission → silent handling
      if (err?.response?.status === 403) {
        console.warn("⛔ Current user is not admin, stopped polling notifications.");
        setIsAdmin(false);
      } else {
        console.error("❌ Failed to fetch admin notifications:", err);
      }
    }
  };

  /* =========================================================
     ⏱️ Polling mechanism (refresh every 60 seconds)
     ========================================================= */
  useEffect(() => {
    if (!isAdmin) return;
    fetchRequests();
    const timer = setInterval(fetchRequests, 60000);
    return () => clearInterval(timer);
  }, [token, isAdmin]);

  /* =========================================================
     📱 Drawer responsive width
     ========================================================= */
  const drawerWidth = screens.lg ? 400 : "90%";

  /* =========================================================
     🧱 Render component
     ========================================================= */
  return (
    <>
      {/* 🔔 Fixed top-right notification button */}
      {isAdmin && (
        <div style={{ position: "fixed", top: 18, right: 24, zIndex: 2000 }}>
          <Tooltip title="User request notifications">
            <Badge count={unread} overflowCount={9}>
              <Button
                shape="circle"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => setDrawerOpen(true)}
              />
            </Badge>
          </Tooltip>
        </div>
      )}

      {/* 🗂️ Notification drawer */}
      <Drawer
        title="📢 User Request Notification Center"
        placement="right"
        width={drawerWidth}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setUnread(0);
        }}
        destroyOnClose
      >
        {requests.length > 0 ? (
          <List
            className="notif-list"
            dataSource={requests}
            renderItem={(item) => (
              <List.Item
                className="notif-item pending"
                key={item._id}
                style={{
                  background: "rgba(250,173,20,0.08)",
                  borderRadius: 8,
                  marginBottom: 10,
                  padding: 12,
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: "#faad14" }}
                    />
                  }
                  title={
                    <b>
                      {item.type === "renew" ? "🔁 Renew Request" : "📦 Return Request"}
                    </b>
                  }
                  description={
                    <>
                      <div>📘 {item.bookTitle || "Unknown Book"}</div>
                      <div>
                        👤 {item.userName}（{item.userId}）
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#999",
                          marginTop: 4,
                        }}
                      >
                        {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 15 }}>
                No new user requests 📭
              </Text>
            }
          />
        )}
      </Drawer>
    </>
  );
}

export default AdminNotifier;
