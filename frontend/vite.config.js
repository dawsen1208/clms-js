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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-icon-180.png'],
      manifest: {
        name: 'CLMS-JS 图书馆管理系统',
        short_name: 'CLMS-JS',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1677ff',
        icons: [
          // Use your custom icons placed under /public/icons
          { src: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/icons/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB limit for large assets
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],

  server: {
    host: 'localhost',  // 明确绑定到 localhost，避免网卡变化
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
