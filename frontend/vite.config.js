// ✅ vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ============================================================
// 🌐 改进说明：
// - 允许手机、平板、其他电脑在同一 Wi-Fi 下访问前端页面
// - 启用跨域（方便前后端联调）
// - 保留你的原始结构与风格
// ============================================================

// 获取当前构建时间
const buildTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
const buildVersion = process.env.npm_package_version || '1.3.1';

export default defineConfig({
  base: '/', // ✅ Reverted to root for Azure Static Web Apps
  plugins: [
    react(),
  ],
  define: {
    // 注入构建信息
    '__BUILD_INFO__': JSON.stringify({
      time: buildTime,
      version: buildVersion,
      commit: 'latest' // 如果有 git 可以尝试注入 git hash，这里先用 latest
    })
  },
  build: {
    // 确保构建产物文件名带有 hash，防止缓存
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-utils': ['axios', 'dayjs', 'framer-motion', 'recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },

  server: {
    host: '0.0.0.0',  // ✅ 允许局域网访问
    port: 5174,
    strictPort: true,   // 固定端口，避免端口漂移导致访问失败
    cors: true,         // ✅ 允许跨域请求（访问后端API）
    open: false,        // ✅ 启动时不自动打开浏览器
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: 'localhost',
    port: 5174,
  },
})
