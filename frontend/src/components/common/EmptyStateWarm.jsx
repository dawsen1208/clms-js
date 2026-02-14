import React from 'react';
import { theme, Button, Typography } from 'antd';
import { PlusOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const EmptyStateWarm = ({ 
  title = "No items found", 
  description = "Get started by creating your first item.", 
  actionLabel, 
  onAction,
  icon
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '60px 20px',
      textAlign: 'center',
      background: 'transparent',
      borderRadius: 16
    }}>
      <div style={{ 
        width: 120, 
        height: 120, 
        background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorBgContainer} 100%)`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        border: `1px solid ${token.colorPrimary}30`
      }}>
        <div style={{ fontSize: 48, color: token.colorPrimary, opacity: 0.8 }}>
          {icon || <BookOutlined />}
        </div>
      </div>
      
      <Title level={3} style={{ 
        marginBottom: 12, 
        fontFamily: "'Literata', serif",
        color: token.colorTextHeading
      }}>
        {title}
      </Title>
      
      <Text type="secondary" style={{ 
        maxWidth: 400, 
        marginBottom: 32, 
        fontSize: 16,
        lineHeight: 1.6
      }}>
        {description}
      </Text>

      {actionLabel && (
        <Button 
          type="primary" 
          size="large" 
          icon={<PlusOutlined />} 
          onClick={onAction}
          style={{ 
            height: 48, 
            padding: '0 32px', 
            borderRadius: 24,
            fontSize: 16,
            boxShadow: token.boxShadowSecondary
          }}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyStateWarm;
