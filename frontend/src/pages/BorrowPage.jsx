// ✅ client/src/pages/BorrowPage.jsx
import { useEffect, useState, useMemo } from "react";
import {
  List,
  Card,
  Button,
  Spin,
  DatePicker,
  Modal,
  message,
  Tag,
  Typography,
  Statistic,
  Empty,
  Table,
  Space,
  Row,
  Col,
  Tooltip
} from "antd";
import {
  ReloadOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  RollbackOutlined,
  CalendarOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "./BorrowPage.css";
import { Grid } from "antd";
import {
  getBorrowedBooksLibrary,
  requestRenewLibrary,
  requestReturnLibrary,
  getUserRequestsLibrary,
} from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";
import { theme } from "../styles/theme";

function BorrowPage({ appearance }) {
  const { t } = useLanguage();
  const isHighContrast = appearance?.highContrast;
  const { Title, Text } = Typography;
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renewModal, setRenewModal] = useState({ open: false, record: null });
  const [returnModal, setReturnModal] = useState({ open: false, record: null });
  const [newDate, setNewDate] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [localPendingRenew, setLocalPendingRenew] = useState([]);
  const [localPendingReturn, setLocalPendingReturn] = useState([]);
  
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // Statistics
  const stats = useMemo(() => {
    const total = borrowed.length;
    const pending = pendingRequests.filter((r) => r.status === "pending").length;
    // Calculate overdue
    const overdue = borrowed.filter(b => {
      return b.dueDate && dayjs(b.dueDate).endOf('day').isBefore(dayjs());
    }).length;
    
    return { total, pending, overdue };
  }, [borrowed, pendingRequests]);

  /* =========================================================
     Helpers
     ========================================================= */
  const getBookId = (record) => {
    return typeof record.bookId === "object"
      ? record.bookId?._id
      : record.bookId || record._id;
  };

  const getBookTitle = (record) => {
    return record.title || record.bookTitle || t("common.unknown");
  };

  /* =========================================================
     Status Logic
     ========================================================= */
  const getLatestRequestStatus = (bookId) => {
    const idStr = String(bookId);
    if (localPendingRenew.includes(idStr)) return "pending";
    const req = pendingRequests.find(
      (r) => String(r.bookId) === idStr && r.status === 'pending'
    );
    return req?.status || null;
  };

  const renderStatusTag = (record) => {
    const bookId = getBookId(record);
    const idStr = String(bookId);
    
    // Check pending requests
    const pendingReq = pendingRequests.find(r => String(r.bookId) === idStr && r.status === 'pending');
    const isRenewPending = localPendingRenew.includes(idStr) || (pendingReq && pendingReq.type === 'renew');
    const isReturnPending = localPendingReturn.includes(idStr) || (pendingReq && pendingReq.type === 'return');
    
    if (isRenewPending) return <Tag color="gold" icon={<ClockCircleOutlined />}>{t("borrow.renewPending")}</Tag>;
    if (isReturnPending) return <Tag color="orange" icon={<ClockCircleOutlined />}>{t("borrow.returnPending")}</Tag>;
    
    // Check overdue
    const isOverdue = record.dueDate && dayjs(record.dueDate).endOf('day').isBefore(dayjs());
    if (isOverdue) return <Tag color="error" icon={<WarningOutlined />}>{t("borrow.overdue")}</Tag>;

    return <Tag color="processing">{t("borrow.active")}</Tag>;
  };

  /* =========================================================
     Fetch Data
     ========================================================= */
  const fetchBorrowedBooks = async () => {
    if (!token) {
      message.error(t("common.loginFirst"));
      return;
    }
    try {
      setLoading(true);
      const [resBorrowed, resRequests] = await Promise.all([
        getBorrowedBooksLibrary(token),
        getUserRequestsLibrary(token),
      ]);

      const activeBorrowed = (resBorrowed.data || []).filter((r) => !r.returned);
      setBorrowed(activeBorrowed);
      setPendingRequests(resRequests.data || []);
    } catch (err) {
      console.error("Failed to fetch records:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedBooks();
  }, []);

  /* =========================================================
     Actions
     ========================================================= */
  const openRenewModal = (record) => {
    setRenewModal({ open: true, record });
    const defaultNewDate = record?.dueDate
      ? dayjs(record.dueDate).add(7, "day")
      : dayjs();
    setNewDate(defaultNewDate);
  };

  const handleConfirmRenew = async () => {
    const record = renewModal.record;
    if (!record) return;
    const bookId = getBookId(record);
    
    if (!newDate) return message.warning(t("borrow.selectDate"));
    const maxDate = dayjs(record.dueDate).add(30, "day");
    if (newDate.isAfter(maxDate)) return message.warning(t("borrow.renewalLimit"));

    const idStr = String(bookId);
    setLocalPendingRenew((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));

    try {
      await requestRenewLibrary(
        {
          type: "renew",
          bookId: idStr,
          bookTitle: getBookTitle(record),
        },
        token
      );
      message.success(t("borrow.renewalSubmitted"));
      setRenewModal({ open: false, record: null });
      fetchBorrowedBooks();
    } catch (err) {
      const msg = err.response?.data?.message || t("borrow.submitFailed");
      message.error(msg);
      setLocalPendingRenew((prev) => prev.filter((x) => x !== idStr));
    }
  };

  const openReturnModal = (record) => {
    setReturnModal({ open: true, record });
  };

  const handleConfirmReturn = async () => {
    const record = returnModal.record;
    if (!record) return;
    const bookId = getBookId(record);
    const idStr = String(bookId);
    
    setLocalPendingReturn((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));

    try {
      await requestReturnLibrary(
        {
          type: "return",
          bookId: idStr,
          bookTitle: getBookTitle(record),
        },
        token
      );
      message.success(t("borrow.returnSubmitted"));
      setReturnModal({ open: false, record: null });
      fetchBorrowedBooks();
    } catch (err) {
      const msg = err.response?.data?.message || t("borrow.submitFailed");
      message.error(msg);
      setLocalPendingReturn((prev) => prev.filter((x) => x !== idStr));
    }
  };

  /* =========================================================
     Render
     ========================================================= */
  const isPendingUI = (record) => {
    const bookId = getBookId(record);
    const idStr = String(bookId);
    const pendingReq = pendingRequests.find(r => String(r.bookId) === idStr && r.status === 'pending');
    return (
      localPendingRenew.includes(idStr) ||
      localPendingReturn.includes(idStr) ||
      !!pendingReq
    );
  };

  const columns = [
    {
      title: t("common.bookTitle"),
      dataIndex: 'title',
      key: 'title',
      width: '40%',
      render: (text, record) => {
        const bookId = getBookId(record);
        return (
          <Space direction="vertical" size={0}>
            <Link to={`/book/${bookId}`} style={{ fontWeight: 600, color: theme.token.colorPrimary, fontSize: 15 }}>
              {getBookTitle(record)}
            </Link>
            {/* Optional: Add Author if available in record */}
          </Space>
        );
      }
    },
    {
      title: t("borrow.dueDate"),
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => (
        <Space>
          <CalendarOutlined style={{ color: '#8c8c8c' }} />
          <Text>{date ? dayjs(date).format("YYYY-MM-DD") : "N/A"}</Text>
        </Space>
      ),
      sorter: (a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf(),
    },
    {
      title: t("common.status"),
      key: 'status',
      render: (_, record) => renderStatusTag(record),
    },
    {
      title: t("common.action"),
      key: 'action',
      render: (_, record) => {
        const pending = isPendingUI(record);
        return (
          <Space>
            <Tooltip title={pending ? t("borrow.pending") : t("borrow.renewLoan")}>
              <Button
                size="small"
                type="text"
                icon={<SyncOutlined />}
                disabled={pending}
                onClick={() => openRenewModal(record)}
                style={{ color: pending ? undefined : theme.token.colorPrimary }}
              >
                {!isMobile && t("borrow.renew")}
              </Button>
            </Tooltip>
            <Tooltip title={pending ? t("borrow.pending") : t("borrow.requestReturn")}>
              <Button
                size="small"
                type="text"
                danger
                icon={<RollbackOutlined />}
                disabled={pending}
                onClick={() => openReturnModal(record)}
              >
                {!isMobile && t("borrow.return")}
              </Button>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  const renderMobileCard = (record) => {
    const pending = isPendingUI(record);
    return (
      <div key={record._id} className="card-clean" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <Link to={`/book/${getBookId(record)}`}>
              <Title level={5} className="text-clamp-2" style={{ marginBottom: 4 }}>{getBookTitle(record)}</Title>
            </Link>
            <Space size={4} style={{ color: '#64748b', fontSize: 13 }}>
              <CalendarOutlined />
              <span>{t("borrow.due")}: {record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "N/A"}</span>
            </Space>
          </div>
          <div style={{ marginLeft: 12 }}>
            {renderStatusTag(record)}
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Button 
            block 
            icon={<SyncOutlined />} 
            disabled={pending}
            onClick={() => openRenewModal(record)}
          >
            {t("borrow.renew")}
          </Button>
          <Button 
            block 
            danger
            icon={<RollbackOutlined />} 
            disabled={pending}
            onClick={() => openReturnModal(record)}
          >
            {t("borrow.return")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* Header & KPIs */}
      <div style={{ marginBottom: 24 }}>
        <Row gutter={[24, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Title level={2} style={{ margin: 0, fontWeight: 600 }}>{t("titles.myBorrowings")}</Title>
            <Text type="secondary">{t("borrow.subtitle") || "Manage your active loans and requests"}</Text>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', gap: 24, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
              <Statistic 
                title={t("common.total")} 
                value={stats.total} 
                valueStyle={{ fontWeight: 600 }}
                titleStyle={{ fontSize: 12, color: '#8c8c8c' }}
              />
              <Statistic 
                title={t("borrow.overdue")} 
                value={stats.overdue} 
                valueStyle={{ fontWeight: 600, color: stats.overdue > 0 ? '#ff4d4f' : 'inherit' }}
                titleStyle={{ fontSize: 12, color: '#8c8c8c' }}
              />
              <Statistic 
                title={t("common.pending")} 
                value={stats.pending} 
                valueStyle={{ fontWeight: 600, color: stats.pending > 0 ? '#faad14' : 'inherit' }}
                titleStyle={{ fontSize: 12, color: '#8c8c8c' }}
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* Main Content */}
      <div className={isMobile ? "" : "card-clean"} style={!isMobile ? { padding: 0, overflow: 'hidden' } : {}}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        ) : borrowed.length > 0 ? (
          isMobile ? (
            <div>{borrowed.map(renderMobileCard)}</div>
          ) : (
            <Table
              dataSource={borrowed}
              columns={columns}
              rowKey={(r) => r._id}
              pagination={false}
              size="middle"
            />
          )
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
            description={t("borrow.noBorrowings")} 
            style={{ margin: '40px 0' }}
          >
            <Link to="/search">
              <Button type="primary">{t("borrow.goBorrow")}</Button>
            </Link>
          </Empty>
        )}
      </div>

      {/* Renew Modal */}
      <Modal
        title={`${t("titles.applyRenew")}: ${renewModal.record ? getBookTitle(renewModal.record) : ""}`}
        open={renewModal.open}
        onCancel={() => setRenewModal({ open: false, record: null })}
        onOk={handleConfirmRenew}
        okText={t("common.submit")}
        cancelText={t("common.cancel")}
        centered
        destroyOnClose
      >
        <p style={{ marginBottom: 10 }}>{t("borrow.selectDate")}:</p>
        <DatePicker
          style={{ width: "100%" }}
          format="YYYY-MM-DD"
          value={newDate}
          onChange={(date) => setNewDate(date)}
          disabledDate={(date) => {
            if (!renewModal.record?.dueDate) return false;
            const min = dayjs(renewModal.record.dueDate);
            const max = dayjs(renewModal.record.dueDate).add(30, "day");
            return date.isBefore(min) || date.isAfter(max);
          }}
        />
      </Modal>

      {/* Return Modal */}
      <Modal
        title={t("borrow.confirmReturnTitle")}
        open={returnModal.open}
        onCancel={() => setRenewModal({ open: false, record: null })}
        onOk={handleConfirmReturn}
        okText={t("common.submit")}
        cancelText={t("common.cancel")}
        centered
        destroyOnClose
      >
        <p>{t("borrow.confirmReturnContent")}</p>
        {returnModal.record && (
           <p><strong>{getBookTitle(returnModal.record)}</strong></p>
        )}
      </Modal>
    </div>
  );
}

export default BorrowPage;
