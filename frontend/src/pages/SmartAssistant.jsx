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
} from "antd";
import { Grid } from "antd";
import "./SmartAssistant.css";
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
} from "../api"; // ✅ 统一封装API调用
import { getBookComparison, getBooksLibrary } from "../api.js"; // ✅ 统一 API
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";
import RadarChart from "../components/RadarChart.jsx";
import dayjs from "dayjs";
import { Link } from "react-router-dom";

function SmartAssistant() {
  /* =========================================================
     🤖 Smart Recommendations
     ========================================================= */
  const [recommends, setRecommends] = useState([]);
  const [strategy, setStrategy] = useState("System is generating recommendations...");
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  // Controlled modals for robust visibility
  const [limitOpen, setLimitOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");

  // 🔤 Normalize backend strategy text to English when Chinese appears
  const toEnglishStrategy = (s) => {
    if (!s) return "Recommendation based on borrow history";
    let t = String(s);
    // Replace common Chinese phrases seen from backend
    t = t.replace("基于您偏借类别", "Based on your preferred categories ");
    t = t.replace("基于您常借类别", "Based on your frequently borrowed categories ");
    t = t.replace("未借阅用户推荐：", "For new users: ");
    // Strip decorative emoji/symbols first
    t = t.replace(/[📚📖⭐️✨🌟📈]/g, "");
    t = t.replace(/\*+/g, "");
    // Remove trailing Chinese '推荐' even if followed by spaces/emojis
    t = t.replace(/推荐(?:\s)*$/g, "");
    // Collapse extra spaces
    t = t.replace(/\s{2,}/g, " ").trim();
    t = t.replace(/未知/g, "Unknown");
    return t;
  };

  const fetchRecommendations = async () => {
    if (!token) return message.error("Please log in first!");
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
      setStrategy(toEnglishStrategy(data.strategy) || "Recommendation based on borrow history");
    } catch (err) {
      console.error("❌ Failed to fetch recommendations:", err);
      message.error("Failed to fetch recommendations, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (bookId, title, copies) => {
    if (!token) return message.warning("Please log in before borrowing!");
    try {
      let available = copies;
      if (typeof available !== "number") {
        // Preflight detail query to verify stock
        const detail = await getBookDetail(bookId);
        available = Number(detail?.data?.copies ?? 0);
      }

      if (available <= 0) {
        Modal.info({
          title: "Out of stock",
          content:
            "This book is currently out of stock. Please check back later or explore other titles.",
          okText: "Got it",
          centered: true,
        });
        message.warning("Out of stock — borrow is not available now.");
        console.log("🟡 Borrow blocked due to zero stock:", { bookId, title, available });
        return;
      }

      const res = await borrowBook(bookId, token);
      setSuccessTitle(title);
      showBorrowSuccessModal(title);
      message.success(res.data.message || `📘 Successfully borrowed “${title}”!`);
      fetchRecommendations(); // ✅ Refresh recommendations after borrowing
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
      message.error(backendMsg || "Borrow failed, please try again later.");
    }
  };

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
  const { useBreakpoint } = Grid;
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
      message.error("Failed to load books data");
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
        message.warning("You can select up to 5 books to compare");
        return prev;
      }
    });
  };

  // ✅ 分页逻辑
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedBooks = filteredBooks.slice(startIdx, startIdx + pageSize);
  const comparisonData = allBooks.filter((b) => selectedIds.includes(b._id));

  const comparisonColumns = [
    { title: "Title", dataIndex: "title", key: "title", render: (t) => <b>{t}</b> },
    { title: "Author", dataIndex: "author", key: "author" },
    { title: "Category", dataIndex: "category", key: "category" },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (t) => (t ? t.slice(0, 50) + (t.length > 50 ? "..." : "") : "No description"),
    },
  ];

  // 触发后端比较
  const handleCompare = async () => {
    if (selectedIds.length < 2 || selectedIds.length > 6) {
      message.warning("Please select 2 to 6 books to compare");
      return;
    }
    setCmpLoading(true);
    try {
      const res = await getBookComparison(selectedIds, windowDays);
      setCmpData(res);
      message.success("Comparison updated");
    } catch (err) {
      console.error("❌ 比较数据获取失败:", err);
      const msg = err.response?.data?.message || err.message || "Failed to compare books";
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
        name: r.book?.title || "Unknown",
        metrics: weighted,
      };
    });
  }, [cmpData, weights, radarMode]);

  // 当前权重总和提示
  const weightSum = useMemo(() => {
    const vals = Object.values(weights || {});
    return Math.round(vals.reduce((acc, v) => acc + (isNaN(v) ? 0 : v), 0) * 100) / 100;
  }, [weights]);

  const metricsColumns = [
    {
      title: "Book",
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
      title: "Ratings",
      key: "ratings",
      render: (_, row) => (
        <span>
          {row.book.ratingAvg ?? 0} / 5
          <Typography.Text type="secondary"> ({row.book.ratingCount || 0})</Typography.Text>
        </span>
      ),
    },
    {
      title: "Popularity (30d)",
      dataIndex: ["metrics", "borrow30d"],
      key: "borrow30d",
    },
    {
      title: "Availability",
      key: "availability",
      render: (_, row) => (
        <span>
          {row.book.copies ?? 0}/{row.book.totalCopies ?? 0}
          <Typography.Text type="secondary"> (norm {Math.round((row.metrics.availability || 0) * 100) / 100})</Typography.Text>
        </span>
      ),
    },
    {
      title: "Recency",
      key: "recency",
      render: (_, row) => (
        <span>
          {row.book.publishDate ? new Date(row.book.publishDate).toLocaleDateString() : "—"}
          <Typography.Text type="secondary"> (norm {Math.round((row.metrics.recency || 0) * 100) / 100})</Typography.Text>
        </span>
      ),
    },
    {
      title: "Match",
      dataIndex: ["metrics", "match"],
      key: "match",
      render: (v) => Math.round((v || 0) * 100) / 100,
    },
    {
      title: "Score (default)",
      dataIndex: "score",
      key: "score",
    },
    {
      title: "Score (custom)",
      dataIndex: "customScore",
      key: "customScore",
    },
  ];

  /* =========================================================
     🧱 页面布局
     ========================================================= */
  return (
    <div className="assistant-page" style={{ padding: "1.5rem" }}>
      {/* Controlled Success Modal to guarantee visibility */}
      <Modal
        open={!!successTitle}
        title={`"${successTitle}" Borrowed Successfully`}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>Your borrow request has been completed. Enjoy reading!</div>
      </Modal>
      {/* Controlled Limit Modal to guarantee visibility */}
      <Modal
        open={limitOpen}
        title="Borrowing Limit Reached"
        onOk={() => setLimitOpen(false)}
        onCancel={() => setLimitOpen(false)}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
      >
        <div>
          You have reached the maximum number of borrowed books for the current period. Please return some books before borrowing new ones.
        </div>
      </Modal>
      <Card
        title={
          <div className="page-header">
            <Typography.Title level={4} style={{ margin: 0 }}>Smart Assistant</Typography.Title>
            <Typography.Text type="secondary">Personalized Recommendations</Typography.Text>
            <div className="stats-grid">
              <Statistic title="Recommended" value={headerStats.recommended} />
              <Statistic title="Selected" value={headerStats.selected} />
            </div>
            <Typography.Text style={{ marginTop: 6 }} type="secondary">{strategy}</Typography.Text>
          </div>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
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
                  style={{ minWidth: 280, borderRadius: 10 }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', book._id); }}
                  extra={
                    <Space>
                      <Button size="small" onClick={() => handleSelect(book._id)}>
                        {selectedIds.includes(book._id) ? 'Remove' : 'Add'}
                      </Button>
                      <Button size="small" type="primary" icon={<BookOutlined />} onClick={() => handleBorrow(book._id, book.title, book.copies)}>Borrow</Button>
                    </Space>
                  }
                >
                  <p>{book.author || 'Unknown'} · <Tag>{book.category || 'Unknown'}</Tag></p>
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
            No recommendations yet — borrow some books to activate the algorithm 😊
          </p>
        )}
      </Card>

      <Card
        title={
          <div className="page-header">
            <Typography.Title level={4} style={{ margin: 0 }}>Book Comparison</Typography.Title>
            <Typography.Text type="secondary">Select up to 5 books to compare</Typography.Text>
            <div className="stats-grid">
              <Statistic title="Selected" value={headerStats.selected} />
            </div>
          </div>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* 🔍 搜索栏 */}
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by title or author"
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
          <Typography.Text type="secondary">Drag a recommendation here to add to comparison</Typography.Text>
        </div>
        <List
          grid={{ gutter: 16, column: isMobile ? 1 : 3 }}
          dataSource={paginatedBooks}
          renderItem={(book) => (
            <List.Item>
              <Card
                title={book.title}
                size="small"
                extra={
                  <Space>
                    <Checkbox
                      checked={selectedIds.includes(book._id)}
                      onChange={() => handleSelect(book._id)}
                    >
                      Select
                    </Checkbox>
                    {selectedIds.includes(book._id) && <Tag color="green">Added</Tag>}
                  </Space>
                }
                style={{
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <p>Author: {book.author || "Unknown"}</p>
                <p>Category: {book.category || "Unknown"}</p>
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
              <Typography.Text>Window (days):</Typography.Text>
              <InputNumber min={7} max={180} value={windowDays} onChange={(v) => setWindowDays(v || 30)} />
              <Button type="primary" onClick={handleCompare} disabled={selectedIds.length < 2}>
                Compare ({selectedIds.length})
              </Button>
            </Space>

            <Divider />
            <Card
              size="small"
              title="Weights"
              style={{ borderRadius: 10 }}
              extra={<Button onClick={() => setWeights(DEFAULT_WEIGHTS)}>Reset to default</Button>}
            >
              <Space direction="vertical" style={{ width: "100%", maxWidth: 900 }}>
                <Space align="center" style={{ justifyContent: "space-between" }}>
                  <Typography.Text style={{ color: Math.abs(weightSum - 1) < 0.01 ? "#6b7280" : "#d97706" }}>
                    Total: {weightSum.toFixed(2)}
                  </Typography.Text>
                </Space>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Typography.Text style={{ width: 120 }}>Rating</Typography.Text>
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
                  <Typography.Text style={{ width: 120 }}>Popularity</Typography.Text>
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
                  <Typography.Text style={{ width: 120 }}>Availability</Typography.Text>
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
                  <Typography.Text style={{ width: 120 }}>Recency</Typography.Text>
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
                  <Typography.Text style={{ width: 120 }}>Match</Typography.Text>
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
              <BarChartOutlined /> Comparison Results
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
                        <Typography.Text strong>Radar Mode</Typography.Text>
                        <Radio.Group
                          value={radarMode}
                          onChange={(e) => setRadarMode(e.target.value)}
                          options={[
                            { label: "Default weights", value: "default" },
                            { label: "Custom weights", value: "custom" },
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
                  <Collapse.Panel header="Current Selection (brief info)" key="selection">
                    <List
                      dataSource={allBooks.filter((b) => selectedIds.includes(b._id))}
                      renderItem={(book) => (
                        <List.Item>
                          <List.Item.Meta
                            title={book.title}
                            description={book.author || "Unknown author"}
                          />
                          <Tag>{book.category || "Uncategorized"}</Tag>
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
    </div>
  );
}

export default SmartAssistant;
