// 图书馆统一主题配置
// Library Unified Theme Configuration

export const theme = {
  colors: {
    primary: {
      main: '#1677FF',
      light: '#5B8EF3',
      dark: '#0F60D8',
      gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
      gradientHover: 'linear-gradient(135deg, #1E40AF, #2563EB)'
    },
    secondary: {
      main: '#5B8EF3',
      light: '#8AAAF7',
      dark: '#396FE0',
      gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
      gradientHover: 'linear-gradient(135deg, #1E40AF, #2563EB)'
    },
    neutral: {
      white: '#FFFFFF',
      lightGray: '#F5F7FA',
      gray: '#E5EAF2',
      darkGray: '#6B7280',
      darkerGray: '#374151',
      black: '#0A0A0A'
    },
    status: {
      success: '#52C41A',
      warning: '#FAAD14',
      error: '#FF4D4F',
      info: '#1677FF'
    },
    background: {
      main: '#F5F7FA',
      card: '#FFFFFF',
      glass: 'rgba(255, 255, 255, 0.95)'
    }
  },

  // 字体配置
  typography: {
    fontFamily: {
      primary: '"Segoe UI", "Inter", sans-serif',
      secondary: '"Segoe UI", "Inter", sans-serif'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '14px',
      lg: '18px',
      xl: '22px',
      xxl: '28px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // 圆角配置
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '12px',
    xl: '16px',
    xxl: '20px'
  },

  // 阴影配置
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.05)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 20px rgba(0, 0, 0, 0.12)',
    xl: '0 12px 28px rgba(0, 0, 0, 0.16)'
  },

  // 间距配置
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  }
};

// 主题工具函数
export const themeUtils = {
  // 获取主按钮样式
  getPrimaryButtonStyle: (hover = false) => ({
    background: theme.colors.primary.main,
    border: 'none',
    borderRadius: '8px',
    boxShadow: theme.shadows.md,
    color: theme.colors.neutral.white,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.medium,
    transition: 'all 0.3s ease'
  }),

  // 获取卡片样式
  getCardStyle: () => ({
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    boxShadow: theme.shadows.lg,
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }),

  // 获取玻璃态样式
  getGlassStyle: () => ({
    background: theme.colors.background.glass,
    backdropFilter: 'blur(10px)',
    borderRadius: theme.borderRadius.md,
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }),

  // 获取页面容器样式
  getPageContainerStyle: () => ({
    background: theme.colors.background.main,
    minHeight: 'calc(100vh - 64px)',
    padding: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily.primary
  })
};

export default theme;
