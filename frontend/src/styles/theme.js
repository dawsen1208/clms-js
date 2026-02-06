// ✅ client/src/styles/theme.js
export const appTheme = {
  token: {
    colorPrimary: '#1890ff', // 保持主蓝
    colorSuccess: '#52c41a', // 绿色
    colorWarning: '#faad14', // 橙色
    colorError: '#ff4d4f',   // 红色
    colorBgLayout: '#F6F7FB', // 全局浅灰背景
    colorBgContainer: '#FFFFFF', // 容器纯白
    borderRadius: 12,        // 统一圆角
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    fontSizeHeading1: 26,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    fontSize: 14,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', // 轻微阴影
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#001529', // 保持深色侧边栏，或者改为白色（Notion风格通常侧边栏较浅，但为了对比度，先保持深色或改为浅灰）
      // 决定保持深色侧边栏以区分区域，但Header改为纯白
      bodyBg: '#F6F7FB',
    },
    Card: {
      borderRadiusLG: 12,
      boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)', // 更轻的阴影
      paddingLG: 24,
    },
    Button: {
      borderRadius: 8, // 按钮圆角稍微小一点点，或者统一12
      borderRadiusLG: 12,
      controlHeight: 36, // 稍微高一点
      controlHeightLG: 44,
      defaultShadow: '0 2px 0 rgba(0, 0, 0, 0.02)',
      primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
    },
    Input: {
      borderRadius: 8,
      controlHeight: 36,
      controlHeightLG: 44,
    },
    Table: {
      borderRadiusLG: 12,
      headerBg: '#FAFAFA', // 表头浅灰
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }
};

export const theme = appTheme;
