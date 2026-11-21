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

// The demo casts for the cover shot scenes: which sample (an index
// into main.js's SAMPLES order — Boulevard, Marina, Neon, Moto, Pier,
// Gold) fills each panel, so no demo cover ever repeats a person.
// Harbor leads with the Boulevard close-up and seats the rest of the
// cast around her, the Grid shows all six, Key Art leads with the
// gold-dress shot, and Banner mixes the marina, the pier and the neon
// street. Every panel is then framed on its photo's stored focal point
// (the face), so no crop ever slices a face. Mirrored as DEMO_CAST in
// tools/make_screenshots.py, which draws the shipped screenshots.
export const DEMO_CAST = {
  harbor: [0, 1, 2, 3, 4],
  grid: [0, 1, 2, 3, 4, 5],
  keyart: [5, 0, 2],
  banner: [1, 4, 2],
};

// Demo zooms per layout and panel index, on top of the focal framing:
// the Harbor hero is a close-up, so it pushes in on the face; the Key
// Art hero leans in a little. Panels not listed sit at natural zoom.
export const DEMO_ZOOM = {
  harbor: { 0: 1.45 },
  keyart: { 0: 1.12 },
};

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
