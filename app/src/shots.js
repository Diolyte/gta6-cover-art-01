// Deterministic scenes for screenshots, driven by the URL:
//   ?shot=cover&layout=harbor&grade=neonharbor&caption=VICE%20HEAT
//   ?shot=cover&layout=keyart&grade=palm&caption=PALM%20DUSK&frame=on
//   ?shot=editor&layout=grid&grade=neon&caption=NEON%20NIGHTS&pos=top
// `layout` and `grade` take the ids from design.js, `caption` and `tagline`
// the words, `pos` the caption position (top or bottom), and `frame=on`
// turns the gold frame on. With no parameters the scene is the studio's
// default: Harbor, Neon Harbor grade, frame off. In cover mode the page
// shows the cover alone, full-viewport. Either way the same fixed scene
// is set up (the bundled samples in the studio's default arrangement)
// and window.__shotReady is set once it has painted.

import { LAYOUTS, GRADES, DEFAULT_TAGLINE } from './design.js';

export function shotScene(query) {
  const layoutId = LAYOUTS[query.get('layout')] ? query.get('layout') : 'harbor';
  const gradeId = GRADES[query.get('grade')] ? query.get('grade') : 'neonharbor';
  return {
    layoutId,
    gradeId,
    goldFrame: query.get('frame') === 'on',
    caption: query.get('caption') ?? 'VICE HEAT',
    tagline: query.get('tagline') ?? DEFAULT_TAGLINE,
    captionPos: query.get('pos') === 'top' ? 'top' : 'bottom',
  };
}

// Per-panel focal fixes for the cover shot scenes, keyed by layout and
// panel index: { panX, panY, zoom } in render.js's placement terms.
// The wide panels' centred crop slices the Boulevard portrait through
// the woman's face, so the Harbor hero and the Grid's two left-hand
// Boulevard panels are panned up onto her face; the Grid's repeats also
// get varied zooms so the same photo reads as different shots. Panels
// not listed keep the centred default. Mirrored as PLACEMENTS in
// tools/make_screenshots.py, which draws the shipped screenshots.
export const SCENE_PLACEMENTS = {
  harbor: {
    0: { panX: 0, panY: 0.74, zoom: 1 },
  },
  grid: {
    0: { panX: 0, panY: 0.69, zoom: 1 },
    2: { panX: -0.08, panY: 0.49, zoom: 1.25 },
    4: { panX: 0, panY: 0, zoom: 1.15 },
    5: { panX: 0.1, panY: 0.29, zoom: 1.3 },
  },
};

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
