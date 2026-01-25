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
  Grid,
  List
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
  BookOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getAllRequestsLibrary as getAllRequests,
  approveRequestLibrary as approveRequest,
} from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

const { Option } = Select;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const STATUS_INFO = {
  approved: { color: "green", icon: <CheckCircleOutlined /> },
  rejected: { color: "red", icon: <CloseCircleOutlined /> },
  invalid: { color: "default", icon: <ExclamationCircleOutlined /> },
  pending: { color: "gold", icon: <ClockCircleOutlined /> },
};

function AdminBorrowPage() {
  const { t } = useLanguage();
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
      title: `${t("admin.confirmApproveTitle")} ${record.type === "renew" ? t("admin.renew") : t("admin.return")} ${t("admin.request")}`,
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          {t("admin.userLabel")}: <b>{record.userName}</b>
          <br />
          {t("admin.bookLabel")}: <b>{record.bookTitle}</b>
          <br />
          {t("admin.requestedAt")}: {dayjs(record.createdAt).format("YYYY-MM-DD HH:mm")}
        </div>
      ),
      okText: t("admin.approve"),
      cancelText: t("admin.cancel"),
      onOk: async () => {
        console.log("🚀 onOk triggered, sending approve request...");
        try {
          const res = await approveRequest(record._id, true, null, token);
          message.success(res.data?.message || t("admin.approvedSuccess"));
          beep();

          // ✅ Refresh immediately after approval
          await fetchRequests();
        } catch (err) {
          console.error("❌ Approval error:", err);
          message.error(err?.response?.data?.message || t("admin.approvalFailed"));
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
      title: t("admin.rejectTitle"),
      icon: <CloseCircleOutlined style={{ color: "red" }} />,
      content: (
        <Input.TextArea
          placeholder={t("admin.rejectReasonPlaceholder")}
          onChange={(e) => (reason = e.target.value)}
          rows={3}
        />
      ),
      okText: t("admin.reject"),
      cancelText: t("admin.cancel"),
      onOk: async () => {
        try {
          const res = await approveRequest(record._id, false, reason, token);
          message.success(res.data?.message || t("admin.requestRejected"));
          beep();
          // ✅ Refresh immediately after rejection
          await fetchRequests();
        } catch (err) {
          console.error("❌ Reject failed:", err);
          message.error(err?.response?.data?.message || t("admin.rejectFailed"));
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
        try { await approveRequest(r._id, false, t("admin.autoRejectOverdue"), token); beep(); } catch {}
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
          await approveRequest(r._id, false, t("admin.bulkReject"), token);
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
    let label = "";
    switch (status) {
      case "approved": label = t("admin.approved"); break;
      case "rejected": label = t("admin.rejected"); break;
      case "invalid": label = t("admin.invalid"); break;
      case "pending": default: label = t("admin.pending"); break;
    }
    return (
      <Tag color={info.color} icon={info.icon} style={{ borderRadius: 8, fontWeight: 500, padding: "4px 8px", fontSize: "12px" }}>
        {label}
      </Tag>
    );
  };

  /* =========================================================
     📋 Table columns
     ========================================================= */
  const columns = [
    {
      title: t("admin.username"),
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
      title: t("admin.bookTitle"),
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
      title: t("admin.type"),
      dataIndex: "type",
      key: "type",
      render: (text) =>
        text === "renew" ? (
          <Tag color="blue">{t("admin.renew")}</Tag>
        ) : (
          <Tag color="purple">{t("admin.return")}</Tag>
        ),
      filters: [
        { text: t("admin.renew"), value: "renew" },
        { text: t("admin.return"), value: "return" },
      ],
      onFilter: (value, record) => record.type === value,
    },
    {
      title: t("admin.status"),
      dataIndex: "status",
      key: "status",
      render: renderStatusTag,
      filters: [
        { text: t("admin.pending"), value: "pending" },
        { text: t("admin.approved"), value: "approved" },
        { text: t("admin.rejected"), value: "rejected" },
        { text: t("admin.invalid"), value: "invalid" },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: t("admin.requestedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (t) => (t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "—"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: t("admin.handledAt"),
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
      title: t("admin.reason"),
      dataIndex: "reason",
      key: "reason",
      render: (text, record) =>
        record.status === "rejected" || record.status === "invalid" ? (
          <Tooltip title={text || t("admin.noReason")}>
            <span style={{ color: "#8c8c8c" }}>{text || "—"}</span>
          </Tooltip>
        ) : (
          <span style={{ color: "#999" }}>—</span>
        ),
      responsive: ["lg"],
    },
    {
      title: t("admin.actions"),
      key: "action",
      render: (_, record) => (
        <Space>
          <Button

            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApprove(record)}
            disabled={record.status !== "pending"}
          >
            {t("admin.approve")}
          </Button>
          <Button
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleReject(record)}
            disabled={record.status !== "pending"}
          >
            {t("admin.reject")}
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
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("admin.borrowManage")}</Title>
            <div style={{ marginBottom: "1.5rem" }}>
              <Text type="secondary" style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.neutral.darkGray, fontFamily: theme.typography.fontFamily.primary }}>{t("admin.approveRenewals")}</Text>
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
                  title={<span style={{ color: theme.colors.neutral.white, fontSize: theme.typography.fontSize.sm, fontFamily: theme.typography.fontFamily.primary }}>{t("admin.total")}</span>} 
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
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>{t("admin.pending")}</span>} 
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
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>{t("admin.approved")}</span>} 
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
                  title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px" }}>{t("admin.rejected")}</span>} 
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
                  title={<span style={{ color: "rgba(55,65,81,0.9)", fontSize: "14px" }}>{t("admin.invalid")}</span>} 
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
            {t("admin.refresh")}
          </Button>
        }
      >
        <Space className="filters" style={{ marginBottom: "1rem" }} wrap>
          <Input
            placeholder={t("admin.searchUserOrBook")}
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
              { label: t("admin.all"), value: "all" },
              { label: t("admin.renew"), value: "renew" },
              { label: t("admin.return"), value: "return" },
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
            <Option value="all">{t("admin.allStatuses")}</Option>
            <Option value="pending">{t("admin.pending")}</Option>
            <Option value="approved">{t("admin.approved")}</Option>
            <Option value="rejected">{t("admin.rejected")}</Option>
            <Option value="invalid">{t("admin.invalid")}</Option>
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
            {t("admin.reset")}
          </Button>
          <Button type="default" onClick={autoProcessEligible}>
            {t("admin.autoProcess")}
          </Button>
          <Button type="default" onClick={bulkProcessPending}>
            {t("admin.bulkProcess")} ({approvalPrefs.defaultBulkAction === "approve" ? t("admin.approve") : t("admin.reject")})
          </Button>
        </Space>

        <Divider style={{ margin: "12px 0" }} />

        {isMobile ? (
          <List
            loading={loading}
            dataSource={filtered}
            pagination={{ pageSize: 8 }}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 16 }}>
                <Card
                  hoverable
                  style={{ width: "100%", borderRadius: 12 }}
                  actions={[
                    <Button
                      type="text"
                      icon={<CheckCircleOutlined />}
                      style={{ color: "green" }}
                      onClick={() => handleApprove(item)}
                      disabled={item.status !== "pending"}
                    >
                      {t("admin.approve")}
                    </Button>,
                    <Button
                      type="text"
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => handleReject(item)}
                      disabled={item.status !== "pending"}
                    >
                      {t("admin.reject")}
                    </Button>
                  ]}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", fontSize: "16px", maxWidth: "70%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.bookTitle}
                        </span>
                        {renderStatusTag(item.status)}
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 4 }}>
                          👤 {t("admin.username")}: {item.userName}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          📌 {t("admin.type")}:{" "}
                          {item.type === "renew" ? (
                            <Tag color="blue">{t("admin.renew")}</Tag>
                          ) : (
                            <Tag color="purple">{t("admin.return")}</Tag>
                          )}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          🕒 {t("admin.requestedAt")}: {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                        </div>
                        {(item.status === "rejected" || item.status === "invalid") && (
                          <div style={{ marginBottom: 4 }}>
                            ❓ {t("admin.reason")}: {item.reason || t("admin.noReason")}
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={filtered}
            loading={loading}
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 8,
              showTotal: (total) => `${t("admin.total")} ${total}`,
            }}
            size="middle"
            rowClassName={(record) => (record.status === "pending" ? "row-pending" : "")}
            locale={{ emptyText: <Empty description="No matching requests" /> }}
          />
        )}
      </Card>
    </div>
  );
}

export default AdminBorrowPage;
