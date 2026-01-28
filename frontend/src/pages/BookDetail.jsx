import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Card, Typography, Tag, Divider, List, Empty, Spin, Button, message, Tooltip, Statistic, Row, Col } from "antd";
import { getBookDetail, getBorrowHistory, borrowBook, requestReturnLibrary, getBorrowedBooksLibrary, getUserRequestsLibrary } from "../api";
import ReviewModal from "../components/ReviewModal";
import { useLanguage } from "../contexts/LanguageContext";
import "./BookDetail.css";

const { Title, Text, Paragraph } = Typography;

function BookDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      // Browser back button will naturally preserve React state
      console.log('Browser back button pressed - state preserved');
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

        // 2. Check Review Eligibility (User ID logic)
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
             setPendingType(pendingReq.type); // 'borrow' or 'return' or 'renew'
           } else {
             setPendingType(null);
           }
        }

      } catch (e) {
        setError(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Handler for Borrowing
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
      message.success(t("borrow.borrowSuccess")); // You might need to add this key or use a generic one
      setIsBorrowed(true);
      // Refresh book details to update stock
      const res = await getBookDetail(id);
      setBook(res?.data);
    } catch (e) {
      message.error(e?.response?.data?.message || t("borrow.borrowFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Returning
  const handleReturn = async () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    try {
      setActionLoading(true);
      // Request return
      await requestReturnLibrary(
        { type: "return", bookId: id, bookTitle: book.title },
        token
      );
      message.success(t("borrow.returnSubmitted"));
      setPendingType('return');
    } catch (e) {
      message.error(e?.response?.data?.message || t("borrow.submitFailed"));
    } finally {
      setActionLoading(false);
    }
  };


  // 检查是否借阅且已归还（基于历史）
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
        console.warn("获取借阅历史失败：", e?.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <Spin style={{ marginTop: 40 }} />;
  if (error) return <Text type="danger">{t("bookDetail.failedToLoad").replace("{error}", error)}</Text>;
  if (!book) return <Empty description={t("bookDetail.notFound")} />;

  return (
    <div className="book-detail-page">
      <Card className="book-card" style={{
        borderRadius: 20,
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.1)",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)"
      }}>
        <div className="page-header" style={{ marginBottom: "2rem" }}>
          <Title level={2} className="page-modern-title" style={{ margin: "0 0 1rem 0", color: "#1e293b", fontWeight: 700 }}>📚 {book.title}</Title>
          <div className="meta-tags" style={{ marginBottom: "1.5rem" }}>
            <Tag color="blue" style={{ borderRadius: 8, fontWeight: 500 }}>✍️ {t("bookDetail.author")}: {book.author}</Tag>
            <Tag color="purple" style={{ borderRadius: 8, fontWeight: 500 }}>📂 {t("bookDetail.category")}: {book.category}</Tag>
          </div>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            <div style={{ 
              background: "linear-gradient(135deg, #52c41a, #73d13d)", 
              borderRadius: 16, 
              padding: "1rem", 
              color: "white",
              boxShadow: "0 4px 12px rgba(82, 196, 26, 0.3)"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>{t("bookDetail.inStock")}</span>} 
                value={book.copies || 0} 
                valueStyle={{ color: "white", fontSize: "24px", fontWeight: 700 }}
              />
            </div>
            <div style={{ 
              background: "linear-gradient(135deg, #faad14, #ffc53d)", 
              borderRadius: 16, 
              padding: "1rem", 
              color: "white",
              boxShadow: "0 4px 12px rgba(250, 173, 20, 0.3)"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>{t("bookDetail.rating")}</span>} 
                value={book.rating || 0} 
                valueStyle={{ color: "white", fontSize: "24px", fontWeight: 700 }}
                suffix="/5"
              />
            </div>
            <div style={{ 
              background: "linear-gradient(135deg, #1890ff, #36cfc9)", 
              borderRadius: 16, 
              padding: "1rem", 
              color: "white",
              boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>{t("bookDetail.reviews")}</span>} 
                value={book.reviewCount || (Array.isArray(book.reviews) ? book.reviews.length : 0)} 
                valueStyle={{ color: "white", fontSize: "24px", fontWeight: 700 }}
              />
            </div>
          </div>
        </div>
        
        <Divider orientation="left">{t("bookDetail.actions")}</Divider>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem", paddingLeft: "1rem" }}>
            {isBorrowed ? (
                <Button 
                    type="primary" 
                    danger 
                    size="large"
                    loading={actionLoading}
                    disabled={pendingType === 'return'}
                    onClick={handleReturn}
                    style={{ minWidth: '160px', height: '48px', fontSize: '16px', borderRadius: '12px' }}
                >
                    {pendingType === 'return' ? t("borrow.returnPending") : t("borrow.applyReturn")}
                </Button>
            ) : (
                <Button 
                    type="primary" 
                    size="large"
                    loading={actionLoading}
                    disabled={book.copies <= 0 || pendingType === 'borrow'}
                    onClick={handleBorrow}
                    style={{ 
                        minWidth: '160px', 
                        height: '48px', 
                        fontSize: '16px', 
                        borderRadius: '12px',
                        background: (book.copies <= 0 || pendingType === 'borrow') ? undefined : "linear-gradient(135deg, #3b82f6, #2563eb)",
                        border: "none"
                    }}
                >
                    {pendingType === 'borrow' 
                        ? t("borrow.borrowPending") 
                        : (book.copies > 0 ? t("borrow.applyBorrow") : t("borrow.outOfStock"))}
                </Button>
            )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>{t("bookDetail.description")}</Title>
          {ttsEnabled && (
             <Button 
               type="text" 
               icon={<SoundOutlined />} 
               onClick={() => speak(book.description)}
               title="Read Description"
             >
               Read
             </Button>
          )}
        </div>
        <Paragraph style={{ whiteSpace: "pre-wrap" }}>{book.description || t("bookDetail.noDescription")}</Paragraph>

        <Divider>{t("bookDetail.userReviews")}</Divider>
        {Array.isArray(book.reviews) && book.reviews.length > 0 ? (
          <List
            dataSource={book.reviews}
            renderItem={(rev) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{rev.rating} {t("bookDetail.stars")}</Text>}
                  description={
                    <>
                      <div>{rev.comment || t("bookDetail.noComment")}</div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                        {new Date(rev.createdAt).toLocaleString()}
                      </div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t("bookDetail.noReviews")} />
        )}
      <Divider />
        {(() => {
          const canReview = eligible && !hasReviewed;
          const reason = !eligible
            ? t("bookDetail.reviewOnlyAfterReturn")
            : hasReviewed
            ? t("bookDetail.youHaveReviewed")
            : "";
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button 
                type="default" 
                onClick={() => navigate(-1)} // Browser back button - preserves state
                style={{ marginRight: 8 }}
              >
                ← {t("bookDetail.back")}
              </Button>
              {canReview ? (
                <Button type="primary" onClick={() => setReviewOpen(true)}>
                  {t("bookDetail.writeReview")}
                </Button>
              ) : (
                <Tooltip title={reason} placement="top">
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" disabled>
                      {t("bookDetail.writeReview")}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          );
        })()}
      </Card>

      {/* 写书评弹窗 */}
      {book && (
        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          bookId={book._id}
          bookTitle={book.title}
          token={sessionStorage.getItem("token") || localStorage.getItem("token")}
          onSubmitted={async () => {
            try {
              // 重新拉取详情，刷新评论列表与评分
              const res = await getBookDetail(id);
              setBook(res?.data);
              setHasReviewed(true);
              setReviewOpen(false);
              message.success(t("bookDetail.reviewSubmitted"));
            } catch (e) {}
          }}
        />
      )}
    </div>
  );
}

export default BookDetail;
