// ✅ client/src/pages/AdminBorrowPage.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Input,
  Space,
  Modal,
  message,
  Select,
  Typography,
  Tooltip,
  Segmented,
  Statistic,
  Divider,
  Empty,
} from "antd";
import "./AdminBorrowPage.css";
import { theme, themeUtils } from "../styles/theme";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getAllRequestsLibrary as getAllRequests,
  approveRequestLibrary as approveRequest,
} from "../api.js";

const { Option } = Select;
const { Title, Text } = Typography;

const STATUS_INFO = {
  approved: { color: "green", icon: <CheckCircleOutlined />, text: "Approved" },
  rejected: { color: "red", icon: <CloseCircleOutlined />, text: "Rejected" },
  invalid: { color: "default", icon: <ExclamationCircleOutlined />, text: "Invalid" },
  pending: { color: "gold", icon: <ClockCircleOutlined />, text: "Pending" },
};

function AdminBorrowPage() {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const approvalPrefs = (() => {
    try {
      const raw = localStorage.getItem("admin_approval_prefs");
      return raw ? JSON.parse(raw) : { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: "approve", soundEnabled: true };
    } catch { return { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: "approve", soundEnabled: true }; }
  })();

  const beep = () => {
    if (!approvalPrefs.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  // ✅ v5 推荐写法：使用 useModal
  const [modal, contextHolder] = Modal.useModal();

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    const invalid = requests.filter((r) => r.status === "invalid").length;
    return { total, pending, approved, rejected, invalid };
  }, [requests]);

  /* =========================================================
     ✅ Fetch all renew/return requests (admin only)
     ========================================================= */
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await getAllRequests(token);
      const data = res.data || [];
      // 🧩 Sort by createdAt, newest first
      data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRequests(data);
      setFiltered(data);
      console.log("📥 Admin fetched requests:", data.length);
    } catch (err) {
      console.error("❌ Failed to fetch requests:", err);
      const msg = err.response?.data?.message || "Failed to load requests";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🔍 Search / filter logic
     ========================================================= */
  useEffect(() => {
    let data = [...requests];
    if (searchText.trim()) {
      data = data.filter(
        (r) =>
          r.userName?.toLowerCase().includes(searchText.toLowerCase()) ||
          r.bookTitle?.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (filterType !== "all") data = data.filter((r) => r.type === filterType);
    if (filterStatus !== "all")
      data = data.filter((r) => r.status === filterStatus);
    setFiltered(data);
  }, [searchText, filterType, filterStatus, requests]);

  /* =========================================================
     ✅ Approve request (with instant refresh)
     ========================================================= */
  const handleApprove = (record) => {
    console.log("🟢 Approve clicked", record._id, record.type);

    modal.confirm({
      centered: true,
      title: `Confirm approving this ${record.type === "renew" ? "renew" : "return"} request?`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          User: <b>{record.userName}</b>
          <br />
          Book: <b>{record.bookTitle}</b>
          <br />
          Requested At: {dayjs(record.createdAt).format("YYYY-MM-DD HH:mm")}
        </div>
      ),
      okText: "Approve",
      cancelText: "Cancel",
      onOk: async () => {
        console.log("🚀 onOk triggered, sending approve request...");
        try {
          const res = await approveRequest(record._id, true, null, token);
          message.success(res.data?.message || "Approved ✅");
          beep();

          // ✅ Refresh immediately after approval
          await fetchRequests();
        } catch (err) {
          console.error("❌ Approval error:", err);
          message.error(err?.response?.data?.message || "Approval failed");
        }
      },
    });
  };

  /* =========================================================
     ❌ Reject request (with instant refresh)
     ========================================================= */
  const handleReject = (record) => {
    let reason = "";
    modal.confirm({
      centered: true,
      title: "Reject Request",
      icon: <CloseCircleOutlined style={{ color: "red" }} />,
      content: (
        <Input.TextArea
          placeholder="Enter rejection reason (optional)"
          onChange={(e) => (reason = e.target.value)}
          rows={3}
        />
      ),
      okText: "Confirm Reject",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const res = await approveRequest(record._id, false, reason, token);
          message.warning(res.data?.message || "Request rejected");
          beep();
          // ✅ Refresh immediately after rejection
          await fetchRequests();
        } catch (err) {
          console.error("❌ Reject failed:", err);
          message.error(err?.response?.data?.message || "Reject failed");
        }
      },
    });
  };

  const getStock = (r) => {
    const v = r.copies ?? r.available ?? r.availableCopies ?? r.stock;
    return typeof v === "number" ? v : null;
  };
  const getOverdue = (r) => {
    const v = r.overdueCount ?? r.overdue_times ?? r.overdueCount30d;
    return typeof v === "number" ? v : null;
  };

  const autoProcessEligible = async () => {
    const pend = filtered.filter((r) => r.status === "pending");
    for (const r of pend) {
      const stock = getStock(r);
      const overdue = getOverdue(r);
      if (r.type === "renew" && stock != null && stock > approvalPrefs.autoApproveWhenStockGt) {
        try { await approveRequest(r._id, true, null, token); beep(); } catch {}
      } else if (overdue != null && overdue > approvalPrefs.autoRejectWhenOverdueGt) {
        try { await approveRequest(r._id, false, "Auto-reject: overdue times exceeded", token); beep(); } catch {}
      }
    }
    await fetchRequests();
  };

  const bulkProcessPending = async () => {
    const pend = filtered.filter((r) => r.status === "pending");
    for (const r of pend) {
      try {
        if (approvalPrefs.defaultBulkAction === "approve") {
          await approveRequest(r._id, true, null, token);
        } else {
          await approveRequest(r._id, false, "Bulk reject", token);
        }
        beep();
      } catch {}
    }
    await fetchRequests();
  };

  /* =========================================================
     🏷️ Status rendering
     ========================================================= */
  const renderStatusTag = (status) => {
    const info = STATUS_INFO[status] || STATUS_INFO.pending;
    return (
      <Tag color={info.color} icon={info.icon} style={{ borderRadius: 8, fontWeight: 500, padding: "4px 8px", fontSize: "12px" }}>
        {info.text}
      </Tag>
    );
  };

  /* =========================================================
     📋 Table columns
     ========================================================= */
  const columns = [
    {
      title: "Username",
      dataIndex: "userName",
      key: "userName",
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ maxWidth: 160, display: "inline-block" }}>
            {text || "—"}
          </span>
        </Tooltip>
      ),
      ellipsis: true,
    },
    {
      title: "Book Title",
      dataIndex: "bookTitle",
      key: "bookTitle",
      render: (text) => (
        <Tooltip title={text}>
          <span style={{ maxWidth: 220, display: "inline-block" }}>
            {text || "—"}
          </span>
        </Tooltip>
      ),
      ellipsis: true,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (text) =>
        text === "renew" ? (
          <Tag color="blue">Renew</Tag>
        ) : (
          <Tag color="purple">Return</Tag>
        ),
      filters: [
        { text: "Renew", value: "renew" },
        { text: "Return", value: "return" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: renderStatusTag,
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Approved", value: "approved" },
        { text: "Rejected", value: "rejected" },
        { text: "Invalid", value: "invalid" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Requested At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => (t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Handled At",
      dataIndex: "handledAt",
      key: "handledAt",
      render: (t) =>
        t ? (
          <span>{dayjs(t).format("YYYY-MM-DD HH:mm")}</span>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
      sorter: (a, b) => new Date(a.handledAt || 0) - new Date(b.handledAt || 0),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (text, record) =>
        record.status === "rejected" || record.status === "invalid" ? (
          <Tooltip title={text || "No reason provided"}>
            <span style={{ color: "#8c8c8c" }}>{text || "—"}</span>
          </Tooltip>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
      responsive: ["lg"],
    },
    {
      title: "Actions",
      key: "action",
      render: (_, record) => (
        <Space>
          <Button

            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record)}
            disabled={record.status !== "pending"}
          >
            ✅ Approve
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleReject(record)}
            disabled={record.status !== "pending"}
          >
            ❌ Reject
          </Button>
        </Space>
      ),
    },
  ];

  /* =========================================================
     🚀 页面初始化
     ========================================================= */
  useEffect(() => {
    fetchRequests();
  }, []);

  /* =========================================================
     🧱 页面渲染
     ========================================================= */
  return (
    <div className="admin-borrow-page" style={{ 
      padding: "2rem",
      background: theme.colors.background.main,
      minHeight: "calc(100vh - 64px)"
    }}>
      {contextHolder /* ✅ render modal context */}
      <Card
        style={{
          ...themeUtils.getCardStyle(),
          borderRadius: theme.borderRadius.xl
        }}
        title={
          <div className="page-header" style={{ marginBottom: "1rem" }}>
            <Title level={3} style={{ margin: 0, color: theme.colors.neutral.black, fontWeight: theme.typography.fontWeight.bold, fontFamily: theme.typography.fontFamily.primary }}>📋 Borrow Management</Title>
            <div style={{ marginBottom: "1.5rem" }}>
              <Text type="secondary" style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.neutral.darkGray, fontFamily: theme.typography.fontFamily.primary }}>Approve renewals and returns</Text>
            </div>
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
              <div style={{ 
                background: theme.colors.primary.gradient, 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg, 
                color: theme.colors.neutral.white,
                boxShadow: theme.shadows.lg
              }}>
                <Statistic 
                  title={<span style={{ color: theme.colors.neutral.white, fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>Total</span>} 
                  value={stats.total} 
                  valueStyle={{ color: theme.colors.neutral.white, fontSize: theme.typography.fontSize.xxl, fontWeight: theme.typography.fontWeight.bold }}
                />
              </div>
              <div style={{ 
                background: theme.colors.secondary.gradient, 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg, 
                color: theme.colors.neutral.white,
                boxShadow: theme.shadows.lg
              }}>
                <Statistic 
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>Pending</span>} 
                  value={stats.pending} 
                  valueStyle={{ color: "white", fontSize: "28px", fontWeight: 700 }}
                />
              </div>
              <div style={{ 
                background: `linear-gradient(135deg, ${theme.colors.status.success}, #059669)`, 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg, 
                color: theme.colors.neutral.white,
                boxShadow: theme.shadows.lg
              }}>
                <Statistic 
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>Approved</span>} 
                  value={stats.approved} 
                  valueStyle={{ color: "white", fontSize: "28px", fontWeight: 700 }}
                />
              </div>
              <div style={{ 
                background: `linear-gradient(135deg, ${theme.colors.status.error}, #dc2626)`, 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg, 
                color: theme.colors.neutral.white,
                boxShadow: theme.shadows.lg
              }}>
                <Statistic 
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>Rejected</span>} 
                  value={stats.rejected} 
                  valueStyle={{ color: "white", fontSize: "28px", fontWeight: 700 }}
                />
              </div>
              <div style={{ 
                background: theme.colors.neutral.lightGray, 
                borderRadius: theme.borderRadius.lg, 
                padding: theme.spacing.lg, 
                color: theme.colors.neutral.darkerGray,
                boxShadow: theme.shadows.lg
              }}>
                <Statistic 
                  title={<span style={{ color: "rgba(55,65,81,0.9)", fontSize: "14px" }}>Invalid</span>} 
                  value={stats.invalid} 
                  valueStyle={{ color: "#374151", fontSize: "28px", fontWeight: 700 }}
                />
              </div>
            </div>
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            style={{
              borderRadius: theme.borderRadius.lg,
              background: theme.colors.primary.gradient,
              border: "none",
              boxShadow: theme.shadows.md,
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
            }}
            onClick={fetchRequests}
            loading={loading}
          >
            🔄 Refresh
          </Button>
        }
      >
        <Space className="filters" style={{ marginBottom: "1rem" }} wrap>
          <Input
            placeholder="Search by username or book title"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ 
              width: 220,
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}
          />
          <Segmented
            value={filterType}
            onChange={setFilterType}
            options={[
              { label: "All", value: "all" },
              { label: "Renew", value: "renew" },
              { label: "Return", value: "return" },
            ]}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ 
              width: 140,
              borderRadius: 12
            }}
          >
            <Option value="all">All statuses</Option>
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="rejected">Rejected</Option>
            <Option value="invalid">Invalid</Option>
          </Select>
          <Button 
            onClick={() => { setSearchText(""); setFilterType("all"); setFilterStatus("all"); }}
            style={{
              borderRadius: 12,
              background: "linear-gradient(90deg, #8b5cf6, #7c3aed)",
              color: "white",
              border: "none",
              boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(139, 92, 246, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(139, 92, 246, 0.3)";
            }}
          >
            🔄 Reset
          </Button>
          <Button type="default" onClick={autoProcessEligible}>
            ⚙️ Auto Process Eligible
          </Button>
          <Button type="default" onClick={bulkProcessPending}>
            📦 Bulk Process Pending ({approvalPrefs.defaultBulkAction === "approve" ? "Approve" : "Reject"})
          </Button>
        </Space>

        <Divider style={{ margin: "12px 0" }} />

        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filtered}
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{
            pageSize: 8,
            showTotal: (t) => `Total ${t} requests`,
          }}
          size="middle"
          rowClassName={(record) => (record.status === "pending" ? "row-pending" : "")}
          locale={{ emptyText: <Empty description="No matching requests" /> }}
        />
      </Card>
    </div>
  );
}

export default AdminBorrowPage;
