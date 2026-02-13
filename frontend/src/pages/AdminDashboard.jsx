import React, { useMemo, useEffect, useState } from "react";
import { Card, Row, Col, Typography, Divider, Button, Tag, Spin, Modal, Table, theme } from "antd";
import { BookOutlined, ClockCircleOutlined, ReloadOutlined, AlertOutlined, TeamOutlined, CheckCircleOutlined, RiseOutlined } from "@ant-design/icons";
import { getBooksLibrary, getAllRequestsLibrary, getUserAnalytics, getBorrowedBooksLibrary, getBorrowHistoryLibrary, getBorrowHistoryAllLibrary, getBooks, getLibraryStats } from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import KPIStatCardPro from "../components/common/KPIStatCardPro";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

const { Title, Text: AntText } = Typography;
const { useToken } = theme;

const AdminDashboard = ({ appearance }) => {
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
  const [chartData, setChartData] = useState({ trend30d: [], categoryPie: [], userGrowth: [] });

  const refresh = async () => {
    try {
      setLoading(true);
      const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");
      const [booksRes, reqRes, borrowedRes, usersRes, historyAllRes, statsRes] = await Promise.all([
        getBooksLibrary().catch(() => getBooks()).catch(() => ({ data: [] })),
        authToken ? getAllRequestsLibrary(authToken) : Promise.resolve({ data: [] }),
        authToken ? getBorrowedBooksLibrary(authToken) : Promise.resolve({ data: [] }),
        authToken ? getUserAnalytics(authToken) : Promise.resolve({ data: [] }),
        authToken ? getBorrowHistoryAllLibrary(authToken) : Promise.resolve({ data: [] }),
        authToken ? getLibraryStats(authToken) : Promise.resolve({ data: null }),
      ]);

      const books = booksRes.data || [];
      const requests = reqRes.data || [];
      const borrowed = (borrowedRes.data || []).filter((r) => !r.returned);
      const users = usersRes.data || [];
      const history = historyAllRes.data || [];

      const pendingRequests = requests.filter((r) => (r.status || "").toLowerCase() === "pending").length;
      const overdueBooks = borrowed.filter((r) => new Date(r.dueDate) < new Date()).length;
      
      const stats = statsRes?.data || null;

      // Fallback metrics
      const historyActiveBorrowed = Array.isArray(history) ? history.filter((r) => r.returned === false).length : 0;
      const historyOverdue = Array.isArray(history) ? history.filter((r) => r.returned === false && new Date(r.dueDate) < new Date()).length : 0;
      const historyActiveReaders = Array.isArray(history) ? new Set(history.map((r) => String(r.userId))).size : 0;
      
      const onTimeRate = stats?.onTimeRate || 85; // Mock/Fallback

      setMetrics({
        books: stats?.totalBooks ?? books.length,
        totalBorrowed: stats?.totalBorrowed ?? historyActiveBorrowed,
        pendingRequests: stats?.pendingRequests ?? pendingRequests,
        overdueBooks: stats?.overdueBooks ?? historyOverdue,
        activeReaders: stats?.activeReaders ?? historyActiveReaders,
        onTimeRate: onTimeRate,
      });

      // TODO: Replace with real API data aggregation
      setChartData({
        trend30d: Array.from({length: 30}, (_, i) => ({ day: i + 1, value: Math.floor(Math.random() * 20) + 10 })),
        userGrowth: Array.from({length: 12}, (_, i) => ({ month: i + 1, value: Math.floor(Math.random() * 50) + 100 })),
      });

    } catch (error) {
      console.error("Dashboard refresh error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <EditorialPageShell 
      title="Dashboard" 
      subtitle="Overview of library performance and activities."
      extra={<Button icon={<ReloadOutlined />} onClick={refresh}>Refresh Data</Button>}
      fullWidth
    >
      <div className="editorial-grid" style={{ marginBottom: 48 }}>
        <div className="col-span-3">
          <KPIStatCardPro 
            title="Total Books" 
            value={metrics.books} 
            trendType="up"
            trendValue="+12%"
            data={[10, 15, 13, 18, 20, 25, metrics.books]}
          />
        </div>
        <div className="col-span-3">
          <KPIStatCardPro 
            title="Active Loans" 
            value={metrics.totalBorrowed} 
            trendType="up"
            trendValue="High Activity"
            data={[5, 8, 12, 10, 15, metrics.totalBorrowed]}
            color="#6B8E23"
          />
        </div>
        <div className="col-span-3">
          <KPIStatCardPro 
            title="Overdue" 
            value={metrics.overdueBooks} 
            trendType="down"
            trendValue="Needs Attention"
            data={[2, 3, 5, 8, metrics.overdueBooks]}
            color="#A65D57"
          />
        </div>
        <div className="col-span-3">
          <KPIStatCardPro 
            title="Pending Requests" 
            value={metrics.pendingRequests} 
            trendType="up"
            trendValue="Processing"
            data={[1, 0, 2, 1, metrics.pendingRequests]}
            color="#DAA520"
          />
        </div>
      </div>

      {/* Data Story Section */}
      <EditorialSectionHeader title="Library Analytics" subtitle="Borrowing trends and user engagement." />
      
      <div className="editorial-grid" style={{ marginBottom: 48 }}>
        <div className="col-span-8">
          <Card title="Borrowing Activity (30 Days)" bordered={false} style={{ height: 400, borderRadius: 16 }}>
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData.trend30d}>
                 <defs>
                   <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#A65D57" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#A65D57" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                 <Area type="monotone" dataKey="value" stroke="#A65D57" fillOpacity={1} fill="url(#colorValue)" />
               </AreaChart>
             </ResponsiveContainer>
          </Card>
        </div>
        <div className="col-span-4">
          <Card title="User Growth" bordered={false} style={{ height: 400, borderRadius: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData.userGrowth}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} />
                 <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                 <Bar dataKey="value" fill="#6B8E23" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </Card>
        </div>
      </div>

      <div className="editorial-grid">
         <div className="col-span-12">
           <Card bordered={false} style={{ borderRadius: 16, background: '#FAF9F6' }}>
             <Row align="middle" justify="space-between">
               <Col>
                 <Title level={4} style={{ margin: 0, fontFamily: "'Literata', serif" }}>Quick Actions</Title>
                 <AntText type="secondary">Manage your library efficiently</AntText>
               </Col>
               <Col>
                 <Button type="primary" size="large" icon={<BookOutlined />} style={{ marginRight: 16 }}>Manage Books</Button>
                 <Button size="large" icon={<TeamOutlined />}>Manage Users</Button>
               </Col>
             </Row>
           </Card>
         </div>
      </div>
    </EditorialPageShell>
  );
};

export default AdminDashboard;
