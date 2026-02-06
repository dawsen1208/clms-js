// ✅ client/src/pages/SmartAssistant.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  List,
  Button,
  message,
  Spin,
  Table,
  Checkbox,
  Divider,
  Input,
  Pagination,
  Modal,
  Slider,
  Space,
  Typography,
  Statistic,
  Tag,
  InputNumber,
  Collapse,
  Radio,
  Row,
  Col,
  Empty,
  Drawer,
  Tooltip
} from "antd";
import { Grid } from "antd";
import "./SmartAssistant.css";
import {
  RobotOutlined,
  BookOutlined,
  BarChartOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  SettingOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import {
  getRecommendations,
  getBooks,
  borrowBook,
  getBookDetail,
  getBookComparison, 
  getBooksLibrary 
} from "../api";
import { isBorrowLimitError, extractErrorMessage } from "../utils/borrowUI";
import RadarChart from "../components/RadarChart.jsx";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { theme } from "../styles/theme";

const { Title, Text, Paragraph } = Typography;

function SmartAssistant() {
  const { t, language } = useLanguage();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  /* =========================================================
     🤖 Smart Recommendations
     ========================================================= */
  const [recommends, setRecommends] = useState([]);
  const [strategy, setStrategy] = useState(t("assistant.generating"));
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  
  // Controlled modals
  const [limitOpen, setLimitOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");

  const formatStrategy = (s) => {
    if (!s) return t("assistant.basedOnHistory");
    let tStr = String(s);
    if (language === 'zh') return tStr;

    tStr = tStr.replace("基于您偏借类别", t("assistant.basedOnPreferred"));
    tStr = tStr.replace("基于您常借类别", t("assistant.basedOnPreferred"));
    tStr = tStr.replace("未借阅用户推荐：", t("assistant.forNewUsers"));
    tStr = tStr.replace("全馆最热TOP3", t("assistant.top3LibraryHot"));
    tStr = tStr.replace(/[📚📖⭐️✨🌟📈]/g, "");
    tStr = tStr.replace(/\*+/g, "");
    tStr = tStr.replace(/推荐(?:\s)*$/g, "");
    tStr = tStr.replace(/\s{2,}/g, " ").trim();
    tStr = tStr.replace(/未知/g, t("common.unknown"));
    return tStr;
  };

  const fetchRecommendations = async () => {
    if (!token) return; // Silent return if no token, handled by UI
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      const data = res.data || {};
      let recs = data.recommended || [];
      
      // Client-side filtering based on local prefs (legacy support)
      try {
        const raw = localStorage.getItem('recommend_prefs');
        if (raw) {
          const prefs = JSON.parse(raw);
          const include = Array.isArray(prefs.preferredCategories) ? prefs.preferredCategories : [];
          const exclude = Array.isArray(prefs.excludedCategories) ? prefs.excludedCategories : [];
          if (include.length > 0) recs = recs.filter(b => include.includes(b.category));
          if (exclude.length > 0) recs = recs.filter(b => !exclude.includes(b.category));
        }
      } catch {}

      setRecommends(recs);
      setStrategy(formatStrategy(data.strategy));
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      // Don't show error immediately on load to avoid spam
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (bookId, title, copies) => {
    if (!token) return message.warning(t("assistant.loginToBorrow"));
    try {
      // Optimistic check
      if (copies <= 0) {
         // Double check with API if needed, but for UI responsiveness we warn first
         const detail = await getBookDetail(bookId);
         if ((detail?.data?.copies ?? 0) <= 0) {
            message.warning(t("assistant.borrowUnavailable"));
            return;
         }
      }

      const res = await borrowBook(bookId, token);
      setSuccessTitle(title);
      fetchRecommendations(); 
    } catch (err) {
      if (err?.__borrowLimit || isBorrowLimitError(extractErrorMessage(err))) {
        setLimitOpen(true);
        return;
      }
      message.error(extractErrorMessage(err) || t("assistant.borrowFailed"));
    }
  };

  useEffect(() => {
    setStrategy(prev => formatStrategy(prev)); 
  }, [language]);

  useEffect(() => {
    if (token) fetchRecommendations();
  }, [token]);

  /* =========================================================
     📊 Smart Comparison
     ========================================================= */
  const [allBooks, setAllBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Weights & Settings
  const DEFAULT_WEIGHTS = { rating: 0.3, popularity: 0.25, availability: 0.25, recency: 0.1, match: 0.1 };
  const [windowDays, setWindowDays] = useState(30);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpData, setCmpData] = useState(null);
  const [radarMode, setRadarMode] = useState("custom");
  const [weightsDrawerOpen, setWeightsDrawerOpen] = useState(false);

  const fetchAllBooks = async () => {
    try {
      const res = await getBooksLibrary().catch(() => getBooks());
      const list = res?.data || [];
      setAllBooks(list);
      setFilteredBooks(list);
    } catch (err) {
      console.error("Failed to fetch books:", err);
    }
  };

  useEffect(() => {
    fetchAllBooks();
    try {
      const raw = localStorage.getItem('compare_ids');
      if (raw) setSelectedIds(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('compare_ids', JSON.stringify(selectedIds));
  }, [selectedIds]);

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    const filtered = allBooks.filter(
      (book) =>
        book.title?.toLowerCase().includes(value) ||
        book.author?.toLowerCase().includes(value)
    );
    setFilteredBooks(filtered);
    setCurrentPage(1);
  };

  const handleSelect = (bookId) => {
    setSelectedIds((prev) => {
      if (prev.includes(bookId)) return prev.filter((id) => id !== bookId);
      if (prev.length < 5) return [...prev, bookId];
      message.warning(t("assistant.selectLimit"));
      return prev;
    });
  };

  const startIdx = (currentPage - 1) * pageSize;
  const paginatedBooks = filteredBooks.slice(startIdx, startIdx + pageSize);

  const handleCompare = async () => {
    if (selectedIds.length < 2) return message.warning(t("assistant.selectRange"));
    setCmpLoading(true);
    try {
      const res = await getBookComparison(selectedIds, windowDays);
      setCmpData(res);
      message.success(t("assistant.compareUpdated"));
    } catch (err) {
      message.error(t("assistant.compareFailed"));
    } finally {
      setCmpLoading(false);
    }
  };

  const resultsWithCustomScore = useMemo(() => {
    if (!cmpData?.results) return [];
    return cmpData.results.map((r) => {
      const m = r.metrics || {};
      const customScore =
        (weights.rating || 0) * (m.rating || 0) +
        (weights.popularity || 0) * (m.popularity || 0) +
        (weights.availability || 0) * (m.availability || 0) +
        (weights.recency || 0) * (m.recency || 0) +
        (weights.match || 0) * (m.match || 0);
      return { ...r, customScore: Math.round(customScore * 1000) / 1000 };
    });
  }, [cmpData, weights]);

  const radarSeries = useMemo(() => {
    if (!cmpData?.results) return [];
    const useW = radarMode === "default" ? DEFAULT_WEIGHTS : weights;
    const scoreOf = (m) =>
      (useW.rating || 0) * (m.rating || 0) +
      (useW.popularity || 0) * (m.popularity || 0) +
      (useW.availability || 0) * (m.availability || 0) +
      (useW.recency || 0) * (m.recency || 0) +
      (useW.match || 0) * (m.match || 0);
    return cmpData.results.map((r) => {
      const m = r.metrics || {};
      return {
        name: r.book?.title || t("common.unknown"),
        metrics: {
          rating: (m.rating || 0) * (useW.rating || 0),
          popularity: (m.popularity || 0) * (useW.popularity || 0),
          availability: (m.availability || 0) * (useW.availability || 0),
          recency: (m.recency || 0) * (useW.recency || 0),
          match: (m.match || 0) * (useW.match || 0),
          customScore: Math.round(scoreOf(m) * 1000) / 1000,
        },
      };
    });
  }, [cmpData, weights, radarMode]);

  const weightSum = useMemo(() => {
    return Object.values(weights).reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0);
  }, [weights]);

  const metricsColumns = [
    {
      title: t("assistant.book"),
      dataIndex: ["book", "title"],
      key: "title",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: theme.token.colorPrimary }}>{row.book.title}</div>
          <div style={{ color: "#888", fontSize: 12 }}>{row.book.author}</div>
        </div>
      ),
    },
    { title: t("assistant.scoreCustom"), dataIndex: "customScore", key: "customScore", sorter: (a, b) => b.customScore - a.customScore, render: (v) => <b>{v}</b> },
    { title: t("assistant.ratings"), key: "ratings", render: (_, row) => <span>{row.book.ratingAvg ?? 0}</span>, responsive: ['md'] },
    { title: t("assistant.availability"), key: "availability", render: (_, row) => <span>{row.book.copies}</span>, responsive: ['md'] },
  ];

  /* =========================================================
     🧱 Render Helpers
     ========================================================= */
  const renderRecommendationCard = (book) => (
    <Card
      key={book._id}
      bordered={false}
      className="card-clean"
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div className="book-cover-placeholder-sm" style={{ background: theme.token.colorPrimary + '15', color: theme.token.colorPrimary }}>
          <BookOutlined />
        </div>
        <Tag color="blue">{book.category}</Tag>
      </div>
      
      <Title level={5} className="text-clamp-2" style={{ marginBottom: 4, minHeight: 44 }}>{book.title}</Title>
      <Text type="secondary" className="text-clamp-1" style={{ marginBottom: 16 }}>{book.author}</Text>
      
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <Button block type="primary" size="small" onClick={() => handleBorrow(book._id, book.title, book.copies)}>
          {t("assistant.borrow")}
        </Button>
        <Tooltip title={t("assistant.addToCompare")}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => handleSelect(book._id)} />
        </Tooltip>
      </div>
    </Card>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Row gutter={[24, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <Title level={2} style={{ margin: 0, fontWeight: 600 }}>{t("assistant.title")}</Title>
            <Text type="secondary">{t("assistant.subTitle")}</Text>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ display: 'flex', gap: 24, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
              <Statistic title={t("assistant.recommended")} value={recommends.length} valueStyle={{ fontWeight: 600 }} titleStyle={{ fontSize: 12, color: '#8c8c8c' }} />
              <Statistic title={t("assistant.selected")} value={selectedIds.length} valueStyle={{ fontWeight: 600, color: theme.token.colorPrimary }} titleStyle={{ fontSize: 12, color: '#8c8c8c' }} />
            </div>
          </Col>
        </Row>
      </div>

      {/* 1. AI Recommendations */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}><RobotOutlined /> {t("assistant.aiRecommendations")}</Title>
          <Text type="secondary" style={{ fontSize: 13 }}><ReloadOutlined spin={loading} /> {strategy}</Text>
        </div>
        
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
        ) : recommends.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {recommends.map(renderRecommendationCard)}
          </div>
        ) : (
          <Empty description={t("assistant.noRecs")} />
        )}
      </div>

      <Divider />

      {/* 2. Book Comparison */}
      <div id="comparison-section">
        <Title level={4} style={{ marginBottom: 24 }}><BarChartOutlined /> {t("titles.bookComparison")}</Title>
        
        <Row gutter={[24, 24]}>
          {/* Left: Selector */}
          <Col xs={24} lg={8}>
            <div className="card-clean" style={{ height: '100%' }}>
              <div style={{ marginBottom: 16 }}>
                <Input 
                  prefix={<SearchOutlined />} 
                  placeholder={t("assistant.searchPlaceholder")} 
                  onChange={handleSearch} 
                  allowClear
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <Text strong>{t("assistant.selected")} ({selectedIds.length}/5)</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {selectedIds.map(id => {
                    const book = allBooks.find(b => b._id === id);
                    return (
                      <Tag key={id} closable onClose={() => handleSelect(id)} color="blue">
                         {book ? book.title.slice(0, 10) + '...' : id}
                      </Tag>
                    );
                  })}
                  {selectedIds.length === 0 && <Text type="secondary" style={{ fontSize: 12 }}>{t("assistant.selectTip")}</Text>}
                </div>
              </div>
              
              <List
                dataSource={paginatedBooks}
                size="small"
                renderItem={book => (
                  <List.Item 
                    onClick={() => handleSelect(book._id)}
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedIds.includes(book._id) ? '#e6f7ff' : 'transparent',
                      borderRadius: 6,
                      padding: '8px 12px',
                      marginBottom: 4,
                      border: '1px solid transparent',
                      borderColor: selectedIds.includes(book._id) ? '#91caff' : 'transparent'
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong className="text-clamp-1" style={{ maxWidth: '70%' }}>{book.title}</Text>
                        <Tag style={{ margin: 0 }}>{book.category}</Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{book.author}</Text>
                    </div>
                  </List.Item>
                )}
              />
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Pagination 
                  simple 
                  current={currentPage} 
                  total={filteredBooks.length} 
                  pageSize={pageSize}
                  onChange={setCurrentPage} 
                />
              </div>
              
              <Button 
                type="primary" 
                block 
                style={{ marginTop: 16 }} 
                onClick={handleCompare}
                disabled={selectedIds.length < 2}
                loading={cmpLoading}
              >
                {t("assistant.compare")}
              </Button>
            </div>
          </Col>

          {/* Right: Analysis */}
          <Col xs={24} lg={16}>
             {resultsWithCustomScore.length > 0 ? (
               <div className="card-clean">
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                   <Title level={5} style={{ margin: 0 }}>{t("assistant.analysisResult")}</Title>
                   <Button icon={<SettingOutlined />} onClick={() => setWeightsDrawerOpen(true)}>{t("assistant.adjustWeights")}</Button>
                 </div>
                 
                 <Row gutter={[24, 24]}>
                   <Col xs={24} xl={14}>
                     <Table 
                       dataSource={resultsWithCustomScore} 
                       columns={metricsColumns} 
                       pagination={false} 
                       size="small"
                       rowKey={(r) => r.book._id}
                     />
                   </Col>
                   <Col xs={24} xl={10}>
                     <div style={{ textAlign: 'center' }}>
                       <Radio.Group 
                         value={radarMode} 
                         onChange={e => setRadarMode(e.target.value)}
                         options={[
                           { label: t("assistant.defaultWeights"), value: "default" },
                           { label: t("assistant.customWeights"), value: "custom" },
                         ]}
                         optionType="button"
                         size="small"
                         style={{ marginBottom: 16 }}
                       />
                       <RadarChart series={radarSeries} size={300} />
                     </div>
                   </Col>
                 </Row>
               </div>
             ) : (
               <div className="card-clean" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#ccc' }}>
                 <BarChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                 <Text type="secondary">{t("assistant.compareTip")}</Text>
               </div>
             )}
          </Col>
        </Row>
      </div>

      {/* Weights Drawer */}
      <Drawer
        title={t("assistant.adjustWeights")}
        placement="right"
        onClose={() => setWeightsDrawerOpen(false)}
        open={weightsDrawerOpen}
        width={360}
      >
         <div style={{ marginBottom: 24 }}>
           <Text strong>{t("assistant.totalWeight")}: <span style={{ color: Math.abs(weightSum - 1) > 0.01 ? '#faad14' : '#52c41a' }}>{weightSum.toFixed(2)}</span></Text>
           <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{t("assistant.weightTip")}</Text>
         </div>
         {Object.keys(weights).map(key => (
           <div key={key} style={{ marginBottom: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
               <Text>{t(`assistant.${key}`) || key}</Text>
               <Text>{weights[key].toFixed(2)}</Text>
             </div>
             <Slider 
               min={0} max={1} step={0.05} 
               value={weights[key]} 
               onChange={v => setWeights({...weights, [key]: v})} 
             />
           </div>
         ))}
         <Button block onClick={() => setWeights(DEFAULT_WEIGHTS)}>{t("assistant.resetDefault")}</Button>
      </Drawer>

      {/* Modals */}
      <Modal
        open={!!successTitle}
        title={t("assistant.borrowSuccessTitle")}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        footer={[<Button key="ok" type="primary" onClick={() => setSuccessTitle("")}>{t("common.ok")}</Button>]}
      >
        <p>{t("assistant.borrowSuccessMsg")}</p>
        <p><strong>{successTitle}</strong></p>
      </Modal>

      <Modal
        open={limitOpen}
        title={t("assistant.borrowLimitTitle")}
        onOk={() => setLimitOpen(false)}
        onCancel={() => setLimitOpen(false)}
        centered
        footer={[<Button key="ok" type="primary" onClick={() => setLimitOpen(false)}>{t("common.ok")}</Button>]}
      >
        <p>{t("assistant.limitContent")}</p>
      </Modal>
    </div>
  );
}

export default SmartAssistant;