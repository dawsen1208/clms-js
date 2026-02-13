import React from 'react';
import { Card, Typography, Row, Col, Tag, Progress, Button, Space, theme, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  BookOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const LoanCard = ({ 
  book, 
  onRenew, 
  onReturn, 
  loading = false,
  variant = 'active' // active, history
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

  return (
    <Card
      hoverable
      bordered={false}
      style={{ 
        marginBottom: 16, 
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        transition: 'all 0.3s'
      }}
      bodyStyle={{ padding: 24 }}
      onClick={() => navigate(`/book/${book._id || book.id}`)}
    >
      <Row gutter={[24, 24]} align="middle">
        {/* Book Info */}
        <Col xs={24} md={10}>
          <Space align="start">
            <div style={{ 
              width: 48, 
              height: 64, 
              background: token.colorFillSecondary, 
              borderRadius: token.borderRadiusSM,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BookOutlined style={{ fontSize: 24, color: token.colorTextQuaternary }} />
            </div>
            <div>
              <Title level={4} style={{ marginBottom: 4, marginTop: 0 }}>
                {book.title}
              </Title>
              <Text type="secondary" style={{ display: 'block' }}>
                Borrowed on {dayjs(book.borrowDate).format("MMM D, YYYY")}
              </Text>
            </div>
          </Space>
          
          <div style={{ marginTop: 16 }}>
             <Space size={8} wrap>
               <Tag 
                  icon={<ClockCircleOutlined />} 
                  color={isOverdue ? "error" : daysLeft < 5 ? "warning" : "success"} 
                  style={{ borderRadius: 12, padding: '2px 10px', border: 'none' }}
               >
                 {isOverdue ? `${Math.abs(daysLeft)} Days Overdue` : `${daysLeft} Days Left`}
               </Tag>
               
               {pendingType && (
                 <Tag color="processing" icon={<SyncOutlined spin />} style={{ borderRadius: 12, padding: '2px 10px', border: 'none' }}>
                   {pendingType === 'renew' ? 'Renew Pending' : 'Return Pending'}
                 </Tag>
               )}
             </Space>
          </div>
        </Col>
        
        {/* Progress Section */}
        <Col xs={24} md={8}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Time Elapsed</Text>
            <Text strong style={{ fontSize: 12, color: isOverdue ? token.colorError : token.colorPrimary }}>
              {Math.round(progress)}%
            </Text>
          </div>
          <Progress 
            percent={progress} 
            showInfo={false} 
            strokeColor={isOverdue ? token.colorError : { '0%': token.colorPrimary, '100%': token.colorSuccess }} 
            trailColor={token.colorFillSecondary}
            strokeLinecap="round"
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
             <Text type="secondary" style={{ fontSize: 12 }}>
               Due: {book.dueDate ? dayjs(book.dueDate).format("MMM D, YYYY") : "N/A"}
             </Text>
             {book.renewCount > 0 && (
               <Tooltip title={`${book.renewCount} renewals used`}>
                 <Tag style={{ margin: 0, fontSize: 10 }}>{book.renewCount} Renewals</Tag>
               </Tooltip>
             )}
          </div>
        </Col>
        
        {/* Actions */}
        <Col xs={24} md={6} style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {variant === 'active' && (
            <Button 
              type={isOverdue ? "primary" : "default"}
              danger={isOverdue}
              icon={<SyncOutlined />} 
              loading={loading}
              disabled={!!pendingType || isOverdue} // Cannot renew if overdue or pending
              onClick={(e) => {
                e.stopPropagation();
                onRenew && onRenew(book);
              }}
              style={{ borderRadius: 18 }}
            >
              Renew
            </Button>
          )}
          {/* Add Return button if needed in future, usually handled physically */}
        </Col>
      </Row>
    </Card>
  );
};

export default LoanCard;
