// Vice Heat Studio: the editor. A scene (layout, photos placed in panels,
// grade, caption) is kept in plain state; every control changes the state
// and repaints the preview canvas with render.drawCover. Exports repaint
// the same scene onto a fresh canvas at the requested size.

import {
  LAYOUTS, GRADES, LAYOUT_ORDER, GRADE_ORDER, DEFAULT_TAGLINE, defaultPanels, bboxOf,
} from './design.js';
import { drawCover, panelAt } from './render.js';
import { detailCentroid, panForCentroid } from './autoframe.js';
import { shotScene, markShotReady, SCENE_PLACEMENTS } from './shots.js';

const EXPORTS = [
  { label: 'PNG · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'PNG · 1080 × 1350', w: 1080, h: 1350 },
  { label: 'PNG · 1920 × 1080', w: 1920, h: 1080 },
];
const ASPECTS = [
  { label: '1 : 1', w: 1080, h: 1080 },
  { label: '4 : 5', w: 1080, h: 1350 },
  { label: '16 : 9', w: 1920, h: 1080 },
];
const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

const query = new URLSearchParams(location.search);
const shot = query.get('shot');

const state = {
  photos: [], // { name, img }
  layoutId: 'harbor',
  gradeId: 'neonharbor', // the default look: Harbor + Neon Harbor grade, frame off
  goldFrame: false,
  caption: 'VICE HEAT',
  tagline: DEFAULT_TAGLINE,
  captionPos: 'bottom',
  panels: [],
  selected: 0,
  aspect: { w: 1080, h: 1080 },
};

if (shot) Object.assign(state, shotScene(query));

const $ = (id) => document.getElementById(id);
const canvas = $('stage');
const ctx = canvas.getContext('2d');

function renderScene() {
  return {
    layoutId: state.layoutId,
    gradeId: state.gradeId,
    goldFrame: state.goldFrame,
    caption: state.caption,
    tagline: state.tagline,
    captionPos: state.captionPos,
    panels: state.panels.map((p) => ({
      img: p.photo >= 0 && state.photos[p.photo] ? state.photos[p.photo].img : null,
      panX: p.panX,
      panY: p.panY,
      zoom: p.zoom,
    })),
  };
}

function fitCanvas() {
  if (shot === 'cover') {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    return;
  }
  const scale = Math.min(880 / state.aspect.w, 880 / state.aspect.h);
  canvas.width = Math.round(state.aspect.w * scale);
  canvas.height = Math.round(state.aspect.h * scale);
}

function render() {
  fitCanvas();
  drawCover(ctx, canvas.width, canvas.height, renderScene(), { selected: shot === 'cover' ? -1 : state.selected });
  syncPanelControls();
  markThumbs();
  const panel = state.panels[state.selected];
  const photo = panel && state.photos[panel.photo];
  $('status').textContent = panel
    ? `Panel ${state.selected + 1} of ${state.panels.length}${photo ? ` · ${photo.name}` : ' · empty'} — drag on the cover to reposition it.`
    : '';
}

function rebuildPanels() {
  state.panels = defaultPanels(state.layoutId, state.photos.length);
  if (shot === 'cover') {
    // Cover shot scenes carry focal fixes (shots.js) so the faces the
    // samples lead with stay in frame at the shot's aspect, matching
    // the shipped screenshots.
    const fixes = SCENE_PLACEMENTS[state.layoutId];
    if (fixes) {
      state.panels.forEach((panel, i) => {
        const fix = fixes[i];
        if (fix) {
          panel.panX = fix.panX;
          panel.panY = fix.panY;
          panel.zoom = fix.zoom;
        }
      });
    }
  }
  state.selected = 0;
  render();
}

// ------------------------------------------------------------ photos

function addPhoto(name, img) {
  state.photos.push({ name, img });
  if (state.panels.length === 0) {
    rebuildPanels();
  } else {
    // Panels built before any photo existed get the new arrivals in order.
    state.panels.forEach((p, i) => { if (p.photo < 0) p.photo = i % state.photos.length; });
    render();
  }
  buildThumbs();
}

function loadSample(sample) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { addPhoto(sample.name, img); resolve(); };
    img.onerror = () => resolve();
    img.src = sample.src;
  });
}

function buildThumbs() {
  const box = $('thumbs');
  box.textContent = '';
  state.photos.forEach((photo, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.dataset.index = String(i);
    const pic = document.createElement('img');
    pic.src = photo.img.src;
    pic.alt = '';
    const label = document.createElement('span');
    label.textContent = photo.name;
    btn.append(pic, label);
    btn.addEventListener('click', () => {
      const panel = state.panels[state.selected];
      if (panel) {
        panel.photo = i;
        render();
      }
    });
    box.append(btn);
  });
  markThumbs();
}

function markThumbs() {
  const panel = state.panels[state.selected];
  document.querySelectorAll('.thumb').forEach((el) => {
    el.classList.toggle('active', panel && Number(el.dataset.index) === panel.photo);
  });
}

$('photoInput').addEventListener('change', (event) => {
  for (const file of event.target.files) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => addPhoto(file.name.replace(/\.[^.]+$/, ''), img);
    img.src = url;
  }
  event.target.value = '';
});

// ------------------------------------------------------------ layout & grade

function buildButtons(boxId, ids, names, current, onPick) {
  const box = $(boxId);
  box.textContent = '';
  for (const id of ids) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = names[id];
    btn.dataset.id = id;
    btn.classList.toggle('active', id === current);
    btn.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.id === id));
      onPick(id);
    });
    box.append(btn);
  }
}

buildButtons(
  'layoutButtons', LAYOUT_ORDER,
  Object.fromEntries(LAYOUT_ORDER.map((id) => [id, LAYOUTS[id].name])),
  state.layoutId,
  (id) => { state.layoutId = id; rebuildPanels(); },
);
buildButtons(
  'gradeButtons', GRADE_ORDER,
  Object.fromEntries(GRADE_ORDER.map((id) => [id, GRADES[id].name])),
  state.gradeId,
  (id) => { state.gradeId = id; render(); },
);
$('goldFrame').addEventListener('change', (event) => {
  state.goldFrame = event.target.checked;
  render();
});
buildButtons(
  'aspectButtons', ASPECTS.map((_, i) => String(i)),
  Object.fromEntries(ASPECTS.map((a, i) => [String(i), a.label])),
  '0',
  (id) => { state.aspect = ASPECTS[Number(id)]; render(); },
);

// ------------------------------------------------------------ panel editing

function syncPanelControls() {
  const panel = state.panels[state.selected];
  $('panelLabel').textContent = panel ? `Panel ${state.selected + 1}` : 'Panel';
  if (panel) $('zoom').value = String(panel.zoom);
}

$('zoom').addEventListener('input', (event) => {
  const panel = state.panels[state.selected];
  if (panel) {
    panel.zoom = Number(event.target.value);
    render();
  }
});

$('autoframe').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  const photo = panel && state.photos[panel.photo];
  if (!panel || !photo) return;
  const rel = bboxOf(LAYOUTS[state.layoutId].panels[state.selected]);
  const box = {
    x: rel.x * canvas.width, y: rel.y * canvas.height,
    w: rel.w * canvas.width, h: rel.h * canvas.height,
  };
  const pan = panForCentroid(photo.img, box, panel.zoom, detailCentroid(photo.img));
  panel.panX = pan.panX;
  panel.panY = pan.panY;
  render();
});

// Dragging on the canvas: a press selects the panel under the pointer and
// drags its photo. The pan is stored as a fraction of the panel's box, so
// a pointer move of the same relative size moves the photo by that much.
let drag = null;
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = panelAt(state.layoutId, point.x, point.y);
  if (hit < 0) return;
  state.selected = hit;
  const panel = state.panels[hit];
  const box = bboxOf(LAYOUTS[state.layoutId].panels[hit]);
  drag = { x: point.x, y: point.y, panX: panel.panX, panY: panel.panY, box };
  canvas.setPointerCapture(event.pointerId);
  render();
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = state.panels[state.selected];
  panel.panX = drag.panX + (point.x - drag.x) / drag.box.w;
  panel.panY = drag.panY + (point.y - drag.y) / drag.box.h;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// ------------------------------------------------------------ caption

$('captionInput').addEventListener('input', (event) => { state.caption = event.target.value; render(); });
$('taglineInput').addEventListener('input', (event) => { state.tagline = event.target.value; render(); });
$('posSelect').addEventListener('change', (event) => { state.captionPos = event.target.value; render(); });

// ------------------------------------------------------------ export

const exportBox = $('exportButtons');
for (const size of EXPORTS) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = size.label;
  btn.addEventListener('click', () => {
    const off = document.createElement('canvas');
    off.width = size.w;
    off.height = size.h;
    drawCover(off.getContext('2d'), size.w, size.h, renderScene());
    off.toBlob((blob) => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `vice-heat-${size.w}x${size.h}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    }, 'image/png');
  });
  exportBox.append(btn);
}

// ------------------------------------------------------------ start

function syncInputs() {
  $('captionInput').value = state.caption;
  $('taglineInput').value = state.tagline;
  $('posSelect').value = state.captionPos;
  $('goldFrame').checked = state.goldFrame;
}

window.addEventListener('resize', () => { if (shot === 'cover') render(); });

(async () => {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  syncInputs();
  buildThumbs();
  render(); // panels start empty; the samples fill them as they land
  for (const sample of SAMPLES) await loadSample(sample);
  rebuildPanels();
  render();
  if (shot) markShotReady();
})();
