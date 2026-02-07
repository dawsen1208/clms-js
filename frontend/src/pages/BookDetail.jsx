import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  Card, Typography, Tag, List, Empty, Spin, Button, message, Tooltip, 
  Row, Col, Space, Divider, Avatar, Rate 
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
  SyncOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getBookDetail, getBorrowHistory, borrowBook, getBorrowedBooksLibrary, getUserRequestsLibrary } from "../api";
import ReviewModal from "../components/ReviewModal";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";

const { Title, Text, Paragraph } = Typography;

function BookDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligible, setEligible] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
  // Borrow/Return Logic State
  const [isBorrowed, setIsBorrowed] = useState(false);
  const [pendingType, setPendingType] = useState(null); // 'borrow' | 'return' | null
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
      navigate("/login");
      return;
    }
    
    try {
      setActionLoading(true);
      await borrowBook(id, token);
      message.success(t("borrow.borrowSuccess"));
      setIsBorrowed(true);
      const res = await getBookDetail(id);
      setBook(res?.data);
    } catch (e) {
      message.error(e?.response?.data?.message || t("borrow.borrowFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <PageContainer>
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <Spin size="large" />
      </div>
    </PageContainer>
  );

  if (error) return (
    <PageContainer>
      <Empty description={t("bookDetail.failedToLoad").replace("{error}", error)} />
    </PageContainer>
  );

  if (!book) return (
    <PageContainer>
      <Empty description={t("bookDetail.notFound")} />
    </PageContainer>
  );

  // Derived state for UI
  const canReview = eligible && !hasReviewed;
  const reviewReason = !eligible
    ? t("bookDetail.reviewOnlyAfterReturn")
    : hasReviewed
    ? t("bookDetail.youHaveReviewed")
    : "";

  return (
    <PageContainer>
      <PageHeader 
        title={book.title}
        subtitle={book.author}
        breadcrumbs={[
          { title: t("nav.home"), path: "/" },
          { title: t("nav.search"), path: "/search" },
          { title: book.title }
        ]}
        extra={
          <Button icon={<RollbackOutlined />} onClick={() => navigate(-1)}>
            {t("bookDetail.back")}
          </Button>
        }
      />

      <Row gutter={[24, 24]}>
        {/* Left Column: Details */}
        <Col xs={24} lg={16}>
          <Card 
            className="card-shadow" 
            bordered={false} 
            style={{ borderRadius: 16, marginBottom: 24 }}
          >
            <Space size="middle" style={{ marginBottom: 16 }}>
              <Tag color="blue" icon={<UserOutlined />}>{book.author}</Tag>
              <Tag color="purple" icon={<TagsOutlined />}>{book.category}</Tag>
              <Tag color="gold" icon={<StarOutlined />}>{book.rating || 0} / 5</Tag>
            </Space>
            
            <Divider orientation="left" style={{ margin: '24px 0 16px' }}>
              <Text type="secondary" style={{ fontSize: 14 }}>{t("bookDetail.description")}</Text>
            </Divider>
            
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text-color)' }}>
              {book.description || t("bookDetail.noDescription")}
            </Paragraph>
          </Card>

          {/* Reviews Section */}
          <Card 
            title={
              <Space>
                <CommentOutlined />
                {t("bookDetail.userReviews")}
                <Tag>{Array.isArray(book.reviews) ? book.reviews.length : 0}</Tag>
              </Space>
            }
            className="card-shadow"
            bordered={false}
            style={{ borderRadius: 16 }}
            extra={
              canReview ? (
                <Button type="primary" onClick={() => setReviewOpen(true)} icon={<EditOutlined />}>
                  {t("bookDetail.writeReview")}
                </Button>
              ) : (
                <Tooltip title={reviewReason}>
                  <Button disabled icon={<EditOutlined />}>
                    {t("bookDetail.writeReview")}
                  </Button>
                </Tooltip>
              )
            }
          >
            {Array.isArray(book.reviews) && book.reviews.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={book.reviews}
                renderItem={(rev) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />}
                      title={
                        <Space>
                          <Rate disabled defaultValue={rev.rating} style={{ fontSize: 14 }} />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(rev.createdAt).format("YYYY-MM-DD HH:mm")}
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
        </Col>

        {/* Right Column: Stats & Actions */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Action Card */}
            <Card 
              className="card-shadow" 
              bordered={false} 
              style={{ borderRadius: 16, textAlign: 'center' }}
            >
              <Title level={4} style={{ marginTop: 0 }}>{t("bookDetail.actions")}</Title>
              <div style={{ padding: '20px 0' }}>
                {isBorrowed ? (
                  <Button 
                    type="default" 
                    size="large"
                    disabled
                    block
                    icon={<CheckCircleOutlined />}
                    style={{ height: 48, borderRadius: 12, backgroundColor: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }}
                  >
                    {t("borrow.borrowed") || "Borrowed"}
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    size="large"
                    loading={actionLoading}
                    disabled={book.copies <= 0 || pendingType === 'borrow'}
                    onClick={handleBorrow}
                    block
                    icon={<BookOutlined />}
                    style={{ height: 48, borderRadius: 12 }}
                  >
                    {pendingType === 'borrow' 
                        ? t("borrow.borrowPending") 
                        : (book.copies > 0 ? t("borrow.applyBorrow") : t("borrow.outOfStock"))}
                  </Button>
                )}
              </div>
              {book.copies <= 0 && !isBorrowed && (
                <Text type="danger" style={{ display: 'block' }}>
                  <StockOutlined /> {t("borrow.outOfStock")}
                </Text>
              )}
            </Card>

            {/* KPI Stats */}
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <KPIStatCard 
                  title={t("bookDetail.inStock")} 
                  value={book.copies || 0} 
                  icon={<StockOutlined />} 
                  color={book.copies > 0 ? "#52c41a" : "#ff4d4f"} 
                />
              </Col>
              <Col span={12}>
                <KPIStatCard 
                  title={t("bookDetail.rating")} 
                  value={book.rating || 0} 
                  icon={<StarOutlined />} 
                  color="#faad14"
                  suffix="/ 5" 
                />
              </Col>
              <Col span={12}>
                <KPIStatCard 
                  title={t("bookDetail.reviews")} 
                  value={book.reviewCount || (Array.isArray(book.reviews) ? book.reviews.length : 0)} 
                  icon={<CommentOutlined />} 
                  color="#3b82f6" 
                />
              </Col>
            </Row>
          </Space>
        </Col>
      </Row>

      {/* Review Modal */}
      {book && (
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
      )}
    </PageContainer>
  );
}

export default BookDetail;
