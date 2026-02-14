import React from 'react';
import { Card, Statistic, Typography, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const { Text } = Typography;

const KPIStatCard = ({ title, value, prefix, suffix, trend, trendValue, icon, color, loading }) => {
  const { token } = theme.useToken();
  return (
    <Card 
      bordered={false} 
      className="card-shadow" 
      loading={loading}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      bodyStyle={{ padding: '24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>{title}</Text>
        {icon && (
          <div style={{ 
            color: color || token.colorInfo, 
            background: color ? `${color}15` : token.colorInfoBg, 
            padding: 8, 
            borderRadius: 12,
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
        )}
      </div>
      
      <Statistic 
        value={value} 
        prefix={prefix} 
        suffix={suffix}
        valueStyle={{ fontSize: 32, fontWeight: 700 }}
      />
      
      {trend && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', fontSize: 13 }}>
          <span style={{ 
            color: trend === 'up' ? token.colorSuccess : token.colorError, 
            display: 'flex', 
            alignItems: 'center', 
            marginRight: 8,
            fontWeight: 500
          }}>
            {trend === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            <span style={{ marginLeft: 4 }}>{trendValue}</span>
          </span>
          <Text type="secondary">vs last period</Text>
        </div>
      )}
    </Card>
  );
};

export default KPIStatCard;
