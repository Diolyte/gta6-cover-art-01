[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Diolyte/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Diolyte/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Heat Studio

A GTA 6-style cover art maker that runs entirely in the browser. Load your
own photos (or start from the two bundled samples), drop them into the
panels of a cover layout, grade the art, sign it with a striped
retro-chrome title, and export a finished cover PNG. No build step, no
network, no libraries — plain HTML, CSS and ES modules.

The studio opens on its signature cover: the **Harbor** layout with the
**Neon Harbor** grade (a sunset-to-neon wash) and the gold frame off.

## Features

- **4 layouts** — Harbor (slanted multi-panel grid whose hero photo pops
  out above its frame line), Grid (the classic GTA panel grid), Key Art
  (one hero image with small side panels) and Banner (wide cinematic
  panels). Panels sit in bold dark gutters with thin gold keylines.
- **Gold frame option** — a toggle in the Layout section that puts a
  heavy gold frame on the hero panel.
- **Per-panel editing** — click a panel to select it, click a photo to
  assign it, drag on the cover to reposition the photo inside its panel,
  zoom with the slider, or hit Auto-frame to centre the panel on the
  photo's most detailed region (an edge-density centroid computed in an
  offscreen pass).
- **7 colour grades** — Neon Harbor, Sunset Strip, Neon Nights, Chrome
  Heat, Palm Dusk, Midnight Vice and Golden Hour, each a canvas filter
  plus a colour wash and vignette applied to the whole cover.
- **Retro-chrome caption** — your title in striped chrome lettering with
  a 3D extrusion and dark outline, top or bottom, with an editable gold
  cast line under it ("LUCIA • JASON • CAL").
- **Resolution-independent export** — layouts are defined in relative
  coordinates, so the same scene renders the preview and exports at
  1080×1080, 1080×1350 and 1920×1080 PNG.
- **Your photos stay yours** — files are read locally in the page and
  never uploaded anywhere.

## Run it

```
node serve.ts
```

then open http://localhost:8080. Two sample photos are preloaded, so a
cover exists on first load; add your own from the Photos section.

Screenshot scenes are deterministic via URL parameters, e.g.
`?shot=cover&layout=keyart&grade=palm&caption=PALM%20DUSK&frame=on` shows
a cover alone, full-viewport, and `?shot=editor` shows the editor set up
the same way (see `shots.json`). The four files in `screenshots/` are
rendered by `tools/make_screenshots.py`, a PIL mirror of the app's
layout geometry, grades and chrome-title rendering.

## How the entry is handed in

```
node main.ts
```

`main.ts` copies `app/` and `screenshots/` to `$MAKEFUN_OUTPUT_DIR`
(or `/output`) and writes `dossier.json` there with the vendored
make.fun library (`vendor/makefun-app.ts`), which is what the bounty
judges read.
