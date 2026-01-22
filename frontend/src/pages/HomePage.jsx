// ✅ client/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Card, Typography, Spin, message, Statistic, Row, Col } from "antd";
import PopularBanner from "../components/PopularBanner";
import { getRecommendations } from "../api"; // ✅ unified API source
import "./HomePage.css";

const { Title, Paragraph } = Typography;

function HomePage() {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const metrics = { rec: recommended.length };

  /* =========================================================
     📚 Fetch popular recommendations (backend logic)
     ========================================================= */
  const fetchRecommendations = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      setRecommended(res.data.recommended || []);
    } catch (err) {
      console.error("❌ Failed to fetch recommendations:", err);
      message.error("Unable to load popular recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="home-page" style={{ 
      display: "flex", 
      flexDirection: "column", 
      gap: "2rem", 
      padding: "2rem",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "calc(100vh - 64px)"
    }}>
      {/* ✅ 热门借阅榜（动态数据） */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <PopularBanner books={recommended} />
      )}

      {/* ✅ Welcome card */}
      <Card className="welcome-card" style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
        borderRadius: "16px"
      }}>
        <Title
          level={3}
          style={{ color: "#3b82f6", marginBottom: "1rem", fontWeight: 700, textAlign: "center" }}
        >
          📚 Welcome to Community Library Management System
        </Title>

        <Paragraph
          style={{
            fontSize: "1.1rem",
            textAlign: "center",
            lineHeight: 1.7,
            color: "#475569",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          This is an intelligent library system designed for community readers.
          You can quickly navigate via the left menu to search, borrow, return,
          and your profile modules. The system includes smart recommendations
          and smart comparisons to make borrowing more convenient and efficient.
        </Paragraph>
      </Card>

      {/* ✅ System overview */}
      <Card className="overview-card" style={{
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.1)",
        borderRadius: "16px"
      }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "12px" }}>
              <Statistic title="Popular Books" value={metrics.rec} valueStyle={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "12px" }}>
              <Statistic title="Fast Search" value={"⚡"} valueStyle={{ color: '#10b981', fontSize: '24px' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px" }}>
              <Statistic title="Easy Borrow" value={"📚"} valueStyle={{ color: '#f59e0b', fontSize: '24px' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px" }}>
              <Statistic title="Simple Return" value={"✅"} valueStyle={{ color: '#ef4444', fontSize: '24px' }} />
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
        <Title level={4} style={{ color: '#1e293b', textAlign: 'center', marginBottom: '1.5rem' }}>✨ System Overview</Title>
        <ul
          style={{
            listStyleType: "none",
            paddingLeft: "1rem",
            color: "#475569",
            textAlign: "center",
            fontSize: "1.05rem",
            lineHeight: 1.8,
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <li>📖 <b>Book Search:</b> Quickly find collection info and available copies.</li>
          <li>📗 <b>Borrow Management:</b> One-click borrow and renew operations.</li>
          <li>📘 <b>Return System:</b> Conveniently return books and update inventory.</li>
          <li>🤖 <b>Smart Recommendations:</b> Personalized suggestions based on reading history.</li>
          <li>👤 <b>Profile:</b> View borrow history and recommended books.</li>
        </ul>
        </div>
      </Card>
    </div>
  );
}

export default HomePage;
