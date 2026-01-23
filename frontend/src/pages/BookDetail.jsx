import { useEffect, useState } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Card, Typography, Tag, Divider, List, Empty, Spin, Button, message, Tooltip, Statistic, Row, Col } from "antd";
import { getBookDetail, getBorrowHistory } from "../api";
import ReviewModal from "../components/ReviewModal";
import "./BookDetail.css";

const { Title, Text, Paragraph } = Typography;

function BookDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eligible, setEligible] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  
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
        const res = await getBookDetail(id);
        if (!mounted) return;
        const data = res?.data;
        setBook(data);

        // 计算是否已评论（当前用户）
        try {
          const rawUser = sessionStorage.getItem("user") || localStorage.getItem("user");
          const user = rawUser ? JSON.parse(rawUser) : null;
          const uid = user?.userId || user?._id;
          const reviewed = Array.isArray(data?.reviews)
            ? data.reviews.some((r) => String(r.userId) === String(uid))
            : false;
          setHasReviewed(reviewed);
        } catch {}
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
  if (error) return <Text type="danger">Failed to load: {error}</Text>;
  if (!book) return <Empty description="Book not found" />;

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
          <Title level={2} style={{ margin: "0 0 1rem 0", color: "#1e293b", fontWeight: 700 }}>📚 {book.title}</Title>
          <div className="meta-tags" style={{ marginBottom: "1.5rem" }}>
            <Tag color="blue" style={{ borderRadius: 8, fontWeight: 500 }}>✍️ Author: {book.author}</Tag>
            <Tag color="purple" style={{ borderRadius: 8, fontWeight: 500 }}>📂 Category: {book.category}</Tag>
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
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>In Stock</span>} 
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
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>Rating</span>} 
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
                title={<span style={{ color: "rgba(255,255,255,0.9)", fontSize: "12px" }}>Reviews</span>} 
                value={book.reviewCount || (Array.isArray(book.reviews) ? book.reviews.length : 0)} 
                valueStyle={{ color: "white", fontSize: "24px", fontWeight: 700 }}
              />
            </div>
          </div>
        </div>
        <Paragraph style={{ whiteSpace: "pre-wrap" }}>{book.description || "No description"}</Paragraph>

        <Divider>User Reviews</Divider>
        {Array.isArray(book.reviews) && book.reviews.length > 0 ? (
          <List
            dataSource={book.reviews}
            renderItem={(rev) => (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong>{rev.rating} stars</Text>}
                  description={
                    <>
                      <div>{rev.comment || "(No written comment)"}</div>
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
          <Empty description="No reviews yet — be the first!" />
        )}
      <Divider />
        {(() => {
          const canReview = eligible && !hasReviewed;
          const reason = !eligible
            ? "You can review only after returning"
            : hasReviewed
            ? "You have already reviewed"
            : "";
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button 
                type="default" 
                onClick={() => navigate(-1)} // Browser back button - preserves state
                style={{ marginRight: 8 }}
              >
                ← Back to Previous Page
              </Button>
              {canReview ? (
                <Button type="primary" onClick={() => setReviewOpen(true)}>
                  Write a Review
                </Button>
              ) : (
                <Tooltip title={reason} placement="top">
                  <span style={{ display: "inline-block" }}>
                    <Button type="primary" disabled>
                      Write a Review
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
              message.success("Review submitted and page updated");
            } catch (e) {}
          }}
        />
      )}
    </div>
  );
}

export default BookDetail;
