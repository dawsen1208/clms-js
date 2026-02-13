import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, Typography, Tag, List, Empty, Spin, Button, message, Tooltip, 
  Row, Col, Space, Divider, Avatar, Rate, Modal, Badge, Affix 
} from "antd";
import { 
  BookOutlined, 
  UserOutlined, 
  TagsOutlined, 
  StarOutlined, 
  StockOutlined, 
  CommentOutlined, 
  RollbackOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  ShareAltOutlined,
  CopyOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getBookDetail, getBorrowHistory, borrowBook, getBorrowedBooksLibrary, getUserRequestsLibrary } from "../api";
import ReviewModal from "../components/ReviewModal";
import { useLanguage } from "../contexts/LanguageContext";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";
import PageShell from "../components/common/PageShell";
import Section from "../components/common/Section";
import KPIStatCard from "../components/common/KPIStatCard";

const { Title, Text, Paragraph } = Typography;

function BookDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  
  // State
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligible, setEligible] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
  // Borrow/Return Logic State
  const [isBorrowed, setIsBorrowed] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        
        // 1. Fetch Book Details
        const res = await getBookDetail(id);
        if (!mounted) return;
        const data = res?.data;
        setBook(data);

        // 2. Check Review Eligibility
        try {
          const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
          const user = rawUser ? JSON.parse(rawUser) : null;
          const uid = user?.userId || user?._id;
          const reviewed = Array.isArray(data?.reviews)
            ? data.reviews.some((r) => String(r.userId) === String(uid))
            : false;
          setHasReviewed(reviewed);
        } catch {}

        // 3. Check Borrow Status (If logged in)
        if (token) {
           const [borrowedRes, requestsRes] = await Promise.all([
             getBorrowedBooksLibrary(token),
             getUserRequestsLibrary(token)
           ]);
           
           // Check if currently borrowed
           const borrowedList = borrowedRes.data || [];
           const isCurrentlyBorrowed = borrowedList.some(b => 
             String(b.bookId?._id || b.bookId) === String(id) && !b.returned
           );
           setIsBorrowed(isCurrentlyBorrowed);

           // Check for pending requests
           const requests = requestsRes.data || [];
           const pendingReq = requests.find(r => 
             String(r.bookId) === String(id) && r.status === 'pending'
           );
           if (pendingReq) {
             setPendingType(pendingReq.type); 
           } else {
             setPendingType(null);
           }
        }

      } catch (e) {
        setError(e?.response?.data?.message || e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  // Check history for review eligibility
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");
        if (!token) return;
        const res = await getBorrowHistory(token);
        const history = res?.data || [];
        const returnedThis = history.some(
          (h) => h.action === "return" && String(h.bookId) === String(id)
        );
        if (mounted) setEligible(returnedThis);
      } catch (e) {
        console.warn("Failed to fetch borrow history:", e?.message);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const handleBorrow = async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      message.warning(t("common.loginFirst"));
      return;
    }
    
    modal.confirm({
      title: t("borrow.confirmTitle") || "Confirm Borrow",
      content: t("borrow.confirmContent", { title: book.title }),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: async () => {
        setActionLoading(true);
        try {
          await borrowBook(id, token);
          message.success(t("borrow.borrowSuccess"));
          // Refresh state
          setIsBorrowed(true);
          setBook(prev => ({ ...prev, copies: prev.copies - 1 }));
        } catch (error) {
          const errorMsg = extractErrorMessage(error);
          if (error.__borrowLimit || isBorrowLimitError(errorMsg)) {
            showBorrowLimitModal(t, modal);
          } else {
            message.error(errorMsg);
          }
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  if (loading) return (
    <PageShell>
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    </PageShell>
  );

  if (error) return (
    <PageShell>
      <Empty description={t("bookDetail.failedToLoad").replace("{error}", error)} />
    </PageShell>
  );

  if (!book) return (
    <PageShell>
      <Empty description={t("bookDetail.notFound")} />
    </PageShell>
  );

  const canReview = eligible && !hasReviewed;

  return (
    <PageShell
      title="Book Details"
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.search"), path: "/search" },
        { title: book.title }
      ]}
      extra={
        <Space>
           <Button icon={<ShareAltOutlined />} onClick={() => {
             navigator.clipboard.writeText(window.location.href);
             message.success("Link copied to clipboard!");
           }}>Share</Button>
        </Space>
      }
    >
      {contextHolder}
      
      <Row gutter={[32, 32]}>
        {/* Left Column: Book Info */}
        <Col xs={24} lg={16}>
          <Card 
            bordered={false} 
            style={{ borderRadius: 16, marginBottom: 24 }}
          >
            <div style={{ display: 'flex', gap: 24, flexDirection: 'column' }}>
               <div>
                  <Space wrap size="small" style={{ marginBottom: 16 }}>
                    <Tag color="blue">{book.category}</Tag>
                    {book.publishDate && <Tag>{dayjs(book.publishDate).format('YYYY')}</Tag>}
                    {book.rating > 4.5 && <Tag color="gold">Top Rated</Tag>}
                  </Space>
                  
                  <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>{book.title}</Title>
                  <Text type="secondary" style={{ fontSize: 16 }}>by {book.author}</Text>
               </div>

               <Divider style={{ margin: '12px 0' }} />
               
               <div>
                 <Title level={5}>Description</Title>
                 <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#595959' }}>
                   {book.description || t("bookDetail.noDescription")}
                 </Paragraph>
               </div>
            </div>
          </Card>

          {/* Reviews Section */}
          <Section 
             title={t("bookDetail.reviews") + ` (${Array.isArray(book.reviews) ? book.reviews.length : 0})`}
             extra={
               canReview ? (
                <Button type="primary" onClick={() => setReviewOpen(true)} icon={<EditOutlined />}>
                  {t("bookDetail.writeReview")}
                </Button>
              ) : null
             }
          >
            <Card bordered={false} style={{ borderRadius: 16 }}>
              {Array.isArray(book.reviews) && book.reviews.length > 0 ? (
                <List
                  itemLayout="horizontal"
                  dataSource={book.reviews}
                  renderItem={(rev) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: '#1677FF' }}>{rev.userId?.name?.[0] || 'U'}</Avatar>}
                        title={
                          <Space>
                            <Rate disabled defaultValue={rev.rating} style={{ fontSize: 14 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {dayjs(rev.createdAt).format("YYYY-MM-DD")}
                            </Text>
                          </Space>
                        }
                        description={
                          <Text style={{ fontSize: 15 }}>{rev.comment || t("bookDetail.noComment")}</Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description={t("bookDetail.noReviews")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Section>
        </Col>

        {/* Right Column: Actions & Stats */}
        <Col xs={24} lg={8}>
          <div style={{ position: 'sticky', top: 24 }}>
             <Card bordered={false} style={{ borderRadius: 16, marginBottom: 24, textAlign: 'center' }}>
                <div style={{ marginBottom: 24 }}>
                   {book.coverImage ? (
                     <img src={book.coverImage} alt={book.title} style={{ width: '100%', maxWidth: 200, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} />
                   ) : (
                     <div style={{ width: 140, height: 200, background: '#f5f5f5', borderRadius: 8, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                     </div>
                   )}
                </div>

                <div style={{ marginBottom: 24 }}>
                   <div style={{ fontSize: 24, fontWeight: 'bold', color: book.copies > 0 ? '#52c41a' : '#ff4d4f' }}>
                      {book.copies > 0 ? 'In Stock' : 'Out of Stock'}
                   </div>
                   <Text type="secondary">{book.copies} copies available</Text>
                </div>

                {isBorrowed ? (
                  <Button 
                    size="large"
                    disabled
                    block
                    icon={<CheckCircleOutlined />}
                    className="action-btn-borrowed"
                    style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }}
                  >
                    Borrowed
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    size="large"
                    loading={actionLoading}
                    disabled={book.copies <= 0 || pendingType === 'borrow'}
                    onClick={handleBorrow}
                    block
                    icon={pendingType === 'borrow' ? <ClockCircleOutlined /> : <BookOutlined />}
                  >
                    {pendingType === 'borrow' 
                        ? "Request Pending" 
                        : (book.copies > 0 ? "Borrow Now" : "Notify When Available")}
                  </Button>
                )}
             </Card>

             <Card bordered={false} style={{ borderRadius: 16 }}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Ratings</Title>
                <Row gutter={[16, 16]}>
                   <Col span={24} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1 }}>{book.rating || 0}</div>
                      <Rate disabled allowHalf value={book.rating || 0} />
                      <div style={{ marginTop: 8 }}><Text type="secondary">out of 5</Text></div>
                   </Col>
                </Row>
             </Card>
          </div>
        </Col>
      </Row>

      {/* Mobile Sticky Action Bar */}
      <div className="mobile-sticky-action-bar mobile-only-block">
        <div style={{ flex: 1 }}>
           <Text strong style={{ display: 'block' }} ellipsis>{book.title}</Text>
           <Text type="secondary" style={{ fontSize: 12 }}>
             {book.copies > 0 ? <span style={{ color: '#52c41a' }}>In Stock</span> : <span style={{ color: '#ff4d4f' }}>Out of Stock</span>}
           </Text>
        </div>
        <Button 
          type="primary" 
          disabled={book.copies <= 0 || isBorrowed || pendingType === 'borrow'}
          onClick={handleBorrow}
          loading={actionLoading}
        >
          {isBorrowed ? "Borrowed" : "Borrow"}
        </Button>
      </div>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        bookId={book._id}
        bookTitle={book.title}
        token={sessionStorage.getItem("token") || localStorage.getItem("token")}
        onSubmitted={async () => {
          try {
            const res = await getBookDetail(id);
            setBook(res?.data);
            setHasReviewed(true);
            setReviewOpen(false);
            message.success(t("bookDetail.reviewSubmitted"));
          } catch (e) {}
        }}
      />
      
      <style jsx>{`
        @media (min-width: 769px) {
          .mobile-only-block {
            display: none !important;
          }
        }
      `}</style>
    </PageShell>
  );
}

export default BookDetail;
