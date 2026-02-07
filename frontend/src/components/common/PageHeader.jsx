import React from 'react';
import { Typography, Breadcrumb, Button, Space, theme } from 'antd';

const { Title, Text } = Typography;

const PageHeader = ({ title, subtitle, breadcrumbItems, extra, style }) => {
  const { token } = theme.useToken();
  
  return (
    <div style={{ marginBottom: 32, ...style }}>
      {breadcrumbItems && (
        <Breadcrumb items={breadcrumbItems} style={{ marginBottom: 16 }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="signature-gradient" style={{ marginRight: 16, width: 6, height: 32, marginBottom: 0 }}></div>
            <Title level={1} style={{ margin: 0, fontSize: 28 }}>{title}</Title>
          </div>
          {subtitle && (
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 16, marginLeft: 22 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {extra && (
          <Space>
            {extra}
          </Space>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
