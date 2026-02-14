import React, { useMemo, useEffect, useState } from "react";
import { Typography, Button, Spin, theme, Row, Col, Empty } from "antd";
import { 
  BookOutlined, 
  ClockCircleOutlined, 
  ReloadOutlined, 
  AlertOutlined, 
  TeamOutlined, 
  CheckCircleOutlined, 
  RiseOutlined,
  ArrowRightOutlined,
  ReadOutlined
} from "@ant-design/icons";
import { getBooksLibrary, getAllRequestsLibrary, getUserAnalytics, getBorrowedBooksLibrary, getBorrowHistoryAllLibrary, getBooks, getLibraryStats } from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import StatCard from "../components/cards/StatCard";
import InsightCard from "../components/cards/InsightCard";
import ActionCard from "../components/cards/ActionCard";
import ListCard from "../components/cards/ListCard";

const { Title, Text } = Typography;
const { useToken } = theme;

const AdminDashboard = () => {
  const { t } = useLanguage();
  const { token } = useToken();
  const [loading, setLoading] = useState(false);
  
  const [metrics, setMetrics] = useState({
    books: 0,
    totalBorrowed: 0,
    pendingRequests: 0,
    overdueBooks: 0,
    activeReaders: 0,
    onTimeRate: 0,
  });
  
  const [chartData, setChartData] = useState({ 
    trend30d: [], 
    categoryPie: [], 
    userGrowth: [] 
  });
  
  const [recentRequests, setRecentRequests] = useState([]);

  const refresh = async () => {
    try {
      setLoading(true);
      const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      // Mock data handling if API fails or for development
      // TODO: Remove mock fallbacks when backend is fully ready
      const [booksRes, reqRes, borrowedRes, usersRes, historyAllRes, statsRes] = await Promise.all([
        getBooksLibrary().catch(() => ({ data: [] })),
        authToken ? getAllRequestsLibrary(authToken).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        authToken ? getBorrowedBooksLibrary(authToken).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        authToken ? getUserAnalytics(authToken).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        authToken ? getBorrowHistoryAllLibrary(authToken).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        authToken ? getLibraryStats(authToken).catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);

      const books = booksRes.data || [];
      const requests = reqRes.data || [];
      const borrowed = (borrowedRes.data || []).filter((r) => !r.returned);
      const users = usersRes.data || [];
      const history = historyAllRes.data || [];

      const pendingRequests = requests.filter((r) => (r.status || "").toLowerCase() === "pending").length;
      const overdueBooks = borrowed.filter((r) => new Date(r.dueDate) < new Date()).length;
      
      const activeReaders = new Set(borrowed.map(b => b.userId)).size;

      setMetrics({
        books: books.length,
        totalBorrowed: borrowed.length,
        pendingRequests,
        overdueBooks,
        activeReaders,
        onTimeRate: 92, // Mock for now
      });
      
      setRecentRequests(requests.slice(0, 5));

      // Mock Chart Data - TODO: Replace with real aggregation
      setChartData({
        trend30d: [
          { name: 'Week 1', value: 12 },
          { name: 'Week 2', value: 19 },
          { name: 'Week 3', value: 15 },
          { name: 'Week 4', value: 25 },
        ],
        categoryPie: [
          { name: 'Fiction', value: 45 },
          { name: 'Sci-Fi', value: 25 },
          { name: 'History', value: 20 },
          { name: 'Tech', value: 10 },
        ],
        userGrowth: [
          { month: 'Jan', value: 10 },
          { month: 'Feb', value: 25 },
          { month: 'Mar', value: 40 },
          { month: 'Apr', value: 55 },
        ]
      });

    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <EditorialPageShell
      title={t("titles.dashboard")}
      subtitle="Overview of library performance and activities"
      headerAction={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={refresh} 
          loading={loading}
          shape="circle"
        />
      }
    >
      <div className="editorial-grid">
        {/* 1. Key Metrics Row - Bento Style */}
        <div className="col-span-3">
          <StatCard 
            title={t("dashboard.totalBooks")}
            value={metrics.books}
            icon={<BookOutlined />}
            trend={5.2}
            trendLabel="new titles"
            color={token.colorPrimary}
          />
        </div>
        <div className="col-span-3">
          <StatCard 
            title={t("dashboard.borrowed")}
            value={metrics.totalBorrowed}
            icon={<ReadOutlined />}
            trend={12.5}
            color={token.colorWarning}
          />
        </div>
        <div className="col-span-3">
          <StatCard 
            title={t("dashboard.pendingReq")}
            value={metrics.pendingRequests}
            icon={<ClockCircleOutlined />}
            trend={-2.1}
            trendLabel="wait time"
            color={token.colorInfo}
          />
        </div>
        <div className="col-span-3">
          <StatCard 
            title={t("dashboard.overdue")}
            value={metrics.overdueBooks}
            icon={<AlertOutlined />}
            trend={-15} // Negative is good for overdue
            trendLabel="vs last month"
            color={token.colorError}
          />
        </div>

        {/* 2. Main Visuals - Bento Layout */}
        <div className="col-span-8">
          <InsightCard 
            title="Borrowing Activity" 
            subtitle="Monthly trends in book circulation"
            data={chartData.trend30d}
            type="area"
            height={360}
          />
        </div>
        <div className="col-span-4">
          <div className="editorial-card" style={{ padding: 24, height: 360, display: 'flex', flexDirection: 'column' }}>
            <Title level={4} style={{ margin: "0 0 16px 0", fontFamily: "'Literata', serif" }}>
              Quick Actions
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1 }}>
              <ActionCard 
                icon={<BookOutlined />} 
                title="Add Book" 
                onClick={() => {}} // TODO: Navigate
                variant="minimal"
              />
              <ActionCard 
                icon={<TeamOutlined />} 
                title="Users" 
                onClick={() => {}} // TODO: Navigate
                variant="minimal"
              />
              <ActionCard 
                icon={<CheckCircleOutlined />} 
                title="Approvals" 
                onClick={() => {}} // TODO: Navigate
                variant="minimal"
              />
              <ActionCard 
                icon={<RiseOutlined />} 
                title="Reports" 
                onClick={() => {}} // TODO: Navigate
                variant="minimal"
              />
            </div>
          </div>
        </div>

        {/* 3. Detailed Lists & Secondary Charts */}
        <div className="col-span-6">
          <div className="editorial-card" style={{ padding: 24, height: '100%', minHeight: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Title level={4} style={{ margin: 0, fontFamily: "'Literata', serif" }}>Recent Requests</Title>
              <Button type="link">View All</Button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {recentRequests.length > 0 ? (
                recentRequests.map((req, idx) => (
                  <ListCard 
                    key={idx}
                    title={req.bookTitle || "Unknown Book"}
                    subtitle={`by ${req.userName || "Unknown User"}`}
                    status={req.status}
                    date={new Date(req.requestDate).toLocaleDateString()}
                    actionLabel="Review"
                    onAction={() => {}}
                  />
                ))
              ) : (
                 <Empty description="No pending requests" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        </div>

        <div className="col-span-6">
          <InsightCard 
            title="User Growth" 
            subtitle="New member registrations this year"
            data={chartData.userGrowth}
            type="bar"
            xAxisKey="month"
            height={400} // Match height of neighbor
            color={token.colorSuccess}
          />
        </div>
      </div>
    </EditorialPageShell>
  );
};

export default AdminDashboard;
