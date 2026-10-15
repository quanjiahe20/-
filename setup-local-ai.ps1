# setup-local-ai.ps1
# 本地 AI 接管电脑 · Windows 一键准备脚本
# 用法：用「管理员 PowerShell」运行：
#   powershell -ExecutionPolicy Bypass -File .\setup-local-ai.ps1
#
# 说明：本脚本只做「可安全自动化」的部分（检测显卡、装 Ollama、拉模型、打开下载页）。
#      两个 GUI 应用的安装与配置需按 deploy-local-ai-agent.md 手动完成。

$ErrorActionPreference = "Continue"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# ---------- 1. 检测显卡 / 显存 ----------
Write-Step "1/4 检测显卡"
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    nvidia-smi --query-gpu=name,memory.total --format=csv
    Write-Host "提示：显存 < 8GB 时请务必只用 Q4 量化模型。" -ForegroundColor Yellow
} else {
    Write-Host "未检测到 NVIDIA 显卡（或驱动未装）。纯 CPU 也能跑，但会很慢。" -ForegroundColor Yellow
}

# ---------- 2. 安装 Ollama ----------
Write-Step "2/4 安装 Ollama（本地模型运行时）"
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if ($ollama) {
    Write-Host "已安装 Ollama。"
} else {
    Write-Host "尝试用 winget 安装..."
    winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        Write-Host "winget 安装未成功，请手动下载：https://ollama.com/download/windows" -ForegroundColor Yellow
    }
}
$ollama = Get-Command ollama -ErrorAction SilentlyContinue

# ---------- 3. 拉取模型 ----------
Write-Step "3/4 拉取本地模型"
if ($ollama) {
    # 文件/命令/代码用（约 4.5GB）
    Write-Host "拉取 qwen2.5-coder:7b ..."
    ollama pull qwen2.5-coder:7b

    # 视觉点击用：UI-TARS-1.5-7B 需自行准备量化 GGUF 后用 Modelfile 创建。
    Write-Host "`n视觉模型（UI-TARS-1.5-7B）需手动准备量化 GGUF，步骤见 deploy-local-ai-agent.md 第 3 节。" -ForegroundColor Yellow
    Write-Host "现成但偏大（15GB，8GB 显卡会变慢）的版本可试： ollama pull 0000/ui-tars-1.5-7b"
} else {
    Write-Host "跳过：Ollama 未就绪。" -ForegroundColor Yellow
}

# ---------- 4. 打开两个应用的下载页 ----------
Write-Step "4/4 打开应用下载页"
Start-Process "https://github.com/bytedance/UI-TARS-desktop/releases/latest"   # UI-TARS Desktop
Start-Process "https://www.openinterpreter.com/download"                       # Open Interpreter Desktop

Write-Host "`n完成基础准备。请按 deploy-local-ai-agent.md 继续安装并配置两个应用。" -ForegroundColor Green
