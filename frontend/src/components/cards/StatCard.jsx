import React from 'react';
import { Typography, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const StatCard = ({ 
  title, 
  value, 
  prefix, 
  suffix, 
  trend, // number (positive or negative)
  trendLabel = "vs last month",
  explanation,
  color,
  loading = false 
}) => {
  const { token } = theme.useToken();
  const isPositive = trend >= 0;
  const trendColor = isPositive ? token.colorSuccess : token.colorError;
  const mainColor = color || token.colorPrimary;

  // Smoother Sparkline
  const Sparkline = () => (
    <svg width="80" height="32" viewBox="0 0 80 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M2 28C10 24 15 26 22 20C29 14 35 18 42 12C49 6 55 10 65 4L78 2" 
        stroke={mainColor} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );

  return (
    <div className="editorial-card" style={{ 
      padding: 24, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      border: `1px solid ${token.colorBorderSecondary}`
    }}>
      <div>
        <Text type="secondary" style={{ 
          fontSize: 12, 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em',
          fontWeight: 600,
          color: token.colorTextSecondary
        }}>
          {title}
        </Text>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {prefix && <span style={{ fontSize: 24, color: token.colorTextSecondary, fontWeight: 300 }}>{prefix}</span>}
          <Title level={2} style={{ 
            margin: 0, 
            fontSize: 42, 
            fontWeight: 600, 
            color: token.colorTextHeading,
            fontFamily: "'Inter', sans-serif", // Clean sans for numbers
            lineHeight: 1
          }}>
            {Intl.NumberFormat().format(value ?? 0)}
          </Title>
          {suffix && <span style={{ fontSize: 24, color: token.colorTextSecondary, fontWeight: 300 }}>{suffix}</span>}
        </div>
      </div>
      
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 6, 
            color: trendColor, 
            fontWeight: 600,
            background: isPositive ? `${token.colorSuccess}15` : `${token.colorError}15`,
            padding: '4px 8px',
            borderRadius: 12,
            fontSize: 13
          }}>
            {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            <span>{Math.abs(trend)}%</span>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>{trendLabel}</Text>
        </div>
        <Sparkline />
      </div>
      
      {explanation && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Text style={{ fontSize: 13, color: token.colorTextSecondary, lineHeight: 1.4 }}>{explanation}</Text>
        </div>
      )}
    </div>
  );
};

export default StatCard;
