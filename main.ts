// The hand-in program for Vice Heat Studio (gta6-cover-art-01), Node 22
// with nothing but the standard library.
//
// The entry itself is the static web app in app/ — plain files a desktop
// browser opens offline, no build step and no network — plus the renders
// in screenshots/. This program's whole job is to deliver them: it copies
// app/ and screenshots/ into the output directory ($MAKEFUN_OUTPUT_DIR,
// or /output where the grader runs it) and writes dossier.json there,
// the summary the judge reads, produced by the vendored make.fun library
// in vendor/makefun-app.ts (the kit's file, imported as-is).
//
// Try the app first with `node serve.ts`. Run this with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Deliver the app exactly as it sits beside this file.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });

// Deliver the screenshots (the dossier wants at least one; we ship four).
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The dossier, under the scorer's own caps (the kit's gate): of these only
// text_max_bytes shapes the bytes written; the rest make this program
// refuse anything the scorer would refuse — too many screenshots or one
// over 256 KiB, an app/ past 993 entries or 48 MiB in all, or a single
// app/ path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
