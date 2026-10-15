#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最小可跑的「本地 AI 操作电脑」agent。

原理：每步截屏 -> 发给本地视觉模型(Ollama) -> 模型返回一个 JSON 动作
     -> 用 pyautogui 执行 -> 再截屏，循环直到 done。

依赖（三条命令即可）：
    pip install requests pyautogui pillow
    # 需要本地已安装并运行 Ollama，且拉取一个视觉模型：
    ollama pull qwen2.5vl:7b

用法示例：
    python mini_computer_agent.py "打开计算器并按 12*7 回车"
    python mini_computer_agent.py "在浏览器搜索今天的天气" --model qwen2.5vl:7b --max-steps 20
    python mini_computer_agent.py "把桌面截图前的操作演示一遍" --dry-run   # 只看不执行

安全提示：agent 拥有你全部的鼠标键盘权限，会真的点击/输入。建议先在虚拟机运行。
紧急停止：运行时把鼠标猛甩到屏幕左上角（pyautogui FAILSAFE）。
"""

import argparse
import base64
import io
import json
import re
import sys
import time

import requests

# ---------- 配置 ----------
OLLAMA = "http://localhost:11434"   # Ollama 默认地址
MAX_W = 1280                        # 截图发送前最大宽度（越小越省显存）
SCALE_X = 1.0                       # 模型坐标 -> 真实坐标 的缩放因子
SCALE_Y = 1.0

# ---------- 系统提示词：约束模型只输出一个 JSON 动作 ----------
SYSTEM_PROMPT = """你是一个操作电脑的智能体。你会收到当前屏幕截图和任务。
你需要决定下一步只做「一个」动作，并只输出一个 JSON，格式严格如下：

{"thought": "简短中文思考", "action": "动作名", "args": {参数}}

可用动作：
- click(x, y)               左键单击，坐标是图像像素
- double_click(x, y)        双击
- right_click(x, y)         右键
- move(x, y)                移动鼠标
- type(text)                输入文字
- key(comb)                 按键，如 "enter"、"ctrl+c"、"alt+f4"
- scroll(amount, x, y)      滚轮，amount 正数向上、负数向下
- wait(seconds)             等待
- done(summary)             任务完成，summary 是结果说明
- fail(reason)              无法完成，reason 说明原因

规则：
1. 坐标基于你看到的图片尺寸，左上角为 (0,0)。
2. 每轮只输出一个 JSON，不要输出多余文字、不要用 markdown 代码块。
3. 如果不确定，先用 click 聚焦，再 type/key。
4. 任务完成时用 done。
"""


def screenshot_b64():
    """截取全屏，按 MAX_W 缩放后转 base64，并更新坐标缩放因子。"""
    global SCALE_X, SCALE_Y
    import pyautogui
    img = pyautogui.screenshot()
    real_w, real_h = img.size
    if real_w > MAX_W:
        new_h = int(real_h * MAX_W / real_w)
        img = img.resize((MAX_W, new_h))
    SCALE_X = real_w / img.width
    SCALE_Y = real_h / img.height
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def ask_model(model, task, log):
    """把当前屏幕 + 任务 + 历史动作发给 Ollama 视觉模型，返回文本。"""
    b64 = screenshot_b64()
    user_text = (
        f"任务：{task}\n\n"
        f"已执行动作（供参考，别重复）：\n{log if log else '（无）'}\n\n"
        "请根据当前屏幕决定下一步唯一动作，只输出 JSON。"
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_text, "images": [b64]},
        ],
        "stream": False,
        "options": {"temperature": 0},
    }
    r = requests.post(f"{OLLAMA}/api/chat", json=payload, timeout=180)
    r.raise_for_status()
    return r.json()["message"]["content"]


def parse_action(text):
    """从模型输出里抠出 JSON 动作。"""
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    if "action" in obj:
        obj.setdefault("args", {})
        obj.setdefault("thought", "")
        return obj
    return None


def _paste_text(text):
    """非 ASCII 文本用剪贴板粘贴（pyautogui.write 不支持中文）。"""
    import pyautogui
    try:
        import pyperclip
    except ImportError:
        print("  ! 需要输入非英文字符，请先 pip install pyperclip")
        return
    pyperclip.copy(text)
    time.sleep(0.1)
    pyautogui.hotkey("ctrl", "v")


def execute(act, dry_run=False):
    """执行单个动作，返回 (是否结束, 结果文本)。"""
    name = act.get("action")
    a = act.get("args", {}) or {}
    print(f"  → {act.get('thought','')}  [{name} {a}]")
    if dry_run:
        return name in ("done", "fail"), f"(dry-run) {name}"

    import pyautogui
    pyautogui.PAUSE = 0.3

    def real_xy(x, y):
        return int(x * SCALE_X), int(y * SCALE_Y)

    if name in ("click", "double_click", "right_click", "move"):
        x, y = real_xy(a.get("x", 0), a.get("y", 0))
        if name == "move":
            pyautogui.moveTo(x, y, duration=0.2)
        elif name == "click":
            pyautogui.click(x, y)
        elif name == "double_click":
            pyautogui.doubleClick(x, y)
        elif name == "right_click":
            pyautogui.rightClick(x, y)
    elif name == "type":
        text = str(a.get("text", ""))
        if text.isascii():
            pyautogui.write(text, interval=0.02)
        else:
            _paste_text(text)
    elif name == "key":
        comb = str(a.get("comb", "")).lower().replace(" ", "")
        keys = [k for k in comb.split("+") if k]
        if len(keys) > 1:
            pyautogui.hotkey(*keys)
        elif keys:
            pyautogui.press(keys[0])
    elif name == "scroll":
        amount = int(a.get("amount", -3))
        if "x" in a and "y" in a:
            x, y = real_xy(a["x"], a["y"])
            pyautogui.moveTo(x, y, duration=0.2)
        pyautogui.scroll(amount)
    elif name == "wait":
        time.sleep(float(a.get("seconds", 1)))
    elif name == "done":
        return True, str(a.get("summary", "完成"))
    elif name == "fail":
        return True, "失败：" + str(a.get("reason", ""))
    else:
        return False, f"未知动作：{name}"
    return False, ""


def check_ollama():
    try:
        r = requests.get(f"{OLLAMA}/api/tags", timeout=5)
        r.raise_for_status()
        return True
    except Exception:
        print(f"无法连接 Ollama（{OLLAMA}）。请先安装并启动 Ollama：https://ollama.com/download")
        return False


def main():
    p = argparse.ArgumentParser(description="本地 AI 操作电脑（最小版）")
    p.add_argument("task", help="要 AI 做的事，例如：打开记事本写一句hello")
    p.add_argument("--model", default="qwen2.5vl:7b", help="Ollama 视觉模型名")
    p.add_argument("--max-steps", type=int, default=15, help="最多执行多少步")
    p.add_argument("--dry-run", action="store_true", help="只打印动作，不真的操作")
    args = p.parse_args()

    if not check_ollama():
        sys.exit(1)

    print("=" * 50)
    print(f"任务：{args.task}")
    print(f"模型：{args.model}   最多 {args.max_steps} 步")
    print("3 秒后开始。紧急停止：把鼠标猛甩到屏幕左上角。")
    print("=" * 50)
    for i in (3, 2, 1):
        print(f"  {i}...")
        time.sleep(1)

    log = []
    for step in range(1, args.max_steps + 1):
        print(f"\n[第 {step} 步] 截屏并询问模型...")
        try:
            raw = ask_model(args.model, args.task, "\n".join(log[-6:]))
        except Exception as e:
            print(f"模型请求失败：{e}")
            break

        act = parse_action(raw)
        if not act:
            print(f"  ! 模型未返回合法动作，原文：{raw[:200]}")
            log.append("上一步输出格式错误")
            continue

        finished, result = execute(act, dry_run=args.dry_run)
        log.append(f"{act['action']} {act.get('args', {})}")
        if finished:
            print(f"\n结束：{result}")
            return

    print(f"\n达到最大步数 {args.max_steps}，停止。")


if __name__ == "__main__":
    main()
