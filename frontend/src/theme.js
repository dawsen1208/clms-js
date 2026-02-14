import { theme } from 'antd';

export const appTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    // Colors (Warm Editorial Palette)
    colorPrimary: '#A65D57', // Dried Rose - Main Brand Color
    colorSuccess: '#6B705C', // Olive Green
    colorWarning: '#D4A373', // Paper Gold
    colorError: '#BC4749',   // Muted Red
    colorInfo: '#8D99AE',    // Muted Blue
    
    // Backgrounds
    colorBgLayout: '#F7F5F3', // Warm Off-White
    colorBgContainer: '#FFFFFF', // Paper White
    colorBgElevated: '#FFFFFF',
    
    // Text
    colorText: '#2C2C2C', // Soft Black
    colorTextSecondary: '#595959', // Warm Dark Gray
    colorTextTertiary: '#8C8C8C',
    
    // Borders
    colorBorder: '#E6E3E0', // Warm Light Gray
    colorBorderSecondary: '#F0EEEB',
    
    // Shape & Sizes
    borderRadius: 8,
    borderRadiusLG: 16,
    borderRadiusSM: 4,
    
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,
    
    // Spacing
    marginLG: 24,
    marginMD: 16,
    marginSM: 12,
    marginXS: 8,
    
    paddingLG: 24,
    paddingMD: 16,
    paddingSM: 12,
    paddingXS: 8,
    
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
    boxShadowSecondary: '0 6px 16px rgba(0, 0, 0, 0.06)',
    boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
      boxShadow: '0 2px 0 rgba(0, 0, 0, 0.02)',
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 20,
      paddingLG: 24,
      boxShadowTertiary: '0 8px 24px rgba(0, 0, 0, 0.04)', // Softer shadow for cards
    },
    Typography: {
      fontFamilyCode: "'Fira Code', monospace",
      fontFamilyHeading: "'Literata', 'Playfair Display', serif", // Editorial Headings
    },
    Table: {
      borderRadiusLG: 12,
      headerBg: '#FAFAFA',
      headerSplitColor: 'transparent',
    },
    Tabs: {
      itemSelectedColor: '#A65D57',
      inkBarColor: '#A65D57',
    },
    Input: {
      controlHeight: 36,
      controlHeightLG: 44,
      borderRadius: 8,
      activeBorderColor: '#A65D57',
      hoverBorderColor: '#CB997E',
    },
    Menu: {
      itemSelectedColor: '#A65D57',
      itemSelectedBg: '#FFF0F0', // Very light dried rose
    },
    Layout: {
      bodyBg: '#F7F5F3',
      headerBg: '#FFFFFF',
    }
  },
};
