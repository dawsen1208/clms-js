import React from 'react';
import { Typography, Button, Space, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Section = ({ 
  title, 
  extra, 
  children, 
  onViewAll,
  style = {} 
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ marginBottom: 32, ...style }}>
      <div className="section-title">
        <Space size={8}>
          {/* Optional: Add a decorative accent line/block */}
          <div style={{ 
            width: 4, 
            height: 18, 
            background: token.colorPrimary, 
            borderRadius: 2 
          }} />
          <span>{title}</span>
        </Space>
        
        <Space>
          {extra}
          {onViewAll && (
            <Button type="text" size="small" onClick={onViewAll} style={{ color: token.colorTextSecondary }}>
              View All <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          )}
        </Space>
      </div>
      
      <div>
        {children}
      </div>
    </div>
  );
};

export default Section;
