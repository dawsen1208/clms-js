#!/usr/bin/env pwsh
# ============================================================
# CLMS-JS Azure 部署脚本
# 使用方法: .\deploy-azure.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Header { param($Text) Write-Host "`n=== $Text ===`n" -ForegroundColor Cyan }
function Write-Success { param($Text) Write-Host "✓ $Text" -ForegroundColor Green }
function Write-Warning { param($Text) Write-Host "⚠ $Text" -ForegroundColor Yellow }
function Write-Error { param($Text) Write-Host "✗ $Text" -ForegroundColor Red }

# ============================================================
# 配置变量 (请根据需要修改)
# ============================================================
$RESOURCE_GROUP = "clms-rg"
$LOCATION = "East Asia"
$BACKEND_NAME = "clms-backend-api"
$FRONTEND_NAME = "clms-frontend"
$SUBSCRIPTION = (Get-AzContext).Subscription.Name

Write-Header "CLMS-JS Azure 部署脚本"
Write-Host "后端: $BACKEND_NAME"
Write-Host "前端: $FRONTEND_NAME"
Write-Host "资源组: $RESOURCE_GROUP"
Write-Host "区域: $LOCATION"
Write-Host "订阅: $SUBSCRIPTION"

# ============================================================
# 步骤 1: 检查 Azure CLI 登录状态
# ============================================================
Write-Header "步骤 1: 检查登录状态"

try {
    $context = Get-AzContext
    if ($null -eq $context) {
        Write-Warning "未登录 Azure，正在打开登录..."
        Connect-AzAccount
    }
    Write-Success "已登录: $($context.Account)"
} catch {
    Write-Error "登录失败: $_"
    exit 1
}

# ============================================================
# 步骤 2: 创建资源组
# ============================================================
Write-Header "步骤 2: 创建资源组"

try {
    $rg = Get-AzResourceGroup -Name $RESOURCE_GROUP -ErrorAction SilentlyContinue
    if ($null -eq $rg) {
        New-AzResourceGroup -Name $RESOURCE_GROUP -Location $LOCATION
        Write-Success "资源组 '$RESOURCE_GROUP' 创建成功"
    } else {
        Write-Success "资源组 '$RESOURCE_GROUP' 已存在"
    }
} catch {
    Write-Error "创建资源组失败: $_"
    exit 1
}

# ============================================================
# 步骤 3: 创建后端 App Service
# ============================================================
Write-Header "步骤 3: 部署后端 API"

try {
    # 检查 App Service Plan
    $planName = "clms-backend-plan"
    $plan = Get-AzAppServicePlan -Name $planName -ResourceGroupName $RESOURCE_GROUP -ErrorAction SilentlyContinue
    if ($null -eq $plan) {
        Write-Host "创建 App Service Plan..."
        New-AzAppServicePlan -Name $planName -ResourceGroupName $RESOURCE_GROUP -Location $LOCATION -Tier "Free" -IsLinux
        Write-Success "App Service Plan 创建成功"
    } else {
        Write-Success "App Service Plan 已存在"
    }

    # 检查 Web App
    $webapp = Get-AzWebApp -Name $BACKEND_NAME -ResourceGroupName $RESOURCE_GROUP -ErrorAction SilentlyContinue
    if ($null -eq $webapp) {
        Write-Host "创建 Web App..."
        New-AzWebApp -Name $BACKEND_NAME -ResourceGroupName $RESOURCE_GROUP -Plan $planName -Runtime "NODE:20-lts"
        Write-Success "Web App 创建成功"
    } else {
        Write-Success "Web App 已存在"
    }

    # 配置应用设置
    Write-Host "配置环境变量..."
    $settings = @{
        PORT = "5000"
        HOST = "0.0.0.0"
        # 这些值需要用户手动设置或从密钥保管库获取
        MONGODB_URI = "请在 Azure 门户中设置"
        JWT_SECRET = "请在 Azure 门户中设置"
        CLIENT_ORIGIN = "https://$FRONTEND_NAME.azurestaticapps.net"
    }

    $existingSettings = Get-AzWebApp -Name $BACKEND_NAME -ResourceGroupName $RESOURCE_GROUP
    foreach ($key in $settings.Keys) {
        $value = $settings[$key]
        Set-AzWebApp -Name $BACKEND_NAME -ResourceGroupName $RESOURCE_GROUP -AppSettings @{$key = $value}
    }
    Write-Success "环境变量配置完成 (请在门户中填写敏感信息)"

} catch {
    Write-Error "后端部署失败: $_"
    exit 1
}

# ============================================================
# 步骤 4: 部署前端 Static Web Apps
# ============================================================
Write-Header "步骤 4: 部署前端 (手动步骤)"

Write-Host @"

由于 Static Web Apps 需要 GitHub 集成，建议在 Azure 门户手动配置:

1. 打开 Azure 门户
2. 点击 '创建资源' -> 搜索 'Static Web App'
3. 配置:
   - 名称: $FRONTEND_NAME
   - 资源组: $RESOURCE_GROUP
   - 源: GitHub
   - 组织: 你的 GitHub 用户名
   - 仓库: dawsen1208/clms-js
   - 分支: main
   - 构建预设: React
   - 应用位置: frontend
   - API 位置: (留空)
   - 输出位置: dist

4. 点击 '创建'

"@

# ============================================================
# 完成
# ============================================================
Write-Header "部署完成!"

Write-Host @"

后端访问地址: https://$BACKEND_NAME.azurewebsites.net
后端健康检查: https://$BACKEND_NAME.azurewebsites.net/api/health

前端访问地址: 请在创建 Static Web Apps 后获取

后续步骤:
1. 在 Azure 门户中设置后端的 MONGODB_URI (Cosmos DB 连接字符串)
2. 在 Azure 门户中设置后端的 JWT_SECRET (至少32位随机字符串)
3. 在 Azure 门户中获取前端地址并更新后端的 CLIENT_ORIGIN
4. 创建 Cosmos DB 数据库 (如果尚未创建)

"@

Read-Host "按 Enter 退出"
