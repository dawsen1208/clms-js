import React from 'react';
import { Card, Typography, theme } from 'antd';
import { SharedCover } from '../../motion/CardToDetailTransition';

const { Title, Text } = Typography;
const { useToken } = theme;

const MagazineBentoGrid = ({ items = [], className = '', mode = 'grid' }) => {
  const { token } = useToken();

  const getCategoryColor = (category) => {
    const colors = [
      token.colorPrimary,
      token.colorSuccess,
      token.colorWarning,
      token.colorError,
      token.colorInfo
    ];
    let hash = 0;
    const str = category || 'General';
    for (let i = 0; i < str.length; i += 1) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const renderStock = (item) => {
    const available = typeof item.availableCopies === 'number' ? item.availableCopies : undefined;
    if (available === undefined) {
      if (!item.meta) return null;
      return (
        <Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
          {item.meta}
        </Text>
      );
    }

    if (available === 0) {
      return (
        <span style={{ fontSize: 12, color: token.colorTextTertiary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorBorderSecondary, display: 'inline-block' }} />
          OUT OF STOCK
        </span>
      );
    }

    if (available <= 3) {
      return (
        <span style={{ fontSize: 12, color: token.colorWarningText, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorWarning, display: 'inline-block' }} />
          LOW STOCK
        </span>
      );
    }

    return (
      <span style={{ fontSize: 12, color: token.colorSuccessText, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: token.colorSuccess, display: 'inline-block' }} />
        Available
      </span>
    );
  };

  if (mode === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map((item, index) => {
          const available = typeof item.availableCopies === 'number' ? item.availableCopies : undefined;
          const total = typeof item.totalCopies === 'number' ? item.totalCopies : undefined;
          const hasClick = typeof item.onClick === 'function';

          return (
            <div
              key={item.id || index}
              className="editorial-card book-card"
              style={{ width: '100%', cursor: hasClick ? 'pointer' : 'default' }}
              onClick={item.onClick}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '88px 1fr',
                  alignItems: 'stretch',
                  gap: 12,
                  padding: 16
                }}
              >
                <div
                  className="book-card-cover"
                  style={{
                    position: 'relative',
                    height: '100%',
                    overflow: 'hidden',
                    borderRadius: 4,
                    background: token.colorFillTertiary
                  }}
                >
                  {(item.coverImage || item.coverNode) && (
                    <SharedCover id={String(item.id || '')}>
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <div style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                          {item.coverNode}
                        </div>
                        {item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
                            srcSet={item.coverSrcSet || undefined}
                            sizes={item.coverSizes || undefined}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center',
                              display: 'block',
                              position: 'relative',
                              zIndex: 1
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                      </div>
                    </SharedCover>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <Title level={5} style={{ margin: 0 }}>
                    {item.title}
                  </Title>
                  {item.description && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={{ fontSize: 12, opacity: 0.8 }}>
                    {(item.category || 'General') +
                      (available !== undefined || total !== undefined
                        ? ` · stock: ${available ?? 0}${total !== undefined ? `/${total}` : ''}`
                        : item.meta
                        ? ` · ${item.meta}`
                        : '')}
                  </Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`magazine-bento-grid editorial-grid ${className}`} style={{ gap: 24 }}>
      {items.map((item, index) => {
        const isFeatured = index === 0;
        const colSpan = item.colSpan || (isFeatured ? 8 : 4);
        const rowSpan = item.rowSpan || (isFeatured ? 2 : 1);
        const categoryColor = getCategoryColor(item.category);

        return (
          <div
            key={item.id || index}
            className={`bento-item col-span-${colSpan}`}
            style={{
              gridRow: `span ${rowSpan}`,
              height: '100%',
              minHeight: isFeatured ? 320 : 220
            }}
          >
            <Card
              hoverable
              bordered={false}
              className="book-card"
              style={{
                height: '100%',
                background: item.background || token.colorBgContainer,
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                cursor: item.onClick ? 'pointer' : 'default'
              }}
              bodyStyle={{
                height: '100%',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              onClick={item.onClick}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: categoryColor }} />
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {(item.coverImage || item.coverNode) && (
                  <div
                    className="book-card-cover"
                    style={{
                      margin: isFeatured ? 20 : 16,
                      marginBottom: 12,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: token.colorFillTertiary,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
                    }}
                  >
                    <SharedCover id={String(item.id || '')}>
                      <div style={{ position: 'relative', width: '100%', paddingTop: isFeatured ? '135%' : '145%' }}>
                        <div style={{ position: 'absolute', inset: 0 }}>
                          <div style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
                            {item.coverNode}
                          </div>
                          {item.coverImage ? (
                            <img
                              src={item.coverImage}
                              alt={item.title}
                              loading="lazy"
                              decoding="async"
                              srcSet={item.coverSrcSet || undefined}
                              sizes={item.coverSizes || undefined}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', position: 'relative', zIndex: 1 }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </SharedCover>
                  </div>
                )}
                <div
                  style={{
                    padding: 24,
                    paddingTop: item.coverImage || item.coverNode ? 0 : 24,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1
                  }}
                >
                  {item.category && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: token.colorTextTertiary
                      }}
                    >
                      {item.category}
                    </Text>
                  )}
                  <div
                    style={{
                      fontFamily: "'Literata', serif",
                      fontWeight: 600,
                      fontSize: 18,
                      marginTop: 6,
                      marginBottom: 4,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {item.title}
                  </div>
                  {item.description && (
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 13,
                        color: token.colorTextSecondary,
                        marginBottom: item.meta ? 4 : 8
                      }}
                      ellipsis={{ rows: 2, tooltip: item.description }}
                    >
                      {item.description}
                    </Text>
                  )}
                  {item.meta && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: token.colorTextTertiary
                      }}
                    >
                      {item.meta}
                    </Text>
                  )}
                  <div
                    style={{
                      marginTop: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 12
                    }}
                  >
                    {renderStock(item)}
                  </div>
                </div>
              </div>
              {item.action && (
                <div className="book-card-overlay-actions">
                  {item.action}
                </div>
              )}
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default MagazineBentoGrid;
