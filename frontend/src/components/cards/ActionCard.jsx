import React from 'react';
import { Typography, Button, theme } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ActionCard = ({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  secondaryAction,
  color,
  variant = 'default' // default, primary, ghost
}) => {
  const { token } = theme.useToken();
  
  // Color logic
  const accentColor = color || token.colorPrimary;
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? accentColor : token.colorBgContainer;
  const textColor = isPrimary ? token.colorWhite : token.colorText;
  const subTextColor = isPrimary ? token.colorTextLightSolid : token.colorTextSecondary;

  return (
    <div 
      className="editorial-card"
      style={{ 
        padding: 32, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'flex-start',
        background: bg,
        color: textColor,
        border: isPrimary ? 'none' : `1px solid ${token.colorBorderSecondary}`
      }}
    >
      {icon && (
        <div style={{ 
          marginBottom: 24,
          width: 48,
          height: 48,
          borderRadius: 12,
          background: isPrimary ? token.colorBgContainer : `${accentColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isPrimary ? token.colorWhite : accentColor,
          fontSize: 24
        }}>
          {icon}
        </div>
      )}

      <Title level={3} style={{ 
        marginBottom: 12, 
        color: textColor,
        fontFamily: "'Literata', serif"
      }}>
        {title}
      </Title>

      <Text style={{ 
        marginBottom: 32, 
        color: subTextColor, 
        fontSize: 16,
        lineHeight: 1.6
      }}>
        {description}
      </Text>

      <div style={{ marginTop: 'auto', width: '100%', display: 'flex', gap: 16 }}>
        {actionLabel && (
          <Button 
            type={isPrimary ? 'default' : 'primary'}
            size="large"
            onClick={onAction}
            icon={<ArrowRightOutlined />}
            style={{ 
              borderRadius: 24,
              padding: '0 24px',
              fontWeight: 500,
              boxShadow: 'none',
              border: 'none',
              color: isPrimary ? accentColor : token.colorWhite
            }}
          >
            {actionLabel}
          </Button>
        )}
        
        {secondaryAction && (
          <Button 
            type="text"
            size="large"
            onClick={secondaryAction.onClick}
            style={{ 
              color: isPrimary ? '#fff' : token.colorTextSecondary,
              borderRadius: 24
            }}
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ActionCard;
