// The cover renderer. drawCover paints a whole scene (layout + photos +
// grade + caption) onto any 2D context at any size: the layouts live in
// relative coordinates, so the preview and the three export sizes are the
// same drawing at different resolutions.

import {
  LAYOUTS, GRADES, CHROME_STOPS, INK, GOLD, GOLD_DEEP,
  TITLE_FONT, TAG_FONT, liftedPolygon,
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

// The striped retro-chrome title with its 3D extrusion and dark outline,
// plus the small gold cast line beneath it.
function drawTitle(ctx, W, H, caption, tagline, pos) {
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
  else base = H * 0.965 - (hasTag ? size * 0.5 : size * 0.16);

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
// panY, zoom} or {img: null}); options.selected, when >= 0, outlines that
// panel for the editor and is never set for exports or shot mode.
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

  drawTitle(ctx, W, H, scene.caption, scene.tagline, scene.captionPos);

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
