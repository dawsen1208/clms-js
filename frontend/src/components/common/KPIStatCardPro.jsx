import React from 'react';
import { Card, Typography, Statistic, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const KPIStatCardPro = ({ 
  title, 
  value, 
  trend, 
  trendType = 'up', // 'up' or 'down'
  trendValue, 
  data = [], 
  color = '#A65D57',
  loading = false
}) => {
  // Simple SVG Sparkline
  const renderSparkline = () => {
    if (!data || data.length < 2) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const width = 120;
    const height = 40;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.8 }}
        />
        <circle 
          cx={width} 
          cy={height - ((data[data.length-1] - min) / range) * height} 
          r="3" 
          fill={color} 
        />
      </svg>
    );
  };

  return (
    <Card 
      bordered={false} 
      loading={loading}
      style={{ 
        height: '100%', 
        borderRadius: 16, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
      }}
      bodyStyle={{ padding: 24 }}
      className="kpi-stat-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          {title}
        </Text>
        {trendValue && (
          <Space size={4} style={{ 
            color: trendType === 'up' ? '#52c41a' : '#ff4d4f',
            background: trendType === 'up' ? 'rgba(82, 196, 26, 0.1)' : 'rgba(255, 77, 79, 0.1)',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600
          }}>
            {trendType === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {trendValue}
          </Space>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Statistic 
          value={value} 
          valueStyle={{ 
            fontSize: 36, 
            fontFamily: "'Literata', serif", 
            fontWeight: 600,
            lineHeight: 1,
            color: '#2C3E50'
          }} 
        />
        
        <div style={{ height: 40, width: 120 }}>
          {renderSparkline()}
        </div>
      </div>
    </Card>
  );
};

export default KPIStatCardPro;
