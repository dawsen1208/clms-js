import React from 'react';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

const MagazineBentoGrid = ({ items = [], className = '' }) => {
  return (
    <div className={`magazine-bento-grid editorial-grid ${className}`} style={{ gap: 24 }}>
      {items.map((item, index) => {
        // Calculate grid spans based on index or item property
        // Pattern: Big (2x2) -> Wide (2x1) -> Small (1x1) -> Small (1x1)
        const isFeatured = index === 0;
        const isWide = index === 1 || index === 2;
        
        const colSpan = item.colSpan || (isFeatured ? 8 : isWide ? 6 : 4);
        const rowSpan = item.rowSpan || (isFeatured ? 2 : 1);
        
        return (
          <div 
            key={item.id || index}
            className={`bento-item col-span-${colSpan}`}
            style={{ 
              gridRow: `span ${rowSpan}`,
              height: '100%',
              minHeight: isFeatured ? 400 : 280
            }}
          >
            <Card
              hoverable
              bordered={false}
              style={{ 
                height: '100%', 
                borderRadius: 16, 
                overflow: 'hidden',
                background: item.background || '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
              bodyStyle={{ 
                height: '100%', 
                padding: 0, 
                display: 'flex', 
                flexDirection: 'column' 
              }}
            >
              {item.coverImage && (
                <div style={{ 
                  flex: isFeatured ? 2 : 1, 
                  background: `url(${item.coverImage}) center/cover no-repeat`,
                  minHeight: isFeatured ? '60%' : '50%'
                }} />
              )}
              
              <div style={{ 
                padding: 24, 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {item.category}
                  </Text>
                  <Title level={isFeatured ? 2 : 4} style={{ 
                    fontFamily: "'Literata', serif", 
                    margin: '8px 0 12px',
                    lineHeight: 1.3
                  }}>
                    {item.title}
                  </Title>
                  <Text type="secondary" ellipsis={{ rows: 2 }}>
                    {item.description}
                  </Text>
                </div>
                
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#999' }}>{item.meta}</Text>
                  {item.action}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default MagazineBentoGrid;
