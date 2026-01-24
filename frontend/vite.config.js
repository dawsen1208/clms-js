// ✅ vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// ============================================================
// 🌐 改进说明：
// - 允许手机、平板、其他电脑在同一 Wi-Fi 下访问前端页面
// - 启用跨域（方便前后端联调）
// - 保留你的原始结构与风格
// ============================================================

export default defineConfig({
  base: '/', // ✅ 确保绝对路径，避免嵌套路由（如 /books/:id）刷新后资源 404
  plugins: [
    react(),
    // VitePWA({ ... }) // 暂时注释掉 PWA 以排除缓存干扰
  ],

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
