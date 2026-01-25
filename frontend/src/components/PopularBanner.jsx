// ✅ client/src/components/PopularBanner.jsx
import { useState, useEffect } from "react";
import { Button, Modal, message, Spin, Grid } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FireOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

function PopularBanner({ books = [] }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  // 🔄 自动轮播逻辑
  useEffect(() => {
    if (!playing || books.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % books.length);
    }, 4000); // 稍微放慢轮播速度
    return () => clearInterval(timer);
  }, [playing, books]);

  // 🖱️ 点击跳转详情
  const handleBookClick = (book) => {
    if (book?._id) {
      navigate(`/book/${book._id}`);
    } else if (book?.id) {
       navigate(`/book/${book.id}`);
    }
  };

  if (isMobile) {
    // 📱 移动端视图：简单的标题展示，具体列表由父组件 HomePage 处理
    // 或者如果需要复用 Banner，也可以在这里渲染，但根据 HomePage 代码，移动端列表是在 HomePage 内部渲染的
    return null; 
  }

  // 💻 桌面端视图
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(90deg, #001529, #00416A)",
        color: "white",
        padding: "1.5rem 2rem",
        borderRadius: "16px",
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        minHeight: "160px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div style={{ flex: 1, zIndex: 2 }}>
        <h2
          style={{
            color: "#fff",
            marginBottom: "0.5rem",
            fontWeight: 700,
            fontSize: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
          }}
        >
          <FireOutlined style={{ color: "#ff7875" }} /> {t("titles.popularToday")}
        </h2>

        <div style={{ position: "relative", height: "80px", marginTop: "10px" }}>
          {books.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: "absolute",
                  width: "100%",
                  cursor: "pointer",
                }}
                onClick={() => handleBookClick(books[index])}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ 
                    background: "#ffd666", 
                    color: "#000", 
                    fontWeight: "bold", 
                    padding: "2px 10px", 
                    borderRadius: "12px",
                    fontSize: "0.9rem"
                  }}>
                    #{index + 1}
                  </div>
                  <div>
                    <h3 style={{ color: "#fff", margin: 0, fontSize: "1.4rem", fontWeight: 600 }}>
                      {books[index].title}
                    </h3>
                    <p style={{ margin: 0, opacity: 0.9, fontSize: "1rem" }}>
                      {books[index].author || t("common.unknown")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <p style={{ color: "#ccc" }}>{t("popular.noRecs")}</p>
          )}
        </div>
      </div>

      {/* 封面预览 (桌面端增强) */}
      {books.length > 0 && (
        <motion.div
           key={`cover-${index}`}
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5 }}
           style={{ 
             width: "100px", 
             height: "140px", 
             borderRadius: "8px", 
             overflow: "hidden", 
             boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
             flexShrink: 0,
             marginLeft: "20px",
             cursor: "pointer",
             border: "2px solid rgba(255,255,255,0.2)"
           }}
           onClick={() => handleBookClick(books[index])}
        >
          <img 
            src={books[index].cover} 
            alt={books[index].title} 
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/100x140?text=No+Cover";
            }}
          />
        </motion.div>
      )}

      {/* 播放控制 */}
      <div style={{ position: "absolute", right: "1rem", top: "1rem", zIndex: 3 }}>
        <Button
          type="text"
          icon={
            playing ? (
              <PauseCircleOutlined style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }} />
            ) : (
              <PlayCircleOutlined style={{ fontSize: 24, color: "rgba(255,255,255,0.6)" }} />
            )
          }
          onClick={(e) => {
            e.stopPropagation();
            setPlaying(!playing);
          }}
        />
      </div>
    </div>
  );
}

export default PopularBanner;
