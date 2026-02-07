export const theme = {
  token: {
    colorPrimary: '#1890ff', // Standard Blue
    colorBgLayout: '#F6F7FB', // Light Gray Background
    borderRadius: 14,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    fontSize: 14,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  },
  components: {
    Layout: {
      bodyBg: '#F6F7FB',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    },
    Card: {
      headerFontSize: 18,
      headerFontWeight: 600,
    },
    Typography: {
      fontWeightStrong: 700,
    },
    Button: {
      fontWeight: 500,
      controlHeight: 40,
    }
  }
};

export const globalStyles = {
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f1f1f',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f1f1f',
    marginBottom: '16px',
  },
  kpiNumber: {
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  textSecondary: {
    color: '#8c8c8c',
  }
};
