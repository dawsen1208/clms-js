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
  Alert,
  Grid
} from "antd";
import {
  RobotOutlined,
  BookOutlined,
  BarChartOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  getRecommendations,
  getBooks,
  borrowBook,
  getBookDetail,
} from "../api";
import { getBookComparison, getBooksLibrary } from "../api.js";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";
import RadarChart from "../components/RadarChart.jsx";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";

const { useBreakpoint } = Grid;

function SmartAssistant() {
  const { t, language } = useLanguage();
  /* =========================================================
     🤖 Smart Recommendations
     ========================================================= */
  const [recommends, setRecommends] = useState([]);
  const [strategy, setStrategy] = useState(t("assistant.generating"));
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  // Controlled modals for robust visibility
  const [successTitle, setSuccessTitle] = useState("");

  // 🔤 Normalize backend strategy text based on language
  const formatStrategy = (s) => {
    if (!s) return t("assistant.basedOnHistory");
    let tStr = String(s);
    
    // If Chinese mode, just clean up
    if (language === 'zh') {
       // Remove common prefixes if they are redundant or just return as is
       return tStr;
    }

    // If English mode, translate common phrases
    tStr = tStr.replace("基于您偏借类别", t("assistant.basedOnPreferred"));
    tStr = tStr.replace("基于您常借类别", t("assistant.basedOnPreferred"));
    tStr = tStr.replace("未借阅用户推荐：", t("assistant.forNewUsers"));
    tStr = tStr.replace("全馆最热TOP3", t("assistant.top3LibraryHot"));
    // Strip decorative emoji/symbols first
    tStr = tStr.replace(/[📚📖⭐️✨🌟📈]/g, "");
    tStr = tStr.replace(/\*+/g, "");
    // Remove trailing Chinese '推荐' even if followed by spaces/emojis
    tStr = tStr.replace(/推荐(?:\s)*$/g, "");
    // Collapse extra spaces
    tStr = tStr.replace(/\s{2,}/g, " ").trim();
    tStr = tStr.replace(/未知/g, t("common.unknown"));
    return tStr;
  };

  const fetchRecommendations = async () => {
    if (!token) return message.error(t("assistant.loginFirst"));
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      const data = res.data || {};
      let recs = data.recommended || [];
      try {
        const raw = localStorage.getItem('recommend_prefs');
        if (raw) {
          const prefs = JSON.parse(raw);
          const include = Array.isArray(prefs.preferredCategories) ? prefs.preferredCategories : [];
          const exclude = Array.isArray(prefs.excludedCategories) ? prefs.excludedCategories : [];
          if (include.length > 0) {
            recs = recs.filter(b => include.includes(b.category));
          }
          if (exclude.length > 0) {
            recs = recs.filter(b => !exclude.includes(b.category));
          }
          if (prefs.autoLearn === false) {
            // no-op for now: backend handles learning; avoid storing local behavior
          }
        }
      } catch {}
      setRecommends(recs);
      setStrategy(formatStrategy(data.strategy));
    } catch (err) {
      console.error("❌ Failed to fetch recommendations:", err);
      message.error(t("assistant.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (bookId, title, copies) => {
    if (!token) return message.warning(t("assistant.loginToBorrow"));
    try {
      let available = copies;
      if (typeof available !== "number") {
        // Preflight detail query to verify stock
        const detail = await getBookDetail(bookId);
        available = Number(detail?.data?.copies ?? 0);
      }

      if (available <= 0) {
        Modal.info({
          title: t("assistant.outOfStockTitle"),
          content: t("assistant.outOfStockMsg"),
          okText: t("assistant.gotIt"),
          centered: true,
        });
        message.warning(t("assistant.borrowUnavailable"));
        console.log("🟡 Borrow blocked due to zero stock:", { bookId, title, available });
        return;
      }

      const res = await borrowBook(bookId, token);
      setSuccessTitle(title);
      message.success(res.data.message || t("assistant.borrowSuccessMsg"));
      fetchRecommendations(); // ✅ Refresh recommendations after borrowing
    } catch (err) {
      console.error("❌ Borrow failed:", err);
      if (err?.__borrowLimit) {
        console.warn("🔴 Borrow limit flagged by interceptor", {
          url: err?.config?.url,
          status: err?.response?.status,
        });
        showBorrowLimitModal(t);
        return;
      }
      const backendMsg = extractErrorMessage(err);
      if (isBorrowLimitError(backendMsg)) {
        console.warn("🔴 Borrow limit matched by message", { backendMsg });
        showBorrowLimitModal(t);
        return;
      }
      // Fallback: detect by HTTP status and route
      const status = err?.response?.status;
      const url = err?.config?.url || "";
      if (status === 400 && url.includes("/library/borrow/")) {
        console.warn("🔴 Borrow limit fallback by status+route", { status, url });
        showBorrowLimitModal(t);
        return;
      }
      message.error(backendMsg || t("assistant.borrowFailed"));
    }
  };

  useEffect(() => {
    // Re-format strategy when language changes if we have one
    setStrategy(prev => formatStrategy(prev)); 
  }, [language]);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  /* =========================================================
     📊 Smart Comparison
     ========================================================= */
  const [allBooks, setAllBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // 比较参数与结果
  const DEFAULT_WEIGHTS = {
    rating: 0.3,
    popularity: 0.25,
    availability: 0.25,
    recency: 0.1,
    match: 0.1,
  };
  const [windowDays, setWindowDays] = useState(30);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpData, setCmpData] = useState(null);
  const [radarMode, setRadarMode] = useState("custom"); // "default" | "custom"

  const fetchAllBooks = async () => {
    try {
      // 优先 /library 路由，兼容旧 /books
      const res = await getBooksLibrary().catch(() => getBooks());
      const list = res?.data || [];
      setAllBooks(list);
      setFilteredBooks(list);
    } catch (err) {
      console.error("❌ Failed to fetch books:", err);
      message.error(t("assistant.fetchBooksFailed"));
    }
  };

  useEffect(() => {
    fetchAllBooks();
    try {
      const raw = localStorage.getItem('compare_ids') || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setSelectedIds(arr);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('compare_ids', JSON.stringify(selectedIds));
    } catch {}
  }, [selectedIds]);

  const headerStats = useMemo(() => ({
    recommended: recommends.length,
    selected: selectedIds.length,
  }), [recommends, selectedIds]);

  // 🔍 Search filter (by title or author)
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

  // ✅ Select books to compare (up to 5)
  const handleSelect = (bookId) => {
    setSelectedIds((prev) => {
      if (prev.includes(bookId)) {
        return prev.filter((id) => id !== bookId);
      } else if (prev.length < 5) {
        return [...prev, bookId];
      } else {
        message.warning(t("assistant.selectLimit"));
        return prev;
      }
    });
  };

  // ✅ 分页逻辑
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedBooks = filteredBooks.slice(startIdx, startIdx + pageSize);
  
  // 触发后端比较
  const handleCompare = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 6) {
      message.warning(t("assistant.selectRange"));
      return;
    }
    setCmpLoading(true);
    try {
      const res = await getBookComparison(selectedIds, windowDays);
      setCmpData(res);
      message.success(t("assistant.compareUpdated"));
    } catch (err) {
      console.error("❌ 比较数据获取失败:", err);
      const msg = err.response?.data?.message || err.message || t("assistant.compareFailed");
      message.error(msg);
    } finally {
      setCmpLoading(false);
    }
  };

  // 前端自定义权重评分（与后端默认权重分开显示）
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

  // 雷达图数据：根据模式对各指标进行加权缩放展示
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
      const weighted = {
        rating: (m.rating || 0) * (useW.rating || 0),
        popularity: (m.popularity || 0) * (useW.popularity || 0),
        availability: (m.availability || 0) * (useW.availability || 0),
        recency: (m.recency || 0) * (useW.recency || 0),
        match: (m.match || 0) * (useW.match || 0),
        customScore: Math.round(scoreOf(m) * 1000) / 1000,
      };
      return {
        name: r.book?.title || t("common.unknown"),
        metrics: weighted,
      };
    });
  }, [cmpData, weights, radarMode, language]);

  // 当前权重总和提示
  const weightSum = useMemo(() => {
    const vals = Object.values(weights || {});
    return Math.round(vals.reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0) * 100) / 100;
  }, [weights]);

  const metricsColumns = [
    {
      title: t("assistant.book"),
      dataIndex: ["book", "title"],
      key: "title",
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.book.title}</div>
          <div style={{ color: "#888" }}>{row.book.author}</div>
          <div>
            <Tag>{row.book.category}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: t("assistant.ratings"),
      key: "ratings",
      render: (_, row) => (
        <span>
          {row.book.ratingAvg ?? 0} / 5
          <Typography.Text type="secondary"> ({row.book.ratingCount || 0})</Typography.Text>
        </span>
      ),
    },
    {
      title: `${t("assistant.popularity")} (30d)`,
      dataIndex: ["metrics", "borrow30d"],
      key: "borrow30d",
    },
    {
      title: t("assistant.availability"),
      key: "availability",
      render: (_, row) => (
        <span>
          {row.book.copies ?? 0}/{row.book.totalCopies ?? 0}
          <Typography.Text type="secondary"> (norm {Math.round((row.metrics.availability || 0) * 100) / 100})</Typography.Text>
        </span>
      ),
    },
    {
      title: t("assistant.recency"),
      key: "recency",
      render: (_, row) => (
        <span>
          {row.book.publishDate ? new Date(row.book.publishDate).toLocaleDateString() : "—"}
          <Typography.Text type="secondary"> (norm {Math.round((row.metrics.recency || 0) * 100) / 100})</Typography.Text>
        </span>
      ),
    },
    {
      title: t("assistant.match"),
      dataIndex: ["metrics", "match"],
      key: "match",
      render: (v) => Math.round((v || 0) * 100) / 100,
    },
    {
      title: t("assistant.scoreDefault"),
      dataIndex: "score",
      key: "score",
    },
    {
      title: t("assistant.scoreCustom"),
      dataIndex: "customScore",
      key: "customScore",
    },
  ];

  /* =========================================================
     🧱 页面布局
     ========================================================= */
  return (
    <PageContainer>
      {/* Controlled Success Modal to guarantee visibility */}
      <Modal
        open={!!successTitle}
        title={`"${successTitle}" ${t("assistant.borrowSuccessTitle")}`}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        zIndex={10000}
      >
        <div>{t("assistant.borrowSuccessMsg")}</div>
      </Modal>
      
      <PageHeader 
        title={t("assistant.title")}
        subtitle={t("assistant.subTitle")}
        extra={
           <Space size="large">
             <Statistic title={t("assistant.recommended")} value={headerStats.recommended} prefix={<RobotOutlined />} />
             <Statistic title={t("assistant.selected")} value={headerStats.selected} prefix={<BarChartOutlined />} />
           </Space>
        }
      />
      
      {/* Strategy Info */}
      <Alert
        message={strategy}
        type="info"
        showIcon
        icon={<RobotOutlined />}
        style={{ marginBottom: 24, borderRadius: 8, border: 'none', background: '#e6f7ff' }}
      />

      {/* Recommendations Card */}
      <Card
        title={<span><RobotOutlined /> {t("assistant.recommended")}</span>}
        bordered={false}
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginBottom: "2rem",
        }}
      >
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "2rem auto" }} />
        ) : recommends.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }} id="recs-scroll">
              {recommends.map((book) => (
                <Card
                  key={book._id}
                  title={book.title}
                  style={{ minWidth: 280, borderRadius: 10, cursor: 'move' }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', book._id); }}
                  extra={
                    <Space>
                      <Button size="small" onClick={() => handleSelect(book._id)}>
                        {selectedIds.includes(book._id) ? t("assistant.remove") : t("assistant.add")}
                      </Button>
                      <Button size="small" type="primary" icon={<BookOutlined />} onClick={() => handleBorrow(book._id, book.title, book.copies)}>{t("assistant.borrow")}</Button>
                    </Space>
                  }
                >
                  <p>{book.author || t("common.unknown")} · <Tag>{book.category || t("common.unknown")}</Tag></p>
                </Card>
              ))}
            </div>
            <Space style={{ position: 'absolute', top: -40, right: 0 }}>
              <Button size="small" onClick={() => { const el = document.getElementById('recs-scroll'); el && el.scrollBy({ left: -300, behavior: 'smooth' }); }}>◀</Button>
              <Button size="small" onClick={() => { const el = document.getElementById('recs-scroll'); el && el.scrollBy({ left: 300, behavior: 'smooth' }); }}>▶</Button>
            </Space>
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#999", padding: "1rem" }}>
            {t("assistant.noRecs")}
          </p>
        )}
      </Card>

      {/* Comparison Card */}
      <Card
        title={<span><BarChartOutlined /> {t("titles.bookComparison")}</span>}
        bordered={false}
        style={{
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        {/* 🔍 搜索栏 */}
        <Input
          prefix={<SearchOutlined />}
          placeholder={t("assistant.searchPlaceholder")}
          value={searchTerm}
          onChange={handleSearch}
          allowClear
          style={{
            marginBottom: "1rem",
            borderRadius: 8,
            width: "100%",
            maxWidth: 500,
          }}
        />

        {/* 📚 分页书籍展示 + 拖拽加入比较 */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData('text/plain');
            if (id) handleSelect(id);
          }}
          style={{ border: '1px dashed #e5e7eb', padding: 12, borderRadius: 10, marginBottom: 12 }}
        >
          <Typography.Text type="secondary">{t("assistant.dragTip")}</Typography.Text>
        </div>
        <List
          grid={{ gutter: 16, column: isMobile ? 1 : 3 }}
          dataSource={paginatedBooks}
          renderItem={(book) => (
            <List.Item>
              <Card
                title={book.title}
                size="small"
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('text/plain', book._id); }}
                extra={
                  <Space>
                    <Checkbox
                      checked={selectedIds.includes(book._id)}
                      onChange={() => handleSelect(book._id)}
                    >
                      {t("assistant.selectToCompare")}
                    </Checkbox>
                    {selectedIds.includes(book._id) && <Tag color="green">{t("assistant.added")}</Tag>}
                  </Space>
                }
                style={{
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  cursor: "move",
                }}
              >
                <p>{t("bookDetail.author")}: {book.author || t("common.unknown")}</p>
                <p>{t("bookDetail.category")}: {book.category || t("common.unknown")}</p>
              </Card>
            </List.Item>
          )}
        />

        {/* 📑 分页控制 */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={filteredBooks.length}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>

        {/* ⚙️ 比较参数与操作 */}
        {selectedIds.length > 0 && (
          <>
            <Divider />
            <Space wrap>
              <Typography.Text>{t("assistant.windowDays")}:</Typography.Text>
              <InputNumber min={7} max={180} value={windowDays} onChange={(v) => setWindowDays(v || 30)} />
              <Button type="primary" onClick={handleCompare} disabled={selectedIds.length < 2}>
                {t("assistant.compare")} ({selectedIds.length})
              </Button>
            </Space>

            <Divider />
            <Card
              size="small"
              title={t("assistant.weights")}
              style={{ borderRadius: 10 }}
              extra={<Button onClick={() => setWeights(DEFAULT_WEIGHTS)}>{t("assistant.resetDefault")}</Button>}
            >
              <Space direction="vertical" style={{ width: "100%", maxWidth: 900 }}>
                <Space align="center" style={{ justifyContent: "space-between" }}>
                  <Typography.Text style={{ color: Math.abs(weightSum - 1) < 0.01 ? "#6b7280" : "#d97706" }}>
                    {t("assistant.total")}: {weightSum.toFixed(2)}
                  </Typography.Text>
                </Space>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>{t("assistant.ratings")}</Typography.Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    marks={{ 0: "0", 0.25: "0.25", 0.5: "0.5", 0.75: "0.75", 1: "1" }}
                    value={weights.rating}
                    onChange={(v) => setWeights({ ...weights, rating: v })}
                    style={{ flex: 1, minWidth: 420 }}
                  />
                  <Typography.Text style={{ width: 56, textAlign: "right" }}>{weights.rating.toFixed(2)}</Typography.Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>{t("assistant.popularity")}</Typography.Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    marks={{ 0: "0", 0.25: "0.25", 0.5: "0.5", 0.75: "0.75", 1: "1" }}
                    value={weights.popularity}
                    onChange={(v) => setWeights({ ...weights, popularity: v })}
                    style={{ flex: 1, minWidth: 420 }}
                  />
                  <Typography.Text style={{ width: 56, textAlign: "right" }}>{weights.popularity.toFixed(2)}</Typography.Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>{t("assistant.availability")}</Typography.Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    marks={{ 0: "0", 0.25: "0.25", 0.5: "0.5", 0.75: "0.75", 1: "1" }}
                    value={weights.availability}
                    onChange={(v) => setWeights({ ...weights, availability: v })}
                    style={{ flex: 1, minWidth: 420 }}
                  />
                  <Typography.Text style={{ width: 56, textAlign: "right" }}>{weights.availability.toFixed(2)}</Typography.Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>{t("assistant.recency")}</Typography.Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    marks={{ 0: "0", 0.25: "0.25", 0.5: "0.5", 0.75: "0.75", 1: "1" }}
                    value={weights.recency}
                    onChange={(v) => setWeights({ ...weights, recency: v })}
                    style={{ flex: 1, minWidth: 420 }}
                  />
                  <Typography.Text style={{ width: 56, textAlign: "right" }}>{weights.recency.toFixed(2)}</Typography.Text>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>{t("assistant.match")}</Typography.Text>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    marks={{ 0: "0", 0.25: "0.25", 0.5: "0.5", 0.75: "0.75", 1: "1" }}
                    value={weights.match}
                    onChange={(v) => setWeights({ ...weights, match: v })}
                    style={{ flex: 1, minWidth: 420 }}
                  />
                  <Typography.Text style={{ width: 56, textAlign: "right" }}>{weights.match.toFixed(2)}</Typography.Text>
                </div>
              </Space>
            </Card>

            <Divider />
            <h3 style={{ marginBottom: "1rem" }}>
              <BarChartOutlined /> {t("assistant.comparisonResults")}
            </h3>
            {cmpLoading ? (
              <Spin size="large" style={{ display: "block", margin: "2rem auto" }} />
            ) : (
              resultsWithCustomScore.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16 }}>
                  <Table
                    rowKey={(row) => row.book?._id || row.book?.id || row.book?.title}
                    dataSource={resultsWithCustomScore}
                    columns={metricsColumns}
                    pagination={{ pageSize: 6 }}
                    bordered
                  />
                  <div>
                    <Space direction="vertical" style={{ width: 360 }}>
                      <Space align="center" style={{ justifyContent: "space-between" }}>
                        <Typography.Text strong>{t("assistant.radarMode")}</Typography.Text>
                        <Radio.Group
                          value={radarMode}
                          onChange={(e) => setRadarMode(e.target.value)}
                          options={[
                            { label: t("assistant.defaultWeights"), value: "default" },
                            { label: t("assistant.customWeights"), value: "custom" },
                          ]}
                          optionType="button"
                          buttonStyle="solid"
                        />
                      </Space>
                      <RadarChart series={radarSeries} size={360} />
                    </Space>
                  </div>
                </div>
              ) : (
                <Collapse defaultActiveKey={[]}>
                  <Collapse.Panel header={t("assistant.currentSelection")} key="selection">
                    <List
                      dataSource={allBooks.filter((b) => selectedIds.includes(b._id))}
                      renderItem={(book) => (
                        <List.Item>
                          <List.Item.Meta
                            title={book.title}
                            description={book.author || t("assistant.unknownAuthor")}
                          />
                          <Tag>{book.category || t("assistant.uncategorized")}</Tag>
                        </List.Item>
                      )}
                    />
                  </Collapse.Panel>
                </Collapse>
              )
            )}
          </>
        )}
      </Card>
    </PageContainer>
  );
}

export default SmartAssistant;
