/**
 * Smart Assistant Page
 * Provides book recommendations, multi-book comparison, and intelligent search results
 * using a radar chart and custom weighting system.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
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
  Slider,
  Space,
  Typography,
  Tag,
  InputNumber,
  Collapse,
  Radio,
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
  borrowBook,
} from "../api";
import { getBookComparison, getBooks } from "../api.js";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";
import RadarChart from "../components/RadarChart.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";

const { useBreakpoint } = Grid;

export const AssistantLeftPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState([]);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchRecs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getRecommendations(token);
      const data = res.data || {};
      setRecs(data.recommended || []);
    } catch {
      message.error(t("assistant.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  const handleBorrowLeft = async (bookId, title, copies) => {
    try {
      if (isBorrowLimitError({ copies })) {
        showBorrowLimitModal();
        return;
      }
      const res = await borrowBook(bookId, token);
      message.success(res.data?.message || t("assistant.borrowSuccessTitle"));
      fetchRecs();
    } catch (err) {
      message.error(extractErrorMessage(err) || t("assistant.borrowFailed"));
    }
  };

  return (
    <div style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
      <Typography.Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
        {t("assistant.title")}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {t("assistant.subTitle")}
      </Typography.Paragraph>

      <Card
        bordered={false}
        style={{ borderRadius: 12 }}
        title={<span><RobotOutlined /> {t("assistant.recommended")}</span>}
      >
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "1.5rem auto" }} />
        ) : recs.length > 0 ? (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {recs.map((book) => (
              <Card
                key={book._id}
                title={book.title}
                style={{ minWidth: 260, borderRadius: 10 }}
                extra={
                  <Button
                    size="small"
                    type="primary"
                    icon={<BookOutlined />}
                    onClick={() => handleBorrowLeft(book._id, book.title, book.copies)}
                  >
                    {t("assistant.borrow")}
                  </Button>
                }
              >
                <p style={{ marginBottom: 0 }}>
                  {book.author || t("common.unknown")} · <Tag>{book.category || t("common.unknown")}</Tag>
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Typography.Text type="secondary">
            {t("assistant.noRecs")}
          </Typography.Text>
        )}
      </Card>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          {t("assistant.tips") || "Tips"}
        </Typography.Text>
        <List
          size="small"
          dataSource={[
            t("assistant.tipAsk") || "Ask for book recommendations based on your history.",
            t("assistant.tipCompare") || "Compare multiple books to decide faster.",
            t("assistant.tipBorrow") || "Borrow directly from recommendations.",
          ]}
          renderItem={(it) => <List.Item style={{ padding: '8px 0' }}>• {it}</List.Item>}
        />
      </Card>

      <div style={{ marginTop: 'auto' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Quick Links
        </Typography.Text>
        <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
          <Button icon={<SearchOutlined />} onClick={() => navigate('/search')} block>
            {t("nav.search")}
          </Button>
          <Button icon={<BookOutlined />} onClick={() => navigate('/borrow')} block>
            {t("nav.myBooks")}
          </Button>
        </Space>
      </div>
    </div>
  );
};

function SmartAssistant() {
  const { t } = useLanguage();

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
  const DEFAULT_WEIGHTS = useMemo(() => ({
    rating: 0.3,
    popularity: 0.25,
    availability: 0.25,
    recency: 0.1,
    match: 0.1,
  }), []);
  const [windowDays, setWindowDays] = useState(30);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [cmpLoading, setCmpLoading] = useState(false);
  const [cmpData, setCmpData] = useState(null);
  const [radarMode, setRadarMode] = useState("custom"); // "default" | "custom"

  const fetchAllBooks = useCallback(async () => {
    try {
      const res = await getBooks();
      const list = res?.data || [];
      setAllBooks(list);
      setFilteredBooks(list);
    } catch (err) {
      console.error("❌ Failed to fetch books:", err);
      message.error(t("assistant.fetchBooksFailed"));
    }
  }, [t]);

  useEffect(() => {
    fetchAllBooks();
    try {
      const raw = localStorage.getItem('compare_ids') || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setSelectedIds(arr);
    } catch (error) {
      void error;
    }
  }, [fetchAllBooks]);

  useEffect(() => {
    try {
      localStorage.setItem('compare_ids', JSON.stringify(selectedIds));
    } catch (error) {
      void error;
    }
  }, [selectedIds]);

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
  }, [cmpData, weights, radarMode, t, DEFAULT_WEIGHTS]);

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
      {/* Compare UI 保留在右侧，推荐已移至左侧 */}

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
                isMobile ? (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Table
                      rowKey={(row) => row.book?._id || row.book?.id || row.book?.title}
                      dataSource={resultsWithCustomScore}
                      columns={metricsColumns}
                      pagination={{ pageSize: 6 }}
                      bordered
                      scroll={{ x: true }}
                    />
                    <Card
                      size="small"
                      style={{ borderRadius: 10 }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }}>
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
                        <RadarChart series={radarSeries} size={280} />
                      </Space>
                    </Card>
                  </Space>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1.6fr) minmax(320px, 0.9fr)",
                      gap: 24,
                      alignItems: "flex-start",
                    }}
                  >
                    <Table
                      rowKey={(row) => row.book?._id || row.book?.id || row.book?.title}
                      dataSource={resultsWithCustomScore}
                      columns={metricsColumns}
                      pagination={{ pageSize: 6 }}
                      bordered
                      scroll={{ x: true }}
                    />
                    <Card
                      size="small"
                      style={{ borderRadius: 10 }}
                      bodyStyle={{ padding: 16 }}
                    >
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
                    </Card>
                  </div>
                )
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
