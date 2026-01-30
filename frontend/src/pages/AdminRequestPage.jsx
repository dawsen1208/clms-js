// ✅ client/src/pages/AdminRequestPage.jsx
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
  List,
  Row,
  Col
} from "antd";
import "./AdminBorrowPage.css"; // Reuse CSS
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
const { Title, Text: AntText } = Typography;
const { useBreakpoint } = Grid;

const STATUS_INFO = {
  approved: { color: "green", icon: <CheckCircleOutlined /> },
  rejected: { color: "red", icon: <CloseCircleOutlined /> },
  invalid: { color: "default", icon: <ExclamationCircleOutlined /> },
  pending: { color: "gold", icon: <ClockCircleOutlined /> },
};

function AdminRequestPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  // 🆕 Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  
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
    // 🔄 Auto-exit batch mode on filter/search change
    if (isBatchMode) {
      setIsBatchMode(false);
      setSelectedRowKeys([]);
    }

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
          // approveRequestLibrary parameters: id, approve (bool), reason (string), token
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

  /* =========================================================
     ⚙️ Bulk Process Logic
     ========================================================= */
  const enterBatchMode = () => {
    setIsBatchMode(true);
    setSelectedRowKeys([]);
  };

  const exitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedRowKeys([]);
  };

  const executeBulkProcess = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t("admin.selectAtLeastOne"));
      return;
    }

    modal.confirm({
      centered: true,
      title: t("admin.bulkProcessTitle"),
      content: t("admin.bulkProcessContent").replace("{count}", selectedRowKeys.length),
      okText: t("admin.confirm"),
      cancelText: t("admin.cancel"),
      onOk: async () => {
        const hide = message.loading(t("admin.processing"), 0);
        let successCount = 0;
        let failCount = 0;

        try {
          const promises = selectedRowKeys.map(async (id) => {
             try {
                if (approvalPrefs.defaultBulkAction === "approve") {
                  await approveRequest(id, true, null, token);
                } else {
                  await approveRequest(id, false, t("admin.bulkReject"), token);
                }
                successCount++;
             } catch (e) {
                failCount++;
             }
          });

          await Promise.all(promises);

          if (failCount === 0) {
            message.success(t("admin.bulkSuccess").replace("{count}", successCount));
          } else {
            message.warning(
              t("admin.bulkPartialSuccess")
                .replace("{success}", successCount)
                .replace("{fail}", failCount)
            );
          }
          
          beep();
          await fetchRequests();
          exitBatchMode();
        } catch (err) {
          console.error("Bulk process error:", err);
        } finally {
          hide();
        }
      },
    });
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
     ✅ Row Selection for Batch Mode
     ========================================================= */
  const rowSelection = isBatchMode
    ? {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
        getCheckboxProps: (record) => ({
          disabled: record.status !== "pending",
        }),
      }
    : undefined;

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
    <div className="admin-request-page" style={{ padding: "1.5rem" }}>
      {contextHolder}
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
              {t("admin.applicationManagement") || "Application Management"}
            </Title>
            <AntText type="secondary" style={{ display: "block", marginTop: 8 }}>
              {t("admin.manageBorrowReturnRequests")}
            </AntText>
            
            {/* 📊 Statistics Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 8 }}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.totalRequests")}</span>} 
                    value={stats.total} 
                    prefix={<BookOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #faad14, #d48806)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(250, 173, 20, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.pending")}</span>} 
                    value={stats.pending} 
                    prefix={<ClockCircleOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.approved")}</span>} 
                    value={stats.approved} 
                    prefix={<CheckCircleOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(239, 68, 68, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.rejected")}</span>} 
                    value={stats.rejected} 
                    prefix={<CloseCircleOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Action Buttons Row */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 16 }}>
              <Button onClick={autoProcessEligible} disabled={isBatchMode}>
                {t("admin.autoProcess")}
              </Button>
              {isBatchMode && (
                <Button onClick={exitBatchMode}>
                  {t("admin.cancelBulkMode")}
                </Button>
              )}
              <Button type="primary" onClick={isBatchMode ? executeBulkProcess : enterBatchMode}>
                {isBatchMode 
                  ? `${t("admin.confirmBulkProcess")} (${selectedRowKeys.length})` 
                  : t("admin.bulkProcess")}
              </Button>
            </div>
          </div>
        }
        extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchRequests}
              loading={loading}
            >
              {t("admin.refresh")}
            </Button>
          }
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: "1.5rem" }}
      >
        {/* 🔍 Search & Filter */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("admin.searchPlaceholder")}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Segmented
            options={[
              { label: t("admin.all"), value: "all" },
              { label: t("admin.renew"), value: "renew" },
              { label: t("admin.return"), value: "return" },
            ]}
            value={filterType}
            onChange={setFilterType}
          />
          <Segmented
            options={[
              { label: t("admin.all"), value: "all" },
              { label: t("admin.pending"), value: "pending" },
              { label: t("admin.approved"), value: "approved" },
              { label: t("admin.rejected"), value: "rejected" },
            ]}
            value={filterStatus}
            onChange={setFilterStatus}
          />
        </div>

        {/* 📋 Requests Table */}
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `${t("admin.total")} ${total} ${t("admin.items")}` }}
          scroll={{ x: 800 }}
          rowSelection={rowSelection}
          onChange={(pagination, filters, sorter, extra) => {
            if (isBatchMode) exitBatchMode();
          }}
        />
      </Card>
    </div>
  );
}

export default AdminRequestPage;
