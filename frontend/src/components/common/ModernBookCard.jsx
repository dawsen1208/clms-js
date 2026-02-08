import React from 'react';
import { Card, Button, Typography, Tag, Tooltip } from 'antd';
import { 
  BookOutlined, 
  UserOutlined, 
  ClockCircleOutlined,
  ExperimentOutlined,
  RocketOutlined,
  HourglassOutlined,
  BankOutlined,
  BgColorsOutlined,
  ReadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCleanImageUrl } from '../../utils/imageUtils';

const { Title, Text, Paragraph } = Typography;

const BOOK_IMAGES = [
  "/books/art.jpg",
  "/books/cleancode.jpg",
  "/books/design.jpg",
  "/books/habits.jpg",
  "/books/investor.jpg",
  "/books/psychology.jpg",
  "/books/sapiens.jpg",
  "/books/app.jpg"
];

const getRandomImage = (id) => {
  if (!id) return BOOK_IMAGES[0];
  const index = id.toString().charCodeAt(0) % BOOK_IMAGES.length;
  return BOOK_IMAGES[index];
};

const categoryColors = {
  "Fiction": "#1890ff",
  "Science": "#722ed1",
  "Technology": "#13c2c2",
  "History": "#faad14",
  "Biography": "#eb2f96",
  "Business": "#52c41a",
  "Art": "#fa541c",
  "default": "#8c8c8c"
};

const categoryIcons = {
  "Fiction": <ReadOutlined />,
  "Science": <ExperimentOutlined />,
  "Technology": <RocketOutlined />,
  "History": <HourglassOutlined />,
  "Biography": <UserOutlined />,
  "Business": <BankOutlined />,
  "Art": <BgColorsOutlined />,
  "default": <BookOutlined />
};

const ModernBookCard = ({ book, onBorrow, onRenew, isBorrowed, isPending, loading, variant = "default" }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { _id, id, title, author, category, copies, available, coverUrl } = book;
  const bookId = _id || id;
  const isAvailable = copies > 0;
  
  const displayCover = getCleanImageUrl(coverUrl) || getRandomImage(bookId);
  const categoryColor = categoryColors[category] || categoryColors["default"];
  const CategoryIcon = categoryIcons[category] || categoryIcons["default"];

  const handleCardClick = () => {
    navigate(`/book/${bookId}`);
  };

  const handleBorrowClick = (e) => {
    e.stopPropagation();
    if (onBorrow) onBorrow(bookId, title, copies);
  };

  if (variant === "search") {
    // Search Variant: No Image, Category Placeholder
    return (
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          hoverable
          onClick={handleCardClick}
          bordered={false}
          style={{ 
            borderRadius: 12, 
            overflow: 'hidden', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
          }}
          bodyStyle={{ padding: 0, display: 'flex', height: 160 }}
        >
          {/* Left Side: Category Placeholder */}
          <div style={{ 
            width: 90, 
            backgroundColor: categoryColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>
              {CategoryIcon}
            </div>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', padding: '0 4px' }}>
              {category || "Book"}
            </Text>
          </div>

          {/* Right Side: Info */}
          <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <div>
              <Title level={5} ellipsis={{ rows: 2 }} style={{ marginBottom: 4, fontSize: 15, lineHeight: 1.3 }}>
                {title}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                <UserOutlined style={{ marginRight: 6 }} />{author}
              </Text>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Tag color={isAvailable ? 'success' : 'error'} bordered={false} style={{ marginRight: 0, fontSize: 11 }}>
                {isAvailable ? 'In Stock' : 'Out'}
              </Tag>
              <Button 
                type="primary" 
                size="small" 
                shape="round" 
                ghost 
                onClick={handleBorrowClick}
                disabled={!isAvailable}
                style={{ fontSize: 12, height: 24, padding: '0 8px' }}
              >
                Borrow
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (variant === "horizontal") {
    // Horizontal Variant (Home Page): Image on Left, Details on Right
    return (
      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
        <Card
          hoverable
          onClick={handleCardClick}
          bordered={false}
          className="card-shadow"
          style={{ borderRadius: 14, overflow: 'hidden' }}
          bodyStyle={{ padding: 0, display: 'flex', minHeight: 150 }}
        >
            {/* Left: Image */}
            <div style={{
                width: 110,
                background: `url(${displayCover}) center/cover`,
                flexShrink: 0,
                position: 'relative'
            }}>
                 <div style={{ position: 'absolute', top: 8, left: 8 }}>
                    <Tag color={isAvailable ? 'success' : 'error'} style={{ margin: 0, border: 'none', opacity: 0.9 }}>
                        {isAvailable ? 'In Stock' : 'Out'}
                    </Tag>
                 </div>
            </div>

            {/* Right: Content */}
            <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: 8 }}>
                             <Tag color={categoryColor} style={{ border: 'none', marginBottom: 6, fontSize: 11, padding: '0 6px' }}>{category || 'General'}</Tag>
                             <Title level={5} style={{ margin: 0, fontSize: 16, lineHeight: 1.3 }} ellipsis={{ rows: 1 }}>{title}</Title>
                        </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}><UserOutlined /> {author}</Text>
                    <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginTop: 8, fontSize: 12, marginBottom: 0, lineHeight: 1.4 }}>
                        {book.description || "Immerse yourself in this fascinating read. Discover new perspectives and ideas within these pages."}
                    </Paragraph>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{copies} copies</Text>
                     <Button type="primary" size="small" shape="round" onClick={handleBorrowClick} disabled={!isAvailable}>
                        Borrow
                     </Button>
                </div>
            </div>
        </Card>
      </motion.div>
    );
  }

  // Default / Recommended Variant (Hero Style)
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hoverable
        onClick={handleCardClick}
        bordered={false}
        className="card-shadow"
        style={{ borderRadius: 16, overflow: 'hidden' }}
        cover={
          <div style={{ 
            height: 240, // Taller for hero feel
            background: `url(${displayCover}) center/cover`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Gradient Overlay for Text Readability at bottom */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)'
            }} />
            
            {!coverUrl && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                 <BookOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              </div>
            )}
            
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <Tag color={isAvailable ? 'success' : 'error'} style={{ margin: 0, borderRadius: 12, border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {isAvailable ? 'In Stock' : 'Out'}
              </Tag>
            </div>
          </div>
        }
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Tag color={categoryColors[category] || 'default'} style={{ borderRadius: 4, fontSize: 10, border: 'none' }}>
            {category || 'General'}
          </Tag>
        </div>
        
        <Tooltip title={title}>
          <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 16 }} className="text-ellipsis">
            {title}
          </Title>
        </Tooltip>
        
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }} className="text-ellipsis">
          by {author}
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#8c8c8c' }}>
            <UserOutlined style={{ marginRight: 4 }} /> {copies} {t("guide.borrow.desc").includes("copies") ? "" : "copies"}
          </div>
          {isBorrowed && (
             <Tag color="processing" style={{ margin: 0 }}>{t("common.borrowed")}</Tag>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default ModernBookCard;
