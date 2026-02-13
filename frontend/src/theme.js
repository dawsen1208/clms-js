export const theme = {
  token: {
    colorPrimary: '#1677FF', // Vibrant Blue
    colorInfo: '#1677FF',
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    
    colorBgLayout: '#F8F9FA', // Lighter, cleaner background
    colorBgContainer: '#FFFFFF',
    colorBorderSecondary: '#F0F0F0',
    
    borderRadius: 8, // Standard base radius
    borderRadiusLG: 16, // Requested rounded cards
    
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', // Softer, spread out shadow
    boxShadowSecondary: '0 2px 8px rgba(0, 0, 0, 0.04)',
    
    fontSizeHeading1: 32,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSize: 14,
    
    controlHeightLG: 48, // Taller, more premium buttons
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Layout: {
      bodyBg: '#F8F9FA',
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
    },
    Card: {
      borderRadiusLG: 16,
      headerFontSize: 18,
      headerFontWeight: 600,
    },
    Button: {
      fontWeight: 500,
      controlHeight: 40,
      borderRadius: 8,
    },
    Table: {
      borderRadiusLG: 12,
      headerBg: '#FAFAFA',
      headerSplitColor: 'transparent',
    },
    Tabs: {
      itemSelectedColor: '#1677FF',
      inkBarColor: '#1677FF',
    },
    Tag: {
      borderRadius: 4,
    }
  }
};
