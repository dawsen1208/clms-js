import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, Typography, Tag, List, Empty, Button, message, 
  Row, Col, Space, Divider, Avatar, Rate, Modal, Progress, Tooltip, theme, Grid 
} from "antd";
import { 
  BookOutlined, 
  UserOutlined, 
  TagsOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  ReadOutlined,
  ShareAltOutlined,
  FireOutlined,
  TeamOutlined,
  EditOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getBookDetail, borrowBook, getBorrowedBooks } from "../api";
import ReviewModal from "../components/ReviewModal";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import BookCoverPro from "../components/common/BookCoverPro";
import StatCard from "../components/cards/StatCard";
import ShimmerSkeleton from "../components/common/ShimmerSkeleton";

const { Title, Text, Paragraph } = Typography;

const { useBreakpoint } = Grid;

function BookDetail() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const { id } = useParams();
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  const backText = (t("nav.back") && t("nav.back") !== "nav.back") ? t("nav.back") : "Back to Library";
  
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
        const tokenVal = sessionStorage.getItem("token") || localStorage.getItem("token");
        
        // 1. Fetch Book Details
        const res = await getBookDetail(id);
        if (!mounted) return;
        const data = res?.data;
        setBook(data);

        // Check if user already borrowed this book
        if (tokenVal && (data?._id || data?.id)) {
          try {
            const br = await getBorrowedBooks(tokenVal);
            const borrowedIds = (br?.data || []).map(b => String(b.book_id || b.bookId || b._id || b.id));
            const thisId = String(data?._id || data?.id);
            setIsBorrowed(borrowedIds.includes(thisId));
          } catch (e) {}
        }

        // 2. Check Review Eligibility
        try {
          const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
          const user = rawUser ? JSON.parse(rawUser) : null;
          const uid = user?.userId || user?._id;
          const reviewed = Array.isArray(data?.reviews)
            ? data.reviews.some((r) => String(r.userId) === String(uid))
            : false;
          
          setHasReviewed(reviewed);
          // Simplified eligibility check for demo purposes
          setEligible(!!tokenVal); 
        } catch (e) {
          console.error("Eligibility check failed", e);
        }

        // Borrow status handled above

      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || err.message || "Failed to load book");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const handleBorrow = async () => {
    if (!book) return;
    setActionLoading(true);
    try {
      const tokenVal = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!tokenVal) {
        message.warning("Please login to borrow books");
        navigate("/login");
        return;
      }
      
      // Prevent duplicate borrow
      if (isBorrowed) {
        message.info("Already borrowed");
        return;
      }

      await borrowBook(book._id || book.id, tokenVal);
      message.success("Borrowed");
      setIsBorrowed(true);
      setPendingType(null);
      // Refresh book data to update copies count if needed
      const res = await getBookDetail(id);
      setBook(res?.data);
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to borrow book");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    modal.info({
      title: "Share this page",
      centered: true,
      okText: "Got it",
      content: (
        <div style={{ marginTop: 8 }}>
          <Paragraph style={{ marginBottom: 8 }}>
            <Text strong>Link:</Text>
          </Paragraph>
          <Paragraph copyable={{ text: url }} style={{ userSelect: 'text', marginBottom: 8 }}>
            {url}
          </Paragraph>
          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        </div>
      )
    });
  };

  if (loading) return (
    <EditorialPageShell>
      <div style={{ padding: 48 }}>
         <ShimmerSkeleton height={400} style={{ marginBottom: 32 }} />
         <ShimmerSkeleton height={200} />
      </div>
    </EditorialPageShell>
  );

  if (error) return (
    <EditorialPageShell>
      <Empty description={t("bookDetail.failedToLoad").replace("{error}", error)} />
    </EditorialPageShell>
  );

  if (!book) return (
    <EditorialPageShell>
      <Empty description={t("bookDetail.notFound")} />
    </EditorialPageShell>
  );

  const canReview = eligible && !hasReviewed;

  // TODO: Mock Data for "Community Reading Progress" (Bonus Package)
  // This data is currently hardcoded for visual demonstration of the magazine style.
  // In a real implementation, this should be aggregated from real user reading logs.
  const readingStats = {
    readersNow: Math.floor(Math.random() * 50) + 10,
    avgFinishTime: "4.5 days",
    completionRate: 85,
    topTags: ["Mind-blowing", "Must read", "Classic"]
  };

  return (
    <EditorialPageShell
      title={null} // Custom Hero handles title
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.search"), path: "/search" },
        { title: book.title }
      ]}
      fullWidth
      noPadding
    >
      {contextHolder}
      
      {/* 1. Immersive Hero Section */}
      <div style={{ 
        background: '#FAF9F6', 
        padding: '64px 24px', 
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Texture/Shape */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(166, 93, 87, 0.05) 0%, rgba(255,255,255,0) 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <Button onClick={() => navigate('/search')}>{backText}</Button>
          </div>
          <div className="editorial-grid" style={{ alignItems: 'start' }}>
            {/* Left: Book Cover */}
            <div className="col-span-4" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ 
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)', 
                borderRadius: 8, 
                overflow: 'hidden',
                background: '#fff',
                transform: 'rotate(-2deg)',
                transition: 'transform 0.3s ease',
                cursor: 'default'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(0deg) scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'rotate(-2deg)'}
              >
                <div style={{ position: 'relative', width: '100%', height: 'auto' }}>
                  <div style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                    <BookCoverPro 
                      title={book.title} 
                      author={book.author} 
                      width={400} 
                      height={600} 
                      style="serif"
                      baseColor={token.colorPrimary}
                      className="w-full h-auto"
                    />
                  </div>
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      loading="lazy"
                      decoding="async"
                      srcSet={
                        book.coverImageSet
                          ? [
                              book.coverImageSet.w160 ? `${book.coverImageSet.w160} 160w` : null,
                              book.coverImageSet.w240 ? `${book.coverImageSet.w240} 240w` : null,
                              book.coverImageSet.w360 ? `${book.coverImageSet.w360} 360w` : null
                            ].filter(Boolean).join(', ')
                          : undefined
                      }
                      sizes="(min-width: 1200px) 400px, (min-width: 768px) 320px, 60vw"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: 'auto', display: 'block', position: 'relative', zIndex: 1 }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right: Info & Actions */}
            <div className="col-span-8" style={{ 
              paddingLeft: screens.md ? 48 : 0, 
              paddingTop: screens.md ? 24 : 32 
            }}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <div>
                  <Space wrap size="small" style={{ marginBottom: 16 }}>
                    <Tag color="transparent" style={{ border: `1px solid ${token.colorPrimary}`, color: token.colorPrimary }}>{book.category}</Tag>
                    {book.publishDate && <Tag color="default" style={{ background: 'transparent' }}>{dayjs(book.publishDate).format('YYYY')}</Tag>}
                    {book.rating > 4.5 && <Tag color="#E8B86D" style={{ color: '#fff', border: 'none' }}><FireOutlined /> Top Rated</Tag>}
                  </Space>
                  
                  <Title level={1} style={{ 
                    fontFamily: "'Literata', serif", 
                    fontSize: '3.5rem', 
                    margin: 0, 
                    lineHeight: 1.1,
                    color: token.colorTextHeading
                  }}>
                    {book.title}
                  </Title>
                  <Text style={{ 
                    fontSize: '1.25rem', 
                    color: token.colorTextSecondary, 
                    display: 'block', 
                    marginTop: 12,
                    fontFamily: "'Inter', sans-serif" 
                  }}>
                    by <span style={{ color: token.colorPrimary, fontWeight: 500 }}>{book.author}</span>
                  </Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <Rate disabled allowHalf value={book.rating || 0} style={{ color: token.colorWarning, fontSize: 20 }} />
                  <Divider type="vertical" />
                  <Space>
                    <ReadOutlined /> <Text>{`stock: ${(book.available_copies ?? book.copies ?? 0)}/${book.total_copies ?? book.totalCopies ?? book.total ?? book.copies ?? 0}`}</Text>
                  </Space>
                  <Divider type="vertical" />
                  <Space>
                    <TeamOutlined /> <Text>{readingStats.readersNow} Reading</Text>
                  </Space>
                </div>

                <Paragraph style={{ 
                  fontSize: '1.1rem', 
                  lineHeight: 1.8, 
                  color: token.colorText, 
                  maxWidth: '800px',
                  fontFamily: "'Literata', serif"
                }} ellipsis={{ rows: 4, expandable: true, symbol: 'Read more' }}>
                  {book.description || t("bookDetail.noDescription")}
                </Paragraph>

                {/* Sticky-like Action Bar (Inline for desktop) */}
                <div style={{ 
                  marginTop: 32, 
                  padding: 24, 
                  background: '#fff', 
                  borderRadius: 12, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 24
                }}>
                   <div>
                      <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Availability</Text>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>
                        {`stock: ${(book.available_copies ?? book.copies ?? 0)}/${book.total_copies ?? book.totalCopies ?? book.total ?? book.copies ?? 0}`}
                      </div>
                   </div>
                   
                   <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 16 }}>
                      <Button size="large" icon={<ShareAltOutlined />} onClick={handleShare}>Share</Button>
                      
                      {isBorrowed ? (
                        <Button 
                          size="large"
                          disabled
                          icon={<CheckCircleOutlined />}
                          style={{ 
                            background: `${token.colorSuccess}15`, 
                            borderColor: `${token.colorSuccess}40`, 
                            color: token.colorSuccess, 
                            minWidth: 160 
                          }}
                        >
                          Borrowed
                        </Button>
                      ) : (
                        <Button 
                          type="primary" 
                          size="large"
                          loading={actionLoading}
                          disabled={(book.copies ?? book.available_copies ?? 0) <= 0}
                          onClick={handleBorrow}
                          style={{ 
                            minWidth: 180, 
                            height: 48, 
                            fontSize: 16,
                            background: (book.copies ?? book.available_copies ?? 0) > 0 ? token.colorPrimary : token.colorBorder
                          }}
                          icon={<BookOutlined />}
                        >
                          {(book.copies ?? book.available_copies ?? 0) > 0 ? "Borrow Now" : "Out of Stock"}
                        </Button>
                      )}
                   </div>
                </div>
              </Space>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Content Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div className="editorial-grid">
           {/* Main Content: Reviews & Details */}
           <div className="col-span-8">
              <EditorialSectionHeader 
                title="Community Insights" 
                subtitle={`What readers are saying about "${book.title}"`} 
                actionText={canReview ? "Write a Review" : null}
                onActionClick={() => setReviewOpen(true)}
              />
              
              <div style={{ marginBottom: 48 }}>
                 {Array.isArray(book.reviews) && book.reviews.length > 0 ? (
                    <List
                      itemLayout="vertical"
                      size="large"
                      dataSource={book.reviews}
                      renderItem={(rev) => (
                        <List.Item
                          key={rev._id}
                          style={{ padding: '32px 0', borderBottom: '1px solid #eee' }}
                        >
                          <List.Item.Meta
                            avatar={<Avatar size={48} style={{ backgroundColor: token.colorPrimary }}>{rev.userId?.name?.[0] || 'U'}</Avatar>}
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                 <Text strong style={{ fontSize: 16 }}>{rev.userId?.name || 'Anonymous'}</Text>
                                 <Text type="secondary" style={{ fontSize: 14 }}>{dayjs(rev.createdAt).format("MMM D, YYYY")}</Text>
                              </div>
                            }
                            description={<Rate disabled defaultValue={rev.rating} style={{ fontSize: 14, color: '#E8B86D' }} />}
                          />
                          <Paragraph style={{ fontSize: 16, lineHeight: 1.8, marginTop: 16, color: '#333' }}>
                            {rev.comment || t("bookDetail.noComment")}
                          </Paragraph>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <div style={{ padding: '48px 0', textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
                       <Empty description={t("bookDetail.noReviews")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                       {canReview && (
                         <Button type="primary" onClick={() => setReviewOpen(true)} style={{ marginTop: 16 }}>
                           Be the first to review
                         </Button>
                       )}
                    </div>
                  )}
              </div>
           </div>

           {/* Sidebar: Stats & Metadata */}
           <div className="col-span-4">
              <div style={{ position: 'sticky', top: 32 }}>
                 <div style={{ marginBottom: 32 }}>
                    <StatCard
                      title="Community Reading"
                      value={readingStats.completionRate}
                      suffix="%"
                      explanation="Completion Rate"
                      color={token.colorSuccess}
                      trend={0}
                    />
                 </div>

                 <Card title="Book Metadata" bordered={false} style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">ISBN</Text>
                          <Text copyable>{book.isbn || 'N/A'}</Text>
                       </div>
                       <Divider style={{ margin: '4px 0' }} />
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Publisher</Text>
                          <Text>{book.publisher || 'N/A'}</Text>
                       </div>
                       <Divider style={{ margin: '4px 0' }} />
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Language</Text>
                          <Text>English</Text>
                       </div>
                       <Divider style={{ margin: '4px 0' }} />
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text type="secondary">Avg. Read Time</Text>
                          <Text>{readingStats.avgFinishTime}</Text>
                       </div>
                    </Space>
                 </Card>

                 <div style={{ marginTop: 32 }}>
                    <Title level={5}>Readers also liked</Title>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                       {['Design', 'Art', 'Psychology'].map(tag => (
                          <Tag key={tag} style={{ padding: '4px 12px', borderRadius: 16, cursor: 'pointer' }}>#{tag}</Tag>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
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
    </EditorialPageShell>
  );
}

export default BookDetail;
