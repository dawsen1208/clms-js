import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Button, message, Tag, Typography, theme, Row, Col, Empty, List, Card, Space } from "antd";
import { ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined, BookOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import EditorialPageShell from "../components/common/EditorialPageShell";
import StatCard from "../components/cards/StatCard";
import BookCoverPro from "../components/common/BookCoverPro";
import { stringToWarmColor } from "../utils/hashColor";
import { getCleanImageUrl } from "../utils/imageUtils";
import { getBorrowHistory } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Text, Title } = Typography;

const useReturnData = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const userToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchHistory = useCallback(async () => {
    if (!userToken) return;

    try {
      setLoading(true);
      const res = await getBorrowHistory(userToken);
      let data = res.data || [];
      
      // TODO: Mock Data Injection for Visual Refactoring (Remove in production)
      // If history is empty, inject some mock data to show off the magazine style
      if (data.length === 0) {
        console.log("Injecting mock history data");
        data = [
          { _id: 'h1', bookId: 'm1', title: 'The Design of Everyday Things', action: 'borrow', date: dayjs().subtract(2, 'day').toISOString(), author: 'Don Norman' },
          { _id: 'h2', bookId: 'm2', title: 'Thinking, Fast and Slow', action: 'return', returnDate: dayjs().subtract(5, 'day').toISOString(), date: dayjs().subtract(20, 'day').toISOString(), author: 'Daniel Kahneman' },
          { _id: 'h3', bookId: 'm3', title: 'Dune', action: 'borrow', date: dayjs().subtract(1, 'month').toISOString(), author: 'Frank Herbert' },
          { _id: 'h4', bookId: 'm4', title: 'Atomic Habits', action: 'return', returnDate: dayjs().subtract(10, 'day').toISOString(), date: dayjs().subtract(15, 'day').toISOString(), author: 'James Clear' },
          { _id: 'h5', bookId: 'm5', title: 'Deep Work', action: 'return', returnDate: dayjs().subtract(40, 'day').toISOString(), date: dayjs().subtract(45, 'day').toISOString(), author: 'Cal Newport' },
        ];
      }
      
      setHistory(data);
    } catch (err) {
      console.error("❌ Failed to fetch history:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [userToken, t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stats = useMemo(() => {
    const total = history.length;
    const returned = history.filter(r => r.action === 'return' || !!r.returnDate).length;
    const current = total - returned;
    return { total, returned, current };
  }, [history]);
  
  return {
    t,
    token,
    navigate,
    history,
    loading,
    stats,
    fetchHistory,
  };
};

export const ReturnLeftPanel = () => {
  const { t, token, navigate, history, loading, stats, fetchHistory } = useReturnData();
  const last = history[0];
  const lastCoverImage = last ? getCleanImageUrl(last.coverImage || "") : "";
  const lastCoverSet = last?.coverImageSet;
  const lastCoverSrcSet = lastCoverSet
    ? [
        lastCoverSet.w160 ? `${lastCoverSet.w160} 160w` : null,
        lastCoverSet.w240 ? `${lastCoverSet.w240} 240w` : null,
        lastCoverSet.w360 ? `${lastCoverSet.w360} 360w` : null,
      ].filter(Boolean).join(", ")
    : undefined;
  const lastCoverSizes = "(max-width: 575px) 70px, (max-width: 991px) 80px, 90px";
  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <Title level={3} style={{ marginBottom: 8, fontFamily: "'Literata', serif" }}>
          {t("nav.borrowHistory") || "Reading History"}
        </Title>
        <Text type="secondary">
          {t("history.subtitle") || "A timeline of your literary journey."}
        </Text>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <StatCard 
          title="Books Read" 
          value={stats.total} 
          trend={12}
          trendLabel="this year"
          color={token.colorPrimary}
          loading={loading}
        />
        <StatCard 
          title="Currently Reading" 
          value={stats.current} 
          trend={0}
          trendLabel="active loans"
          color={token.colorWarning}
          loading={loading}
        />
        <StatCard 
          title="Returned" 
          value={stats.returned} 
          trend={5}
          trendLabel="completed"
          color={token.colorSuccess}
          loading={loading}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Quick Actions
        </Text>
        <Space style={{ marginTop: 8 }} wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchHistory}>
            {t("common.refresh")}
          </Button>
          <Button type="default" icon={<BookOutlined />} onClick={() => navigate('/search')}>
            Browse Library
          </Button>
        </Space>
      </div>
      {last && (
        <div style={{ marginTop: "auto" }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Latest Activity
          </Text>
          <Card bordered={false} style={{ marginTop: 8, borderRadius: 12, boxShadow: '0 8px 20px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                {lastCoverImage ? (
                  <img
                    src={lastCoverImage}
                    srcSet={lastCoverSrcSet}
                    sizes={lastCoverSizes}
                    alt={last.title || 'Unknown'}
                    style={{
                      width: 60,
                      height: 90,
                      objectFit: 'cover',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                ) : (
                  <BookCoverPro 
                    title={last.title || 'Unknown'} 
                    author={last.author || 'Unknown'} 
                    width={60} 
                    height={90} 
                    baseColor={stringToWarmColor(last.title || 'U')}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ margin: 0 }}>{last.title || 'Unknown Book'}</Title>
                <Text type="secondary">{last.author || 'Unknown Author'}</Text>
                <div style={{ marginTop: 6 }}>
                  <Tag color={(last.action === 'return' || last.returnDate) ? "success" : "warning"}>
                    {(last.action === 'return' || last.returnDate) ? "Returned" : "Borrowed"}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {dayjs(last.date || last.createdAt).format("MMM D, YYYY")}
                  </Text>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export const ReturnRightPanel = () => {
  const { t, token, navigate, history, loading, stats, fetchHistory } = useReturnData();

  return (
    <EditorialPageShell
      title={t("nav.borrowHistory") || "Reading History"}
      subtitle={t("history.subtitle") || "A timeline of your literary journey."}
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.borrowHistory") }
      ]}
      fullWidth
      headerAction={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchHistory}
          loading={loading}
          type="text"
        >
          {t("common.refresh")}
        </Button>
      }
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
        
        <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
           <Col xs={24} sm={8}>
             <StatCard 
               title="Books Read" 
               value={stats.total} 
               trend={12}
               trendLabel="this year"
               color={token.colorPrimary}
               loading={loading}
             />
           </Col>
           <Col xs={24} sm={8}>
             <StatCard 
               title="Currently Reading" 
               value={stats.current} 
               trend={0}
               trendLabel="active loans"
               color={token.colorWarning}
               loading={loading}
             />
           </Col>
           <Col xs={24} sm={8}>
             <StatCard 
               title="Returned" 
               value={stats.returned} 
               trend={5}
               trendLabel="completed"
               color={token.colorSuccess}
               loading={loading}
             />
           </Col>
        </Row>

        <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 32 }}>Activity Log</Title>
        
        {history.length > 0 ? (
          <div className="editorial-grid">
             {history.map((item, index) => {
                const isReturn = item.action === 'return' || !!item.returnDate;
                const date = item.date || item.createdAt;
                const displayDate = dayjs(date).format("MMM D, YYYY");
                const bookId = item.bookId || item.book?._id;
                const bookTitle = item.title || item.bookTitle || "Unknown Book";
                const bookAuthor = item.author || "Unknown Author"; // Often missing in simple history API, so we might need to mock or fetch
                const coverImage = getCleanImageUrl(item.coverImage || "");
                const coverSet = item.coverImageSet;
                const coverSrcSet = coverSet
                  ? [
                      coverSet.w160 ? `${coverSet.w160} 160w` : null,
                      coverSet.w240 ? `${coverSet.w240} 240w` : null,
                      coverSet.w360 ? `${coverSet.w360} 360w` : null,
                    ].filter(Boolean).join(", ")
                  : undefined;
                const coverSizes = "(max-width: 575px) 70px, (max-width: 991px) 80px, 90px";

                return (
                  <div 
                    key={item._id || index} 
                    className="col-span-12 md:col-span-6"
                    onClick={() => navigate(`/book/${bookId}`)}
                    style={{
                      background: '#fff',
                      border: `1px solid ${token.colorBorderSecondary}`,
                      padding: 24,
                      display: 'flex',
                      gap: 24,
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Status Line */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      background: isReturn ? token.colorSuccess : token.colorWarning
                    }} />

                    {/* Book Cover (Mini) */}
                    <div style={{ flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                      {coverImage ? (
                        <img
                          src={coverImage}
                          srcSet={coverSrcSet}
                          sizes={coverSizes}
                          alt={bookTitle}
                          style={{
                            width: 60,
                            height: 90,
                            objectFit: 'cover',
                            borderRadius: 4,
                            display: 'block',
                          }}
                        />
                      ) : (
                        <BookCoverPro 
                          title={bookTitle} 
                          author={bookAuthor} 
                          width={60} 
                          height={90} 
                          baseColor={stringToWarmColor(bookTitle)}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Tag 
                            color={isReturn ? "success" : "warning"} 
                            style={{ 
                              border: 'none',
                              background: isReturn ? token.colorSuccessBg : token.colorWarningBg,
                              color: isReturn ? token.colorSuccess : token.colorWarning,
                              fontWeight: 600
                            }}
                          >
                             {isReturn ? <><CheckCircleOutlined /> Returned</> : <><BookOutlined /> Borrowed</>}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{displayDate}</Text>
                       </div>
                       
                       <Title level={5} style={{ 
                         fontFamily: "'Literata', serif", 
                         margin: '8px 0 4px',
                         lineHeight: 1.3
                       }}>
                         {bookTitle}
                       </Title>
                       <Text type="secondary" style={{ fontSize: 13 }}>{bookAuthor}</Text>
                    </div>
                  </div>
                );
             })}
          </div>
        ) : (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={<Text type="secondary">No reading history yet. Time to start your first book!</Text>} 
            />
            <Button type="primary" onClick={() => navigate('/search')} style={{ marginTop: 16 }}>
              Browse Library
            </Button>
          </div>
        )}
      </div>
    </EditorialPageShell>
  );
};

function ReturnPage() {
  return <ReturnRightPanel />;
}

export default ReturnPage;
