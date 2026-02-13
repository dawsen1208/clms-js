import React from 'react';
import { Breadcrumb, Typography, Space, theme } from 'antd';
import { useLocation, Link } from 'react-router-dom';

const { Title, Text } = Typography;

const PageShell = ({ 
  title, 
  subtitle, 
  extra, 
  children, 
  breadcrumbItems,
  noPadding = false 
}) => {
  const { token } = theme.useToken();
  const location = useLocation();

  // Auto-generate breadcrumbs if not provided
  const generateBreadcrumbs = () => {
    if (breadcrumbItems) return breadcrumbItems;
    
    const pathSnippets = location.pathname.split('/').filter(i => i);
    const extraBreadcrumbItems = pathSnippets.map((_, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      return {
        key: url,
        title: <Link to={url}>{_.charAt(0).toUpperCase() + _.slice(1)}</Link>,
      };
    });
    
    return [
      { key: 'home', title: <Link to="/home">Home</Link> },
      ...extraBreadcrumbItems,
    ];
  };

  return (
    <div className="page-wrapper" style={{ paddingTop: 24 }}>
      {/* Page Header Area */}
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb items={generateBreadcrumbs()} style={{ marginBottom: 16 }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {title && (
              <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
                {subtitle}
              </Text>
            )}
          </div>
          
          {extra && (
            <Space size="middle">
              {extra}
            </Space>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        background: noPadding ? 'transparent' : 'transparent',
        borderRadius: token.borderRadiusLG,
        minHeight: 280
      }}>
        {children}
      </div>
    </div>
  );
};

export default PageShell;
