// ✅ client/src/pages/AdminProfilePage.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Avatar,
  Typography,
  Descriptions,
  Button,
  Tag,
  List,
  Space,
  Input,
  message,
  Table,
} from "antd";
import { UserOutlined, MailOutlined, EditOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
 import { getProfile, updateProfile, getPendingRequestsLibrary } from "../api";
 
 const { Title } = Typography;

const AdminProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const API_BASE = (
    import.meta.env.VITE_API_BASE?.trim() || window.location.origin
  ).replace(/\/$/, "");

  /* =========================================================
     🧩 Fetch admin profile
     ========================================================= */
  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setEmail(res.data.email || "");
    } catch (err) {
      console.error("❌ Failed to fetch admin info:", err);
      message.error("Failed to load profile, please re-login");
    }
  };

  /* =========================================================
     📨 Fetch pending requests (✅ /library/requests/admin)
     ========================================================= */
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/library/requests/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Backend returns BorrowRecord; normalize to BorrowRequest-like structure
      const pending = (res.data || [])
        .filter((r) => r.status === "pending" || r.returned === false)
        .map((r) => ({
          _id: r._id,
          userId: r.userId,
          userName: r.userName || "Unknown user",
          bookTitle: r.bookTitle || r.bookId?.title || "Unknown book",
          type: r.type || (r.returned === false ? "return" : "renew"),
          status: r.status || (r.returned === false ? "pending" : "approved"),
          createdAt: r.createdAt || r.borrowedAt,
          time: r.updatedAt || r.returnedAt || r.createdAt,
        }));

      setRequests(pending);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
      message.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchRequests();
  }, []);

  /* =========================================================
     ✏️ Update email
     ========================================================= */
  const handleUpdateEmail = async () => {
    try {
      await axios.put(
        `${API_BASE}/api/users/profile`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Email updated");
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error("❌ Failed to update email:", err);
      message.error("Failed to update email");
    }
  };

  /* =========================================================
     📸 Upload avatar
     ========================================================= */
  const handleUpload = async ({ file }) => {
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await axios.post(`${API_BASE}/api/users/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      message.success("Avatar updated 🎉");
      fetchProfile();
    } catch (err) {
      console.error("❌ Failed to upload avatar:", err);
      message.error("Failed to upload avatar");
    }
  };

  /* =========================================================
     📋 Pending requests table (with handled time)
     ========================================================= */
  const columns = [
    { title: "User", dataIndex: "userName", key: "userName" },
    { title: "User ID", dataIndex: "userId", key: "userId" },
    {
      title: "Book Title",
      dataIndex: "bookTitle",
      key: "bookTitle",
      render: (v) => v || "Unknown book",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (v) =>
        v === "renew" ? (
          <Tag color="blue">Renew</Tag>
        ) : (
          <Tag color="purple">Return</Tag>
        ),
    },
    {
      title: "Request Time",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => (v ? new Date(v).toLocaleString() : "—"),
    },
    {
      title: "Handled At",
      dataIndex: "time",
      key: "time",
      render: (v) =>
        v ? (
          <span>{new Date(v).toLocaleString()}</span>
        ) : (
          <span style={{ color: "#aaa" }}>Not handled</span>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v) => (
        <Tag
          color={
            v === "pending"
              ? "orange"
              : v === "approved"
              ? "green"
              : "red"
          }
        >
          {v === "pending"
            ? "Pending"
            : v === "approved"
            ? "Approved"
            : "Rejected"}
        </Tag>
      ),
    },
  ];

  if (!profile) {
    return (
      <div style={{ textAlign: "center", marginTop: "4rem" }}>
        <Spin size="large" />
      </div>
    );
  }

  /* =========================================================
     🎨 页面结构渲染
     ========================================================= */
  return (
    <Card
      bordered={false}
      style={{
        maxWidth: 960,
        margin: "2rem auto",
        borderRadius: 20,
        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
        background: "#fff",
        padding: "2.5rem 3rem",
      }}
    >
      {/* 🧑‍💼 Top avatar + basic info */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 30,
          paddingBottom: 20,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Avatar
          size={120}
          src={
            profile.avatar ||
            "https://cdn-icons-png.flaticon.com/512/149/149071.png"
          }
          style={{ marginBottom: 20 }}
        />
        <Title level={3} style={{ marginBottom: 4 }}>
          {profile.name || "Admin"}
        </Title>
        <div style={{ color: "#888", marginBottom: 12 }}>
          Role: {profile.role}
        </div>

        <Upload
          showUploadList={false}
          customRequest={handleUpload}
          accept="image/*"
        >
          <Button icon={<UploadOutlined />} type="primary">
            Change Avatar
          </Button>
        </Upload>
      </div>

      {/* 📋 Email card */}
      <Card
        bordered
        style={{
          textAlign: "left",
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          marginBottom: 30,
          padding: "1rem 1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 500 }}>Email</span>
          <Space>
            {editing ? (
              <>
                <Input
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: 180 }}
                />
                <Button size="small" type="primary" onClick={handleUpdateEmail}>
                  Save
                </Button>
                <Button size="small" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span>{profile.email || "No email set"}</span>
                <Button size="small" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              </>
            )}
          </Space>
        </div>
      </Card>

      {/* 📨 Pending requests card */}
      <Card
        title={
          <span>
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            Pending Requests (total {requests.length})
          </span>
        }
        bordered
        style={{
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {loading ? (
          <Spin
            size="large"
            style={{ display: "block", margin: "2rem auto" }}
          />
        ) : (
          <Table
            dataSource={requests}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: "No pending requests 🎉" }}
          />
        )}
      </Card>
    </Card>
  );
};

export default AdminProfilePage;
