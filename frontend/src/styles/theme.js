// 图书馆统一主题配置
// Library Unified Theme Configuration

export const theme = {
  colors: {
    primary: {
      main: '#BC6C25', // Warm Bronze/Dried Rose equivalent for magazine feel
      light: '#DDA15E',
      dark: '#606C38', // Olive Green as dark variant
      gradient: 'linear-gradient(135deg, #BC6C25, #DDA15E)',
      gradientHover: 'linear-gradient(135deg, #A45B1E, #C68E4D)'
    },
    secondary: {
      main: '#606C38', // Olive Green
      light: '#FEFAE0', // Paper Gold/Cream
      dark: '#283618', // Dark Forest
      gradient: 'linear-gradient(135deg, #606C38, #283618)',
      gradientHover: 'linear-gradient(135deg, #4F5B2A, #1F2B12)'
    },
    neutral: {
      white: '#FFFFFF',
      lightGray: '#FDFBF7', // Warm Paper White
      gray: '#E6E2DD', // Warm Gray
      darkGray: '#9C9893',
      darkerGray: '#4A4845',
      black: '#1C1917' // Warm Black
    },
    status: {
      success: '#52B788', // Muted Green
      warning: '#E9C46A', // Muted Yellow/Gold
      error: '#E76F51', // Muted Red/Terra Cotta
      info: '#BC6C25' // Use Primary for info to keep warm tone
    },
    background: {
      main: '#FDFBF7', // Warm Paper Background
      card: '#FFFFFF',
      glass: 'rgba(253, 251, 247, 0.95)'
    }
  },

  // 字体配置
  typography: {
    fontFamily: {
      primary: '"Literata", "Inter", "Segoe UI", sans-serif',
      secondary: '"Inter", "Segoe UI", sans-serif',
      serif: '"Literata", serif',
      sans: '"Inter", sans-serif'
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      xxl: '32px'
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
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px'
  },

  // 阴影配置
  shadows: {
    sm: '0 2px 8px rgba(188, 108, 37, 0.08)', // Warm shadow
    md: '0 4px 16px rgba(188, 108, 37, 0.12)',
    lg: '0 8px 24px rgba(188, 108, 37, 0.16)',
    xl: '0 12px 32px rgba(188, 108, 37, 0.2)'
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
    borderRadius: '24px', // More rounded for editorial feel
    boxShadow: theme.shadows.md,
    color: theme.colors.neutral.white,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: theme.typography.fontWeight.medium,
    transition: 'all 0.3s ease',
    padding: '8px 24px'
  }),

  // 获取卡片样式
  getCardStyle: () => ({
    background: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.sm,
    border: `1px solid ${theme.colors.neutral.gray}`
  }),

  // 获取玻璃态样式
  getGlassStyle: () => ({
    background: theme.colors.background.glass,
    backdropFilter: 'blur(16px)',
    borderRadius: theme.borderRadius.lg,
    border: '1px solid rgba(188, 108, 37, 0.1)'
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
