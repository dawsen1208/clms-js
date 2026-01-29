
# 自动构建并部署脚本

$ErrorActionPreference = "Stop"

try {
    # 1. 前端构建
    Write-Host "正在构建前端..." -ForegroundColor Green
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "前端构建失败！"
    }
    Set-Location ..

    # 2. 提交代码到 GitHub
    Write-Host "正在提交代码..." -ForegroundColor Green
    git add .
    $commitMessage = Read-Host "请输入提交信息 (默认为 'update: auto deploy')"
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $commitMessage = "update: auto deploy"
    }
    git commit -m "$commitMessage"

    # 3. 推送到远程仓库
    Write-Host "正在推送到 GitHub..." -ForegroundColor Green
    git push origin main

    Write-Host "部署完成！" -ForegroundColor Green
}
catch {
    Write-Host "发生错误: $_" -ForegroundColor Red
    exit 1
}
