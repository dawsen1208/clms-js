import React, { useEffect, useState, useMemo } from "react";
import { 
  Typography, 
  Button, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Progress, 
  Space, 
  Modal, 
  message,
  Empty,
  Skeleton,
  DatePicker
} from "antd";
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  RollbackOutlined, 
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";
import { 
  getBorrowedBooks, 
  getUserRequestsLibrary, 
  requestRenewLibrary 
} from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";

const { Title, Text } = Typography;

const BorrowPage = () => {
  const { t } = useLanguage();
  const [modal, contextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(true);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Modals
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [renewDate, setRenewDate] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const [borrowedRes, requestsRes] = await Promise.all([
        getBorrowedBooks(token),
        getUserRequestsLibrary(token)
      ]);
      
      setBorrowedBooks(borrowedRes.data);
      setPendingRequests(requestsRes.data);
    } catch (error) {
      console.error("Error fetching borrow data:", error);
      message.error("Failed to load borrowed books");
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    // Fallback if no dueDate (assume 30 days)
    const due = dueDate ? dayjs(dueDate) : dayjs(borrowDate).add(30, 'day');
    const now = dayjs();
    return due.diff(now, 'day');
  };

  const getProgressPercent = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    const start = dayjs(borrowDate);
    const end = dueDate ? dayjs(dueDate) : start.add(30, 'day');
    const now = dayjs();
    const totalDuration = end.diff(start, 'hour');
    const elapsed = now.diff(start, 'hour');
    
    if (totalDuration === 0) return 0;
    const percent = (elapsed / totalDuration) * 100;
    return Math.min(Math.max(percent, 0), 100);
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

  const BorrowCard = ({ book }) => {
    const daysLeft = getDaysLeft(book.borrowDate, book.dueDate);
    const progress = getProgressPercent(book.borrowDate, book.dueDate);
    const pendingType = getRequestStatus(book._id || book.id);
    const isOverdue = daysLeft < 0;
    
    return (
      <Card 
        className="card-shadow"
        bordered={false}
        style={{ marginBottom: 16, borderRadius: 14 }}
        bodyStyle={{ padding: 24 }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} md={12}>
            <Title level={4} style={{ marginBottom: 4 }}>
              <Link to={`/book/${book._id || book.id}`} style={{ color: 'inherit' }}>
                {book.title}
              </Link>
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Borrowed on {dayjs(book.borrowDate).format("MMM D, YYYY")}
            </Text>
            
            <Space size={16} style={{ marginBottom: 16 }}>
               <Tag icon={<ClockCircleOutlined />} color={isOverdue ? "error" : daysLeft < 5 ? "warning" : "success"} style={{ fontSize: 14, padding: '4px 8px' }}>
                 {isOverdue ? `${Math.abs(daysLeft)} Days Overdue` : `${daysLeft} Days Left`}
               </Tag>
               {pendingType && (
                 <Tag color="processing" icon={<SyncOutlined spin />}>
                   {pendingType === 'renew' ? 'Renew Pending' : 'Pending'}
                 </Tag>
               )}
            </Space>
          </Col>
          
          <Col xs={24} md={6}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Loan Progress</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{Math.round(progress)}%</Text>
              </div>
              <Progress 
                percent={progress} 
                showInfo={false} 
                strokeColor={isOverdue ? "#ff4d4f" : { '0%': '#1890ff', '100%': '#52c41a' }} 
              />
            </div>
            <Text style={{ fontSize: 12 }} type="secondary">
              Due: {book.dueDate ? dayjs(book.dueDate).format("MMM D, YYYY") : "N/A"}
            </Text>
          </Col>
          
          <Col xs={24} md={6} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button 
              icon={<SyncOutlined />} 
              disabled={!!pendingType || isOverdue}
              onClick={() => handleRenewClick(book)}
            >
              Renew
            </Button>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <PageContainer>
      {contextHolder}
      <PageHeader 
        title="My Library"
        subtitle="Manage your borrowed books and requests."
      />

      {/* Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <KPIStatCard 
            title={t("common.activeLoans")} 
            value={stats.total} 
            icon={<ClockCircleOutlined />} 
            color="#1890ff"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8}>
           <KPIStatCard 
            title={t("common.pendingRequests")} 
            value={stats.pending} 
            icon={<SyncOutlined />} 
            color="#faad14"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8}>
           <KPIStatCard 
            title={t("common.overdueBooks")} 
            value={stats.overdue} 
            icon={<ExclamationCircleOutlined />} 
            color="#ff4d4f"
            loading={loading}
          />
        </Col>
      </Row>

      <Title level={4} style={{ marginBottom: 16 }}>{t("titles.currentBorrowings")}</Title>
      
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : borrowedBooks.length > 0 ? (
        borrowedBooks.map(book => (
          <BorrowCard key={book._id || book.id} book={book} />
        ))
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="You haven't borrowed any books yet." 
        >
          <Button type="primary" href="/search">Browse Books</Button>
        </Empty>
      )}

      {/* Renew Modal */}
      <Modal
        title="Renew Book"
        open={renewModalOpen}
        onOk={submitRenew}
        onCancel={() => setRenewModalOpen(false)}
        okText="Confirm Renewal"
      >
        <p>Would you like to request a renewal for <strong>{selectedBook?.title}</strong>?</p>
        <p>This will extend the due date by 7 days pending approval.</p>
      </Modal>
    </PageContainer>
  );
};

export default BorrowPage;
