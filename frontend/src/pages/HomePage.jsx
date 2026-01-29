// ✅ client/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Card, Typography, Spin, message, Statistic, Row, Col, Button, Grid, Modal, Space } from "antd";
import { 
  SearchOutlined, 
  BookOutlined, 
  HistoryOutlined, 
  FireOutlined, 
  SettingOutlined, 
  MessageOutlined, 
  BulbOutlined, 
  ScanOutlined,
  AppstoreOutlined 
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom"; // ✅ Added
import PopularBanner from "../components/PopularBanner";
import { getRecommendations } from "../api"; // ✅ unified API source
import "./HomePage.css";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Paragraph } = Typography;
// const { useBreakpoint } = Grid; // ❌ Moved inside

function HomePage() {
  const { t } = useLanguage();
  const navigate = useNavigate(); // ✅ Added


  const { useBreakpoint } = Grid; // ✅ Moved here
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); // ✅ Flip state
  const [guideModal, setGuideModal] = useState({ open: false, title: "", content: null }); // ✅ Guide Modal State

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const metrics = { rec: recommended.length };
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const guideItems = [
    {
      key: 'search',
      icon: <SearchOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      title: t("common.bookSearch") || "图书搜索",
      content: (
        <div>
          <Paragraph>使用搜索栏查找您感兴趣的图书。</Paragraph>
          <Paragraph>
            <ul>
              <li>支持按书名、作者、ISBN 搜索</li>
              <li>可使用筛选功能精确查找</li>
              <li>点击图书封面查看详细信息</li>
            </ul>
          </Paragraph>
          <Button type="primary" onClick={() => { setGuideModal({ open: false }); navigate('/search'); }}>去搜索</Button>
        </div>
      )
    },
    {
      key: 'borrow',
      icon: <BookOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      title: t("common.borrowManage") || "借阅管理",
      content: (
        <div>
          <Paragraph>查看和管理您当前的借阅状态。</Paragraph>
          <Paragraph>
            <ul>
              <li>查看当前借阅的图书及归还期限</li>
              <li>支持在线续借操作</li>
              <li>查询历史借阅记录</li>
            </ul>
          </Paragraph>
          <Button type="primary" onClick={() => { setGuideModal({ open: false }); navigate('/borrow'); }}>去管理</Button>
        </div>
      )
    },
    {
      key: 'return',
      icon: <ScanOutlined style={{ fontSize: 24, color: '#faad14' }} />,
      title: t("common.returnSystem") || "归还系统",
      content: (
        <div>
          <Paragraph>了解如何归还图书。</Paragraph>
          <Paragraph>
             请前往图书馆柜台或自助归还机进行还书操作。归还后系统会自动更新您的借阅状态。
          </Paragraph>
        </div>
      )
    },
    {
      key: 'smartRec',
      icon: <BulbOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      title: t("common.smartRec") || "智能推荐",
      content: (
        <div>
          <Paragraph>基于您的阅读喜好为您推荐好书。</Paragraph>
          <Paragraph>
            系统会根据您的借阅历史和热门趋势，每日更新推荐书单。
          </Paragraph>
        </div>
      )
    },
    {
      key: 'feedback',
      icon: <MessageOutlined style={{ fontSize: 24, color: '#eb2f96' }} />,
      title: t("common.feedback") || "反馈中心",
      content: (
        <div>
          <Paragraph>您的意见对我们很重要。</Paragraph>
          <Paragraph>
             如果您在使用过程中遇到问题或有任何建议，欢迎通过反馈中心告诉我们。
          </Paragraph>
          <Button type="primary" onClick={() => { setGuideModal({ open: false }); navigate('/feedback'); }}>去反馈</Button>
        </div>
      )
    },
    {
      key: 'settings',
      icon: <SettingOutlined style={{ fontSize: 24, color: '#13c2c2' }} />,
      title: t("settings.settings") || "设置",
      content: (
        <div>
          <Paragraph>个性化您的应用体验。</Paragraph>
          <Paragraph>
            <ul>
              <li>切换语言 (中文/English)</li>
              <li>调整字体大小和主题颜色</li>
              <li>开启无障碍功能 (TTS, 高对比度)</li>
            </ul>
          </Paragraph>
          <Button type="primary" onClick={() => { setGuideModal({ open: false }); navigate('/settings'); }}>去设置</Button>
        </div>
      )
    }
  ];

  const titleStyle = {
    background: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: "16px",
    fontWeight: "bold"
  };

  /* =========================================================
     📚 Fetch popular recommendations (backend logic)
     ========================================================= */
  const fetchRecommendations = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      const { popularBooks } = await import("../data/booksData");

      const normalizeBooks = (books) =>
        (books || []).map((book, index) => {
          // 1. Try to find static cover match by ID (using imported popularBooks)
          const staticMatch = popularBooks.find(b => b._id === book._id);

          // 2. Resolve cover from various properties
          let cover =
            book.cover ||
            book.coverUrl ||
            book.image ||
            book.imageUrl;

          // 3. If no cover, fallback to static match
          if (!cover && staticMatch?.cover) {
            cover = staticMatch.cover;
          }

          // 4. If still no cover, fallback to popularBooks by index (cycling)
          if (!cover && popularBooks.length > 0) {
            const fallbackBook = popularBooks[index % popularBooks.length];
            cover = fallbackBook.cover;
          }

          // 5. Last resort default
          if (!cover) cover = "/books/cleancode.jpg";

          // 6. URL Normalization (Cloud/Backend compatibility)
          if (typeof cover === "string") {
            if (cover.startsWith("http") || cover.startsWith("data:")) {
              // Absolute URL, keep it
            } else if (cover.startsWith("/books/")) {
              // Static asset, keep it
            } else {
              // Backend relative path -> prepend API base
              const apiBase = import.meta.env.VITE_API_BASE;
              if (apiBase) {
                const cleanBase = apiBase.replace(/\/$/, "");
                const cleanPath = cover.startsWith("/") ? cover : `/${cover}`;
                cover = `${cleanBase}${cleanPath}`;
              }
            }
          }
          return { ...book, cover };
        });

      const backendBooks = res.data?.recommended || [];
      if (backendBooks.length) {
        setRecommended(normalizeBooks(backendBooks));
      } else {
        setRecommended(normalizeBooks(popularBooks));
      }
    } catch (err) {
      console.error("❌ Failed to fetch recommendations:", err);
      const { popularBooks } = await import("../data/booksData");
      setRecommended(popularBooks);
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
        {/* ✅ 1. Welcome Flip Card (Mobile) */}
        <div className={`flip-card-container ${isFlipped ? "flipped" : ""}`} onClick={() => setIsFlipped(!isFlipped)}>
          <div className="flip-card-inner">
            {/* Front Side */}
            <div className="flip-card-front">
              <Card className="welcome-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Title level={2} className="page-modern-title" style={{ textAlign: "center", width: "100%", fontSize: "1.5rem" }}>
                  👋 {t("common.welcome")}
                </Title>
                <Paragraph className="home-paragraph" style={{ fontSize: "0.9rem" }}>
                  {t("common.welcomeDesc")}
                </Paragraph>
                <div className="flip-hint">
                  <span role="img" aria-label="touch">👆</span> {t("common.clickToViewGuide")}
                </div>
              </Card>
            </div>

            {/* Back Side */}
            <div className="flip-card-back">
              <Card className="welcome-card" bodyStyle={{ padding: '12px' }} style={{ height: '100%', overflow: 'hidden' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '10px', 
                  height: '100%', 
                  alignContent: 'center' 
                }}>
                  {guideItems.map(item => (
                    <div 
                      key={item.key}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent flip
                        setGuideModal({ open: true, title: item.title, content: item.content });
                      }}
                      style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ marginBottom: '6px' }}>{item.icon}</div>
                      <Typography.Text style={{ fontSize: '13px', fontWeight: '500', color: '#334155' }}>{item.title}</Typography.Text>
                    </div>
                  ))}
                </div>
                <div className="flip-hint" style={{ bottom: '8px', right: '12px' }}>
                  <span role="img" aria-label="back">↩️</span> {t("common.clickToBack")}
                </div>
              </Card>
            </div>
          </div>
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
                onClick={() => navigate('/search')}
                style={{ height: '48px', borderRadius: '12px', background: '#3b82f6', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
              >
                {t("common.searchBooks")}
              </Button>
            </Col>
            <Col span={12}>
              <Button 
                type="default" 
                size="large" 
                block 
                icon={<BookOutlined />}
                onClick={() => navigate('/borrow')}
                style={{ height: '48px', borderRadius: '12px', borderColor: '#cbd5e1', color: '#475569' }}
              >
                {t("titles.myBorrowings")}
              </Button>
            </Col>
          </Row>
        </div>

        {/* ✅ 3. Popular Borrowing List (Horizontal Scroll) */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={5} style={{ margin: 0, fontSize: '18px' }}>{t("titles.popularToday")}</Title>
            <Button type="link" size="small" onClick={() => navigate('/search')} style={{ color: '#3b82f6' }}>{t("common.viewAll")}</Button>
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
                   onClick={() => navigate(`/book/${book._id}`)}
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
                        top: '8px', right: '8px', left: 'auto',
                        background: index < 3 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(148, 163, 184, 0.9)', 
                        color: '#fff', 
                        minWidth: '24px', height: '24px', 
                        borderRadius: '12px', 
                        padding: '0 6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 'bold',
                        zIndex: 1,
                        backdropFilter: 'blur(4px)'
                      }}>
                        #{index + 1}
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
                      <span>{book.borrowCount || Math.floor(Math.random() * 50) + 10} {t("common.borrows")}</span>
                   </div>
                 </Card>
               ))}
             </div>
          )}
        </div>

        {/* ✅ 4. Recommended (Vertical List) - Keeping existing logic but simplified */}
        <div style={{ marginBottom: '20px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={5} style={{ margin: 0, fontSize: '18px' }}>{t("titles.recommended")}</Title>
           </div>
           
           {loading ? <Spin /> : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               {recommended.slice(0, 5).map(book => (
                 <div key={book._id} 
                      onClick={() => navigate(`/book/${book._id}`)}
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
                        <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px' }}>{book.category || t("common.general")}</span>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
        <Modal
          title={guideModal.title}
          open={guideModal.open}
          onCancel={() => setGuideModal({ ...guideModal, open: false })}
          footer={null}
          centered
          destroyOnClose
        >
          {guideModal.content}
        </Modal>
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

      {/* ✅ Welcome Flip Card */}
      <div className={`flip-card-container ${isFlipped ? "flipped" : ""}`} onClick={() => setIsFlipped(!isFlipped)}>
        <div className="flip-card-inner">
          {/* Front Side */}
          <div className="flip-card-front">
            <Card className="welcome-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Title level={2} className="page-modern-title" style={{ textAlign: "center", width: "100%" }}>
                {t("common.welcomeFull")}
              </Title>
              <Paragraph className="home-paragraph">
                {t("common.welcomeDesc")}
              </Paragraph>
              <div className="flip-hint">
                <span role="img" aria-label="touch">👆</span> {t("common.clickToViewGuide")}
              </div>
            </Card>
          </div>

          {/* Back Side */}
          <div className="flip-card-back">
            <Card className="welcome-card" bodyStyle={{ padding: '20px' }} style={{ height: '100%', overflow: 'hidden' }}>
               <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '16px', 
                  height: '100%', 
                  alignContent: 'center' 
                }}>
                  {guideItems.map(item => (
                    <div 
                      key={item.key}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent flip
                        setGuideModal({ open: true, title: item.title, content: item.content });
                      }}
                      style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        height: '100%'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#eef2ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      <div style={{ marginBottom: '8px' }}>{item.icon}</div>
                      <Typography.Text style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{item.title}</Typography.Text>
                    </div>
                  ))}
                </div>
              <div className="flip-hint" style={{ bottom: '12px', right: '20px' }}>
                <span role="img" aria-label="back">↩️</span> {t("common.clickToBack")}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ✅ System overview */}
      <Card className="overview-card">
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(59, 130, 246, 0.1)", borderRadius: "12px" }}>
              <Statistic title={t("titles.popularToday")} value={metrics.rec} valueStyle={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "12px" }}>
              <Statistic title={t("common.fastSearch")} value={"⚡"} valueStyle={{ color: '#10b981', fontSize: '24px' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "12px" }}>
              <Statistic title={t("common.easyBorrow")} value={"📚"} valueStyle={{ color: '#f59e0b', fontSize: '24px' }} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: "center", padding: "20px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "12px" }}>
              <Statistic title={t("common.simpleReturn")} value={"✅"} valueStyle={{ color: '#ef4444', fontSize: '24px' }} />
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
        <Title level={4} className="system-overview-title">✨ {t("common.systemOverview")}</Title>
        <ul className="system-overview-list">
          <li>📖 <b>{t("common.bookSearch")}:</b> {t("common.bookSearchDesc")}</li>
          <li>📗 <b>{t("common.borrowManage")}:</b> {t("common.borrowManageDesc")}</li>
          <li>📘 <b>{t("common.returnSystem")}:</b> {t("common.returnSystemDesc")}</li>
          <li>🤖 <b>{t("common.smartRec")}:</b> {t("common.smartRecDesc")}</li>
          <li>👤 <b>{t("common.profile")}:</b> {t("common.profileDesc")}</li>
        </ul>
        </div>
      </Card>

      <div style={{ textAlign: "center", marginTop: "40px", color: "#94a3b8", paddingBottom: "20px" }}>
        © 2024 CLMS Library System | v1.3.0 (Fixed Mobile Borrow & UI)
      </div>

      {/* ✅ Guide Modal */}
      <Modal
        title={guideModal.title}
        open={guideModal.open}
        onCancel={() => setGuideModal({ ...guideModal, open: false })}
        footer={null}
        centered
        destroyOnClose
      >
        {guideModal.content}
      </Modal>
    </div>
  );
}

export default HomePage;
