// client/src/pages/AdminDashboard.jsx
import React, { useMemo, useEffect, useState } from "react";
import { Card, Statistic, Row, Col, Typography, Divider, Button, Tooltip, Tag, Spin, Modal, Table } from "antd";
import { BookOutlined, UserOutlined, ClockCircleOutlined, ReloadOutlined, AlertOutlined, TeamOutlined, CheckCircleOutlined } from "@ant-design/icons";
import "./AdminDashboard.css";
import { getBooksLibrary, getAllRequestsLibrary, getUserAnalytics, getBorrowedBooksLibrary, getBorrowHistoryLibrary, getBorrowHistoryAllLibrary, getBooks, getLibraryStats } from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text } = Typography;

const AdminDashboard = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    books: 0,
    totalBorrowed: 0,
    pendingRequests: 0,
    overdueBooks: 0,
    activeReaders: 0,
    onTimeRate: 0,
  });
  const [chartData, setChartData] = useState({ trend30d: [], categoryPie: [], userGrowth: [] });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [totalTitles, setTotalTitles] = useState(0);
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendDetails, setTrendDetails] = useState([]);
  const [growthOpen, setGrowthOpen] = useState(false);
  const [growthDetails, setGrowthDetails] = useState([]);
  const [annOpen, setAnnOpen] = useState(false);
  const [annDetailOpen, setAnnDetailOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnn, setSelectedAnn] = useState(null);

  const refresh = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const [booksRes, reqRes, borrowedRes, usersRes, historyAllRes, statsRes] = await Promise.all([
        getBooksLibrary().catch(() => getBooks()).catch(() => ({ data: [] })),
        token ? getAllRequestsLibrary(token) : Promise.resolve({ data: [] }),
        token ? getBorrowedBooksLibrary(token) : Promise.resolve({ data: [] }),
        token ? getUserAnalytics(token) : Promise.resolve({ data: [] }),
        token ? getBorrowHistoryAllLibrary(token) : Promise.resolve({ data: [] }),
        token ? getLibraryStats(token) : Promise.resolve({ data: null }),
      ]);

      const books = booksRes.data || [];
      const requests = reqRes.data || [];
      const borrowed = (borrowedRes.data || []).filter((r) => !r.returned);
      const users = usersRes.data || [];
      const history = historyAllRes.data || [];

      const pendingRequests = requests.filter((r) => (r.status || "").toLowerCase() === "pending").length;
      const overdueBooks = borrowed.filter((r) => new Date(r.dueDate) < new Date()).length;
      const onTimeRates = users.map((u) => u.onTimeRate || 0);
      const onTimeRateAvg = onTimeRates.length ? Math.round(onTimeRates.reduce((a, b) => a + b, 0) / onTimeRates.length) : 0;
      const stats = statsRes?.data || null;

      // Fallback metrics computed from historyAll when stats not available
      const historyActiveBorrowed = Array.isArray(history)
        ? history.filter((r) => r.returned === false).length
        : 0;
      const historyOverdue = Array.isArray(history)
        ? history.filter((r) => r.returned === false && new Date(r.dueDate) < new Date()).length
        : 0;
      const historyActiveReaders = Array.isArray(history)
        ? new Set(history.map((r) => String(r.userId))).size
        : 0;
      const historyReturns = Array.isArray(history) ? history.filter((r) => !!r.returnDate) : [];
      const historyOnTimeRate = historyReturns.length
        ? Math.round(
            (historyReturns.filter((r) => new Date(r.returnDate) <= new Date(r.dueDate)).length /
              historyReturns.length) * 100
          )
        : 0;

      setMetrics({
        books: stats?.totalBooks ?? books.length,
        totalBorrowed: stats?.totalBorrowed ?? historyActiveBorrowed,
        pendingRequests: stats?.pendingRequests ?? pendingRequests,
        overdueBooks: stats?.overdueBooks ?? historyOverdue,
        activeReaders: stats?.activeReaders ?? historyActiveReaders,
        onTimeRate: stats?.onTimeRate ?? (historyOnTimeRate || onTimeRateAvg),
      });

      setAnnouncements(buildSystemAnnouncements(t));

      // Build charts data
      const catAgg = aggregateCategories(books, t);
      setChartData({
        trend30d: buildBorrowTrend30d(history),
        categoryPie: catAgg.items,
        userGrowth: buildUserGrowth(history),
      });
      setCategoryDetails(catAgg.details);
      setTotalTitles(catAgg.totalTitles);
    } catch (e) {
      // silent fail, keep previous metrics
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [t]);
  return (
    <div className="admin-dashboard" style={{ 
      padding: "2rem",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      minHeight: "calc(100vh - 64px)"
    }}>
      <Card
        title={
          <div className="dash-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
                {t("admin.dashboard")}
              </Title>
              <Text type="secondary" style={{ fontSize: "14px", color: "#64748b" }}>
                {t("admin.overview")}
              </Text>
            </div>
          </div>
        }
        extra={
          <Button 
            type="primary" 
            icon={<ReloadOutlined />}
            style={{
              borderRadius: 12,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              border: "none",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
            }}
          onClick={refresh}>{t("admin.refresh")}</Button>
        }
        className="dash-card"
        style={{
          borderRadius: 16,
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
        {loading && <Spin style={{ display: 'block', margin: '12px auto' }} />}    
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border: "none",
              boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.totalBooks")}</span>} 
                value={metrics.books}
                prefix={<BookOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none",
              boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.activeReaders")}</span>} 
                value={metrics.activeReaders} 
                prefix={<TeamOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.totalBorrowed")}</span>} 
                value={metrics.totalBorrowed} 
                prefix={<ClockCircleOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              border: "none",
              boxShadow: "0 8px 25px rgba(239, 68, 68, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.overdueBooks")}</span>} 
                value={metrics.overdueBooks} 
                prefix={<AlertOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #faad14, #d48806)",
              border: "none",
              boxShadow: "0 8px 25px rgba(250, 173, 20, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.pendingRequests")}</span>} 
                value={metrics.pendingRequests} 
                prefix={<ClockCircleOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card className="metric-card" style={{
              borderRadius: 16,
              background: "linear-gradient(135deg, #52C41A, #3f9f14)",
              border: "none",
              boxShadow: "0 8px 25px rgba(82, 196, 26, 0.3)",
              color: "white"
            }}>
              <Statistic 
                title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.onTimeRate")}</span>} 
                value={metrics.onTimeRate} 
                suffix="%"
                prefix={<CheckCircleOutlined style={{ color: "white" }} />} 
                valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={t("admin.borrowTrend")} hoverable className="section-card" style={{
              borderRadius: 16,
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }} onClick={() => setTrendOpen(true)}>
              <div style={{ height: 180 }}>
                {renderSparkline(chartData.trend30d)}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card title={t("admin.categoryRatio")} hoverable className="section-card" style={{
              borderRadius: 16,
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }} onClick={() => setDetailsOpen(true)}>
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderPie(chartData.categoryPie)}
              </div>
            </Card>
          </Col>
          <Col xs={24} md={6}>
            <Card title={t("admin.userGrowth")} hoverable className="section-card" style={{
              borderRadius: 16,
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }} onClick={() => setGrowthOpen(true)}>
              <div style={{ height: 180, padding: 8 }}>{renderBars(chartData.userGrowth)}</div>
            </Card>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]}>
          <Col xs={24} md={24}>
            <Card title={t("admin.systemAnnouncements")} hoverable className="section-card" style={{
              borderRadius: 16,
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.05)",
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }} onClick={() => setAnnOpen(true)}>
              {(announcements.slice(0, 3)).map((a) => (
                <div key={a.id} className="announcement-item" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <Tag color={a.color} style={{ borderRadius: 8, fontWeight: 500 }}>{a.tag}</Tag>
                  <span style={{ color: "#475569", fontSize: "14px" }}>{a.title}</span>
                  <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '12px' }}>{a.date}</span>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Card>
      <Modal
        title={t("admin.categoryDetails")}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={null}
        width={720}
      >
        <Table
          rowKey={(r) => r.category}
          dataSource={categoryDetails}
          pagination={{ pageSize: 8 }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: t("admin.category"), dataIndex: 'category' },
            { title: t("admin.titles"), dataIndex: 'titles' },
            { title: t("admin.copies"), dataIndex: 'copies' },
            { title: t("admin.percentage"), dataIndex: 'percentage', render: (p) => `${p}%` },
          ]}
        />
      </Modal>
      <Modal
        title={t("admin.borrowTrendTitle")}
        open={trendOpen}
        onCancel={() => setTrendOpen(false)}
        footer={null}
        width={720}
      >
        <Table
          rowKey={(r) => r.date}
          dataSource={trendDetails}
          pagination={{ pageSize: 15 }}
          scroll={{ x: "max-content" }}
          columns={[
            { title: t("admin.date"), dataIndex: 'date' },
            { title: t("admin.borrows"), dataIndex: 'count' },
          ]}
        />
      </Modal>
      <Modal
        title={t("admin.userGrowthTitle")}
        open={growthOpen}
        onCancel={() => setGrowthOpen(false)}
        footer={null}
        width={720}
      >
        <Table
          rowKey={(r) => r.week}
          dataSource={growthDetails}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: t("admin.week"), dataIndex: 'week' },
            { title: t("admin.uniqueBorrowers"), dataIndex: 'users' },
            { title: t("admin.newBorrowers"), dataIndex: 'newUsers' },
          ]}
        />
      </Modal>
      <Modal
        title={t("admin.systemAnnouncements")}
        open={annOpen}
        onCancel={() => setAnnOpen(false)}
        footer={null}
        width={900}
      >
        <Row gutter={[16, 16]}>
          {announcements.map((a) => (
            <Col xs={24} md={12} key={a.id}>
              <Card hoverable onClick={() => { setSelectedAnn(a); setAnnDetailOpen(true); }} style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={a.color}>{a.tag}</Tag>
                  <span style={{ fontWeight: 600 }}>{a.title}</span>
                </div>
                <div style={{ color: '#64748b', marginTop: 6 }}>{a.summary}</div>
                <div style={{ textAlign: 'right', marginTop: 8, color: '#94a3b8' }}>{a.date}</div>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>
      <Modal
        title={selectedAnn?.title || t("admin.announcement")}
        open={annDetailOpen}
        onCancel={() => setAnnDetailOpen(false)}
        footer={null}
        width={640}
      >
        <div style={{ marginBottom: 8 }}><Tag color={selectedAnn?.color}>{selectedAnn?.tag}</Tag> <span style={{ color: '#94a3b8' }}>{selectedAnn?.date}</span></div>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{selectedAnn?.content}</Typography.Paragraph>
      </Modal>
    </div>
  );
};

// Mini charts (no external libs)
function renderSparkline(points = []) {
  const width = 520; const height = 160; const pad = 10;
  const max = Math.max(...points, 1); const min = Math.min(...points, 0);
  const stepX = (width - pad * 2) / (points.length - 1 || 1);
  const toY = (v) => pad + (height - pad * 2) * (1 - (v - min) / (max - min || 1));
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${pad + i * stepX},${toY(p)}`).join(' ');
  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="gradLine" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1677FF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5B8EF3" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#gradLine)" strokeWidth="2.5" />
    </svg>
  );
}

function renderBars(values = []) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
      {values.map((v, i) => (
        <div key={i} style={{ width: 18, height: Math.round((v / max) * 120), background: '#1677FF', borderRadius: 6 }} />
      ))}
    </div>
  );
}

function renderPie(items = []) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  let curr = 0; const segs = items.map(it => {
    const from = (curr / total) * 360; curr += it.value; const to = (curr / total) * 360;
    return `${it.color} ${from}deg ${to}deg`;
  }).join(', ');
  return (
    <div style={{ width: 140, height: 140, borderRadius: '50%', background: `conic-gradient(${segs})`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
  );
}

function buildTrendDetails(history = []) {
  const days = 30;
  const now = new Date();
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const label = d.toISOString().slice(0, 10);
    const count = history.filter((h) => {
      const bd = new Date(h.borrowDate || h.borrowedAt || h.createdAt);
      return bd.toISOString().slice(0, 10) === label;
    }).length;
    arr.push({ date: label, count });
  }
  return arr;
}

function buildGrowthDetails(history = []) {
  const weeks = 10;
  const now = new Date();
  const arr = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const users = new Set();
    history.forEach((h) => {
      const d = new Date(h.borrowDate || h.borrowedAt || h.createdAt);
      if (d >= start && d <= end) {
        users.add(String(h.userId?._id || h.userId || ''));
      }
    });
    const weekLabel = `${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}`;
    const prev = arr.length ? arr[arr.length - 1].userSet : new Set();
    const newUsers = Array.from(users).filter((u) => !prev.has(u)).length;
    arr.push({ week: weekLabel, users: users.size, newUsers, userSet: users });
  }
  // strip helper sets before returning
  return arr.map(({ week, users, newUsers }) => ({ week, users, newUsers }));
}

function buildSystemAnnouncements(t) {
  const fmt = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');
  const now = Date.now();
  const ann = [
    {
      id: 'rel-1',
      tag: t('admin.tag_release'),
      color: 'blue',
      title: t('admin.ann_v130_title'),
      summary: t('admin.ann_v130_summary'),
      content: t('admin.ann_v130_content'),
      date: fmt(now - 3600 * 1000),
    },
    {
      id: 'feat-1',
      tag: t('admin.tag_feature'),
      color: 'green',
      title: t('admin.ann_feat1_title'),
      summary: t('admin.ann_feat1_summary'),
      content: t('admin.ann_feat1_content'),
      date: fmt(now - 24 * 3600 * 1000),
    },
    {
      id: 'maint-1',
      tag: t('admin.tag_maintenance'),
      color: 'gold',
      title: t('admin.ann_maint1_title'),
      summary: t('admin.ann_maint1_summary'),
      content: t('admin.ann_maint1_content'),
      date: fmt(now - 48 * 3600 * 1000),
    },
    {
      id: 'notice-1',
      tag: t('admin.tag_notice'),
      color: 'purple',
      title: t('admin.ann_notice1_title'),
      summary: t('admin.ann_notice1_summary'),
      content: t('admin.ann_notice1_content'),
      date: fmt(now - 72 * 3600 * 1000),
    },
  ];
  ann.sort((a, b) => new Date(b.date) - new Date(a.date));
  return ann;
}

// Data builders
function buildBorrowTrend30d(history = []) {
  const days = 30;
  const arr = new Array(days).fill(0);
  const now = new Date();
  history.forEach((h) => {
    const d = new Date(h.borrowDate || h.borrowedAt || h.createdAt);
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff < days) arr[days - 1 - diff] += 1;
  });
  return arr;
}

function aggregateCategories(books = [], t) {
  const map = new Map();
  books.forEach((b) => {
    const c = b.category || t('admin.category_unknown');
    const prev = map.get(c) || { titles: 0, copies: 0 };
    map.set(c, { titles: prev.titles + 1, copies: prev.copies + (Number(b.copies || 0)) });
  });
  const colors = ['#5B8EF3', '#52C41A', '#FAAD14', '#FF4D4F', '#9E77FF', '#13C2C2', '#722ED1', '#EB2F96'];
  const totalTitles = Array.from(map.values()).reduce((s, v) => s + v.titles, 0);
  const items = Array.from(map.entries()).map(([label, v], i) => ({ label, value: v.titles, color: colors[i % colors.length] }));
  const details = Array.from(map.entries()).map(([category, v]) => ({ category, titles: v.titles, copies: v.copies, percentage: totalTitles ? Math.round((v.titles / totalTitles) * 100) : 0 }));
  details.sort((a,b) => b.titles - a.titles);
  return { items, details, totalTitles };
}

function buildUserGrowth(history = []) {
  const weeks = 10;
  const arr = new Array(weeks).fill(0);
  const now = new Date();
  const weekSets = Array.from({ length: weeks }, () => new Set());
  history.forEach((h) => {
    const d = new Date(h.borrowDate || h.borrowedAt || h.createdAt);
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    const idx = Math.floor(diffDays / 7);
    if (idx >= 0 && idx < weeks) {
      const uid = String(h.userId?._id || h.userId || '');
      weekSets[weeks - 1 - idx].add(uid);
    }
  });
  weekSets.forEach((s, i) => { arr[i] = s.size; });
  return arr;
}

export default AdminDashboard;
