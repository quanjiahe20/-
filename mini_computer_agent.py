#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地 AI 操作电脑 · 可视化对话窗口版（单文件，tkinter）

准备（Windows）：
    pip install requests pyautogui pillow pyperclip
    ollama pull qwen2.5vl:7b

运行：
    python mini_computer_agent.py

窗口用法：
    - 输入任务（如「打开记事本写下今天的日期」）点「发送」
    - 右侧实时显示 agent 看到的屏幕，聊天区显示它每一步的动作
    - 「停止」随时中断；把鼠标甩到屏幕左上角也能急停（pyautogui failsafe）
    - 「演练模式」= 只看动作不真的操作
"""

import base64
import io
import json
import queue
import re
import threading
import time

import requests
import tkinter as tk
from tkinter import scrolledtext, ttk
from PIL import Image, ImageTk

# ---------- 配置 ----------
OLLAMA = "http://localhost:11434"   # Ollama 地址
MAX_W = 1280                        # 发给模型的截图最大宽度（省显存）
PREVIEW_W = 300                     # 右侧预览图宽度

# ---------- 模型提示词：每轮只返回一个 JSON 动作 ----------
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


# ---------- 核心：截图 / 模型 / 执行 ----------
def screenshot():
    """返回 (base64图, PIL图, (x缩放, y缩放))。"""
    import pyautogui
    img = pyautogui.screenshot()
    real_w, real_h = img.size
    if real_w > MAX_W:
        img = img.resize((MAX_W, int(real_h * MAX_W / real_w)))
    scale = (real_w / img.width, real_h / img.height)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode(), img, scale


def parse_action(text):
    """从模型输出里抠出 JSON 动作，失败返回 None。"""
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
        raise RuntimeError("输入中文需要 pyperclip：pip install pyperclip")
    pyperclip.copy(text)
    time.sleep(0.1)
    pyautogui.hotkey("ctrl", "v")


def execute(act, dry_run, scale):
    """执行单个动作，返回 (是否结束, 结果文本)。异常向上抛（含急停异常）。"""
    name = act.get("action")
    a = act.get("args", {}) or {}
    if dry_run:
        return name in ("done", "fail"), f"(演练) {name} {a}"

    import pyautogui
    pyautogui.PAUSE = 0.3
    sx, sy = scale

    def real_xy(x, y):
        return int(x * sx), int(y * sy)

    if name in ("click", "double_click", "right_click", "move"):
        x, y = real_xy(a.get("x", 0), a.get("y", 0))
        if name == "move":
            pyautogui.moveTo(x, y, duration=0.2)
        elif name == "click":
            pyautogui.click(x, y)
        elif name == "double_click":
            pyautogui.doubleClick(x, y)
        else:
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
        return False, ""   # 未知动作：忽略，下一步让模型重试
    return False, ""


def worker(q, stop, task, model, max_steps, dry_run):
    """后台线程：循环 截图 -> 模型 -> 执行，结果通过队列 q 发回界面。"""
    def status(s):
        q.put(("status", s))

    status("连接 Ollama ...")
    try:
        requests.get(f"{OLLAMA}/api/tags", timeout=5).raise_for_status()
    except Exception:
        q.put(("chat", "sys", f"无法连接 Ollama（{OLLAMA}）。请先安装并启动 Ollama，并确认已拉取模型 {model}。"))
        q.put(("end", None))
        return

    q.put(("chat", "sys", f"任务开始（模型 {model}，最多 {max_steps} 步，演练={dry_run}）。3 秒后动手，急停：鼠标甩到屏幕左上角。"))
    time.sleep(3)

    log = []           # 已执行动作（文字），发给模型防止重复
    for step in range(1, max_steps + 1):
        if stop.is_set():
            q.put(("chat", "sys", "已手动停止。"))
            break
        status(f"第 {step} 步：截屏 → 询问模型 ...")

        try:
            b64, img, scale = screenshot()
        except Exception as e:
            q.put(("chat", "sys", f"截图失败：{e}"))
            break
        q.put(("img", img))

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",
                 "content": (
                     f"任务：{task}\n\n"
                     f"已执行动作（不要重复）：\n" + ("\n".join(log[-6:]) or "（无）")
                     + "\n\n请根据当前屏幕决定下一步唯一动作，只输出 JSON。"
                 ),
                 "images": [b64]},
            ],
            "stream": False,
            "options": {"temperature": 0},
        }
        try:
            r = requests.post(f"{OLLAMA}/api/chat", json=payload, timeout=300)
            r.raise_for_status()
            raw = r.json()["message"]["content"]
        except Exception as e:
            q.put(("chat", "sys", f"模型请求失败：{e}"))
            break

        act = parse_action(raw)
        if not act:
            q.put(("chat", "sys", "模型输出无法解析（已跳过）：" + raw[:160]))
            log.append("格式错误")
            continue

        q.put(("chat", "agent", f"[{act.get('thought', '')}]\n动作: {act['action']} {act.get('args', {})}"))
        try:
            finished, result = execute(act, dry_run, scale)
        except Exception as e:
            # 含 pyautogui.FailSafeException（鼠标甩到角落的急停）
            name = type(e).__name__
            q.put(("chat", "sys", "急停" if "FailSafe" in name else f"动作异常，已停止：{name}: {e}"))
            break

        log.append(f"{act['action']} {act.get('args', {})}")
        if finished:
            q.put(("chat", "agent", f"结束：{result}"))
            break
        time.sleep(0.4)   # 等界面/程序响应，再进入下一步
    else:
        q.put(("chat", "sys", f"已达最大步数 {max_steps}，停止。"))

    q.put(("end", None))


# ---------- 界面 ----------
class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("本地 AI 电脑助手（Ollama 视觉 Agent）")
        self.root.geometry("1000x660")
        self.root.minsize(820, 520)

        self.q = queue.Queue()
        self.stop = threading.Event()
        self.thread = None
        self._photo = None   # 防 PhotoImage 被回收

        self._build()
        self._welcome()
        self.root.after(100, self._poll)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.mainloop()

    # --- 布局 ---
    def _build(self):
        # 顶栏：设置
        top = ttk.Frame(self.root, padding=(8, 6))
        top.pack(fill="x")
        ttk.Label(top, text="模型:").pack(side="left")
        self.model_var = tk.StringVar(value="qwen2.5vl:7b")
        ttk.Entry(top, textvariable=self.model_var, width=16).pack(side="left", padx=(2, 10))
        ttk.Label(top, text="最大步数:").pack(side="left")
        self.steps_var = tk.IntVar(value=15)
        ttk.Spinbox(top, from_=1, to=50, textvariable=self.steps_var, width=5).pack(side="left", padx=(2, 10))
        self.dry_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(top, text="演练模式（只看不点）", variable=self.dry_var).pack(side="left")
        self.clear_btn = ttk.Button(top, text="清空记录", command=self._clear)
        self.clear_btn.pack(side="right")

        # 中部：左聊天 / 右预览
        mid = ttk.Frame(self.root, padding=(8, 0))
        mid.pack(fill="both", expand=True)
        self.chat = scrolledtext.ScrolledText(mid, wrap="word", state="disabled", width=60)
        self.chat.pack(side="left", fill="both", expand=True)
        self.chat.tag_config("user", foreground="#0a58ca", font=("", 10, "bold"))
        self.chat.tag_config("agent", foreground="#10603c")
        self.chat.tag_config("sys", foreground="#8a8a8a")

        side = ttk.Frame(mid, padding=(8, 0))
        side.pack(side="right", fill="y")
        ttk.Label(side, text="agent 看到的屏幕").pack(anchor="w")
        self.preview = ttk.Label(side, text="（暂无截图）", anchor="nw", justify="left")
        self.preview.pack(anchor="nw")
        ttk.Label(side, text="（此截图同时发给本地模型）", foreground="#8a8a8a").pack(anchor="w")

        # 底栏：状态 + 输入
        bottom = ttk.Frame(self.root, padding=(8, 6))
        bottom.pack(fill="x")
        self.status_var = tk.StringVar(value="就绪。")
        ttk.Label(self.root, textvariable=self.status_var, foreground="#555", padding=(10, 0)).pack(fill="x")
        ttk.Label(bottom, text="任务:").pack(side="left")
        self.entry = ttk.Entry(bottom)
        self.entry.pack(side="left", fill="x", expand=True, padx=6)
        self.entry.bind("<Return>", lambda e: self._start())
        self.send_btn = ttk.Button(bottom, text="发送", command=self._start)
        self.send_btn.pack(side="left")
        self.stop_btn = ttk.Button(bottom, text="停止", command=self._stop, state="disabled")
        self.stop_btn.pack(side="left", padx=6)

    def _welcome(self):
        self._add("sys", "欢迎使用本地 AI 电脑助手。所有推理在本地 Ollama 完成，数据不出机器。")
        self._add("sys", "提示：1) 先启动 Ollama 并拉取视觉模型  2) 建议先勾选「演练模式」观察  3) 急停 = 点「停止」或鼠标甩到屏幕左上角。")

    # --- 聊天区 ---
    def _add(self, who, text):
        stamp = time.strftime("%H:%M:%S")
        label = {"user": "你", "agent": "Agent", "sys": "系统"}[who]
        self.chat.config(state="normal")
        self.chat.insert("end", f"[{stamp}] {label}：\n", who)
        self.chat.insert("end", text.strip() + "\n\n", who)
        self.chat.config(state="disabled")
        self.chat.see("end")

    def _clear(self):
        self.chat.config(state="normal")
        self.chat.delete("1.0", "end")
        self.chat.config(state="disabled")
        self._welcome()

    # --- 任务控制 ---
    def _start(self):
        task = self.entry.get().strip()
        if not task:
            return
        if self.thread and self.thread.is_alive():
            self._add("sys", "当前任务还在运行，请先点「停止」。")
            return
        self.stop.clear()
        self._add("user", task)
        self.entry.delete(0, "end")
        self.send_btn.config(state="disabled")
        self.stop_btn.config(state="normal")
        self.status_var.set("运行中 ...")
        self.thread = threading.Thread(
            target=worker,
            args=(self.q, self.stop, task,
                  self.model_var.get().strip() or "qwen2.5vl:7b",
                  int(self.steps_var.get()), self.dry_var.get()),
            daemon=True,
        )
        self.thread.start()

    def _stop(self):
        self.stop.set()
        self.status_var.set("正在停止（等当前步骤完成）...")

    def _on_close(self):
        self.stop.set()
        self.root.destroy()

    # --- 轮询后台消息 ---
    def _poll(self):
        try:
            while True:
                item = self.q.get_nowait()
                kind = item[0]
                if kind == "chat":          # ("chat", who, text) 三元组
                    self._add(item[1], item[2])
                elif kind == "img":         # ("img", PIL图)
                    img = item[1].resize((PREVIEW_W, int(item[1].height * PREVIEW_W / item[1].width)))
                    self._photo = ImageTk.PhotoImage(img)
                    self.preview.config(image=self._photo, text="")
                elif kind == "status":      # ("status", 文本)
                    self.status_var.set(item[1])
                elif kind == "end":         # ("end", None)
                    self.status_var.set("就绪。")
                    self.send_btn.config(state="normal")
                    self.stop_btn.config(state="disabled")
        except queue.Empty:
            pass
        self.root.after(100, self._poll)


if __name__ == "__main__":
    App()
