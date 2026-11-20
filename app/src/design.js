// Vice Heat Studio's shared design table: the four cover layouts and the
// colour grades. Everything is described in relative coordinates (0..1
// across the cover's width and height), so one scene renders identically
// at the on-screen preview size and at every export size.
//
// A layout is a list of panels; each panel is a polygon of [x, y] points.
// `hero` names the panel index that gets the pop-out treatment (Harbor)
// and, when the editor's Gold frame option is on, the heavy gold frame;
// it is null when a layout has no hero (the frame then goes on panel 1).
//
// The studio opens on the Harbor layout with the Neon Harbor grade — a
// sunset-to-neon wash — and the gold frame off: the "Neon Harbor" cover.

export const LAYOUTS = {
  harbor: {
    name: 'Harbor',
    hero: 0,
    popOut: 0.085, // how far the hero photo rises above its frame line, in cover heights
    panels: [
      // the big slanted hero panel, top left
      [[0.02, 0.15], [0.63, 0.08], [0.58, 0.58], [0.02, 0.65]],
      // stacked pair on the right, leaning with the hero
      [[0.67, 0.07], [0.98, 0.05], [0.98, 0.34], [0.63, 0.37]],
      [[0.62, 0.41], [0.98, 0.38], [0.98, 0.63], [0.59, 0.61]],
      // two upright panels along the bottom
      [[0.02, 0.69], [0.46, 0.66], [0.48, 0.96], [0.02, 0.97]],
      [[0.52, 0.65], [0.98, 0.67], [0.98, 0.96], [0.52, 0.96]],
    ],
  },
  grid: {
    name: 'Grid',
    hero: null,
    popOut: 0,
    panels: [
      [[0.02, 0.02], [0.57, 0.02], [0.57, 0.32], [0.02, 0.32]],
      [[0.60, 0.02], [0.98, 0.02], [0.98, 0.32], [0.60, 0.32]],
      [[0.02, 0.35], [0.39, 0.35], [0.39, 0.65], [0.02, 0.65]],
      [[0.42, 0.35], [0.98, 0.35], [0.98, 0.65], [0.42, 0.65]],
      [[0.02, 0.68], [0.57, 0.68], [0.57, 0.98], [0.02, 0.98]],
      [[0.60, 0.68], [0.98, 0.68], [0.98, 0.98], [0.60, 0.98]],
    ],
  },
  keyart: {
    name: 'Key Art',
    hero: 0,
    popOut: 0,
    panels: [
      [[0.04, 0.04], [0.66, 0.04], [0.66, 0.96], [0.04, 0.96]],
      [[0.70, 0.04], [0.96, 0.04], [0.96, 0.47], [0.70, 0.47]],
      [[0.70, 0.53], [0.96, 0.53], [0.96, 0.96], [0.70, 0.96]],
    ],
  },
  banner: {
    name: 'Banner',
    hero: null,
    popOut: 0,
    panels: [
      [[0.02, 0.05], [0.98, 0.03], [0.98, 0.43], [0.02, 0.47]],
      [[0.02, 0.51], [0.49, 0.49], [0.49, 0.97], [0.02, 0.97]],
      [[0.53, 0.47], [0.98, 0.45], [0.98, 0.97], [0.53, 0.97]],
    ],
  },
};

export const LAYOUT_ORDER = ['harbor', 'grid', 'keyart', 'banner'];

// A grade is a canvas filter for the photos, a vertical colour wash laid over
// the finished art, and a vignette strength. The PIL screenshot renderer
// mirrors the same looks with its enhancer settings.
export const GRADES = {
  neonharbor: {
    name: 'Neon Harbor',
    filter: 'saturate(1.45) contrast(1.12) brightness(1.02) hue-rotate(-6deg)',
    wash: [[0, [255, 120, 50, 0.12]], [0.5, [255, 60, 130, 0.07]], [1, [140, 0, 255, 0.24]]],
    vignette: 0.47,
  },
  sunset: {
    name: 'Sunset Strip',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.06)',
    wash: [[0, [255, 110, 40, 0.10]], [0.55, [255, 60, 120, 0.05]], [1, [60, 10, 80, 0.30]]],
    vignette: 0.45,
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.16) brightness(0.98) hue-rotate(-12deg)',
    wash: [[0, [0, 220, 255, 0.12]], [0.5, [120, 0, 255, 0.06]], [1, [255, 0, 140, 0.26]]],
    vignette: 0.5,
  },
  chrome: {
    name: 'Chrome Heat',
    filter: 'saturate(0.8) contrast(1.28) brightness(1.1)',
    wash: [[0, [200, 220, 255, 0.10]], [1, [20, 30, 50, 0.22]]],
    vignette: 0.4,
  },
  palm: {
    name: 'Palm Dusk',
    filter: 'saturate(1.18) contrast(1.06) brightness(0.95) sepia(0.22)',
    wash: [[0, [0, 180, 170, 0.10]], [1, [50, 10, 90, 0.30]]],
    vignette: 0.48,
  },
  midnight: {
    name: 'Midnight Vice',
    filter: 'saturate(1.22) contrast(1.22) brightness(0.8)',
    wash: [[0, [10, 20, 80, 0.16]], [1, [0, 0, 20, 0.38]]],
    vignette: 0.6,
  },
  golden: {
    name: 'Golden Hour',
    filter: 'saturate(1.28) contrast(1.03) brightness(1.13) sepia(0.12)',
    wash: [[0, [255, 200, 80, 0.12]], [1, [120, 60, 10, 0.20]]],
    vignette: 0.38,
  },
};

export const GRADE_ORDER = ['neonharbor', 'sunset', 'neon', 'chrome', 'palm', 'midnight', 'golden'];

// The retro-chrome title: a striped metal gradient, top (bright) to bottom.
export const CHROME_STOPS = [
  [0, '#ffffff'], [0.28, '#d7dee6'], [0.46, '#828e9c'], [0.5, '#f8fafc'],
  [0.54, '#93a1b1'], [0.78, '#e6ecf2'], [1, '#5f6b78'],
];

export const INK = '#0a0a10';       // gutters and page backdrop of the cover itself
export const GOLD = '#e3b94e';      // keylines and tag-line lettering
export const GOLD_DEEP = '#9a741f'; // the Key Art hero frame

export const TITLE_FONT = '"Arial Black", "Arial Narrow Bold", "Liberation Sans", Arial, sans-serif';
export const TAG_FONT = '"Arial Narrow", "Liberation Sans", Arial, sans-serif';

export const DEFAULT_TAGLINE = 'LUCIA • JASON • CAL';

// A fresh set of panel placements for a layout: photos cycle in order, each
// centred (pan 0, 0) at natural cover zoom. pan is stored as a fraction of
// the panel's bounding-box size; the renderer clamps it so the photo always
// covers its panel.
export function defaultPanels(layoutId, photoCount) {
  const layout = LAYOUTS[layoutId];
  return layout.panels.map((_, i) => ({
    photo: photoCount > 0 ? i % photoCount : -1,
    panX: 0,
    panY: 0,
    zoom: 1,
  }));
}

// The polygon with its top edge lifted by `lift` (a fraction of cover
// height): the shape the Harbor hero's pop-out copy is clipped to. The top
// edge is the pair of points nearest the top of the cover (within 0.12 of
// the highest point), so a slanted top edge lifts as one.
export function liftedPolygon(poly, lift) {
  const topY = Math.min(...poly.map((p) => p[1]));
  return poly.map(([x, y]) => [x, y - topY < 0.12 ? y - lift : y]);
}
