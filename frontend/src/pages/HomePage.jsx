// ✅ client/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Card, Typography, Spin, message, Statistic, Row, Col, Button, Grid } from "antd";
import { SearchOutlined, BookOutlined, HistoryOutlined } from "@ant-design/icons";
import PopularBanner from "../components/PopularBanner";
import { getRecommendations } from "../api"; // ✅ unified API source
import "./HomePage.css";

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

function HomePage({ setCurrentPage }) {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const metrics = { rec: recommended.length };
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  /* =========================================================
     📱 Mobile View
     ========================================================= */
  if (isMobile) {
    return (
      <div className="home-page-mobile" style={{ padding: '0 20px 40px 20px', maxWidth: '100vw', overflowX: 'hidden' }}>
        {/* ✅ 1. Compact Welcome Banner */}
        <div style={{ 
          height: '64px', 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '10px' 
        }}>
          <Typography.Text style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
            👋 Welcome back
          </Typography.Text>
        </div>

        {/* ✅ 2. Popular Borrowing List (Horizontal) */}
        {/* PopularBanner handles mobile layout internally */}
        <div style={{ marginBottom: '30px' }}>
          {loading ? (
             <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}><Spin /></div>
          ) : (
             <PopularBanner books={recommended} />
          )}
        </div>

        {/* ✅ 3. Quick Actions */}
        <div style={{ marginBottom: '32px' }}>
          <Typography.Text strong style={{ fontSize: '20px', color: '#1e293b', display: 'block', marginBottom: '16px' }}>
            Quick Actions
          </Typography.Text>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div 
                onClick={() => setCurrentPage('search')}
                style={{ 
                  background: '#F8FAFC', 
                  borderRadius: '16px', 
                  padding: '16px 8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  height: '100px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SearchOutlined style={{ fontSize: '20px', color: '#3b82f6' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Search</span>
              </div>
            </Col>
            <Col span={8}>
              <div 
                onClick={() => setCurrentPage('profile')}
                style={{ 
                  background: '#F8FAFC', 
                  borderRadius: '16px', 
                  padding: '16px 8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  height: '100px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOutlined style={{ fontSize: '20px', color: '#10b981' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>My Books</span>
              </div>
            </Col>
            <Col span={8}>
              <div 
                onClick={() => setCurrentPage('profile')}
                style={{ 
                  background: '#F8FAFC', 
                  borderRadius: '16px', 
                  padding: '16px 8px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  height: '100px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HistoryOutlined style={{ fontSize: '20px', color: '#f59e0b' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>History</span>
              </div>
            </Col>
          </Row>
        </div>

        {/* ✅ 4. Recommended (Vertical List) */}
        <div>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Typography.Text strong style={{ fontSize: '20px', color: '#1e293b' }}>Recommended</Typography.Text>
              <Button type="link" size="small" onClick={() => setCurrentPage('search')} style={{ color: '#3b82f6', fontWeight: '600' }}>See All</Button>
           </div>
           
           {loading ? <Spin /> : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {recommended.slice(0, 5).map(book => (
                 <div key={book._id} 
                      onClick={() => message.info(`Opening ${book.title}...`)}
                      style={{ 
                        display: 'flex', 
                        gap: '16px', 
                        alignItems: 'center', 
                        padding: '12px', 
                        background: '#fff', 
                        borderRadius: '16px', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        border: '1px solid #f1f5f9'
                      }}>
                    <div style={{ width: '56px', height: '80px', borderRadius: '8px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {e.target.onerror=null; e.target.src="https://via.placeholder.com/56x80?text=No+Cover"}}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Text strong ellipsis style={{ fontSize: '16px', color: '#1e293b', display: 'block', marginBottom: '4px' }}>{book.title}</Typography.Text>
                      <Typography.Text ellipsis type="secondary" style={{ fontSize: '14px' }}>{book.author}</Typography.Text>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>{book.category || 'General'}</span>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* ✅ 热门借阅榜（动态数据） */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
          <Spin size="large" />
        </div>
      ) : (
        <PopularBanner books={recommended} />
      )}

      {/* ✅ Welcome card */}
      <Card className="welcome-card">
        <Title level={3} className="home-title">
          📚 Welcome to Community Library Management System
        </Title>

        <Paragraph className="home-paragraph">
          This is an intelligent library system designed for community readers.
          You can quickly navigate via the left menu to search, borrow, return,
          and your profile modules. The system includes smart recommendations
          and smart comparisons to make borrowing more convenient and efficient.
        </Paragraph>
      </Card>

      {/* ✅ System overview */}
      <Card className="overview-card">
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
        <Title level={4} className="system-overview-title">✨ System Overview</Title>
        <ul className="system-overview-list">
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
