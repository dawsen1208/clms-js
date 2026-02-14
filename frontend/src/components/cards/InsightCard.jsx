import React from 'react';
import { Typography, theme, Empty } from 'antd';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const { Title, Text } = Typography;

const InsightCard = ({ 
  title, 
  subtitle, 
  data = [], 
  dataKey = 'value',
  xAxisKey = 'name',
  type = 'area', // area, bar
  color,
  height = 300,
  loading = false
}) => {
  const { token } = theme.useToken();
  const mainColor = color || token.colorPrimary;

  const renderChart = () => {
    if (!data || data.length === 0) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data available" />;
    }

    if (type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
            <XAxis 
              dataKey={xAxisKey} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: token.colorTextSecondary, fontSize: 12 }} 
              dy={10}
            />
            <Tooltip 
              contentStyle={{ 
                background: token.colorBgElevated, 
                border: 'none', 
                borderRadius: 8, 
                boxShadow: token.boxShadowTertiary 
              }}
              cursor={{ fill: token.colorFillTertiary }}
            />
            <Bar 
              dataKey={dataKey} 
              fill={mainColor} 
              radius={[4, 4, 0, 0]} 
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={mainColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorBorderSecondary} />
          <XAxis 
            dataKey={xAxisKey} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }} 
            dy={10}
          />
          <Tooltip 
            contentStyle={{ 
              background: token.colorBgElevated, 
              border: 'none', 
              borderRadius: 8, 
              boxShadow: token.boxShadowTertiary 
            }}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={mainColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#color${dataKey})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="editorial-card" style={{ padding: 24, height: height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, fontFamily: "'Literata', serif" }}>{title}</Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        {renderChart()}
      </div>
    </div>
  );
};

export default InsightCard;
