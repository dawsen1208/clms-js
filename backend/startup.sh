#!/bin/bash
# 启动脚本：先安装依赖，再启动应用

echo "🚀 安装依赖..."
npm install --production

echo "✅ 依赖安装完成，启动服务器..."
npm start
