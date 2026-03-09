/**
 * Borrow Page
 * Manages active loans for the current user, providing renewal requests and overdue alerts.
 */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Typography, 
  Row, 
  Col, 
  Modal, 
  message,
  Skeleton,
  theme,
  Button,
  Card,
  InputNumber,
  Space
} from "antd";
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  ExclamationCircleOutlined,
  BookOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import Section from "../components/common/Section";
import LoanCard from "../components/common/LoanCard";
import StatCard from "../components/cards/StatCard";
import EmptyStateWarm from "../components/common/EmptyStateWarm";
import { 
  getBorrowedBooks, 
  getUserRequestsLibrary, 
  submitRequestLibrary 
} from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";

const { Title } = Typography;

const useBorrowData = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  
  const [loading, setLoading] = useState(true);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Modals
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [renewDays, setRenewDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        navigate('/login');
        return;
      }
      const [borrowedRes, requestsRes] = await Promise.all([
        getBorrowedBooks(token),
        getUserRequestsLibrary(token)
      ]);
      
      setBorrowedBooks(borrowedRes.data || []);
      setPendingRequests(requestsRes.data || []);
    } catch (error) {
      console.error("Error fetching borrow data:", error);
      setBorrowedBooks([]);
      setPendingRequests([]);
      // message.error("Failed to load borrowed books");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onFocus = () => fetchData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const timer = setInterval(fetchData, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(timer);
    };
  }, [fetchData]);

  const getDaysLeft = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    const due = dueDate ? dayjs(dueDate) : dayjs(borrowDate).add(30, 'day');
    const now = dayjs();
    return due.diff(now, 'day');
  };

  const getRequestStatus = (bookId) => {
    if (!bookId) return null;
    const targetId = String(bookId);
    const req = pendingRequests.find(
      (r) => String(r.bookId) === targetId && r.status === "pending"
    );
    return req ? req.type : null; // 'renew' or 'return'
  };

  const handleRenewClick = (book) => {
    setSelectedBook(book);
    setRenewDays(7);
    setRenewModalOpen(true);
  };

  const submitRenew = async (days = 7) => {
    if (!selectedBook) return;
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const bookId =
        selectedBook.bookId ||
        selectedBook.book_id ||
        selectedBook.id ||
        selectedBook._id;
      await submitRequestLibrary({
        type: 'renew',
        bookId,
        bookTitle: selectedBook.title,
        days
      }, token);
      
      message.success("Renew request submitted successfully");
      setRenewModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Renew error:", error);
      if (isBorrowLimitError(error)) {
        showBorrowLimitModal(t, modal);
        return;
      }
      const msg = extractErrorMessage(error);
      if (isBorrowLimitError(msg)) {
        showBorrowLimitModal(t, modal);
      } else {
        message.error(msg || "Failed to submit renew request");
      }
    }
  };

  const stats = useMemo(() => {
    const total = borrowedBooks.length;
    const pending = pendingRequests.filter(r => r.status === 'pending').length;
    const pendingRenew = pendingRequests.filter(r => r.status === 'pending' && r.type === 'renew').length;
    const overdue = borrowedBooks.filter(b => getDaysLeft(b.borrowDate, b.dueDate) < 0).length;
    return { total, pending, overdue, pendingRenew };
  }, [borrowedBooks, pendingRequests]);

  return {
    t,
    token,
    navigate,
    modal,
    contextHolder,
    loading,
    borrowedBooks,
    pendingRequests,
    renewModalOpen,
    selectedBook,
    stats,
    setRenewModalOpen,
    setSelectedBook,
    handleRenewClick,
    submitRenew,
    getRequestStatus,
    renewDays,
    setRenewDays,
  };
};

export const BorrowLeftPanel = () => {
  const {
    t,
    token,
    loading,
    borrowedBooks,
    stats,
    navigate,
    getRequestStatus,
  } = useBorrowData();

  const sampleBook = borrowedBooks[0];

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Title level={3} style={{ marginBottom: 8, fontFamily: "'Literata', serif" }}>
          {t("titles.myBorrowings") || "My Library"}
        </Title>
        <Typography.Text type="secondary">
          {t("history.subtitle") || "Keep an eye on your current loans and deadlines."}
        </Typography.Text>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <StatCard
          title={t("common.activeLoans") || "Active Loans"}
          value={stats.total}
          loading={loading}
          trend={12}
          trendLabel="Active"
        />
        <StatCard
          title={t("common.pendingRequests") || "Pending Requests"}
          value={stats.pending}
          loading={loading}
          color={token.colorWarning}
          trend={0}
          trendLabel="Processing"
        />
        <StatCard
          title={t("common.overdueBooks") || "Overdue"}
          value={stats.overdue}
          loading={loading}
          color={token.colorError}
          trend={-stats.overdue * 10}
          trendLabel="Need Attention"
        />
      </div>

      <div style={{ marginTop: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          Shortcuts
        </Typography.Text>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <Button icon={<BookOutlined />} onClick={() => navigate("/search")} block>
            Browse Collection
          </Button>
          <Button icon={<ClockCircleOutlined />} onClick={() => navigate("/return")} block>
            View History
          </Button>
        </div>
      </div>

      {sampleBook && (
        <div style={{ marginTop: "auto" }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Next due
          </Typography.Text>
          <Card
            bordered={false}
            style={{
              marginTop: 8,
              borderRadius: 14,
              background: token.colorBgContainer,
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            }}
          >
            <LoanCard
              compact
              book={{
                ...sampleBook,
                pendingType: getRequestStatus(
                  sampleBook.bookId || sampleBook._id || sampleBook.id
                ),
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export const BorrowRightPanel = () => {
  const {
    t,
    navigate,
    contextHolder,
    loading,
    borrowedBooks,
    stats,
    renewModalOpen,
    selectedBook,
    setRenewModalOpen,
    handleRenewClick,
    submitRenew,
    getRequestStatus,
    renewDays,
    setRenewDays,
  } = useBorrowData();

  return (
    <EditorialPageShell
      title="My Library"
      subtitle="Manage your borrowed books and track due dates."
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.myBooks") },
      ]}
    >
      {contextHolder}

      {stats.pendingRenew > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="warning">
            {t("borrow.pendingRenewNotice", {
              count: stats.pendingRenew,
            })}
          </Typography.Text>
        </div>
      )}

      <Section title={t("titles.currentBorrowings") || "Active Loans"} style={{ marginTop: 0 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : borrowedBooks.length > 0 ? (
          <Row gutter={[24, 24]}>
            {borrowedBooks.map((book) => (
              <Col span={24} key={book._id || book.id}>
                <LoanCard
                  book={{
                    ...book,
                    pendingType: getRequestStatus(book.bookId || book._id || book.id),
                  }}
                  onRenew={handleRenewClick}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <EmptyStateWarm
            title="No Active Loans"
            description="You haven't borrowed any books yet. Explore our collection to find something new!"
            actionLabel="Browse Books"
            onAction={() => navigate("/search")}
            icon={<BookOutlined />}
          />
        )}
      </Section>

      <Modal
        title="Renew Book"
        open={renewModalOpen}
        onOk={() => submitRenew(renewDays)}
        onCancel={() => setRenewModalOpen(false)}
        okText="Confirm Renewal"
        centered
      >
        <p>
          Would you like to request a renewal for{" "}
          <strong>{selectedBook?.title}</strong>?
        </p>
        <div style={{ marginTop: 8 }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text strong>
              {t("borrow.renewDaysLabel") || "Renewal days"}
            </Typography.Text>
            <div>
              <InputNumber
                min={1}
                max={30}
                value={renewDays}
                onChange={(v) => setRenewDays(Number(v || 7))}
              />
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                {t("borrow.renewDaysDesc") || "Choose how many extra days you want to renew (1-30)"}
              </Typography.Text>
            </div>
          </Space>
        </div>
      </Modal>
    </EditorialPageShell>
  );
};

const BorrowPage = () => {
  return <BorrowRightPanel />;
};

export default BorrowPage;
