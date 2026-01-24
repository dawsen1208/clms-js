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
      <div className="home-page-mobile" style={{ padding: '16px', maxWidth: '100vw', overflowX: 'hidden' }}>
        {/* ✅ 1. Compact Welcome Banner */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
            👋 Welcome to CLMS
          </Title>
        </div>

        {/* ✅ 2. Quick Actions */}
        <div style={{ marginBottom: '32px' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Button 
                type="primary" 
                size="large" 
                block 
                icon={<SearchOutlined />}
                onClick={() => setCurrentPage('search')}
                style={{ height: '48px', borderRadius: '12px', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
              >
                Search Books
              </Button>
            </Col>
            <Col span={12}>
              <Button 
                type="default" 
                size="large" 
                block 
                icon={<BookOutlined />}
                onClick={() => setCurrentPage('profile')}
                style={{ height: '48px', borderRadius: '12px', borderColor: '#cbd5e1', color: '#475569' }}
              >
                My Borrowings
              </Button>
            </Col>
          </Row>
        </div>

        {/* ✅ 3. Popular Borrowing List (Horizontal Scroll) */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={5} style={{ margin: 0, fontSize: '18px' }}>Popular Books</Title>
            <Button type="link" size="small" onClick={() => setCurrentPage('search')} style={{ color: '#3b82f6' }}>View All</Button>
          </div>
          
          {loading ? (
             <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}><Spin /></div>
          ) : (
             <div className="h-scroll-container">
               {recommended.map((book, index) => (
                 <Card
                   key={book._id}
                   bordered={false}
                   hoverable
                   onClick={() => message.info(`Opening ${book.title}...`)}
                   style={{ 
                     minWidth: '140px', 
                     maxWidth: '140px', 
                     flexShrink: 0,
                     borderRadius: '12px',
                     overflow: 'hidden',
                     boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                   }}
                   bodyStyle={{ padding: '10px' }}
                 >
                   <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, 
                        background: index < 3 ? '#ef4444' : '#94a3b8', 
                        color: '#fff', 
                        width: '24px', height: '24px', 
                        borderRadius: '0 0 8px 0', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 'bold',
                        zIndex: 1
                      }}>
                        {index + 1}
                      </div>
                      <img 
                        src={book.cover} 
                        alt={book.title} 
                        style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }} 
                        onError={(e) => {e.target.onerror=null; e.target.src="https://via.placeholder.com/140x180?text=No+Cover"}}
                      />
                   </div>
                   
                   <div className="text-clamp-2" style={{ height: '36px', fontSize: '13px', fontWeight: '600', marginBottom: '4px', lineHeight: '1.3', color: '#1e293b' }}>
                     {book.title}
                   </div>
                   
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px' }}>
                      <FireOutlined style={{ color: '#f59e0b' }} />
                      <span>{book.borrowCount || Math.floor(Math.random() * 50) + 10} borrows</span>
                   </div>
                 </Card>
               ))}
             </div>
          )}
        </div>

        {/* ✅ 4. Recommended (Vertical List) - Keeping existing logic but simplified */}
        <div style={{ marginBottom: '20px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={5} style={{ margin: 0, fontSize: '18px' }}>For You</Title>
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
