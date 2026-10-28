import * as THREE from 'three';

/* Pembantu kecil untuk arena 3D (pengganti lib/tex.js pada proyek referensi). */

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const rand = (a, b) => a + Math.random() * (b - a);

/** smoothstep: 0 di bawah a, 1 di atas b. */
export function smooth(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Peredaman eksponensial (tidak bergantung frame rate). */
export const damp = (cur, target, lambda, dt) => THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

/** Tekstur dari canvas. opts.repeat = [x, y] untuk ubin berulang. */
export function canvasTexture(w, h, draw, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.anisotropy = 4;
  return tex;
}

/** Titik lembut berpendar (untuk partikel, awan, sinar). rgb = '255,255,255'. */
const dotCache = new Map();
export function softDotTexture(rgb = '255,255,255') {
  if (dotCache.has(rgb)) return dotCache.get(rgb);
  const tex = canvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(0.35, `rgba(${rgb},0.55)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  dotCache.set(rgb, tex);
  return tex;
}