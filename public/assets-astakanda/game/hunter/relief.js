import * as THREE from 'three';
import { softDotTexture } from './lib.js';

/* ════════════════════════════════════════════════════════════════
   Model relief 3D dari ilustrasi karakter
   ────────────────────────────────────────────────────────────────
   Ilustrasi asli (WebP) dijadikan jaring 3D yang "digelembungkan" (kedalaman
   dari jarak ke tepi) sehingga tampak 100% sama dengan gambar dari depan,
   tetapi tetap memiliki volume & paralaks. Peta region (sayap, lengan, cakar,
   asap, kepala, perut/daun) menggerakkan tiap bagian secara terpisah.
   Aset dibuat oleh tools: hornet-3d.{webp,json}, sawit-monster-3d.{webp,json}
   ════════════════════════════════════════════════════════════════ */

const b64 = (s) => {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < a.length; i++) a[i] = bin.charCodeAt(i);
  return a;
};

/** Memuat tekstur + peta region. Mengembalikan null bila gagal (pemanggil memakai cadangan). */
export async function loadRelief(name, base = '/assets/images/') {
  try {
    const [json, tex] = await Promise.all([
      fetch(`${base}${name}.json`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('json')))),
      new THREE.TextureLoader().loadAsync(`${base}${name}.webp`),
    ]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const layers = {};
    for (const [k, v] of Object.entries(json.layers)) layers[k] = b64(v);
    return { tex, cols: json.cols, rows: json.rows, aspect: json.aspect, layers, mask: b64(json.mask), maskW: json.maskW, maskH: json.maskH };
  } catch (e) {
    console.warn(`[JOSI PLAYS] model relief "${name}" tidak ditemukan → memakai cadangan.`, e.message);
    return null;
  }
}

export const PROFILES = {
  hornet: {
    depthScale: 0.17,
    layers: {
      wings: { kind: 'flap', pivot: [[0.36, 0.34], [0.64, 0.34]], amp: 0.2, freq: 30, z: 0.1, bias: -0.07 },
      arms: { kind: 'pulse', pivot: [[0.34, 0.47], [0.66, 0.47]], amp: 0.055, freq: 3.4, z: 0.07, bias: 0.05 },
      claws: { kind: 'swipe', pivot: [[0.22, 0.6], [0.78, 0.6]], amp: 0.14, freq: 2.2, z: 0.05, bias: 0.0 },
      smoke: { kind: 'wave', amp: 0.028, freq: 1.4, bias: -0.14 },
      head: { kind: 'sway', pivot: [[0.5, 0.62], [0.5, 0.62]], amp: 0.035, freq: 2.1, bias: 0.08 },
      belly: { kind: 'sway', pivot: [[0.5, 0.58], [0.5, 0.58]], amp: 0.07, freq: 1.8, bias: 0.0 },
    },
    eyes: [[0.405, 0.33], [0.583, 0.33]],
  },
  monster: {
    depthScale: 0.15,
    layers: {
      fronds: { kind: 'wave', amp: 0.012, freq: 1.7, bias: -0.04, up: true },
      arms: { kind: 'pulse', pivot: [[0.33, 0.43], [0.67, 0.43]], amp: 0.045, freq: 2.6, z: 0.08, bias: 0.06 },
      claws: { kind: 'swipe', pivot: [[0.16, 0.64], [0.84, 0.64]], amp: 0.12, freq: 2.0, z: 0.05, bias: 0.0 },
      smoke: { kind: 'wave', amp: 0.03, freq: 1.2, bias: -0.14 },
      head: { kind: 'sway', pivot: [[0.5, 0.6], [0.5, 0.6]], amp: 0.02, freq: 1.7, bias: 0.09 },
      belly: { kind: 'jiggle', pivot: [[0.5, 0.78], [0.5, 0.78]], amp: 0.02, freq: 4.0, bias: 0.05 },
    },
    eyes: [[0.43, 0.332], [0.556, 0.332]],
  },
};

export class ReliefModel {
  /**
   * @param {object} assets  hasil loadRelief()
   * @param {{height:number, profile:'hornet'|'monster'}} opts
   */
  constructor(assets, { height = 2, profile = 'hornet' } = {}) {
    this.assets = assets;
    this.prof = PROFILES[profile];
    this.H = height;
    this.W = height * assets.aspect;
    this.aspectRatio = assets.aspect;
    this.phase = Math.random() * 10;
    this.group = new THREE.Group();

    const { cols, rows } = assets;
    const nx = cols + 1;
    const n = nx * (rows + 1);
    this.n = n;
    const pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const col = new Float32Array(n * 3);
    this.bx = new Float32Array(n);
    this.by = new Float32Array(n);
    this.bz = new Float32Array(n);
    this.ux = new Float32Array(n);
    this.uy = new Float32Array(n);
    const depth = assets.layers.depth;
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const k = j * nx + i;
        const u = i / cols;
        const v = j / rows;
        const d = depth[k] / 255;
        this.ux[k] = u;
        this.uy[k] = v;
        this.bx[k] = (u - 0.5) * this.W;
        this.by[k] = (0.5 - v) * this.H;
        this.bz[k] = d * this.prof.depthScale * this.H;
        uv[k * 2] = u;
        uv[k * 2 + 1] = 1 - v;
        const shade = 0.82 + 0.18 * Math.min(1, d * 1.4); // tepi sedikit lebih gelap → kesan volume
        col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = shade;
      }
    }
    // indeks: hanya sel yang berisi piksel
    const alpha = assets.layers.alpha;
    const idx = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = j * nx + i;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        if (alpha[a] + alpha[b] + alpha[c] + alpha[d] < 40) continue;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(this.W, this.H) * 0.7);
    this.geo = geo;
    this.pos = pos;

    this.mat = new THREE.MeshBasicMaterial({ map: assets.tex, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.25, alphaToCoverage: true, fog: false });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);

    // daftar vertex aktif per layer
    this.act = {};
    for (const name of Object.keys(this.prof.layers)) {
      const w = assets.layers[name];
      const list = [];
      for (let k = 0; k < n; k++) if (w[k] > 3) list.push(k);
      this.act[name] = Int32Array.from(list);
    }

    // cahaya mata
    this.glows = [];
    const gt = softDotTexture('255,40,30');
    for (const [eu, ev] of this.prof.eyes) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.position.set((eu - 0.5) * this.W, (0.5 - ev) * this.H, this.prof.depthScale * this.H * 1.3);
      s.userData.base = this.H * 0.16;
      this.group.add(s);
      this.glows.push(s);
    }
    this.update(0, {});
  }

  /** Titik lokal (x,y) → koordinat uv gambar (0..1). */
  uvFromLocal(x, y) {
    return [x / this.W + 0.5, 0.5 - y / this.H];
  }
  /** Apakah piksel gambar pada (u,v) solid (bukan transparan)? */
  solidAt(u, v) {
    if (u < 0 || v < 0 || u > 1 || v > 1) return false;
    const { mask, maskW, maskH } = this.assets;
    const x = Math.min(maskW - 1, Math.floor(u * maskW));
    const y = Math.min(maskH - 1, Math.floor(v * maskH));
    return mask[y * maskW + x] === 1;
  }

  /**
   * Animasi CPU per-vertex.
   * @param {number} t   waktu (detik)
   * @param {{angry?:number, flinch?:number, telegraph?:number, tint?:number}} o
   */
  update(t, o = {}) {
    const { angry = 0, flinch = 0, telegraph = 0, tint = 0 } = o;
    const { W, H, bx, by, bz, ux, uy, pos } = this;
    const ph = this.phase;
    const fm = 1 + angry * 0.6; // frekuensi
    const am = 1 + angry * 0.7 + flinch * 0.6; // amplitudo
    const br = 1 + Math.sin(t * 1.6 + ph) * 0.012 + flinch * 0.03;
    const depthK = this.prof.depthScale * H;

    // dasar: napas + kedalaman
    for (let k = 0; k < this.n; k++) {
      pos[k * 3] = bx[k] * br;
      pos[k * 3 + 1] = by[k] * br;
      pos[k * 3 + 2] = bz[k];
    }

    for (const [name, L] of Object.entries(this.prof.layers)) {
      const w = this.assets.layers[name];
      const list = this.act[name];
      const f = L.freq * fm;
      const amp = L.amp * am;
      for (let q = 0; q < list.length; q++) {
        const k = list[q];
        const wt = w[k] / 255;
        const side = ux[k] < 0.5 ? 0 : 1;
        const sgn = side === 0 ? -1 : 1;
        let x = pos[k * 3];
        let y = pos[k * 3 + 1];
        let z = pos[k * 3 + 2] + L.bias * H * wt;
        if (L.pivot) {
          const px = (L.pivot[side][0] - 0.5) * W;
          const py = (0.5 - L.pivot[side][1]) * H;
          const dx = x - px;
          const dy = y - py;
          const dist = Math.hypot(dx, dy) / H;
          let a = 0;
          if (L.kind === 'flap') {
            a = Math.sin(t * f + ph + dist * 3) * amp * sgn;
            z += Math.sin(t * f + ph + dist * 4) * L.z * H * wt * Math.min(1, dist * 2.2);
          } else if (L.kind === 'pulse') {
            const s = 1 + (Math.sin(t * f + ph + side * 1.3) * amp + telegraph * 0.06) * wt;
            x = px + dx * s;
            y = py + dy * s + telegraph * 0.07 * H * wt;
            z += (Math.sin(t * f + ph + side * 1.3) * 0.5 + 0.5) * L.z * H * wt;
            a = Math.sin(t * f * 0.5 + ph) * amp * 0.3 * sgn;
          } else if (L.kind === 'swipe') {
            a = Math.sin(t * f + ph + side * 2) * amp * sgn * 0.8;
            z += Math.sin(t * f + ph + side * 2) * L.z * H * wt;
          } else if (L.kind === 'sway') {
            a = Math.sin(t * f + ph) * amp;
          } else if (L.kind === 'jiggle') {
            const s = 1 + Math.sin(t * f + ph + dist * 9) * amp * (1 + telegraph * 2);
            x = px + dx * s;
            y = py + dy * s;
          }
          if (a !== 0) {
            const aa = a * wt;
            const c = Math.cos(aa);
            const s2 = Math.sin(aa);
            const rx = x - px;
            const ry = y - py;
            x = px + rx * c - ry * s2;
            y = py + rx * s2 + ry * c;
          }
        } else if (L.kind === 'wave') {
          const yy = uy[k];
          x += Math.sin(t * f + yy * 7 + ph + ux[k] * 3) * amp * H * wt;
          y += Math.cos(t * f * 0.8 + ux[k] * 6 + ph) * amp * 0.7 * H * wt * (L.up ? 0.5 : 1);
        }
        pos[k * 3] = x;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = z;
      }
    }
    this.geo.attributes.position.needsUpdate = true;

    // cahaya mata berdenyut
    const gl = this.glows.length ? this.glows[0].userData.base * (1 + angry * 0.5 + telegraph * 0.7) * (1 + Math.sin(t * 9 + ph) * 0.12) : 0;
    for (const g of this.glows) {
      g.scale.set(gl, gl, 1);
      g.material.opacity = 0.55 + angry * 0.3 + telegraph * 0.3;
    }
    // kilatan merah saat terkena
    const r = 1;
    const gb = 1 - Math.min(0.75, tint * 0.75 + flinch * 0.4);
    this.mat.color.setRGB(r, gb, gb);
  }
}