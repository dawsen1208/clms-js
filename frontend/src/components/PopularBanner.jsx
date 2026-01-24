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
import { useLanguage } from "../contexts/LanguageContext"; // ✅ Localization

const { useBreakpoint } = Grid;

function PopularBanner() {
  const { t } = useLanguage();
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
        message.info(t("popular.noRecs"));
      }
    } catch (err) {
      console.error("❌ Failed to fetch popular recommendations:", err);
      message.error(t("popular.loadFail"));
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
      message.error(t("popular.loginFirst"));
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
          title: t("popular.outOfStockTitle"),
          content: t("popular.outOfStockMsg"),
          okText: t("popular.gotIt"),
          centered: true,
        });
        message.warning(t("popular.outOfStockWarn"));
        console.log("🟡 Borrow blocked due to zero stock:", { bookId: selectedBook._id, title: selectedBook.title, available });
        return;
      }

      const res = await borrowBook(selectedBook._id, token);
      setSuccessTitle(selectedBook.title);
      showBorrowSuccessModal(selectedBook.title);
      message.success(res.data?.message || t("search.borrowSuccessMsg", { title: selectedBook.title }));
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
      message.error(backendMsg || t("popular.borrowFail"));
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
        title={`"${successTitle}" ${t("popular.successTitle")}`}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>{t("popular.successMsg")}</div>
      </Modal>
      {/* Controlled Limit Modal to guarantee visibility */}
      <Modal
        open={limitOpen}
        title={t("popular.limitTitle")}
        onOk={() => setLimitOpen(false)}
        onCancel={() => setLimitOpen(false)}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>
          {t("popular.limitMsg")}
        </div>
      </Modal>

      {/* ✅ Book detail modal */}
      <Modal
        open={visible}
        title={selectedBook?.title}
        footer={[
          <Button key="close" onClick={() => setVisible(false)}>
            {t("common.close")}
          </Button>,
          <Button
            key="detail"
            onClick={() => {
              if (selectedBook) navigate(`/book/${selectedBook._id}`);
            }}
          >
            {t("common.details")}
          </Button>,
          <Button
            key="borrow"
            type="primary"
            icon={<BookOutlined />}
            onClick={handleBorrow}
          >
            {t("common.borrowNow")}
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
              <b>Author:</b> {selectedBook.author || t("common.unknown")}
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
          <FireOutlined style={{ color: "#ff4d4f" }} /> {t("titles.popularToday")}
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
                  cursor: "pointer",
                  transition: "transform 0.2s"
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {/* Ranking Badge - Adjusted to not obstruct */}
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    left: "auto",
                    background: i < 3 ? "rgba(255, 77, 79, 0.9)" : "rgba(0, 0, 0, 0.6)",
                    color: "#fff",
                    minWidth: "24px",
                    height: "24px",
                    padding: "0 6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    zIndex: 2,
                    backdropFilter: "blur(4px)"
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
                <div style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b", marginBottom: "2px" }}>
                  {book.title}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                   {book.author || t("common.unknown")}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "1rem", color: "#888" }}>{t("titles.popularToday")}</div>
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
        <FireOutlined style={{ color: "#ff7875" }} /> {t("titles.popularToday")}
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
                {books[index].title} — {books[index].author || t("common.unknown")}
              </p>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p style={{ textAlign: "center", color: "#ccc" }}>{t("titles.popularToday")}</p>
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
