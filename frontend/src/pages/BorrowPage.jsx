import React, { useEffect, useState, useMemo } from "react";
import { 
  Typography, 
  Row, 
  Col, 
  Modal, 
  message,
  Skeleton,
  theme
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
  requestRenewLibrary 
} from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";

const { Title } = Typography;

const BorrowPage = () => {
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      
      // TODO: Mock Data for Visual Refactoring (Remove in production)
      // If no data is returned, we inject some mock data to showcase the UI
      if ((!borrowedRes.data || borrowedRes.data.length === 0) && (!requestsRes.data || requestsRes.data.length === 0)) {
         console.log("Injecting mock data for visualization");
         const mockBooks = [
           { _id: 'm1', title: 'The Design of Everyday Things', author: 'Don Norman', borrowDate: dayjs().subtract(5, 'day').toISOString(), dueDate: dayjs().add(25, 'day').toISOString(), cover: '' },
           { _id: 'm2', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', borrowDate: dayjs().subtract(15, 'day').toISOString(), dueDate: dayjs().add(15, 'day').toISOString(), cover: '' },
           { _id: 'm3', title: 'Dune', author: 'Frank Herbert', borrowDate: dayjs().subtract(28, 'day').toISOString(), dueDate: dayjs().add(2, 'day').toISOString(), cover: '' }
         ];
         setBorrowedBooks(mockBooks);
         setPendingRequests([]);
      } else {
         setBorrowedBooks(borrowedRes.data || []);
         setPendingRequests(requestsRes.data || []);
      }
    } catch (error) {
      console.error("Error fetching borrow data:", error);
      // Mock data on error too for demo
      const mockBooks = [
         { _id: 'm1', title: 'The Design of Everyday Things', author: 'Don Norman', borrowDate: dayjs().subtract(5, 'day').toISOString(), dueDate: dayjs().add(25, 'day').toISOString(), cover: '' },
      ];
      setBorrowedBooks(mockBooks);
      // message.error("Failed to load borrowed books");
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    const due = dueDate ? dayjs(dueDate) : dayjs(borrowDate).add(30, 'day');
    const now = dayjs();
    return due.diff(now, 'day');
  };

  const getRequestStatus = (bookId) => {
    const req = pendingRequests.find(r => r.bookId === bookId && r.status === 'pending');
    return req ? req.type : null; // 'renew' or 'return'
  };

  const handleRenewClick = (book) => {
    setSelectedBook(book);
    setRenewModalOpen(true);
  };

  const submitRenew = async () => {
    if (!selectedBook) return;
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await requestRenewLibrary({
        type: 'renew',
        bookId: selectedBook._id || selectedBook.id,
        bookTitle: selectedBook.title
      }, token);
      
      message.success("Renew request submitted successfully");
      setRenewModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Renew error:", error);
      if (error.__borrowLimit) {
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
    const overdue = borrowedBooks.filter(b => getDaysLeft(b.borrowDate, b.dueDate) < 0).length;
    return { total, pending, overdue };
  }, [borrowedBooks, pendingRequests]);

  return (
    <EditorialPageShell
      title="My Library"
      subtitle="Manage your borrowed books and track due dates."
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.myBooks") }
      ]}
    >
      {contextHolder}

      {/* Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
        <Col xs={24} sm={8}>
          <StatCard 
            title={t("common.activeLoans") || "Active Loans"} 
            value={stats.total} 
            loading={loading}
            trend={12}
            trendLabel="Active Readings"
          />
        </Col>
        <Col xs={24} sm={8}>
           <StatCard 
            title={t("common.pendingRequests") || "Pending"} 
            value={stats.pending} 
            loading={loading}
            color={token.colorWarning}
            trend={0}
            trendLabel="Processing"
          />
        </Col>
        <Col xs={24} sm={8}>
           <StatCard 
            title={t("common.overdueBooks") || "Overdue"} 
            value={stats.overdue} 
            loading={loading}
            color={token.colorError}
            trend={-stats.overdue * 10}
            trendLabel="Needs Attention"
          />
        </Col>
      </Row>

      <Section title={t("titles.currentBorrowings") || "Active Loans"} style={{ marginTop: 0 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : borrowedBooks.length > 0 ? (
          <Row gutter={[24, 24]}>
            {borrowedBooks.map(book => (
              <Col span={24} key={book._id || book.id}>
                <LoanCard 
                  book={{
                    ...book,
                    pendingType: getRequestStatus(book._id || book.id)
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
            onAction={() => navigate('/search')}
            icon={<BookOutlined />}
          />
        )}
      </Section>

      {/* Renew Modal */}
      <Modal
        title="Renew Book"
        open={renewModalOpen}
        onOk={submitRenew}
        onCancel={() => setRenewModalOpen(false)}
        okText="Confirm Renewal"
        centered
      >
        <p>Would you like to request a renewal for <strong>{selectedBook?.title}</strong>?</p>
        <p>This will extend the due date by 7 days pending approval.</p>
      </Modal>
    </EditorialPageShell>
  );
};

export default BorrowPage;
