# 本地 AI 接管电脑 · Windows 部署方案（8GB 显卡版）

> 目标：在你自己的 Windows 电脑上，用本地模型让 AI 直接看屏幕、动鼠标键盘、开浏览器、跑命令和整理文件。
> 全程开源框架 + 本地推理，数据不出本机。

---

## 0. 方案总览

只用**一个应用**很难同时做好"高精度视觉点击"和"文件/命令/浏览器"。推荐组合：

| 组件 | 作用 | 对应你的需求 |
|---|---|---|
| **Ollama** | 本地模型运行时，提供 OpenAI 兼容接口 | 底座 |
| **UI-TARS Desktop** | 截图→视觉模型→精确点鼠标/敲键盘，接管真实桌面 | 鼠标键盘 + 视觉操作 |
| **Open Interpreter Desktop** | 在指定文件夹里读写文件、跑 shell/代码、操作浏览器 | 文件 + 命令行 + 浏览器 |

**为什么这样分工**：UI-TARS 是专为"GUI 定位"训练的模型，视觉点击精度是开源里最好的；Open Interpreter 则擅长"代码/文件/命令行"这类非图形任务。两者都支持本地模型。

**建议顺序**：先装 Ollama，再装 Open Interpreter Desktop（最快见效），最后配 UI-TARS Desktop（视觉接管）。

---

## 1. 硬件与模型选型（8GB 显存能跑什么）

| 用途 | 推荐模型 | 量化后大小 | 显存占用 |
|---|---|---|---|
| 视觉点击（UI-TARS Desktop） | `UI-TARS-1.5-7B` | Q4_K_M ≈ 5GB | ≈5–7GB（够） |
| 文件/命令/代码（Open Interpreter） | `qwen2.5-coder:7b` 或 `qwen2.5:7b` | Q4 ≈ 4.5GB | ≈5GB（够） |
| 视觉备用（Open Interpreter 看图） | `qwen2.5vl:7b` | Q4 ≈ 5GB | ≈6GB（偏紧） |

> 8GB 显存的关键：**一定用 Q4 量化**。整屏截图 token 很多，把上下文控制在 4K–8K，别开太大，否则显存爆掉会退到 CPU 变很慢。

---

## 2. 第一步：安装 Ollama（本地模型运行时）

方式 A（推荐，命令行）：
```powershell
winget install --id Ollama.Ollama -e
```
方式 B（若 winget 报错）：去官网下载 Windows 安装包 https://ollama.com/download/windows

安装后验证：
```powershell
ollama --version
```
Windows 上 Ollama 默认监听 `http://localhost:11434`，并自带 OpenAI 兼容接口 `http://localhost:11434/v1/`（后面 UI-TARS Desktop 要用）。

拉一个通用/代码模型：
```powershell
ollama pull qwen2.5-coder:7b
```

---

## 3. 第二步：准备本地视觉模型（UI-TARS-1.5-7B 量化版）

UI-TARS Desktop 需要一个 **OpenAI 兼容** 的视觉模型服务。有两条路：

### 路线 A：Ollama（最省事）
1. 到 Hugging Face 下载 Q4 量化版 GGUF 与视觉投影文件（mmproj）：
   - `Mungert/UI-TARS-1.5-7B-GGUF`（选 **Q4_K_M** 的 .gguf，以及带 `mmproj` 的那个文件）
2. 写一个 `Modelfile`（放在下载目录）：
   ```
   FROM ./UI-TARS-1.5-7B-Q4_K_M.gguf
   FROM ./mmproj-UI-TARS-1.5-7B-f16.gguf
   ```
   > 第二个 `FROM` 是视觉投影（mmproj），Ollama 用它支持图片输入。文件名请以你实际下载的文件名为准。
3. 创建并运行：
   ```powershell
   ollama create uitars -f .\Modelfile
   ollama run uitars
   ```
   打开后能回话、能识别图片即成功。

> 注意：Ollama 上现成的 `0000/ui-tars-1.5-7b` 约 15GB（近 fp16），8GB 显卡会大量走内存/CPU，很慢，不建议。

### 路线 B：llama.cpp / vLLM（更稳、更接近官方）
- `llama.cpp` 的 `llama-server` 加载同一个 GGUF + mmproj，暴露一个 `http://localhost:8080/v1/` 的 OpenAI 兼容端点，Windows 有预编译包。
- 或 `vLLM`（需 WSL2）直接起 `UI-TARS-1.5-7B`，质量最好但吃显存。

**建议**：先用路线 A 跑通，效果不满意再换路线 B。

---

## 4. 第三步：安装 UI-TARS Desktop（视觉接管电脑）

1. 下载 Windows 版：https://github.com/bytedance/UI-TARS-desktop/releases/latest
2. （浏览器操作需要）先装好 **Chrome / Edge / Firefox** 任一。
3. 打开 App → **Settings**，按下面填（指向你的本地模型）：
   ```yaml
   Language: cn
   VLM Provider: Hugging Face for UI-TARS-1.5   # 必须选带 UI-TARS 的项，才能正确解析点击动作
   VLM Base URL: http://localhost:11434/v1/     # Ollama 路线；如用 llama.cpp 改成 http://localhost:8080/v1/
   VLM API KEY:  ollama                          # Ollama 不校验，随便填非空字符串
   VLM Model Name: uitars                        # 你 ollama create 的名字
   ```
   > 关键点：Provider 必须选 **UI-TARS 系列**（保证动作解析），Base URL 是 OpenAI 兼容端点，所以可以指向本地。
4. 新建对话，选 **Local Computer Operator**（操作本机）或 **Browser Operator**（操作浏览器），输入任务试跑，例如：
   - "打开记事本，把今天的日期打进去"
   - "在浏览器里搜索今天的天气并读给我听"

> 限制：UI-TARS Desktop **目前只支持单显示器**，多屏容易任务失败。

---

## 5. 第四步：安装 Open Interpreter Desktop（文件 / 命令 / 浏览器）

1. 下载 Windows 版：https://www.openinterpreter.com/download
2. 首次启动按提示：
   - **Workspace folder**：选一个真实工作目录，**不要选整个 Home 目录**（安全）。
   - **Profile**：选 **Ollama**，模型填 `qwen2.5-coder:7b`（Ollama 无需 key）。
   - **权限**：批准 Windows 的 UAC 提示（否则无法点鼠标/看图）。
3. 试跑："把 workspace 里所有 .png 按修改日期重命名"、"统计这个 CSV 里各城市销量"。

它能操作真实桌面 App，也能跑代码/shell，覆盖"文件 + 命令行 + 浏览器 + 基础桌面控制"。

---

## 6. 一键脚本

同目录下的 `setup-local-ai.ps1` 会：检测显卡 → 安装 Ollama → 拉取代码模型 → 打开两个应用的下载页。
用 **管理员 PowerShell** 运行：
```powershell
powershell -ExecutionPolicy Bypass -File .\setup-local-ai.ps1
```

---

## 7. 安全与注意事项（务必读）

- **AI 拥有你全部的鼠标/键盘权限**，等于"你本人"。它会真的点、真的删、真的发消息。
- 建议先在**虚拟机**或**专门的小号/测试机**里跑；重要目录和密码不要让它碰。
- 不要让 App 以管理员（admin）身份常驻运行；需要 admin 的操作临时批准即可。
- 本地模型的行动规划能力弱于云端大模型，**长任务容易跑偏**——把任务拆小，一步一步下指令。
- 8GB 显存下，**一次只加载一个视觉模型**；UI-TARS 用完后退出再让 Open Interpreter 跑代码模型，避免显存争抢。
- 全程本地 = 数据不出机器，但模型下载与更新仍需联网。

---

## 参考来源

- UI-TARS Desktop 官方仓库与文档：https://github.com/bytedance/UI-TARS-desktop
- UI-TARS-1.5 部署指南：https://github.com/bytedance/UI-TARS/blob/main/README_deploy.md
- Open Interpreter Desktop 安装文档：https://www.openinterpreter.com/docs/desktop/install
- Ollama Windows 文档：https://docs.ollama.com/
- UI-TARS-1.5-7B GGUF 量化：https://huggingface.co/Mungert/UI-TARS-1.5-7B-GGUF
