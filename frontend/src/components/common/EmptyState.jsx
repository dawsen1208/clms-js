import React from 'react';
import { Empty, Button, Typography, theme } from 'antd';
import { InboxOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

const EmptyState = ({ 
  title = "No Data Found", 
  description = "We couldn't find what you're looking for.", 
  actionText, 
  onAction,
  icon
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ 
      padding: '48px 24px', 
      textAlign: 'center',
      background: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      border: `1px dashed ${token.colorBorderSecondary}`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ marginTop: 8 }}>
            <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
              {title}
            </Text>
            <Text type="secondary">
              {description}
            </Text>
          </div>
        }
      />
      
      {actionText && onAction && (
        <Button 
          type="primary" 
          onClick={onAction}
          style={{ marginTop: 24 }}
          icon={icon || <SearchOutlined />}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
