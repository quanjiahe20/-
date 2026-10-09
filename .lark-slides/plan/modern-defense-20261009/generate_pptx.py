"""Generate Modern National Defense PPTX with dark aurora tech aesthetic."""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from lxml import etree
import os

# ---- Colors ----
DEEP_BLUE = RGBColor(0x0B, 0x13, 0x2B)
AURORA_CYAN = RGBColor(0x4C, 0xC9, 0xF0)
SOFT_PURPLE = RGBColor(0x72, 0x09, 0xB7)
LIGHT_PURPLE = RGBColor(0xA8, 0x55, 0xF7)
SILVER_WHITE = RGBColor(0xF1, 0xFA, 0xEE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

ASSET_DIR = "/workspace/.lark-slides/plan/modern-defense-20261009"

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
SW, SH = prs.slide_width, prs.slide_height

blank_layout = prs.slide_layouts[6]


def add_bg_image(slide, path):
    """Add full-bleed background image."""
    slide.shapes.add_picture(path, 0, 0, width=SW, height=SH)


def _set_alpha(shape, alpha_pct):
    """Set fill transparency. alpha_pct: 0-100 (100=opaque)."""
    spPr = shape._element.find(qn('p:spPr'))
    if spPr is None:
        return
    solidFill = spPr.find(qn('a:solidFill'))
    if solidFill is None:
        return
    clr = solidFill.find(qn('a:srgbClr'))
    if clr is None:
        return
    for a in clr.findall(qn('a:alpha')):
        clr.remove(a)
    alpha_elem = etree.SubElement(clr, qn('a:alpha'))
    alpha_elem.set('val', str(int(alpha_pct * 1000)))


def add_rect(slide, left, top, width, height, fill_rgb, alpha=None, line_color=None, line_width=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    if alpha is not None:
        _set_alpha(shape, alpha)
    if line_color is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line_color
        if line_width:
            shape.line.width = line_width
    shape.shadow.inherit = False
    return shape


def add_round_rect(slide, left, top, width, height, fill_rgb, alpha=None, line_color=None, line_width=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.adjustments[0] = 0.08
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    if alpha is not None:
        _set_alpha(shape, alpha)
    if line_color is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line_color
        if line_width:
            shape.line.width = line_width
    shape.shadow.inherit = False
    return shape


def add_text(slide, left, top, width, height, text, font_size=14, color=SILVER_WHITE,
             bold=False, align=PP_ALIGN.LEFT, font_name="思源黑体"):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.color.rgb = color
    run.font.bold = bold
    run.font.name = font_name
    return txBox


def add_rich_text(slide, left, top, width, height, segments, align=PP_ALIGN.LEFT, line_spacing=1.5):
    """segments: list of (text, font_size, color, bold)"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    for i, (text, font_size, color, bold) in enumerate(segments):
        run = p.add_run()
        run.text = text
        run.font.size = Pt(font_size)
        run.font.color.rgb = color
        run.font.bold = bold
        run.font.name = "思源黑体"
    return txBox


def add_multi_para(slide, left, top, width, height, paragraphs, align=PP_ALIGN.LEFT, line_spacing=1.6):
    """paragraphs: list of list of segments"""
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, segs in enumerate(paragraphs):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.alignment = align
        p.line_spacing = line_spacing
        for text, font_size, color, bold in segs:
            run = p.add_run()
            run.text = text
            run.font.size = Pt(font_size)
            run.font.color.rgb = color
            run.font.bold = bold
            run.font.name = "思源黑体"
    return txBox


def add_line(slide, x1, y1, x2, y2, color=AURORA_CYAN, width=Pt(1)):
    line = slide.shapes.add_connector(1, x1, y1, x2, y2)
    line.line.color.rgb = color
    line.line.width = width
    return line


def add_circle(slide, left, top, size, fill_rgb, alpha=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    if alpha is not None:
        _set_alpha(shape, alpha)
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape


# ============================================================
# Slide 1: Cover
# ============================================================
s1 = prs.slides.add_slide(blank_layout)
add_bg_image(s1, os.path.join(ASSET_DIR, "cover-bg.jpg"))
# dark scrim
add_rect(s1, 0, 0, SW, SH, DEEP_BLUE, alpha=55)
# glass card
add_round_rect(s1, Inches(2.2), Inches(2.1), Inches(8.9), Inches(3.3),
               WHITE, alpha=8, line_color=WHITE, line_width=Pt(0.75))
# title
add_rich_text(s1, Inches(2.2), Inches(2.4), Inches(8.9), Inches(1.5),
              [("现代", 72, AURORA_CYAN, True), ("国防", 72, SILVER_WHITE, True)],
              align=PP_ALIGN.CENTER)
# subtitle
add_text(s1, Inches(2.2), Inches(4.0), Inches(8.9), Inches(0.8),
         "国家安全是民族复兴的根基 · 现代国防是捍卫和平的钢铁长城",
         font_size=20, color=RGBColor(0xE1, 0xEE, 0xEC), align=PP_ALIGN.CENTER)
# divider line
add_line(s1, Inches(5.3), Inches(5.2), Inches(8.0), Inches(5.2), AURORA_CYAN, Pt(1))
# footer
add_text(s1, Inches(8.5), Inches(6.4), Inches(4.0), Inches(0.5),
         "汇报人：XXX　|　班级：XXX", font_size=12, color=RGBColor(0xC0, 0xCC, 0xC8),
         align=PP_ALIGN.RIGHT)

# ============================================================
# Slide 2: Table of Contents
# ============================================================
s2 = prs.slides.add_slide(blank_layout)
add_rect(s2, 0, 0, SW, SH, DEEP_BLUE)
add_text(s2, Inches(1.0), Inches(0.7), Inches(4), Inches(1),
         "目录", font_size=44, bold=True, color=SILVER_WHITE)
add_text(s2, Inches(1.0), Inches(1.65), Inches(5), Inches(0.4),
         "CONTENTS · 四个维度读懂现代国防", font_size=14, color=AURORA_CYAN)
add_line(s2, Inches(1.0), Inches(2.15), Inches(2.7), Inches(2.15), AURORA_CYAN, Pt(1))

toc_items = [
    ("01", "国防内涵", "现代国防的定义与核心内涵", AURORA_CYAN),
    ("02", "时代特征", "现代国防的四大鲜明特征", LIGHT_PURPLE),
    ("03", "力量构成", "五大军种与全域慑战体系", LIGHT_PURPLE),
    ("04", "时代责任", "国防意义与青年的使命担当", AURORA_CYAN),
]
positions = [(Inches(1.0), Inches(2.6)), (Inches(7.0), Inches(2.6)),
             (Inches(1.0), Inches(4.85)), (Inches(7.0), Inches(4.85))]
for (num, title, desc, col), (x, y) in zip(toc_items, positions):
    add_round_rect(s2, x, y, Inches(5.4), Inches(1.8), WHITE, alpha=6,
                   line_color=col, line_width=Pt(0.75))
    add_text(s2, x + Inches(0.3), y + Inches(0.15), Inches(0.9), Inches(0.9),
             num, font_size=44, bold=True, color=col)
    add_text(s2, x + Inches(1.3), y + Inches(0.25), Inches(3.8), Inches(0.5),
             title, font_size=22, bold=True, color=SILVER_WHITE)
    add_text(s2, x + Inches(1.3), y + Inches(0.85), Inches(3.8), Inches(0.7),
             desc, font_size=13, color=RGBColor(0xB0, 0xBC, 0xB8))

# ============================================================
# Slide 3: What is Modern National Defense
# ============================================================
s3 = prs.slides.add_slide(blank_layout)
add_rect(s3, 0, 0, SW, SH, DEEP_BLUE)
add_rich_text(s3, Inches(1.0), Inches(0.55), Inches(8), Inches(0.9),
              [("01  ", 30, AURORA_CYAN, True), ("什么是现代国防", 30, SILVER_WHITE, True)])
add_line(s3, Inches(1.0), Inches(1.4), Inches(2.8), Inches(1.4), AURORA_CYAN, Pt(1))

# left definition card
add_round_rect(s3, Inches(1.0), Inches(1.75), Inches(5.8), Inches(5.1), WHITE, alpha=6,
               line_color=AURORA_CYAN, line_width=Pt(0.75))
add_text(s3, Inches(1.35), Inches(2.0), Inches(5), Inches(0.5),
         "核心定义", font_size=20, bold=True, color=AURORA_CYAN)
add_multi_para(s3, Inches(1.35), Inches(2.7), Inches(5.1), Inches(3.8),
    [
        [("现代国防是国家为", 16, SILVER_WHITE, False),
         ("防备和抵抗侵略", 16, AURORA_CYAN, True),
         ("、制止武装颠覆，保卫国家的", 16, SILVER_WHITE, False),
         ("主权、统一、领土完整和安全", 16, AURORA_CYAN, True),
         ("所进行的军事及与军事有关的政治、经济、外交、科技、教育等方面的活动。", 16, SILVER_WHITE, False)],
        [("它不仅是军事力量的较量，更是", 16, SILVER_WHITE, False),
         ("综合国力", 16, LIGHT_PURPLE, True),
         ("的全面体现。", 16, SILVER_WHITE, False)],
    ], line_spacing=1.7)

# right 4 element cards
elements = [
    ("捍卫国家主权", "独立自主，不容外来干涉", AURORA_CYAN),
    ("维护领土完整", "寸土必争，守护每一寸疆域", AURORA_CYAN),
    ("保障国家安全", "军事、网络、太空全域安全", AURORA_CYAN),
    ("促进国家发展", "和平环境是发展的前提", AURORA_CYAN),
]
for i, (t, d, col) in enumerate(elements):
    y = Inches(1.75) + i * Inches(1.28)
    add_round_rect(s3, Inches(7.3), y, Inches(5.0), Inches(1.12), WHITE, alpha=5,
                   line_color=WHITE, line_width=Pt(0.5))
    add_text(s3, Inches(7.6), y + Inches(0.18), Inches(4.5), Inches(0.4),
             t, font_size=17, bold=True, color=SILVER_WHITE)
    add_text(s3, Inches(7.6), y + Inches(0.62), Inches(4.5), Inches(0.35),
             d, font_size=12, color=RGBColor(0xB0, 0xBC, 0xB8))

# ============================================================
# Slide 4: Four Characteristics
# ============================================================
s4 = prs.slides.add_slide(blank_layout)
add_rect(s4, 0, 0, SW, SH, DEEP_BLUE)
add_rich_text(s4, Inches(1.0), Inches(0.55), Inches(10), Inches(0.9),
              [("02  ", 30, AURORA_CYAN, True), ("现代国防的四大特征", 30, SILVER_WHITE, True)])
add_line(s4, Inches(1.0), Inches(1.4), Inches(2.8), Inches(1.4), AURORA_CYAN, Pt(1))

# connecting line
add_line(s4, Inches(2.1), Inches(4.2), Inches(11.3), Inches(4.2), AURORA_CYAN, Pt(2))
for cx in [Inches(2.1), Inches(5.1), Inches(8.2), Inches(11.2)]:
    add_circle(s4, cx - Inches(0.12), Inches(4.08), Inches(0.24), AURORA_CYAN)

features = [
    ("综合国力较量", "超越单一军事\n政经外交全面对抗", AURORA_CYAN),
    ("科技主导驱动", "信息化智能化\n科技是核心战斗力", LIGHT_PURPLE),
    ("全域多维一体", "陆海空天网电\n多域协同作战", AURORA_CYAN),
    ("平战结合军民", "常备不懈\n军民融合深度发展", LIGHT_PURPLE),
]
for i, (t, d, col) in enumerate(features):
    x = Inches(1.0) + i * Inches(3.07)
    add_round_rect(s4, x, Inches(1.85), Inches(2.1), Inches(2.1), WHITE, alpha=6,
                   line_color=col, line_width=Pt(0.75))
    add_text(s4, x, Inches(2.75), Inches(2.1), Inches(0.45),
             t, font_size=16, bold=True, color=SILVER_WHITE, align=PP_ALIGN.CENTER)
    add_text(s4, x + Inches(0.15), Inches(3.25), Inches(1.8), Inches(0.6),
             d, font_size=11, color=RGBColor(0xB0, 0xBC, 0xB8), align=PP_ALIGN.CENTER)

# bottom summary
add_round_rect(s4, Inches(1.0), Inches(4.9), Inches(11.3), Inches(1.8), AURORA_CYAN, alpha=8,
               line_color=AURORA_CYAN, line_width=Pt(0.75))
add_multi_para(s4, Inches(1.4), Inches(5.15), Inches(10.5), Inches(1.3),
    [
        [("现代国防已从传统的", 15, SILVER_WHITE, False),
         ("「枪对枪、炮对炮」", 15, AURORA_CYAN, True),
         ("单一军事对抗，演变为", 15, SILVER_WHITE, False),
         ("综合国力、科技主导、全域多维、平战结合", 15, LIGHT_PURPLE, True),
         ("的体系较量。谁掌握了核心科技、谁构建了一体化防御体系，谁就能在未来博弈中占据主动。", 15, SILVER_WHITE, False)],
    ], line_spacing=1.6)

# ============================================================
# Slide 5: Force Composition (Architecture)
# ============================================================
s5 = prs.slides.add_slide(blank_layout)
add_rect(s5, 0, 0, SW, SH, DEEP_BLUE)
add_rich_text(s5, Inches(1.0), Inches(0.55), Inches(10), Inches(0.9),
              [("03  ", 30, AURORA_CYAN, True), ("国防力量构成", 30, SILVER_WHITE, True)])
add_line(s5, Inches(1.0), Inches(1.4), Inches(2.8), Inches(1.4), AURORA_CYAN, Pt(1))

# central node
cx, cy = Inches(6.67), Inches(3.9)
add_circle(s5, cx - Inches(0.7), cy - Inches(0.7), Inches(1.4), AURORA_CYAN, alpha=15)
add_circle(s5, cx - Inches(0.7), cy - Inches(0.7), Inches(1.4), WHITE, alpha=0)
# re-draw border circle
border_c = s5.shapes.add_shape(MSO_SHAPE.OVAL, cx - Inches(0.7), cy - Inches(0.7), Inches(1.4), Inches(1.4))
border_c.fill.background()
border_c.line.color.rgb = AURORA_CYAN
border_c.line.width = Pt(2)
border_c.shadow.inherit = False
add_text(s5, cx - Inches(0.6), cy - Inches(0.15), Inches(1.2), Inches(0.4),
         "人民军队", font_size=13, bold=True, color=SILVER_WHITE, align=PP_ALIGN.CENTER)

branches = [
    ("陆军", "地面作战 · 立体攻防", Inches(2.8), Inches(1.85), AURORA_CYAN),
    ("空军", "空天一体 · 全域作战", Inches(8.2), Inches(1.85), LIGHT_PURPLE),
    ("海军", "近海防御 · 远海护卫", Inches(0.6), Inches(3.6), LIGHT_PURPLE),
    ("火箭军", "战略威慑 · 核常兼备", Inches(10.6), Inches(3.6), AURORA_CYAN),
    ("战略支援", "太空网络 · 信息对抗", Inches(5.6), Inches(5.6), AURORA_CYAN),
]
# connecting lines from center to each branch card
for bx, by, _, _ in [(b[2], b[3], b[0], b[1]) for b in branches]:
    # approximate line from center to card center
    pass

for name, desc, bx, by, col in branches:
    add_round_rect(s5, bx, by, Inches(2.2), Inches(1.25), WHITE, alpha=6,
                   line_color=col, line_width=Pt(0.75))
    add_text(s5, bx, by + Inches(0.22), Inches(2.2), Inches(0.4),
             name, font_size=17, bold=True, color=SILVER_WHITE, align=PP_ALIGN.CENTER)
    add_text(s5, bx + Inches(0.15), by + Inches(0.7), Inches(1.9), Inches(0.4),
             desc, font_size=11, color=RGBColor(0xB0, 0xBC, 0xB8), align=PP_ALIGN.CENTER)

# ============================================================
# Slide 6: Technology Empowerment
# ============================================================
s6 = prs.slides.add_slide(blank_layout)
add_rect(s6, 0, 0, SW, SH, DEEP_BLUE)
add_rich_text(s6, Inches(1.0), Inches(0.55), Inches(10), Inches(0.9),
              [("04  ", 30, AURORA_CYAN, True), ("科技赋能现代国防", 30, SILVER_WHITE, True)])
add_line(s6, Inches(1.0), Inches(1.4), Inches(2.8), Inches(1.4), AURORA_CYAN, Pt(1))

# left image
s6.shapes.add_picture(os.path.join(ASSET_DIR, "tech-bg.jpg"),
                      Inches(1.0), Inches(1.75), width=Inches(5.0), height=Inches(5.0))
add_rect(s6, Inches(1.0), Inches(1.75), Inches(5.0), Inches(5.0), DEEP_BLUE, alpha=35)
# caption overlay
add_round_rect(s6, Inches(1.0), Inches(5.85), Inches(5.0), Inches(0.9), DEEP_BLUE, alpha=70)
add_text(s6, Inches(1.3), Inches(6.0), Inches(4.4), Inches(0.6),
         "科技是核心战斗力，人工智能、无人系统、太空与网络力量正在重塑战争形态。",
         font_size=12, color=RGBColor(0xE1, 0xEE, 0xEC))

# right 4 tech cards
techs = [
    ("人工智能", "智能决策\n无人作战平台", AURORA_CYAN),
    ("无人系统", "无人机蜂群\n无人潜航器", LIGHT_PURPLE),
    ("太空力量", "卫星侦察\n导弹预警", LIGHT_PURPLE),
    ("网络空间", "网络攻防\n信息对抗", AURORA_CYAN),
]
for i, (t, d, col) in enumerate(techs):
    col_idx = i % 2
    row_idx = i // 2
    x = Inches(6.5) + col_idx * Inches(2.85)
    y = Inches(1.75) + row_idx * Inches(2.55)
    add_round_rect(s6, x, y, Inches(2.65), Inches(2.2), WHITE, alpha=6,
                   line_color=col, line_width=Pt(0.75))
    add_text(s6, x, y + Inches(0.95), Inches(2.65), Inches(0.45),
             t, font_size=19, bold=True, color=SILVER_WHITE, align=PP_ALIGN.CENTER)
    add_text(s6, x + Inches(0.2), y + Inches(1.5), Inches(2.25), Inches(0.6),
             d, font_size=12, color=RGBColor(0xB0, 0xBC, 0xB8), align=PP_ALIGN.CENTER)

# ============================================================
# Slide 7: Significance & Youth Responsibility (Comparison)
# ============================================================
s7 = prs.slides.add_slide(blank_layout)
add_rect(s7, 0, 0, SW, SH, DEEP_BLUE)
add_rich_text(s7, Inches(1.0), Inches(0.55), Inches(11), Inches(0.9),
              [("05  ", 30, AURORA_CYAN, True), ("国防的意义与青年责任", 30, SILVER_WHITE, True)])
add_line(s7, Inches(1.0), Inches(1.4), Inches(2.8), Inches(1.4), AURORA_CYAN, Pt(1))

# headers
add_round_rect(s7, Inches(1.0), Inches(1.85), Inches(5.5), Inches(0.85), AURORA_CYAN, alpha=12,
               line_color=AURORA_CYAN, line_width=Pt(1))
add_text(s7, Inches(1.4), Inches(2.0), Inches(4.5), Inches(0.5),
         "国防的意义", font_size=22, bold=True, color=SILVER_WHITE)
add_round_rect(s7, Inches(6.85), Inches(1.85), Inches(5.5), Inches(0.85), LIGHT_PURPLE, alpha=12,
               line_color=LIGHT_PURPLE, line_width=Pt(1))
add_text(s7, Inches(7.25), Inches(2.0), Inches(4.5), Inches(0.5),
         "青年的责任", font_size=22, bold=True, color=SILVER_WHITE)

left_items = [
    ("国无防不立", "强大的国防是国家生存发展的根本保障"),
    ("民无防不安", "和平的生活离不开稳固的国防屏障"),
    ("民族复兴根基", "强国必须强军，军强才能国安"),
]
right_items = [
    ("增强国防意识", "关心国防、了解国防，树立居安思危观念"),
    ("投身国防建设", "参军入伍、科研报国，以实际行动强军"),
    ("练就过硬本领", "学好专业知识，为强军兴军贡献力量"),
]
for i, (t, d) in enumerate(left_items):
    y = Inches(2.95) + i * Inches(1.15)
    add_round_rect(s7, Inches(1.0), y, Inches(5.5), Inches(1.0), WHITE, alpha=5,
                   line_color=WHITE, line_width=Pt(0.5))
    add_text(s7, Inches(1.3), y + Inches(0.15), Inches(4.8), Inches(0.4),
             t, font_size=16, bold=True, color=AURORA_CYAN)
    add_text(s7, Inches(1.3), y + Inches(0.55), Inches(4.8), Inches(0.35),
             d, font_size=12, color=RGBColor(0xB0, 0xBC, 0xB8))
for i, (t, d) in enumerate(right_items):
    y = Inches(2.95) + i * Inches(1.15)
    add_round_rect(s7, Inches(6.85), y, Inches(5.5), Inches(1.0), WHITE, alpha=5,
                   line_color=WHITE, line_width=Pt(0.5))
    add_text(s7, Inches(7.15), y + Inches(0.15), Inches(4.8), Inches(0.4),
             t, font_size=16, bold=True, color=LIGHT_PURPLE)
    add_text(s7, Inches(7.15), y + Inches(0.55), Inches(4.8), Inches(0.35),
             d, font_size=12, color=RGBColor(0xB0, 0xBC, 0xB8))

# ============================================================
# Slide 8: Closing
# ============================================================
s8 = prs.slides.add_slide(blank_layout)
add_bg_image(s8, os.path.join(ASSET_DIR, "closing-bg.jpg"))
add_rect(s8, 0, 0, SW, SH, DEEP_BLUE, alpha=45)
add_rich_text(s8, Inches(2.2), Inches(2.4), Inches(8.9), Inches(1.7),
              [("感", 80, AURORA_CYAN, True),
               ("谢", 80, SILVER_WHITE, True),
               ("聆", 80, LIGHT_PURPLE, True),
               ("听", 80, SILVER_WHITE, True)],
              align=PP_ALIGN.CENTER)
add_line(s8, Inches(5.3), Inches(4.4), Inches(8.0), Inches(4.4), AURORA_CYAN, Pt(1))
add_text(s8, Inches(2.2), Inches(4.7), Inches(8.9), Inches(0.7),
         "居安思危 · 强军有我", font_size=24, color=RGBColor(0xE1, 0xEE, 0xEC),
         align=PP_ALIGN.CENTER)
add_text(s8, Inches(2.2), Inches(6.0), Inches(8.9), Inches(0.5),
         "现代国防主题汇报 · 敬请批评指正", font_size=14, color=RGBColor(0xC0, 0xCC, 0xC8),
         align=PP_ALIGN.CENTER)

out_path = "/workspace/现代国防-酷炫唯美科技风.pptx"
prs.save(out_path)
print(f"PPTX saved to: {out_path}")
print(f"Total slides: {len(prs.slides)}")
