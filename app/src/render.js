// The cover renderer. drawCover paints a whole scene (layout + photos +
// grade + caption) onto any 2D context at any size: the layouts live in
// relative coordinates, so the preview and the three export sizes are the
// same drawing at different resolutions.

import {
  LAYOUTS, GRADES, CHROME_STOPS, INK, GOLD, GOLD_DEEP,
  TITLE_FONT, TAG_FONT, liftedPolygon, REVIEW, BILLING, SEAL_RING, SEAL_CENTER,
} from './design.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rgba = ([r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a})`;

export function bboxOf(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function pathOf(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

// Where a photo lands inside a panel's bounding box: cover-fit scaled by
// zoom, centred, then shifted by the pan (a fraction of the box size),
// clamped so the photo never stops covering the box. Returns the drawImage
// rectangle plus the clamped pan actually used.
export function photoPlacement(img, box, panX, panY, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(box.w / iw, box.h / ih) * zoom;
  const dw = iw * s;
  const dh = ih * s;
  const ox = clamp(panX * box.w, -Math.max(0, (dw - box.w) / 2), Math.max(0, (dw - box.w) / 2));
  const oy = clamp(panY * box.h, -Math.max(0, (dh - box.h) / 2), Math.max(0, (dh - box.h) / 2));
  return {
    dx: box.x + box.w / 2 + ox - dw / 2,
    dy: box.y + box.h / 2 + oy - dh / 2,
    dw, dh, ox, oy,
  };
}

// One photo clipped to one panel polygon (or to any polygon, for the
// pop-out copy). A null image paints the empty-panel slate.
function drawPhoto(ctx, W, H, poly, panel, filter) {
  const box = bboxOf(poly);
  const px = { x: box.x * W, y: box.y * H, w: box.w * W, h: box.h * H };
  ctx.save();
  pathOf(ctx, poly, W, H);
  ctx.clip();
  if (panel && panel.img) {
    ctx.filter = filter;
    const pl = photoPlacement(panel.img, px, panel.panX, panel.panY, panel.zoom);
    ctx.drawImage(panel.img, pl.dx, pl.dy, pl.dw, pl.dh);
  } else {
    ctx.fillStyle = '#17171f';
    ctx.fillRect(px.x - 2, px.y - 2, px.w + 4, px.h + 4);
  }
  ctx.restore();
}

// The bold dark gutter around a panel, with its thin gold keyline centred
// in it. With the Gold frame option on, one panel (the layout's hero, or
// panel 1 when the layout has none) gets a second, much heavier gold
// frame over the gutter so it stands out as the cover's centrepiece.
function strokePanel(ctx, W, H, poly, heavy) {
  const u = Math.min(W, H);
  pathOf(ctx, poly, W, H);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.011 * u;
  ctx.lineJoin = 'round';
  ctx.stroke();
  pathOf(ctx, poly, W, H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 0.0028 * u;
  ctx.stroke();
  if (heavy) {
    pathOf(ctx, poly, W, H);
    ctx.strokeStyle = GOLD_DEEP;
    ctx.lineWidth = 0.017 * u;
    ctx.stroke();
    pathOf(ctx, poly, W, H);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 0.0055 * u;
    ctx.stroke();
  }
}

// The Harbor hero's second copy: clipped to the lifted polygon so the photo
// rises above its frame line, over a soft dark shadow of the same shape.
function drawPopOut(ctx, W, H, poly, panel, filter, lift) {
  const lifted = liftedPolygon(poly, lift);
  const u = Math.min(W, H);
  ctx.save();
  ctx.filter = `blur(${Math.max(1, 0.012 * u)}px)`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.translate(0, 0.014 * H);
  pathOf(ctx, lifted, W, H);
  ctx.fill();
  ctx.restore();
  drawPhoto(ctx, W, H, lifted, panel, filter);
}

// A soft dark band behind the caption so the chrome lettering stays
// readable over bright art.
function captionBand(ctx, W, H, pos) {
  const grad = pos === 'top'
    ? ctx.createLinearGradient(0, 0, 0, H * 0.4)
    : ctx.createLinearGradient(0, H * 0.6, 0, H);
  if (pos === 'top') {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.52)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------- poster furniture
// The dressing a real key-art poster carries, drawn over the graded art:
// a name tag on every panel, the review strip, the studio seal and the
// billing block. Sizes are fractions of u = min(W, H) unless noted, and
// tools/make_screenshots.py mirrors every number.

const BILLING_FS = 0.0145; // billing type size, in u
const BILLING_LH = 1.5;    // billing line height, in type sizes

// The height the billing block reserves along the cover's bottom edge;
// the title (when it sits at the bottom) and the seal rest above it.
export function billingInset(W, H) {
  const u = Math.min(W, H);
  return BILLING_FS * BILLING_LH * BILLING.length * u + 0.016 * H;
}

function setTracking(ctx, px) {
  try { ctx.letterSpacing = `${Math.max(0, Math.round(px))}px`; } catch { /* older engines */ }
}

// One panel's name tag: the star's name in tracked warm-white caps on a
// soft dark plate along the panel's bottom edge, clipped to the panel so
// slanted panels keep it inside their frame. Panels too small to carry
// a legible tag are skipped.
function drawNameTag(ctx, W, H, poly, name) {
  if (!name) return;
  const rel = bboxOf(poly);
  const box = { x: rel.x * W, y: rel.y * H, w: rel.w * W, h: rel.h * H };
  const u = Math.min(W, H);
  if (box.h < 0.10 * u || box.w < 0.12 * u) return;
  const fs = Math.min(box.h * 0.115, u * 0.024);
  const plateH = fs * 2.0;
  // The plate hugs the panel's bottom edge, unless that would run
  // into the billing block's reserved strip — then it rests just
  // above it, so a name tag never collides with the small print.
  let plateBottom = box.y + box.h - box.h * 0.045;
  const limit = H - billingInset(W, H) - 0.006 * H;
  if (plateBottom > limit) plateBottom = limit;
  const plateY = plateBottom - plateH;
  ctx.save();
  pathOf(ctx, poly, W, H);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, plateY - fs * 0.7, 0, box.y + box.h);
  grad.addColorStop(0, 'rgba(4, 4, 10, 0)');
  grad.addColorStop(0.45, 'rgba(4, 4, 10, 0.62)');
  grad.addColorStop(1, 'rgba(4, 4, 10, 0.80)');
  ctx.fillStyle = grad;
  ctx.fillRect(box.x - 2, plateY - fs * 0.7, box.w + 4, box.h - plateY + fs * 0.7 + 2);
  ctx.font = `700 ${fs}px ${TAG_FONT}`;
  setTracking(ctx, fs * 0.22);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f3e9c8';
  ctx.fillText(name.trim().toUpperCase(), box.x + box.w / 2, plateY + fs * 1.34);
  setTracking(ctx, 0);
  ctx.restore();
}

// The billing block: the poster's small print — production, cast and
// credits in tiny tracked caps, centred along the bottom edge over a
// soft dark band that keeps it legible over bright panels.
function drawBilling(ctx, W, H) {
  const u = Math.min(W, H);
  const fs = BILLING_FS * u;
  const lh = fs * BILLING_LH;
  const bandTop = H - billingInset(W, H) - 0.012 * H;
  const band = ctx.createLinearGradient(0, bandTop, 0, H);
  band.addColorStop(0, 'rgba(0, 0, 0, 0)');
  band.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop, W, H - bandTop);

  // Shrink to fit: the longest credits line must clear the cover's
  // width, or the small print runs off the edges of narrow covers.
  let fit = fs;
  const setFont = () => {
    ctx.font = `600 ${fit}px ${TAG_FONT}`;
    setTracking(ctx, fit * 0.14);
  };
  setFont();
  const widest = Math.max(...BILLING.map((line) => ctx.measureText(line).width));
  if (widest > W * 0.96) {
    fit *= (W * 0.96) / widest;
    setFont();
  }
  const flh = fit * BILLING_LH;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(238, 234, 244, 0.92)';
  BILLING.forEach((line, i) => {
    const base = H - 0.010 * H - (BILLING.length - 1 - i) * flh - fit * 0.22;
    ctx.fillText(line, W / 2, base);
  });
  setTracking(ctx, 0);
}

// The review strip: five gold stars and one pull-quote on a slim dark
// band. It takes the edge the caption does not: the top when the title
// sits at the bottom, and just above the billing block when it does not.
function drawReviewStrip(ctx, W, H, pos, inset) {
  const u = Math.min(W, H);
  let fs = u * 0.021;
  const setFont = () => { ctx.font = `700 ${fs}px ${TAG_FONT}`; };
  setFont();
  const starsW = ctx.measureText(REVIEW.stars).width;
  const quoteText = `  “${REVIEW.quote}” — ${REVIEW.source}`;
  let quoteW = ctx.measureText(quoteText).width;
  while (starsW + quoteW > W * 0.94 && fs > 8) {
    fs *= 0.94;
    setFont();
    quoteW = ctx.measureText(quoteText).width;
  }
  const bandH = fs * 2.7;
  const y = pos === 'bottom' ? 0.010 * H : H - inset - bandH - 0.012 * H;
  const band = ctx.createLinearGradient(0, y, 0, y + bandH);
  band.addColorStop(0, 'rgba(4, 4, 10, 0)');
  band.addColorStop(0.25, 'rgba(4, 4, 10, 0.58)');
  band.addColorStop(0.75, 'rgba(4, 4, 10, 0.58)');
  band.addColorStop(1, 'rgba(4, 4, 10, 0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, y, W, bandH);

  const base = y + bandH / 2 + fs * 0.36;
  const total = starsW + quoteW;
  ctx.textBaseline = 'alphabetic';
  setTracking(ctx, fs * 0.06);
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.fillText(REVIEW.stars, W / 2 - total / 2, base);
  ctx.fillStyle = '#f5f2ea';
  ctx.fillText(quoteText, W / 2 - total / 2 + starsW, base);
  setTracking(ctx, 0);
}

// The studio seal: a gold-ringed round badge resting in the bottom-right
// corner above the billing block, its ring lettered like a film seal,
// a star and the founding year at its centre.
function drawSeal(ctx, W, H, inset) {
  const u = Math.min(W, H);
  const r = u * 0.054;
  // Bottom-left: the right corner would sit on the narrow panels'
  // centred name tags and clip their text.
  const cx = r + 0.018 * u;
  const cy = H - inset - r - 0.012 * H;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8, 6, 16, 0.85)';
  ctx.fill();
  ctx.lineWidth = 0.0035 * u;
  ctx.strokeStyle = GOLD;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = 0.0016 * u;
  ctx.stroke();

  const ringFs = r * 0.205;
  ctx.font = `700 ${ringFs}px ${TAG_FONT}`;
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...SEAL_RING];
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + (i / chars.length) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r * 0.885, cy + Math.sin(a) * r * 0.885);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });

  ctx.fillStyle = '#f5f2ea';
  ctx.font = `${r * 0.5}px ${TAG_FONT}`;
  ctx.fillText('★', cx, cy - r * 0.12);
  ctx.fillStyle = GOLD;
  ctx.font = `700 ${r * 0.19}px ${TAG_FONT}`;
  ctx.fillText(SEAL_CENTER, cx, cy + r * 0.40);
  ctx.restore();
}

// The striped retro-chrome title with its 3D extrusion and dark outline,
// plus the small gold cast line beneath it. `inset` is the billing
// block's reserved height: a bottom title rests above it.
function drawTitle(ctx, W, H, caption, tagline, pos, inset = 0) {
  const text = caption.trim().toUpperCase();
  if (!text) return;
  captionBand(ctx, W, H, pos);
  let size = H * 0.135;
  const setFont = () => { ctx.font = `italic 900 ${size}px ${TITLE_FONT}`; };
  setFont();
  while (ctx.measureText(text).width > W * 0.93 && size > 10) {
    size *= 0.94;
    setFont();
  }
  const cx = W / 2;
  const hasTag = tagline.trim().length > 0;
  let base;
  if (pos === 'top') base = H * 0.035 + size * 0.92;
  else base = H * 0.965 - inset - (hasTag ? size * 0.5 : size * 0.16);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';

  // extrusion: a stack of dark copies stepping down from the face
  ctx.fillStyle = '#150820';
  const depth = size * 0.085;
  for (let d = depth; d > 0.5; d -= depth / 5) ctx.fillText(text, cx, base + d);
  // outline
  ctx.strokeStyle = '#0c0416';
  ctx.lineWidth = size * 0.05;
  ctx.strokeText(text, cx, base);
  // striped chrome face
  const grad = ctx.createLinearGradient(0, base - size * 0.86, 0, base + size * 0.12);
  for (const [at, color] of CHROME_STOPS) grad.addColorStop(at, color);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, base);

  if (hasTag) {
    const tagSize = size * 0.23;
    ctx.font = `700 ${tagSize}px ${TAG_FONT}`;
    try { ctx.letterSpacing = `${Math.round(tagSize * 0.32)}px`; } catch { /* older engines */ }
    const tagBase = base + size * 0.44;
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
    ctx.lineWidth = tagSize * 0.14;
    ctx.strokeText(tagline.trim().toUpperCase(), cx, tagBase);
    ctx.fillStyle = GOLD;
    ctx.fillText(tagline.trim().toUpperCase(), cx, tagBase);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }
}

// Paint the whole cover. scene.panels carry resolved images ({img, panX,
// panY, zoom, name} or {img: null}) — name is the panel star's name tag,
// empty when the panel has none. options.selected, when >= 0, outlines
// that panel for the editor and is never set for exports or shot mode.
export function drawCover(ctx, W, H, scene, options = {}) {
  const layout = LAYOUTS[scene.layoutId];
  const grade = GRADES[scene.gradeId];
  const u = Math.min(W, H);

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  if (layout.popOut > 0 && layout.hero !== null) {
    const heroPanel = scene.panels[layout.hero];
    if (heroPanel && heroPanel.img) {
      drawPopOut(ctx, W, H, layout.panels[layout.hero], heroPanel, grade.filter, layout.popOut);
    }
  }

  layout.panels.forEach((poly, i) => {
    drawPhoto(ctx, W, H, poly, scene.panels[i], grade.filter);
  });
  const framedPanel = layout.hero !== null ? layout.hero : 0;
  layout.panels.forEach((poly, i) => {
    strokePanel(ctx, W, H, poly, Boolean(scene.goldFrame) && i === framedPanel);
  });

  // the grade's colour wash over the whole cover
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of grade.wash) wash.addColorStop(at, rgba(color));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  // vignette
  const radius = Math.hypot(W, H) / 2;
  const vig = ctx.createRadialGradient(W / 2, H / 2, radius * 0.55, W / 2, H / 2, radius * 1.02);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // poster furniture over the graded art: name tags, billing block,
  // review strip and seal, then the title above them all
  const inset = billingInset(W, H);
  layout.panels.forEach((poly, i) => {
    drawNameTag(ctx, W, H, poly, scene.panels[i] ? scene.panels[i].name : '');
  });
  drawBilling(ctx, W, H);
  drawReviewStrip(ctx, W, H, scene.captionPos, inset);
  drawSeal(ctx, W, H, inset);

  drawTitle(ctx, W, H, scene.caption, scene.tagline, scene.captionPos, inset);

  const selected = options.selected ?? -1;
  if (selected >= 0 && layout.panels[selected]) {
    pathOf(ctx, layout.panels[selected], W, H);
    ctx.strokeStyle = '#3ee6ff';
    ctx.lineWidth = 0.0045 * u;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

// Hit test for the editor: which panel polygon holds the relative point
// (x, y)? Later panels win where polygons overlap. -1 when none does.
export function panelAt(layoutId, x, y) {
  const panels = LAYOUTS[layoutId].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const poly = panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [xa, ya] = poly[a];
      const [xb, yb] = poly[b];
      if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}
