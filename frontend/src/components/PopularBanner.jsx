// ✅ client/src/components/PopularBanner.jsx
import { useState, useEffect } from "react";
import { Card, Button, Modal, message, Spin, Grid, Tag } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FireOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getRecommendations, borrowBook, getBookDetail } from "../api"; // ✅ 统一 API 调用
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";

const { useBreakpoint } = Grid;

function PopularBanner() {
  const [books, setBooks] = useState([]); // ✅ 动态热门书籍数据
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [loading, setLoading] = useState(false);
  // Controlled modals for robust visibility
  const [limitOpen, setLimitOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  /* =========================================================
     📚 获取热门推荐数据（来自后端）
     ========================================================= */
  const fetchPopularBooks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      if (res.data?.recommended?.length) {
        setBooks(res.data.recommended);
      } else {
        message.info("No popular recommendations available");
      }
    } catch (err) {
      console.error("❌ Failed to fetch popular recommendations:", err);
      message.error("Failed to load popular recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopularBooks();
  }, []);

  /* =========================================================
     ▶️ 自动播放轮播
     ========================================================= */
  useEffect(() => {
    if (!playing || books.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % books.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [playing, books]);

  /* =========================================================
     📘 点击书籍弹出详情
     ========================================================= */
  const handleBookClick = (book) => {
    setSelectedBook(book);
    setVisible(true);
  };

  /* =========================================================
     📖 借阅逻辑（统一 API 调用）
     ========================================================= */
  const handleBorrow = async () => {
    if (!selectedBook) return;
    if (!token) {
      message.error("Please log in before borrowing!");
      return;
    }

    try {
      // Preflight stock check using detail if copies is not available
      let available = typeof selectedBook.copies === "number" ? selectedBook.copies : undefined;
      if (typeof available !== "number") {
        const detail = await getBookDetail(selectedBook._id);
        available = Number(detail?.data?.copies ?? 0);
      }

      if (available <= 0) {
        Modal.info({
          title: "Out of stock",
          content:
            "This book is currently out of stock. Please check back later or explore other titles.",
          okText: "Got it",
          centered: true,
        });
        message.warning("Out of stock — borrow is not available now.");
        console.log("🟡 Borrow blocked due to zero stock:", { bookId: selectedBook._id, title: selectedBook.title, available });
        return;
      }

      const res = await borrowBook(selectedBook._id, token);
      setSuccessTitle(selectedBook.title);
      showBorrowSuccessModal(selectedBook.title);
      message.success(res.data?.message || `"${selectedBook.title}" borrowed successfully!`);
      setVisible(false);
    } catch (err) {
      console.error("❌ Borrow failed:", err);
      if (err?.__borrowLimit) {
        console.warn("🔴 Borrow limit flagged by interceptor", {
          url: err?.config?.url,
          status: err?.response?.status,
        });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      const backendMsg = extractErrorMessage(err);
      if (isBorrowLimitError(backendMsg)) {
        console.warn("🔴 Borrow limit matched by message", { backendMsg });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      // Fallback: detect by HTTP status and route
      const status = err?.response?.status;
      const url = err?.config?.url || "";
      if (status === 400 && url.includes("/library/borrow/")) {
        console.warn("🔴 Borrow limit fallback by status+route", { status, url });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      message.error(backendMsg || "Borrow failed, please try again!");
    }
  };

  /* =========================================================
     🧱 渲染组件
     ========================================================= */
  const renderModals = () => (
    <>
      {/* Controlled Success Modal to guarantee visibility */}
      <Modal
        open={!!successTitle}
        title={`"${successTitle}" Borrowed Successfully`}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>Your borrow request has been completed. Enjoy reading!</div>
      </Modal>
      {/* Controlled Limit Modal to guarantee visibility */}
      <Modal
        open={limitOpen}
        title="Borrowing Limit Reached"
        onOk={() => setLimitOpen(false)}
        onCancel={() => setLimitOpen(false)}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>
          You have reached the maximum number of borrowed books for the current period. Please return some books before borrowing new ones.
        </div>
      </Modal>

      {/* ✅ Book detail modal */}
      <Modal
        open={visible}
        title={selectedBook?.title}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            Close
          </Button>,
          <Button
            key="detail"
            onClick={() => {
              if (selectedBook) navigate(`/book/${selectedBook._id}`);
            }}
          >
            View Details
          </Button>,
          <Button
            key="borrow"
            type="primary"
            icon={<BookOutlined />}
            onClick={handleBorrow}
          >
            Borrow Now
          </Button>,
        ]}
        onCancel={() => setVisible(false)}
        centered
      >
        {selectedBook && (
          <Card
            cover={
              <img
                src={selectedBook.cover || "https://via.placeholder.com/400x250"}
                alt={selectedBook.title}
                style={{ borderRadius: "8px" }}
              />
            }
          >
            <p>
              <b>Author:</b> {selectedBook.author || "Unknown Author"}
            </p>
            <p>{selectedBook.description || "No description"}</p>
          </Card>
        )}
      </Modal>
    </>
  );

  if (isMobile) {
    return (
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px", color: "#1e293b" }}>
          <FireOutlined style={{ color: "#ff4d4f" }} /> Popular Today
        </h2>
        {/* Horizontal Scroll Container */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "12px",
            paddingBottom: "10px",
            scrollbarWidth: "none", // Hide scrollbar for cleaner look
            msOverflowStyle: "none",
          }}
          className="mobile-scroll-container"
        >
          {loading ? (
             <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "20px" }}><Spin /></div>
          ) : books.length > 0 ? (
            books.map((book, i) => (
              <div
                key={book._id}
                onClick={() => handleBookClick(book)}
                style={{
                  minWidth: "130px",
                  width: "130px",
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  position: "relative",
                  flexShrink: 0,
                  cursor: "pointer"
                }}
              >
                {/* Ranking Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    background: i < 3 ? "#ff4d4f" : "#8c8c8c",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "12px 0 8px 0",
                    fontSize: "12px",
                    fontWeight: "bold",
                    zIndex: 1,
                  }}
                >
                  #{i + 1}
                </div>
                {/* Cover Image */}
                <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: "8px", overflow: "hidden", marginBottom: "8px", background: "#f0f0f0" }}>
                   <img 
                      src={book.cover} 
                      alt={book.title} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src="https://via.placeholder.com/130x190?text=No+Cover";
                      }} 
                   />
                </div>
                {/* Title */}
                <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b" }}>
                  {book.title}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                   {book.author || "Unknown"}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "1rem", color: "#888" }}>No popular books available</div>
          )}
        </div>
        {renderModals()}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(90deg, #001529, #00416A)",
        color: "white",
        padding: "1.2rem 2rem",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        minHeight: "130px",
      }}
    >
      {renderModals()}

      {/* ✅ 标题 */}
      <h2
        style={{
          color: "#fff",
          marginBottom: "0.6rem",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <FireOutlined style={{ color: "#ff7875" }} /> Popular Borrowing List
      </h2>

      {/* ✅ 动态展示当前书籍 */}
      <div style={{ position: "relative", height: "60px" }}>
        {loading ? (
          <Spin size="large" style={{ marginTop: "1rem" }} />
        ) : books.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              style={{
                position: "absolute",
                width: "100%",
                textAlign: "center",
                cursor: "pointer",
              }}
              onClick={() => handleBookClick(books[index])}
            >
              <h3 style={{ color: "#ffd666", margin: "0.2rem 0" }}>No.{index + 1}</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: 500 }}>
                {books[index].title} — {books[index].author || "Unknown Author"}
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p style={{ textAlign: "center", color: "#ccc" }}>No popular books</p>
        )}
      </div>

      {/* ✅ 播放控制按钮 */}
      <div style={{ position: "absolute", right: "1rem", top: "1rem" }}>
        <Button
          type="text"
          icon={
            playing ? (
              <PauseCircleOutlined style={{ fontSize: 24, color: "#fff" }} />
            ) : (
              <PlayCircleOutlined style={{ fontSize: 24, color: "#fff" }} />
            )
          }
          onClick={() => setPlaying(!playing)}
        />
      </div>
    </div>
  );
}

export default PopularBanner;
