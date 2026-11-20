// Auto-frame: find a photo's most detailed region and pan the panel so it
// sits in the middle. The photo is shrunk onto a small offscreen canvas,
// turned to grey, and every pixel is weighed by how much its brightness
// differs from its neighbours (a cheap edge detector). The weighted
// centroid of that detail map is the point worth centring.

const WORK = 96; // the analysis copy is at most this many pixels wide

export function detailCentroid(img) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, WORK / iw);
  const w = Math.max(2, Math.round(iw * scale));
  const h = Math.max(2, Math.round(ih * scale));

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const grey = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    grey[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  let sum = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const edge = Math.abs(grey[i] - grey[i - 1]) + Math.abs(grey[i] - grey[i + 1])
        + Math.abs(grey[i] - grey[i - w]) + Math.abs(grey[i] - grey[i + w]);
      sum += edge;
      sx += edge * (x / (w - 1));
      sy += edge * (y / (h - 1));
    }
  }
  if (sum <= 0) return { fx: 0.5, fy: 0.5 };
  return { fx: sx / sum, fy: sy / sum };
}

// The pan that puts the detail centroid at the panel's centre, for a panel
// described by its pixel bounding box. Mirrors render.photoPlacement's
// maths: at cover zoom the image point fx lands at centre + pan - size/2 +
// fx*size, so pan = size * (0.5 - fx); expressed as a fraction of the box
// and clamped by the renderer when it draws.
export function panForCentroid(img, box, zoom, centroid) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(box.w / iw, box.h / ih) * zoom;
  return {
    panX: (iw * s * (0.5 - centroid.fx)) / box.w,
    panY: (ih * s * (0.5 - centroid.fy)) / box.h,
  };
}
