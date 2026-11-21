#!/usr/bin/env python3
"""Render Vice Heat Studio's four screenshots with PIL.

This mirrors the web app (app/src/design.js + render.js) by hand: the same
layout polygons in relative coordinates, the same grade washes and
vignettes (the canvas filter strings approximated with PIL enhancers),
the same striped chrome title and poster furniture, and the app's demo
scenes — each cover's demo cast (a different sample in every panel,
each crop framed on the photo's stored focal point, the face), panel 1
selected in the editor shot. Output goes to screenshots/ as JPEGs
under the scorer's 256 KiB cap.

    python3 tools/make_screenshots.py
"""

import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_DIR = os.path.join(ROOT, "app", "samples")
OUT_DIR = os.path.join(ROOT, "screenshots")

INK = (10, 10, 16)
GOLD = (227, 185, 78)
GOLD_DEEP = (154, 116, 31)
CYAN = (62, 230, 255)
TAGLINE = "MARA • JAX • VALENTINA"

# Poster furniture, mirroring design.js: the review strip's pull-quote,
# the billing block's credits lines and the seal's ring lettering.
REVIEW_STARS = "★★★★★"
REVIEW_QUOTE = "A SUNSET YOU CAN SPEED THROUGH."
REVIEW_SOURCE = "THE HARBOR GAZETTE"
BILLING = [
    "VICE HEAT STUDIO presents a NEON HARBOR PICTURES production “VICE HEAT”",
    "MARA VOSS · JAX MORENO · VALENTINA CRUZ · SOFÍA REYES · ROXY DELGADO · ELIAS BRANDT",
    "music by THE PALM TAPES · edited by R. OKAFOR · photography L. IBARRA · written by C. FERRANTE · directed by A. SOLANO",
]
SEAL_RING = "VICE HEAT STUDIO • ORIGINAL KEY ART • "
SEAL_CENTER = "EST. 2026"
BILLING_FS = 0.0145  # billing type size, in u = min(w, h)
BILLING_LH = 1.5     # billing line height, in type sizes

# ------------------------------------------------------------------ design
# The same tables as app/src/design.js.

LAYOUTS = {
    "harbor": {
        "hero": 0, "pop_out": 0.085,
        "panels": [
            [[0.02, 0.15], [0.63, 0.08], [0.58, 0.58], [0.02, 0.65]],
            [[0.67, 0.07], [0.98, 0.05], [0.98, 0.34], [0.63, 0.37]],
            [[0.62, 0.41], [0.98, 0.38], [0.98, 0.63], [0.59, 0.61]],
            [[0.02, 0.69], [0.46, 0.66], [0.48, 0.96], [0.02, 0.97]],
            [[0.52, 0.65], [0.98, 0.67], [0.98, 0.96], [0.52, 0.96]],
        ],
    },
    "grid": {
        "hero": None, "pop_out": 0,
        "panels": [
            [[0.02, 0.02], [0.57, 0.02], [0.57, 0.32], [0.02, 0.32]],
            [[0.60, 0.02], [0.98, 0.02], [0.98, 0.32], [0.60, 0.32]],
            [[0.02, 0.35], [0.39, 0.35], [0.39, 0.65], [0.02, 0.65]],
            [[0.42, 0.35], [0.98, 0.35], [0.98, 0.65], [0.42, 0.65]],
            [[0.02, 0.68], [0.57, 0.68], [0.57, 0.98], [0.02, 0.98]],
            [[0.60, 0.68], [0.98, 0.68], [0.98, 0.98], [0.60, 0.98]],
        ],
    },
    "keyart": {
        "hero": 0, "pop_out": 0,
        "panels": [
            [[0.04, 0.04], [0.66, 0.04], [0.66, 0.96], [0.04, 0.96]],
            [[0.70, 0.04], [0.96, 0.04], [0.96, 0.47], [0.70, 0.47]],
            [[0.70, 0.53], [0.96, 0.53], [0.96, 0.96], [0.70, 0.96]],
        ],
    },
    "banner": {
        "hero": None, "pop_out": 0,
        "panels": [
            [[0.02, 0.05], [0.98, 0.03], [0.98, 0.43], [0.02, 0.47]],
            [[0.02, 0.51], [0.49, 0.49], [0.49, 0.97], [0.02, 0.97]],
            [[0.53, 0.47], [0.98, 0.45], [0.98, 0.97], [0.53, 0.97]],
        ],
    },
}

# pil: (colour, contrast, brightness) enhancer factors standing in for the
# canvas filter string; wash: vertical gradient stops (pos, (r, g, b, a)).
GRADES = {
    "neonharbor": {
        "pil": (1.45, 1.12, 1.02), "vignette": 0.47,
        "wash": [(0, (255, 120, 50, 0.12)), (0.5, (255, 60, 130, 0.07)), (1, (140, 0, 255, 0.24))],
    },
    "sunset": {
        "pil": (1.35, 1.08, 1.06), "vignette": 0.45,
        "wash": [(0, (255, 110, 40, 0.10)), (0.55, (255, 60, 120, 0.05)), (1, (60, 10, 80, 0.30))],
    },
    "neon": {
        "pil": (1.55, 1.16, 0.98), "vignette": 0.5,
        "wash": [(0, (0, 220, 255, 0.12)), (0.5, (120, 0, 255, 0.06)), (1, (255, 0, 140, 0.26))],
    },
    "chrome": {
        "pil": (0.8, 1.28, 1.1), "vignette": 0.4,
        "wash": [(0, (200, 220, 255, 0.10)), (1, (20, 30, 50, 0.22))],
    },
    "palm": {
        "pil": (1.18, 1.06, 0.95), "vignette": 0.48,
        "wash": [(0, (0, 180, 170, 0.10)), (1, (50, 10, 90, 0.30))],
    },
    "midnight": {
        "pil": (1.22, 1.22, 0.8), "vignette": 0.6,
        "wash": [(0, (10, 20, 80, 0.16)), (1, (0, 0, 20, 0.38))],
    },
    "golden": {
        "pil": (1.28, 1.03, 1.13), "vignette": 0.38,
        "wash": [(0, (255, 200, 80, 0.12)), (1, (120, 60, 10, 0.20))],
    },
}

CHROME_STOPS = [
    (0, (255, 255, 255)), (0.28, (215, 222, 230)), (0.46, (130, 142, 156)),
    (0.5, (248, 250, 252)), (0.54, (147, 161, 177)), (0.78, (230, 236, 242)),
    (1, (95, 107, 120)),
]

FONT_DIR = "/usr/share/fonts/truetype"
def font_path(*names):
    for name in names:
        path = os.path.join(FONT_DIR, name)
        if os.path.exists(path):
            return path
    raise FileNotFoundError(names)

TITLE_FONT = font_path("liberation/LiberationSans-BoldItalic.ttf", "dejavu/DejaVuSans-Bold.ttf")
TAG_FONT = font_path("liberation/LiberationSans-Bold.ttf", "dejavu/DejaVuSans-Bold.ttf")
UI_BOLD = font_path("liberation/LiberationSans-Bold.ttf", "dejavu/DejaVuSans-Bold.ttf")
UI_FONT = font_path("liberation/LiberationSans-Regular.ttf", "dejavu/DejaVuSans.ttf")
UI_TITLE = font_path("liberation/LiberationSans-BoldItalic.ttf", "dejavu/DejaVuSans-Bold.ttf")
# Liberation Sans has no ★ glyph; DejaVu Sans does. Used for the review
# strip's stars and the seal's centre star only.
STAR_FONT = font_path("dejavu/DejaVuSans-Bold.ttf", "liberation/LiberationSans-Bold.ttf")

# The bundled cast, in main.js's SAMPLES order: (file, name tag, editor
# thumb label, focal point). The focal point is the face, as fractions
# of the photo's width and height; every panel crop is framed on it.
SAMPLE_META = [
    ("boulevard.jpg", "Mara Voss", "Mara", (0.60, 0.22)),
    ("marina.jpg", "Sofía Reyes", "Sofía", (0.56, 0.30)),
    ("neon.jpg", "Roxy Delgado", "Roxy", (0.58, 0.31)),
    ("moto.jpg", "Jax Moreno", "Jax", (0.49, 0.26)),
    ("pier.jpg", "Elias Brandt", "Elias", (0.40, 0.27)),
    ("gold.jpg", "Valentina Cruz", "Valentina", (0.52, 0.28)),
]
SAMPLES = [Image.open(os.path.join(SAMPLE_DIR, meta[0])).convert("RGB")
           for meta in SAMPLE_META]

# The demo casts, mirroring DEMO_CAST in app/src/shots.js: which sample
# fills each panel of a demo cover, so no cover repeats a person.
DEMO_CAST = {
    "harbor": [0, 1, 2, 3, 4],
    "grid": [0, 1, 2, 3, 4, 5],
    "keyart": [5, 0, 2],
    "banner": [1, 4, 2],
}
# Demo zooms, mirroring DEMO_ZOOM: the Harbor hero is a close-up.
DEMO_ZOOM = {
    "harbor": {0: 1.45},
    "keyart": {0: 1.12},
}

# ------------------------------------------------------------------ helpers

def interp_stops(stops, t):
    """The (r, g, b, a) at position t along a stop list."""
    if t <= stops[0][0]:
        return stops[0][1]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if t <= p1:
            f = 0 if p1 == p0 else (t - p0) / (p1 - p0)
            return tuple(c0[i] + (c1[i] - c0[i]) * f for i in range(len(c0)))
    return stops[-1][1]


def v_gradient(w, h, stops, alpha_scale=255):
    """A vertical RGBA gradient image from colour stops."""
    col = Image.new("RGBA", (1, h))
    px = col.load()
    for y in range(h):
        r, g, b, a = interp_stops(stops, y / max(1, h - 1))
        px[0, y] = (int(r), int(g), int(b), int(a * alpha_scale))
    return col.resize((w, h))


def apply_grade(img, grade):
    colour, contrast, brightness = grade["pil"]
    out = ImageEnhance.Color(img).enhance(colour)
    out = ImageEnhance.Contrast(out).enhance(contrast)
    out = ImageEnhance.Brightness(out).enhance(brightness)
    return out


def paste_panel(base, poly, img, pan_x=0.0, pan_y=0.0, zoom=1.0):
    """Cover-fit img into poly's bounding box, clipped to the polygon.

    Mirrors render.js's photoPlacement: cover-fit scaled by zoom,
    centred, then shifted by the pan (a fraction of the box size),
    clamped so the photo always covers the box."""
    w, h = base.size
    pts = [(x * w, y * h) for x, y in poly]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    bx, by = min(xs), min(ys)
    bw, bh = max(xs) - bx, max(ys) - by
    s = max(bw / img.width, bh / img.height) * zoom
    dw, dh = img.width * s, img.height * s
    ox = min(max(pan_x * bw, -max(0.0, (dw - bw) / 2)), max(0.0, (dw - bw) / 2))
    oy = min(max(pan_y * bh, -max(0.0, (dh - bh) / 2)), max(0.0, (dh - bh) / 2))
    resized = img.resize((max(1, round(dw)), max(1, round(dh))), Image.LANCZOS)
    layer = Image.new("RGB", (w, h), (0, 0, 0))
    layer.paste(resized, (round(bx + bw / 2 + ox - dw / 2),
                          round(by + bh / 2 + oy - dh / 2)))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    base.paste(layer, (0, 0), mask)


def pan_for_focal(img, bw, bh, zoom, focal):
    """The pan that centres a photo's focal point (its face) in a panel
    of bw x bh pixels: mirrors autoframe.js's panForCentroid with the
    stored focal point standing in for the computed centroid.
    paste_panel clamps it so the photo always covers the panel."""
    fx, fy = focal
    s = max(bw / img.width, bh / img.height) * zoom
    return (img.width * s * (0.5 - fx)) / bw, (img.height * s * (0.5 - fy)) / bh


def panel_placement(layout_id, poly, size, panel_index):
    """(sample index, pan_x, pan_y, zoom) for one demo panel: the demo
    cast's photo, framed on its focal point at the demo zoom."""
    w, h = size
    sample_i = DEMO_CAST[layout_id][panel_index]
    img = SAMPLES[sample_i]
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    bw, bh = (max(xs) - min(xs)) * w, (max(ys) - min(ys)) * h
    zoom = DEMO_ZOOM.get(layout_id, {}).get(panel_index, 1.0)
    pan_x, pan_y = pan_for_focal(img, bw, bh, zoom, SAMPLE_META[sample_i][3])
    return sample_i, pan_x, pan_y, zoom


def stroke_panel(draw, poly, size, heavy=False):
    w, h = size
    u = min(w, h)
    pts = [(x * w, y * h) for x, y in poly] 
    closed = pts + [pts[0]]
    draw.line(closed, fill=INK, width=max(1, round(0.011 * u)), joint="curve")
    draw.line(closed, fill=GOLD, width=max(1, round(0.0028 * u)), joint="curve")
    if heavy:
        draw.line(closed, fill=GOLD_DEEP, width=max(1, round(0.017 * u)), joint="curve")
        draw.line(closed, fill=GOLD, width=max(1, round(0.0055 * u)), joint="curve")


def lifted_polygon(poly, lift):
    top = min(p[1] for p in poly)
    return [[x, y - lift if y - top < 0.12 else y] for x, y in poly]


def vignette(w, h, strength):
    """A black overlay whose alpha follows the app's radial vignette."""
    s = 160
    small = Image.new("L", (s, s), 0)
    px = small.load()
    radius = math.hypot(w, h) / 2
    for y in range(s):
        for x in range(s):
            dx = (x / (s - 1) - 0.5) * w
            dy = (y / (s - 1) - 0.5) * h
            t = math.hypot(dx, dy) / radius
            a = max(0.0, min(1.0, (t - 0.55) / (1.02 - 0.55)))
            px[x, y] = int(255 * strength * a)
    alpha = small.resize((w, h), Image.BICUBIC)
    black = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    black.putalpha(alpha)
    return black


def draw_tracked(draw, cx, base, text, font, tracking, fill, stroke_width=0, stroke_fill=None):
    """Centred text with letter tracking, drawn glyph by glyph on a baseline."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    for ch, cw in zip(text, widths):
        draw.text((x, base), ch, font=font, fill=fill, anchor="ls",
                  stroke_width=stroke_width, stroke_fill=stroke_fill)
        x += cw + tracking


def draw_title(base, caption, tagline, pos, inset=0.0):
    """The striped retro-chrome title, mirroring render.js's drawTitle.
    `inset` is the billing block's reserved height: a bottom title
    rests above it."""
    text = caption.strip().upper()
    if not text:
        return
    w, h = base.size
    draw = ImageDraw.Draw(base)

    # the legibility band behind the caption
    if pos == "top":
        band = v_gradient(w, h, [(0, (0, 0, 0, 0.52)), (0.4, (0, 0, 0, 0.0)), (1, (0, 0, 0, 0.0))])
    else:
        band = v_gradient(w, h, [(0, (0, 0, 0, 0.0)), (0.6, (0, 0, 0, 0.0)), (1, (0, 0, 0, 0.52))])
    base.alpha_composite(band)

    size = h * 0.135
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    while size > 10:
        font = ImageFont.truetype(TITLE_FONT, round(size))
        if probe.textlength(text, font=font) <= w * 0.93:
            break
        size *= 0.94
    font = ImageFont.truetype(TITLE_FONT, round(size))

    has_tag = bool(tagline.strip())
    if pos == "top":
        base_y = h * 0.035 + size * 0.92
    else:
        base_y = h * 0.965 - inset - (size * 0.5 if has_tag else size * 0.16)
    cx = w / 2

    # extrusion: dark copies stepping down from the face
    depth = size * 0.085
    d = depth
    while d > 0.5:
        draw.text((cx, base_y + d), text, font=font, fill=(21, 8, 32), anchor="ms")
        d -= depth / 5
    # outline pass (face painted dark too; the chrome goes over it)
    draw.text((cx, base_y), text, font=font, fill=(12, 4, 22), anchor="ms",
              stroke_width=max(1, round(size * 0.05)), stroke_fill=(12, 4, 22))
    # striped chrome face, through a glyph-only mask
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).text((cx, base_y), text, font=font, fill=255, anchor="ms")
    top = base_y - size * 0.86
    height = max(2, round(size * 0.98))
    grad = Image.new("RGB", (1, height))
    gpx = grad.load()
    for y in range(height):
        r, g, b = interp_stops(CHROME_STOPS, y / (height - 1))
        gpx[0, y] = (int(r), int(g), int(b))
    face = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    face.paste(grad.resize((w, height)), (0, round(top)))
    base.paste(face, (0, 0), mask)

    if has_tag:
        tag_size = size * 0.23
        tag_font = ImageFont.truetype(TAG_FONT, round(tag_size))
        draw_tracked(draw, cx, base_y + size * 0.44, tagline.strip().upper(), tag_font,
                     tag_size * 0.32, GOLD, stroke_width=max(1, round(tag_size * 0.14)),
                     stroke_fill=(10, 4, 20))


# ------------------------------------------------------- poster furniture
# Mirrors render.js's furniture: name tags, the billing block, the
# review strip and the studio seal, in the same sizes and positions.

def billing_inset(w, h):
    """The height the billing block reserves along the bottom edge."""
    u = min(w, h)
    return BILLING_FS * BILLING_LH * len(BILLING) * u + 0.016 * h


def draw_tracked_left(draw, x, base_y, text, font, tracking, fill):
    """Left-aligned tracked text, drawn glyph by glyph on a baseline;
    returns the x just past the last glyph."""
    for ch in text:
        draw.text((x, base_y), ch, font=font, fill=fill, anchor="ls")
        x += draw.textlength(ch, font=font) + tracking
    return x


def tracked_width(draw, text, font, tracking):
    if not text:
        return 0
    return sum(draw.textlength(ch, font=font) for ch in text) + tracking * (len(text) - 1)


def draw_name_tag(base, poly, name):
    """One panel's name tag: the star's name in tracked warm-white caps
    on a soft dark plate along the panel's bottom edge, clipped to the
    panel. Panels too small for a legible tag are skipped."""
    if not name:
        return
    w, h = base.size
    u = min(w, h)
    pts = [(x * w, y * h) for x, y in poly]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    bx, by = min(xs), min(ys)
    bw, bh = max(xs) - bx, max(ys) - by
    if bh < 0.10 * u or bw < 0.12 * u:
        return
    fs = min(bh * 0.115, u * 0.024)
    plate_h = fs * 2.0
    # The plate hugs the panel's bottom edge, unless that would run
    # into the billing block's reserved strip — then it rests just
    # above it, so a name tag never collides with the small print.
    plate_bottom = by + bh - bh * 0.045
    limit = h - billing_inset(w, h) - 0.006 * h
    if plate_bottom > limit:
        plate_bottom = limit
    plate_y = plate_bottom - plate_h
    top = plate_y - fs * 0.7
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    grad = v_gradient(max(2, round(bw) + 4), max(2, round(by + bh - top)),
                      [(0, (4, 4, 10, 0.0)), (0.45, (4, 4, 10, 0.62)), (1, (4, 4, 10, 0.80))])
    layer.alpha_composite(grad, (round(bx) - 2, round(top)))
    font = ImageFont.truetype(TAG_FONT, round(fs))
    draw_tracked(ImageDraw.Draw(layer), bx + bw / 2, plate_y + fs * 1.34,
                 name.strip().upper(), font, fs * 0.22, (243, 233, 200))
    # Clip the finished tag to the panel: fold the polygon into the
    # layer's own alpha, then composite (a plain paste would lay the
    # layer's transparent black over the photo).
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    layer.putalpha(ImageChops.multiply(layer.split()[3], mask))
    base.alpha_composite(layer)


def draw_billing(base):
    """The billing block: production, cast and credits in tiny tracked
    caps, centred along the bottom edge over a soft dark band."""
    w, h = base.size
    u = min(w, h)
    fs = BILLING_FS * u
    lh = fs * BILLING_LH
    band_top = h - billing_inset(w, h) - 0.012 * h
    band = v_gradient(w, max(2, round(h - band_top)),
                      [(0, (0, 0, 0, 0.0)), (1, (0, 0, 0, 0.55))])
    base.alpha_composite(band, (0, round(band_top)))
    draw = ImageDraw.Draw(base)
    # shrink to fit: the longest credits line must clear the cover's
    # width, or the small print runs off the edges of narrow covers
    while fs > 6:
        font = ImageFont.truetype(TAG_FONT, round(fs))
        widest = max(tracked_width(draw, line, font, fs * 0.14) for line in BILLING)
        if widest <= w * 0.96:
            break
        fs *= 0.96
    font = ImageFont.truetype(TAG_FONT, round(fs))
    lh = fs * BILLING_LH
    for i, line in enumerate(BILLING):
        base_y = h - 0.010 * h - (len(BILLING) - 1 - i) * lh - fs * 0.22
        draw_tracked(draw, w / 2, base_y, line, font, fs * 0.14, (238, 234, 244))


def draw_review_strip(base, pos, inset):
    """The review strip: five gold stars and one pull-quote on a slim
    dark band, on the edge the caption does not take."""
    w, h = base.size
    u = min(w, h)
    fs = u * 0.021
    probe = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    quote_text = f"  “{REVIEW_QUOTE}” — {REVIEW_SOURCE}"
    while fs > 8:
        font = ImageFont.truetype(TAG_FONT, round(fs))
        star_font = ImageFont.truetype(STAR_FONT, round(fs))
        total = tracked_width(probe, REVIEW_STARS, star_font, fs * 0.06) \
            + tracked_width(probe, quote_text, font, fs * 0.06)
        if total <= w * 0.94:
            break
        fs *= 0.94
    font = ImageFont.truetype(TAG_FONT, round(fs))
    star_font = ImageFont.truetype(STAR_FONT, round(fs))
    band_h = fs * 2.7
    y = 0.010 * h if pos == "bottom" else h - inset - band_h - 0.012 * h
    band = v_gradient(w, max(2, round(band_h)),
                      [(0, (4, 4, 10, 0.0)), (0.25, (4, 4, 10, 0.58)),
                       (0.75, (4, 4, 10, 0.58)), (1, (4, 4, 10, 0.0))])
    base.alpha_composite(band, (0, round(y)))
    draw = ImageDraw.Draw(base)
    tracking = fs * 0.06
    total = tracked_width(draw, REVIEW_STARS, star_font, tracking) \
        + tracked_width(draw, quote_text, font, tracking)
    x = w / 2 - total / 2
    base_y = y + band_h / 2 + fs * 0.36
    x = draw_tracked_left(draw, x, base_y, REVIEW_STARS, star_font, tracking, GOLD)
    draw_tracked_left(draw, x, base_y, quote_text, font, tracking, (245, 242, 234))


def draw_seal(base, inset):
    """The studio seal: a gold-ringed round badge in the bottom-left
    corner above the billing block, lettered like a film seal. (The
    left corner keeps it clear of the name tags, which are centred in
    their panels and run wide in the narrow right-hand ones.)"""
    w, h = base.size
    u = min(w, h)
    r = u * 0.054
    cx = r + 0.018 * u
    cy = h - inset - r - 0.012 * h
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(8, 6, 16, 217),
                 outline=GOLD + (255,), width=max(1, round(0.0035 * u)))
    rr = r * 0.78
    draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                 outline=GOLD + (255,), width=max(1, round(0.0016 * u)))
    ring_fs = r * 0.205
    ring_font = ImageFont.truetype(TAG_FONT, round(ring_fs))
    n = len(SEAL_RING)
    for i, ch in enumerate(SEAL_RING):
        a = -math.pi / 2 + (i / n) * 2 * math.pi
        x = cx + math.cos(a) * r * 0.885
        y = cy + math.sin(a) * r * 0.885
        cell = round(ring_fs * 2.4)
        glyph = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
        ImageDraw.Draw(glyph).text((cell / 2, cell / 2), ch, font=ring_font,
                                   fill=GOLD + (255,), anchor="mm")
        glyph = glyph.rotate(-(math.degrees(a) + 90), resample=Image.BICUBIC,
                             center=(cell / 2, cell / 2))
        layer.alpha_composite(glyph, (round(x - cell / 2), round(y - cell / 2)))
    draw = ImageDraw.Draw(layer)
    draw.text((cx, cy - r * 0.12), "★",
              font=ImageFont.truetype(STAR_FONT, round(r * 0.5)),
              fill=(245, 242, 234), anchor="mm")
    draw.text((cx, cy + r * 0.40), SEAL_CENTER,
              font=ImageFont.truetype(TAG_FONT, round(r * 0.19)),
              fill=GOLD, anchor="mm")
    base.alpha_composite(layer)


# ------------------------------------------------------------------ covers

def render_cover(w, h, layout_id, grade_id, caption, tagline=TAGLINE, pos="bottom",
                 selected=-1, gold_frame=False):
    layout = LAYOUTS[layout_id]
    grade = GRADES[grade_id]
    graded = [apply_grade(img, grade) for img in SAMPLES]
    base = Image.new("RGBA", (w, h), INK + (255,))

    # the Harbor hero's pop-out copy, over its soft shadow
    if layout["pop_out"] > 0 and layout["hero"] is not None:
        hero = layout["hero"]
        hero_poly = layout["panels"][hero]
        lifted = lifted_polygon(hero_poly, layout["pop_out"])
        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).polygon(
            [(x * w, y * h + 0.014 * h) for x, y in lifted], fill=(0, 0, 0, 140))
        shadow = shadow.filter(ImageFilter.GaussianBlur(max(1, 0.012 * min(w, h))))
        base.alpha_composite(shadow)
        sample_i, pan_x, pan_y, zoom = panel_placement(layout_id, hero_poly, (w, h), hero)
        paste_panel(base, lifted, graded[sample_i], pan_x, pan_y, zoom)

    for i, poly in enumerate(layout["panels"]):
        sample_i, pan_x, pan_y, zoom = panel_placement(layout_id, poly, (w, h), i)
        paste_panel(base, poly, graded[sample_i], pan_x, pan_y, zoom)
    draw = ImageDraw.Draw(base)
    framed = layout["hero"] if layout["hero"] is not None else 0
    for i, poly in enumerate(layout["panels"]):
        stroke_panel(draw, poly, (w, h), heavy=(gold_frame and i == framed))

    base.alpha_composite(v_gradient(w, h, grade["wash"]))
    base.alpha_composite(vignette(w, h, grade["vignette"]))

    # poster furniture over the graded art, then the title above it all
    inset = billing_inset(w, h)
    for i, poly in enumerate(layout["panels"]):
        draw_name_tag(base, poly, SAMPLE_META[DEMO_CAST[layout_id][i]][1])
    draw_billing(base)
    draw_review_strip(base, pos, inset)
    draw_seal(base, inset)
    draw_title(base, caption, tagline, pos, inset)

    if selected >= 0:
        poly = layout["panels"][selected]
        pts = [(x * w, y * h) for x, y in poly]
        ImageDraw.Draw(base).line(pts + [pts[0]], fill=CYAN,
                                  width=max(1, round(0.0045 * min(w, h))), joint="curve")
    return base.convert("RGB")


# ------------------------------------------------------------------ editor

def render_editor(w, h):
    """A faithful drawing of the editor at 1280x720: the Harbor cover in
    the stage (Neon Harbor grade, panel 1 selected, Gold frame toggle
    visible and off in the Layout section), the control panel at right."""
    img = Image.new("RGB", (w, h), (12, 12, 18))
    draw = ImageDraw.Draw(img)
    muted = (154, 151, 168)
    edge = (38, 38, 51)
    field = (14, 14, 21)
    btn_bg = (29, 29, 41)

    def text(xy, s, font, fill, anchor="la"):
        draw.text(xy, s, font=font, fill=fill, anchor=anchor)

    # top bar
    text((24, 26), "VICE HEAT ", ImageFont.truetype(UI_TITLE, 27), (236, 234, 242))
    tw = draw.textlength("VICE HEAT ", font=ImageFont.truetype(UI_TITLE, 27))
    text((24 + tw, 26), "STUDIO", ImageFont.truetype(UI_TITLE, 27), GOLD)
    text((330, 33), "Turn your photos into GTA-style cover art: pick a layout, drop photos "
                    "into the panels, grade it, sign it.",
         ImageFont.truetype(UI_FONT, 13), muted)
    draw.line([(24, 78), (w - 24, 78)], fill=edge, width=1)

    # stage: label, aspect segmented control, the cover, the status hint
    text((24, 96), "PREVIEW", ImageFont.truetype(UI_BOLD, 11), muted)
    seg_x = 560
    for i, label in enumerate(["1 : 1", "4 : 5", "16 : 9"]):
        bw = 62
        x0 = seg_x + i * (bw + 6)
        active = i == 0
        draw.rounded_rectangle([x0, 88, x0 + bw, 112], 6,
                               fill=GOLD if active else btn_bg, outline=edge)
        text((x0 + bw / 2, 100), label, ImageFont.truetype(UI_BOLD, 12),
             (23, 18, 4) if active else (236, 234, 242), anchor="mm")
    cover = render_cover(540, 540, "harbor", "neonharbor", "VICE HEAT", selected=0)
    img.paste(cover, (24, 124))
    draw.rounded_rectangle([24, 124, 564, 664], 8, outline=edge, width=1)
    text((24, 678), "Panel 1 of 5 · Mara Voss — drag on the cover to reposition it.",
         ImageFont.truetype(UI_FONT, 13), muted)

    # control panel
    px, pw = 916, 340
    draw.rounded_rectangle([px, 88, px + pw, 712], 10, fill=(20, 20, 29), outline=edge)
    cx = px + 14
    cw = pw - 28
    y = 102

    def heading(s):
        nonlocal y
        text((cx, y), s, ImageFont.truetype(UI_BOLD, 11), GOLD)
        y += 15

    def divider():
        nonlocal y
        y += 3
        draw.line([(cx, y), (cx + cw, y)], fill=edge, width=1)
        y += 7

    def button(x, yy, bw, bh, label, active=False, font_size=12):
        draw.rounded_rectangle([x, yy, x + bw, yy + bh], 6,
                               fill=GOLD if active else btn_bg, outline=edge)
        text((x + bw / 2, yy + bh / 2), label, ImageFont.truetype(UI_BOLD, font_size),
             (23, 18, 4) if active else (236, 234, 242), anchor="mm")

    # Photos
    heading("PHOTOS")
    grad = Image.new("RGB", (cw, 24))
    for gx in range(cw):
        f = gx / cw
        grad.paste((255, int(61 + 61 * f), int(126 - 63 * f)), (gx, 0, gx + 1, 24))
    img.paste(grad, (cx, y))
    draw.rounded_rectangle([cx, y, cx + cw, y + 24], 6, outline=edge)
    text((cx + cw / 2, y + 12), "Add your photos", ImageFont.truetype(UI_BOLD, 13), (255, 255, 255), anchor="mm")
    y += 30
    for i, sample in enumerate(SAMPLES):
        thumb = ImageOps.fit(sample, (46, 40))
        tx = cx + i * 52
        img.paste(thumb, (tx, y))
        draw.rounded_rectangle([tx - 2, y - 2, tx + 48, y + 42], 6,
                               outline=CYAN if i == 0 else edge, width=2 if i == 0 else 1)
        text((tx + 23, y + 46), SAMPLE_META[i][2], ImageFont.truetype(UI_FONT, 10), muted, anchor="ma")
    y += 62
    divider()

    # Layout, with the Gold frame toggle under the layout buttons
    heading("LAYOUT")
    names = ["Harbor", "Grid", "Key Art", "Banner"]
    bw4 = (cw - 18) / 4
    for i, name in enumerate(names):
        button(cx + i * (bw4 + 6), y, bw4, 24, name, active=(i == 0), font_size=11)
    y += 29
    draw.rounded_rectangle([cx, y + 1, cx + 13, y + 14], 3, outline=edge, width=1)
    text((cx + 20, y), "Gold frame", ImageFont.truetype(UI_BOLD, 12), (236, 234, 242))
    text((cx + 96, y + 1), "— heavy gold on the hero panel", ImageFont.truetype(UI_FONT, 11), muted)
    y += 21
    divider()

    # Grade: Neon Harbor (the default) first and active
    heading("GRADE")
    grade_names = ["Neon Harbor", "Sunset Strip", "Neon Nights", "Chrome Heat",
                   "Palm Dusk", "Midnight Vice", "Golden Hour"]
    for i, name in enumerate(grade_names):
        button(cx + (i % 4) * (bw4 + 6), y + (i // 4) * 28, bw4, 24, name, active=(i == 0), font_size=10)
    y += 58
    divider()

    # Selected panel
    heading("PANEL 1")
    text((cx, y + 2), "Zoom", ImageFont.truetype(UI_BOLD, 12), (236, 234, 242))
    draw.line([(cx + 52, y + 8), (cx + cw, y + 8)], fill=edge, width=4)
    draw.ellipse([cx + 50, y + 1, cx + 64, y + 15], fill=GOLD)
    y += 20
    button(cx, y, cw, 24, "Auto-frame on the face")
    y += 29
    divider()

    # Caption
    heading("CAPTION")
    for label, value in [("Title", "VICE HEAT"), ("Cast line", TAGLINE), ("Position", "Bottom")]:
        text((cx, y), label, ImageFont.truetype(UI_BOLD, 12), (236, 234, 242))
        y += 13
        draw.rounded_rectangle([cx, y, cx + cw, y + 23], 6, fill=field, outline=edge)
        text((cx + 9, y + 11), value, ImageFont.truetype(UI_FONT, 13), (236, 234, 242), anchor="lm")
        y += 28
    divider()

    # Export
    heading("EXPORT")
    for label in ["PNG · 1080 × 1080", "PNG · 1080 × 1350", "PNG · 1920 × 1080"]:
        button(cx, y, cw, 24, label)
        y += 29
    return img


# ------------------------------------------------------------------ main

def save_jpeg(img, name):
    path = os.path.join(OUT_DIR, name)
    quality = 88
    while True:
        img.save(path, "JPEG", quality=quality)
        if os.path.getsize(path) <= 262144 or quality <= 55:
            break
        quality -= 6
    print(f"{name}: {img.width}x{img.height}, {os.path.getsize(path)} bytes (q={quality})")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # Range without repetition: the default Neon Harbor cover (frame off),
    # the editor, Key Art with the gold frame ON, and the Grid in a
    # different grade (Neon Nights) with the frame off. Every cover
    # seats its demo cast — a different person in every panel, each
    # framed on their face — and carries the poster furniture.
    save_jpeg(render_cover(1280, 720, "harbor", "neonharbor", "VICE HEAT"),
              "01-cover-landscape.jpg")
    save_jpeg(render_editor(1280, 720), "02-editor.jpg")
    save_jpeg(render_cover(1024, 1280, "keyart", "palm", "PALM DUSK", gold_frame=True),
              "03-cover-portrait.jpg")
    save_jpeg(render_cover(1080, 1080, "keyart", "neon", "NEON NIGHTS"),
              "04-cover-square.jpg")


if __name__ == "__main__":
    main()
