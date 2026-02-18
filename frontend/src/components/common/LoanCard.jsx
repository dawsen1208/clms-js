import React from 'react';
import { Typography, Row, Col, Tag, Progress, Button, Space, theme, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  BookOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import BookCoverPro from './BookCoverPro';
import { stringToWarmColor } from '../../utils/hashColor';
import { getCleanImageUrl } from '../../utils/imageUtils';

const { Title, Text } = Typography;

const LoanCard = ({ 
  book, 
  onRenew, 
  variant = 'active'
}) => {
  const { token } = theme.useToken();
  const navigate = useNavigate();

  // Helper to calculate days left
  const getDaysLeft = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    const due = dueDate ? dayjs(dueDate) : dayjs(borrowDate).add(30, 'day');
    const now = dayjs();
    return due.diff(now, 'day');
  };

  // Helper to calculate progress
  const getProgressPercent = (borrowDate, dueDate) => {
    if (!borrowDate) return 0;
    const start = dayjs(borrowDate);
    const end = dueDate ? dayjs(dueDate) : start.add(30, 'day');
    const now = dayjs();
    const totalDuration = end.diff(start, 'hour');
    const elapsed = now.diff(start, 'hour');
    
    if (totalDuration === 0) return 0;
    const percent = (elapsed / totalDuration) * 100;
    return Math.min(Math.max(percent, 0), 100);
  };

  const daysLeft = getDaysLeft(book.borrowDate, book.dueDate);
  const progress = getProgressPercent(book.borrowDate, book.dueDate);
  const isOverdue = daysLeft < 0;
  
  // Pending request check (passed in book object usually)
  const pendingType = book.pendingType; // 'renew', 'return'

  const coverImage = getCleanImageUrl(book.coverImage || "");
  const coverSet = book.coverImageSet;
  const coverSrcSet = coverSet
    ? [
        coverSet.w160 ? `${coverSet.w160} 160w` : null,
        coverSet.w240 ? `${coverSet.w240} 240w` : null,
        coverSet.w360 ? `${coverSet.w360} 360w` : null,
      ].filter(Boolean).join(", ")
    : undefined;
  const coverSizes = "(max-width: 575px) 70px, (max-width: 991px) 80px, 90px";

  return (
    <div 
      className="loan-card-editorial"
      onClick={() => navigate(`/book/${book.bookId || book.id || book._id}`)}
      style={{
        background: '#fff',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 2, // Sharp magazine feel
        padding: 0,
        marginBottom: 24,
        position: 'relative',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)';
      }}
    >
      <Row gutter={0} style={{ height: '100%' }}>
        {/* Cover Image - Left Side */}
        <Col xs={8} sm={5} md={4} lg={3} style={{ background: '#FAF9F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
           <div style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
             {coverImage ? (
               <img
                 src={coverImage}
                 srcSet={coverSrcSet}
                 sizes={coverSizes}
                 alt={book.title}
                 style={{
                   width: 80,
                   height: 120,
                   objectFit: 'cover',
                   borderRadius: 4,
                   display: 'block',
                 }}
               />
             ) : (
               <BookCoverPro 
                 title={book.title} 
                 author={book.author} 
                 width={80} 
                 height={120} 
                 style="swiss"
                 baseColor={stringToWarmColor(book.title)}
               />
             )}
           </div>
        </Col>

        {/* Content - Right Side */}
        <Col xs={16} sm={19} md={20} lg={21} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
             <div>
                <Title level={4} style={{ 
                  margin: '0 0 4px 0', 
                  fontFamily: "'Literata', serif", 
                  fontSize: 20,
                  color: token.colorTextHeading
                }}>
                  {book.title}
                </Title>
                <Text type="secondary" style={{ 
                  fontFamily: "'Inter', sans-serif", 
                  fontSize: 14,
                  color: token.colorTextSecondary
                }}>
                  by {book.author || "Unknown Author"}
                </Text>
             </div>
             
             <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isOverdue && (
                  <Tag color="error" style={{ borderRadius: 12, border: 'none', padding: '2px 10px' }}>
                    Overdue
                  </Tag>
                )}
                <Tag style={{ 
                  borderRadius: 12, 
                  border: `1px solid ${token.colorBorderSecondary}`, 
                  background: 'transparent', 
                  color: token.colorTextSecondary 
                }}>
                  Due {book.dueDate ? dayjs(book.dueDate).format("MMM D") : "N/A"}
                </Tag>
             </div>
           </div>

           <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* Progress Bar */}
              <div style={{ flex: 1, minWidth: 200 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                   <Text style={{ fontSize: 12, color: token.colorTextQuaternary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loan Period</Text>
                   <Text style={{ fontSize: 12, fontWeight: 600, color: isOverdue ? token.colorError : token.colorPrimary }}>
                     {isOverdue ? `${Math.abs(daysLeft)} Days Overdue` : `${daysLeft} Days Left`}
                   </Text>
                 </div>
                 <Progress 
                    percent={progress} 
                    showInfo={false} 
                    strokeColor={isOverdue ? token.colorError : token.colorPrimary}
                    trailColor="#F0F0F0"
                    size="small"
                    style={{ marginBottom: 0 }}
                 />
              </div>

              {/* Actions */}
              {variant === 'active' && (
                <div style={{ display: 'flex', gap: 12 }}>
                   <Button 
                     type="default"
                     disabled={!!pendingType || isOverdue}
                     onClick={(e) => {
                       e.stopPropagation();
                       onRenew && onRenew(book);
                     }}
                     icon={pendingType === 'renew' ? <SyncOutlined spin /> : <ClockCircleOutlined />}
                     style={{ 
                       borderRadius: 20, 
                       borderColor: token.colorBorderSecondary,
                       color: token.colorTextSecondary,
                       fontFamily: "'Inter', sans-serif",
                       fontSize: 13
                     }}
                   >
                     {pendingType === 'renew' ? 'Pending' : 'Renew'}
                   </Button>
                </div>
              )}
           </div>
        </Col>
      </Row>
    </div>
  );
};

export default LoanCard;
