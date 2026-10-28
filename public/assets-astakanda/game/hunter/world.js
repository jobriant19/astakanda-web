import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, softDotTexture, clamp, smooth } from './lib.js';

/* ════════════════════════════════════════════════════════════════
   Dunia Hornet Attack v2
   Terrain berbukit • hutan pinus & ek • batu berlumut • semak • jamur • bunga
   • rumput bergoyang • pagar • papan peringatan • kupu-kupu • sarang hornet
   ════════════════════════════════════════════════════════════════ */

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tinggi tanah: datar di area bermain, berbukit di kejauhan. */
export function heightAt(x, z) {
  const d = Math.hypot(x, z + 8);
  const flat = smooth(15, 42, d);
  const n = Math.sin(x * 0.045) * Math.cos(z * 0.04) * 4.2 + Math.sin(x * 0.11 + z * 0.07) * 1.5 + Math.cos(z * 0.09 - x * 0.05) * 1.1;
  return n * flat + smooth(55, 125, d) * 20;
}
const pathX = (z) => Math.sin(z * 0.09) * 3.5 - 3.2;
const pathMask = (x, z) => (z < 8 && z > -52 ? 1 - smooth(0.9, 2.5, Math.abs(x - pathX(z))) : 0);

const hash3 = (x, y, z) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
};

/** Geser vertex secara deterministik (sambungan antar-vertex tetap menyatu). */
function jitter(geo, amt) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    p.setXYZ(i, x + (hash3(x, y, z) - 0.5) * amt, y + (hash3(y, z, x) - 0.5) * amt, z + (hash3(z, x, y) - 0.5) * amt);
  }
  return geo;
}
function paint(geo, fn) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    fn(c, p.getX(i), p.getY(i), p.getZ(i), i);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const lerpColor = (c, a, b, t) => c.setRGB(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

export function createWorld(scene) {
  const rng = mulberry32(20261011);
  const R = (a, b) => a + rng() * (b - a);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s3 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const uTime = { value: 0 };

  scene.background = new THREE.Color(0xbfe3ff);
  scene.fog = new THREE.Fog(0xcfe6f7, 32, 160);

  /* ── Cahaya + bayangan ─────────────────────────────────────────── */
  scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5c7f3a, 1.45));
  const sun = new THREE.DirectionalLight(0xfff0c8, 2.8);
  sun.position.set(16, 30, 12);
  sun.target.position.set(0, 0, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 26, bottom: -26, near: 1, far: 90 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  /* ── Langit, awan, matahari samar ──────────────────────────────── */
  const skyTex = canvasTexture(8, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2f86f0');
    g.addColorStop(0.42, '#82c4ff');
    g.addColorStop(0.5, '#e7f6ff');
    g.addColorStop(1, '#e7f6ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })));

  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture('255,236,180'), transparent: true, opacity: 0.55, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(150, 150, 1);
  glow.position.set(70, 95, -230);
  scene.add(glow);

  const cloudTex = softDotTexture('255,255,255');
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const cx = R(-170, 170);
    const cy = R(48, 90);
    const cz = R(-200, -50);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: R(0.5, 0.85), fog: false, depthWrite: false }));
      const sc = R(34, 70);
      sp.scale.set(sc, sc * 0.5, 1);
      sp.position.set(cx + R(-26, 26), cy + R(-3, 4), cz);
      scene.add(sp);
      clouds.push(sp);
    }
  }

  /* ── Pegunungan jauh ───────────────────────────────────────────── */
  const MT = 22;
  const mtGeo = jitter(new THREE.ConeGeometry(1, 1, 7, 1), 0.12);
  const mountains = new THREE.InstancedMesh(mtGeo, new THREE.MeshStandardMaterial({ color: 0x8da4c4, flatShading: true, roughness: 1 }), MT);
  const caps = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7, 1), new THREE.MeshStandardMaterial({ color: 0xf4f8ff, flatShading: true, roughness: 0.9 }), MT);
  for (let i = 0; i < MT; i++) {
    const a = R(-1.4, 1.4);
    const dist = R(185, 240);
    const w = R(40, 70);
    const h = R(40, 85);
    const x = Math.sin(a) * dist;
    const z = -Math.cos(a) * dist;
    mountains.setMatrixAt(i, m4.compose(v.set(x, h / 2 - 4, z), q.setFromAxisAngle(UP, R(0, 6)), s3.set(w, h, w)));
    mountains.setColorAt(i, new THREE.Color().setHSL(0.6, 0.25, R(0.5, 0.62)));
    caps.setMatrixAt(i, m4.compose(v.set(x, h - 4 - h * 0.14, z), q.identity(), s3.set(w * 0.3, h * 0.3, w * 0.3)));
  }
  scene.add(mountains, caps);

  /* ── Tanah (berbukit + jalan setapak) ──────────────────────────── */
  const groundTex = canvasTexture(
    512,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#e9e9e9';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const g = 150 + Math.random() * 100;
        ctx.fillStyle = `rgba(${g * 0.8},${g},${g * 0.7},${0.18 + Math.random() * 0.3})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 6);
      }
    },
    { repeat: [70, 70] },
  );
  const gGeo = new THREE.PlaneGeometry(320, 320, 128, 128);
  gGeo.rotateX(-Math.PI / 2);
  {
    const p = gGeo.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const hill = new THREE.Color(0.42, 0.5, 0.36);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = heightAt(x, z);
      p.setY(i, y);
      const n = clamp((Math.sin(x * 0.21) * Math.cos(z * 0.19) + Math.sin(x * 0.07 + z * 0.11)) * 0.25 + 0.5, 0, 1);
      lerpColor(c, [0.42, 0.66, 0.22], [0.3, 0.55, 0.18], n);
      c.lerp(new THREE.Color(0.56, 0.43, 0.27), pathMask(x, z) * 0.92);
      if (y > 5) c.lerp(hill, smooth(5, 16, y));
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    gGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ map: groundTex, vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true;
  scene.add(ground);

  /* ── Penempatan acak yang menghindari area bermain & jalan ─────── */
  const spot = (rule, tries = 60) => {
    for (let i = 0; i < tries; i++) {
      const x = R(-70, 70);
      const z = R(-90, 6);
      if (rule(x, z) && pathMask(x, z) < 0.05) return [x, z];
    }
    return [R(20, 40), -R(30, 60)];
  };
  const place = (mesh, i, x, z, s, yaw = R(0, 6.28), yoff = 0, sy = s) => {
    mesh.setMatrixAt(i, m4.compose(v.set(x, heightAt(x, z) + yoff, z), q.setFromAxisAngle(UP, yaw), s3.set(s, sy, s)));
  };
  const tint = (mesh, i, lo = 0.82, hi = 1.12) => {
    const t = R(lo, hi);
    mesh.setColorAt(i, new THREE.Color(t, t * R(0.96, 1.04), t * R(0.94, 1.02)));
  };
  const matV = (extra = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, ...extra });
  const shadowOn = (m, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  /* ── Pohon pinus (4 tingkat) ───────────────────────────────────── */
  const tiers = [[2.8, 3.3, 2.3], [2.3, 3.0, 3.9], [1.8, 2.7, 5.3], [1.15, 2.4, 6.7]];
  const pineParts = tiers.map(([r, h, yc]) => {
    const g = jitter(new THREE.ConeGeometry(r, h, 9, 2), 0.16).translate(0, yc, 0);
    return paint(g, (c, x, y) => lerpColor(c, [0.07, 0.25, 0.12], [0.2, 0.5, 0.22], clamp((y - yc + h / 2) / h, 0, 1)));
  });
  const pineGeo = mergeGeometries(pineParts);
  const trunkGeo = paint(new THREE.CylinderGeometry(0.26, 0.46, 3.6, 8).translate(0, 1.8, 0), (c, x, y) => lerpColor(c, [0.28, 0.18, 0.1], [0.38, 0.26, 0.14], y / 3.6));
  const PINES = 70;
  const pines = shadowOn(new THREE.InstancedMesh(pineGeo, matV(), PINES));
  const pTrunks = shadowOn(new THREE.InstancedMesh(trunkGeo, matV(), PINES));
  for (let i = 0; i < PINES; i++) {
    const [x, z] = spot((a, b) => (Math.abs(a) > 9 || b < -17) && Math.hypot(a + 9, b + 24) > 7);
    const s = R(0.9, 2.1);
    const yaw = R(0, 6.28);
    place(pines, i, x, z, s, yaw);
    place(pTrunks, i, x, z, s, yaw);
    tint(pines, i);
    tint(pTrunks, i, 0.9, 1.1);
  }

  /* ── Pohon ek (kanopi bulat berlapis) ──────────────────────────── */
  const oakCanopy = mergeGeometries(
    [[0, 5.3, 0, 2.1], [1.5, 4.7, 0.6, 1.7], [-1.5, 4.8, -0.3, 1.8], [0.3, 6.3, -0.5, 1.7], [0.5, 4.5, -1.5, 1.6], [-0.7, 5.8, 1.2, 1.5]].map(([x, y, z, r]) =>
      paint(jitter(new THREE.IcosahedronGeometry(r, 1), 0.38).translate(x, y, z), (c, px, py) => lerpColor(c, [0.16, 0.4, 0.12], [0.42, 0.74, 0.22], clamp((py - y + r) / (2 * r), 0, 1))),
    ),
  );
  const oakTrunkGeo = paint(new THREE.CylinderGeometry(0.34, 0.6, 4.4, 8).translate(0, 2.2, 0), (c, x, y) => lerpColor(c, [0.3, 0.2, 0.11], [0.42, 0.3, 0.17], y / 4.4));
  const OAKS = 26;
  const oaks = shadowOn(new THREE.InstancedMesh(oakCanopy, matV(), OAKS));
  const oTrunks = shadowOn(new THREE.InstancedMesh(oakTrunkGeo, matV(), OAKS));
  for (let i = 0; i < OAKS; i++) {
    const [x, z] = spot((a, b) => (Math.abs(a) > 10 || b < -18) && Math.hypot(a + 9, b + 24) > 8);
    const s = R(0.9, 1.7);
    const yaw = R(0, 6.28);
    place(oaks, i, x, z, s, yaw);
    place(oTrunks, i, x, z, s, yaw);
    tint(oaks, i, 0.8, 1.2);
  }

  /* ── Batu berlumut ─────────────────────────────────────────────── */
  const rockGeo = jitter(new THREE.DodecahedronGeometry(1, 0), 0.5);
  rockGeo.computeVertexNormals();
  {
    const n = rockGeo.attributes.normal;
    paint(rockGeo, (c, x, y, z, i) => {
      const moss = smooth(0.35, 0.8, n.getY(i));
      lerpColor(c, [0.5, 0.5, 0.53], [0.3, 0.5, 0.22], moss);
    });
  }
  const ROCKS = 46;
  const rocks = shadowOn(new THREE.InstancedMesh(rockGeo, matV(), ROCKS));
  for (let i = 0; i < ROCKS; i++) {
    const [x, z] = spot((a, b) => b < 4 && (Math.abs(a) > 4 || b < -14));
    const s = R(0.25, 1.4);
    place(rocks, i, x, z, s, R(0, 6.28), s * 0.2, s * R(0.6, 1));
    tint(rocks, i, 0.8, 1.15);
  }

  /* ── Semak ─────────────────────────────────────────────────────── */
  const bushGeo = mergeGeometries(
    [[0, 0.5, 0, 0.7], [0.55, 0.4, 0.2, 0.55], [-0.5, 0.42, -0.15, 0.6], [0.1, 0.9, -0.1, 0.45]].map(([x, y, z, r]) =>
      paint(jitter(new THREE.IcosahedronGeometry(r, 1), 0.2).translate(x, y, z), (c, px, py) => lerpColor(c, [0.1, 0.32, 0.1], [0.3, 0.6, 0.2], clamp(py / 1.4, 0, 1))),
    ),
  );
  const BUSH = 42;
  const bushes = shadowOn(new THREE.InstancedMesh(bushGeo, matV(), BUSH));
  for (let i = 0; i < BUSH; i++) {
    const [x, z] = spot((a, b) => b < 4 && (Math.abs(a) > 5 || b < -15));
    place(bushes, i, x, z, R(0.8, 1.7));
    tint(bushes, i);
  }

  /* ── Jamur ─────────────────────────────────────────────────────── */
  const MUSH = 30;
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.032, 0.1, 8).translate(0, 0.05, 0), new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: 0.8 }), MUSH);
  const mcaps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.095, 0), new THREE.MeshStandardMaterial({ roughness: 0.55 }), MUSH);
  const capCols = [0xe53935, 0xff7043, 0xe53935, 0xf9a825];
  for (let i = 0; i < MUSH; i++) {
    const [x, z] = spot((a, b) => b < 0 && (Math.abs(a) > 5 || b < -12));
    const s = R(0.7, 2.0);
    place(stems, i, x, z, s);
    place(mcaps, i, x, z, s);
    mcaps.setColorAt(i, new THREE.Color(capCols[i % capCols.length]));
  }
  scene.add(stems, mcaps);

    /* ── Bunga: 3 jenis (aster, poppy, lavender), berkelompok & bergoyang ── */
  const rngF = mulberry32(8137);
  const RF = (a, b) => a + rngF() * (b - a);
  const bendY = (geo, fn) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + fn(p.getX(i)));
    return geo;
  };
  const flowerWind = (mat) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float sw = sin(uTime * 1.7 + instanceMatrix[3].x * 0.55 + instanceMatrix[3].z * 0.4) * 0.2 * position.y;
         transformed.x += sw;
         transformed.z += sw * 0.5;`,
      );
    };
    return mat;
  };
  const stemCurve = (H, bend) =>
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(bend * 0.15, H * 0.35, bend * 0.1), new THREE.Vector3(bend * 0.6, H * 0.72, -bend * 0.1), new THREE.Vector3(bend, H, 0)]);
  const stemGeo = (curve, r) => paint(new THREE.TubeGeometry(curve, 8, r, 5, false), (c, x, y) => lerpColor(c, [0.16, 0.38, 0.1], [0.34, 0.62, 0.2], clamp(y / 0.45, 0, 1)));
  const leafGeo = (yaw, y, len, wid) => {
    const g = new THREE.SphereGeometry(1, 6, 3).scale(len, 0.004, wid).translate(len, 0, 0);
    bendY(g, (x) => {
      const u = x / (2 * len);
      return len * (0.9 * u - 1.3 * u * u);
    });
    g.rotateY(yaw).translate(0, y, 0);
    return paint(g, (c, x, py, z) => lerpColor(c, [0.14, 0.36, 0.1], [0.32, 0.6, 0.2], clamp(Math.hypot(x, z) / (len * 2), 0, 1)));
  };
  const petalGeo = (len, wid, cup, tilt, yaw, y, base = [0.8, 0.78, 0.72], gap = 0.014) => {
    const g = new THREE.SphereGeometry(1, 6, 3).scale(len, 0.0035, wid).translate(len + gap, 0, 0);
    bendY(g, (x) => cup * x * x);
    g.rotateZ(tilt).rotateY(yaw).translate(0, y, 0);
    return paint(g, (c, x, py, z) => lerpColor(c, base, [1, 1, 1], smooth(0.05, 0.5, clamp(Math.hypot(x, z) / (len * 2 + gap), 0, 1))));
  };
  const ring = (n, len, wid, cup, tilt, y, off = 0, base, gap) =>
    Array.from({ length: n }, (_, i) => petalGeo(len, wid, cup, tilt + RF(-0.06, 0.06), (i / n) * Math.PI * 2 + off + RF(-0.08, 0.08), y, base, gap));

  const buildDaisy = () => {
    const curve = stemCurve(0.36, 0.05);
    const top = curve.getPoint(1);
    const stem = mergeGeometries([stemGeo(curve, 0.0065), leafGeo(0.6, 0.03, 0.06, 0.014), leafGeo(3.5, 0.075, 0.05, 0.012)]);
    const petals = mergeGeometries([...ring(13, 0.05, 0.0105, -1.2, 0.2, 0, 0), ...ring(13, 0.044, 0.0105, -1.2, 0.1, -0.004, Math.PI / 13)].map((g) => g.translate(top.x, top.y, top.z)));
    const center = paint(new THREE.SphereGeometry(0.021, 10, 6).scale(1, 0.6, 1), (c, x, y) => lerpColor(c, [0.8, 0.45, 0.03], [1, 0.8, 0.12], clamp((y + 0.005) / 0.016, 0, 1))).translate(top.x, top.y + 0.004, top.z);
    return { stem, petals, center };
  };
  const buildPoppy = () => {
    const curve = stemCurve(0.3, 0.09);
    const top = curve.getPoint(1);
    const stem = mergeGeometries([stemGeo(curve, 0.0055), leafGeo(0.2, 0.03, 0.05, 0.012), leafGeo(3.0, 0.06, 0.04, 0.01)]);
    const dark = [0.12, 0.05, 0.05];
    const petals = mergeGeometries([...ring(5, 0.05, 0.045, 6, 0.45, 0, 0, dark, 0.004), ...ring(5, 0.042, 0.04, 8, 0.7, 0.004, Math.PI / 5, dark, 0.003)].map((g) => g.translate(top.x, top.y, top.z)));
    const parts = [paint(new THREE.SphereGeometry(0.011, 8, 5).scale(1, 0.8, 1).translate(0, 0.006, 0), (c) => c.setRGB(0.4, 0.5, 0.18))];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.CylinderGeometry(0.0012, 0.0012, 0.026, 3).translate(0, 0.013, 0).rotateZ(-0.5).translate(0.006, 0, 0).rotateY((i / 16) * Math.PI * 2);
      parts.push(paint(g, (c, x, y) => lerpColor(c, [0.1, 0.04, 0.12], [0.9, 0.75, 0.2], clamp(y / 0.022, 0, 1))));
    }
    const center = mergeGeometries(parts).translate(top.x, top.y + 0.003, top.z);
    return { stem, petals, center };
  };
  const buildLavender = () => {
    const curve = stemCurve(0.44, 0.07);
    const top = curve.getPoint(1);
    const stem = mergeGeometries([stemGeo(curve, 0.0045), leafGeo(0.5, 0.02, 0.07, 0.006), leafGeo(2.2, 0.03, 0.065, 0.006), leafGeo(4.0, 0.025, 0.06, 0.006)]);
    const N = 14;
    const buds = [];
    for (let k = 0; k < N; k++) {
      const p = curve.getPoint(0.55 + (0.45 * k) / (N - 1));
      const sz = 1 - (k / N) * 0.35;
      const shade = 0.75 + 0.25 * (k / N);
      for (const side of [0, Math.PI]) {
        const g = new THREE.SphereGeometry(1, 5, 3).scale(0.0085 * sz, 0.015 * sz, 0.0085 * sz).translate(0.011 * sz, 0.007, 0).rotateY(k * 2.4 + side).translate(p.x, p.y, p.z);
        buds.push(paint(g, (c) => c.setRGB(shade, shade, shade)));
      }
    }
    const petals = mergeGeometries(buds);
    const center = paint(new THREE.SphereGeometry(0.0065, 5, 3).scale(1, 1.8, 1), (c) => c.setRGB(0.55, 0.5, 0.85)).translate(top.x, top.y + 0.008, top.z);
    return { stem, petals, center };
  };

  const flStemMat = flowerWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
  const flPetalMat = flowerWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }));
  const flCoreMat = flowerWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
  const flPatches = Array.from({ length: 18 }, () => {
    let x;
    let z;
    do {
      x = RF(-26, 26);
      z = RF(-34, 4);
    } while (pathMask(x, z) > 0.2);
    return { x, z, r: RF(1.6, 4.2), ci: Math.floor(RF(0, 4)) };
  });
  const flowerSpot = () => {
    for (let k = 0; k < 20; k++) {
      let x;
      let z;
      let pc = null;
      if (rngF() < 0.8) {
        pc = flPatches[Math.floor(rngF() * flPatches.length)];
        const a = RF(0, 6.283);
        const d = pc.r * Math.sqrt(rngF());
        x = pc.x + Math.cos(a) * d;
        z = pc.z + Math.sin(a) * d;
      } else {
        x = RF(-26, 26);
        z = RF(-34, 4);
      }
      if (z < 5 && Math.abs(x) < 30 && pathMask(x, z) < 0.2) return { x, z, pc };
    }
    return { x: RF(8, 20), z: RF(-30, -8), pc: null };
  };
  const flowerKinds = [
    { build: buildDaisy, count: 150, s: [0.7, 1.35], pal: [0xffffff, 0xffffff, 0xffc0d6, 0xd2b4ff, 0xffe066] },
    { build: buildPoppy, count: 100, s: [0.7, 1.3], pal: [0xe53935, 0xff7a1a, 0xff4081, 0xffc400] },
    { build: buildLavender, count: 90, s: [0.7, 1.4], pal: [0x8c6bff, 0xb388ff, 0x6a7bff, 0xd68cff] },
  ];
  const flEuler = new THREE.Euler();
  const flCol = new THREE.Color();
  flowerKinds.forEach((kind, ki) => {
    const parts = kind.build();
    const mStem = new THREE.InstancedMesh(parts.stem, flStemMat, kind.count);
    const mPet = new THREE.InstancedMesh(parts.petals, flPetalMat, kind.count);
    const mCen = new THREE.InstancedMesh(parts.center, flCoreMat, kind.count);
    for (let i = 0; i < kind.count; i++) {
      const { x, z, pc } = flowerSpot();
      const s = RF(kind.s[0], kind.s[1]);
      q.setFromEuler(flEuler.set(RF(-0.16, 0.16), RF(0, 6.28), RF(-0.16, 0.16), 'YXZ'));
      m4.compose(v.set(x, heightAt(x, z) - 0.01, z), q, s3.set(s, s * RF(0.9, 1.15), s));
      mStem.setMatrixAt(i, m4);
      mPet.setMatrixAt(i, m4);
      mCen.setMatrixAt(i, m4);
      const hex = kind.pal[(pc ? pc.ci + ki : Math.floor(RF(0, kind.pal.length))) % kind.pal.length];
      mPet.setColorAt(i, flCol.set(hex).multiplyScalar(RF(0.86, 1)));
    }
    scene.add(mStem, mPet, mCen);
  });

  /* ── Rumput realistis: rumpun helai melengkung, gradasi warna, angin ── */
  const grassClump = (() => {
    const pos = [];
    const nor = [];
    const col = [];
    const idx = [];
    const stops = [0, 0.38, 0.72, 1];
    const cBase = [0.05, 0.17, 0.04];
    const cMid = [0.17, 0.4, 0.09];
    const cTip = [0.42, 0.62, 0.16];
    for (let b = 0; b < 5; b++) {
      const yaw = RF(0, 6.283);
      const dx = Math.cos(yaw);
      const dz = Math.sin(yaw);
      const hf = RF(0.65, 1);
      const wf = RF(0.045, 0.07);
      const lean = RF(0.12, 0.5);
      const ox = RF(-0.07, 0.07);
      const oz = RF(-0.07, 0.07);
      const bv = RF(0.85, 1.1);
      const start = pos.length / 3;
      stops.forEach((t) => {
        const d = lean * t * t * hf;
        const cx = ox + dx * d;
        const cy = t * hf;
        const cz = oz + dz * d;
        const half = wf * (1 - 0.88 * t) * 0.5;
        const k = 2 * lean * t * hf;
        const nl = Math.hypot(dx * hf * 0.45, 0.9 + k * 0.3, dz * hf * 0.45);
        const n = [(-dx * hf * 0.45) / nl, (0.9 + k * 0.3) / nl, (-dz * hf * 0.45) / nl];
        const c = t < 0.38 ? lerpColor(new THREE.Color(), cBase, cMid, t / 0.38) : lerpColor(new THREE.Color(), cMid, cTip, (t - 0.38) / 0.62);
        const verts = t < 1 ? [-half, half] : [0];
        verts.forEach((s) => {
          pos.push(cx - dz * s, cy, cz + dx * s);
          nor.push(...n);
          col.push(c.r * bv, c.g * bv, c.b * bv);
        });
      });
      idx.push(start, start + 1, start + 2, start + 1, start + 3, start + 2, start + 2, start + 3, start + 4, start + 3, start + 5, start + 4, start + 4, start + 5, start + 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  })();
  const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float gph = uTime * 1.6 + instanceMatrix[3].x * 0.45 + instanceMatrix[3].z * 0.35;
       float gust = 0.6 + 0.8 * (0.5 + 0.5 * sin(uTime * 0.7 + instanceMatrix[3].x * 0.08 + instanceMatrix[3].z * 0.05));
       float gbend = position.y * position.y;
       float sway = (sin(gph) * 0.1 + sin(gph * 2.3 + (position.x + position.z) * 8.0) * 0.03) * gust * gbend;
       transformed.x += sway;
       transformed.z += sway * 0.45;`,
    );
  };
  const addGrass = (count, hLo, hHi, wLo, wHi, maxPath) => {
    const mesh = new THREE.InstancedMesh(grassClump, grassMat, count);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      let x;
      let z;
      let tries = 0;
      do {
        x = RF(-32, 32);
        z = RF(-44, 6);
        tries++;
      } while (pathMask(x, z) > maxPath && tries < 12);
      const onPath = pathMask(x, z) > maxPath;
      const h = RF(hLo, hHi);
      const w = RF(wLo, wHi);
      m4.compose(v.set(x, onPath ? -50 : heightAt(x, z) - 0.02, z), q.setFromAxisAngle(UP, RF(0, 6.28)), s3.set(w, h, w));
      mesh.setMatrixAt(i, m4);
      if (RF(0, 1) < 0.12) col.setRGB(RF(1.2, 1.45), RF(1, 1.15), RF(0.5, 0.7));
      else col.setRGB(RF(0.8, 1.1), RF(0.85, 1.15), RF(0.7, 1));
      mesh.setColorAt(i, col);
    }
    scene.add(mesh);
  };
  addGrass(1500, 0.55, 1.1, 0.9, 1.5, 0.5); // rumpun tinggi
  addGrass(3800, 0.14, 0.36, 0.8, 1.3, 0.55); // hamparan rumput pendek

  /* ── Pagar kayu ────────────────────────────────────────────────── */
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5d34, roughness: 0.9 });
  const POSTS = 22;
  const posts = shadowOn(new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.15, 0.14).translate(0, 0.575, 0), woodMat, POSTS));
  const rails = shadowOn(new THREE.InstancedMesh(new THREE.BoxGeometry(2.1, 0.1, 0.06), woodMat, POSTS * 2));
  let pi = 0;
  let ri = 0;
  for (const side of [-1, 1]) {
    for (let k = 0; k < 11; k++) {
      const x = side * (11 + k * 2.1);
      const z = -5.5 - Math.sin(k * 0.5) * 0.6;
      posts.setMatrixAt(pi++, m4.compose(v.set(x, heightAt(x, z), z), q.setFromAxisAngle(UP, R(-0.05, 0.05)), s3.set(1, R(0.9, 1.1), 1)));
      if (k < 10) {
        for (const yy of [0.45, 0.85]) {
          const cx = x + side * 1.05;
          rails.setMatrixAt(ri++, m4.compose(v.set(cx, heightAt(cx, z) + yy, z), q.setFromAxisAngle(UP, 0), s3.set(1, 1, 1)));
        }
      }
    }
  }
  rails.count = ri;

  /* ── Batang pohon tumbang ──────────────────────────────────────── */
  const logMat = new THREE.MeshStandardMaterial({ color: 0x6f4a2a, roughness: 1 });
  [[-11.5, -8.5, 0.5], [13, -12, -0.4]].forEach(([x, z, rot]) => {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 2.8, 12), logMat);
    log.rotation.set(0, rot, Math.PI / 2);
    log.position.set(x, heightAt(x, z) + 0.32, z);
    log.castShadow = true;
    log.receiveShadow = true;
    scene.add(log);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.33, 14), new THREE.MeshStandardMaterial({ color: 0xd2a56a, roughness: 0.8 }));
    ring.position.set(0, 1.401, 0);
    ring.rotation.x = -Math.PI / 2;
    log.add(ring);
  });

  /* ── Pohon sarang + sarang hornet bergantung ───────────────────── */
  const nestTreeX = -9.5;
  const nestTreeZ = -25;
  const nestPos = new THREE.Vector3(-6.4, 5.4, -24.2);
  {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.7, 1.1, 8, 10).translate(0, 4, 0), (c, x, y) => lerpColor(c, [0.26, 0.17, 0.1], [0.4, 0.28, 0.16], y / 8)), matV()));
    g.add(new THREE.Mesh(oakCanopy.clone().scale(1.35, 1.35, 1.35).translate(0, 2.2, 0), matV()));
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 3.6, 8).translate(0, 1.8, 0), logMat);
    branch.rotation.z = -Math.PI / 2 + 0.12;
    branch.position.set(0.5, 6.4, 0);
    g.add(branch);
    g.position.set(nestTreeX, heightAt(nestTreeX, nestTreeZ), nestTreeZ);
    g.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
    scene.add(g);

    const paper = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#cdb88e';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 110; i++) {
        ctx.strokeStyle = `rgba(${100 + Math.random() * 70},${85 + Math.random() * 50},${55 + Math.random() * 30},.45)`;
        ctx.lineWidth = 2 + Math.random() * 7;
        ctx.beginPath();
        const y = Math.random() * h;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.3, y + 24, w * 0.7, y - 24, w, y + 8);
        ctx.stroke();
      }
    });
    const nest = new THREE.Group();
    const layers = [[0.5, 0.35], [0.9, 0.5], [1.15, 0.6], [1.2, 0.62], [1.05, 0.55], [0.8, 0.45], [0.5, 0.35]];
    let ny = 0;
    layers.forEach(([r, hh], i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10), new THREE.MeshStandardMaterial({ map: paper, roughness: 1, color: new THREE.Color().setHSL(0.1, 0.25, 0.62 - i * 0.02) }));
      m.scale.y = hh / r;
      m.position.y = -ny;
      m.castShadow = true;
      nest.add(m);
      ny += hh * 0.75;
    });
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), new THREE.MeshBasicMaterial({ color: 0x1a120a }));
    hole.position.set(0.1, -ny + 0.3, 0.58);
    nest.add(hole);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), logMat);
    rope.position.y = 0.9;
    nest.add(rope);
    nest.position.copy(nestPos).add(new THREE.Vector3(0, 0.5, 0));
    scene.add(nest);
  }

    /* ── Kupu-kupu: 4 jenis, sayap depan + belakang, badan & antena ── */
  const wTex = (w, h, shapeFn, paintFn) =>
    canvasTexture(w, h, (ctx) => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      shapeFn(ctx, w, h);
      ctx.clip();
      paintFn(ctx, w, h);
      ctx.restore();
    });
  const foreShape = (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.5);
    ctx.bezierCurveTo(w * 0.25, h * 0.05, w * 0.7, 0, w * 0.99, h * 0.1);
    ctx.bezierCurveTo(w, h * 0.45, w * 0.92, h * 0.8, w * 0.7, h * 0.93);
    ctx.bezierCurveTo(w * 0.45, h * 0.98, w * 0.15, h * 0.8, w * 0.02, h * 0.62);
    ctx.closePath();
  };
  const hindShape = (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.12);
    ctx.bezierCurveTo(w * 0.3, 0, w * 0.75, h * 0.08, w * 0.95, h * 0.4);
    ctx.bezierCurveTo(w, h * 0.75, w * 0.7, h, w * 0.4, h * 0.95);
    ctx.bezierCurveTo(w * 0.15, h * 0.9, w * 0.02, h * 0.6, w * 0.02, h * 0.12);
    ctx.closePath();
  };
  const tailShape = (ctx, w, h) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.1);
    ctx.bezierCurveTo(w * 0.3, 0, w * 0.75, h * 0.05, w * 0.95, h * 0.35);
    ctx.bezierCurveTo(w, h * 0.6, w * 0.85, h * 0.72, w * 0.68, h * 0.78);
    ctx.lineTo(w * 0.62, h * 0.99);
    ctx.lineTo(w * 0.5, h * 0.98);
    ctx.lineTo(w * 0.48, h * 0.78);
    ctx.bezierCurveTo(w * 0.3, h * 0.8, w * 0.08, h * 0.6, w * 0.02, h * 0.1);
    ctx.closePath();
  };
  const bfGrad = (ctx, w, h, a, b) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  const bfVeins = (ctx, w, h, ox, oy, n, color, lw) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = -0.95 + (i / (n - 1)) * 1.9;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.cos(a) * w * 1.1, oy + Math.sin(a) * h * 1.1);
      ctx.stroke();
    }
  };
  const bfBorder = (ctx, w, h, shape, color, lw) => {
    shape(ctx, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  const bfDots = (ctx, w, h, pts, r, color) => {
    ctx.fillStyle = color;
    pts.forEach(([x, y, k = 1]) => {
      ctx.beginPath();
      ctx.arc(w * x, h * y, r * k, 0, 6.3);
      ctx.fill();
    });
  };
  const bfEye = (ctx, w, h, x, y, r, rings) => {
    rings.forEach(([k, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(w * x, h * y, r * k, 0, 6.3);
      ctx.fill();
    });
  };
  const bfKinds = [
    {
      // Monarch (oranye, urat hitam, titik putih)
      fore: wTex(256, 192, foreShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#f6a21e', '#e8590c');
        bfVeins(ctx, w, h, w * 0.04, h * 0.55, 8, '#1a0f08', 5);
        ctx.fillStyle = 'rgba(20,12,8,0.9)';
        ctx.beginPath();
        ctx.ellipse(w * 0.93, h * 0.2, w * 0.16, h * 0.32, 0.5, 0, 7);
        ctx.fill();
        bfBorder(ctx, w, h, foreShape, '#1a0f08', 30);
        bfDots(ctx, w, h, [[0.9, 0.45], [0.85, 0.6], [0.78, 0.75], [0.68, 0.86], [0.88, 0.14, 1.2], [0.95, 0.27], [0.8, 0.3, 1.3]], 5, '#fff7e0');
      }),
      hind: wTex(256, 192, hindShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#f6a21e', '#e8590c');
        bfVeins(ctx, w, h, w * 0.04, h * 0.2, 6, '#1a0f08', 5);
        bfBorder(ctx, w, h, hindShape, '#1a0f08', 26);
        bfDots(ctx, w, h, [[0.9, 0.45], [0.85, 0.62], [0.74, 0.8], [0.58, 0.9], [0.4, 0.92]], 5, '#fff7e0');
        bfDots(ctx, w, h, [[0.5, 0.45]], 7, '#1a0f08');
      }),
    },
    {
      // Swallowtail (kuning, belang hitam, bintik biru, ekor)
      fore: wTex(256, 192, foreShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#ffe14d', '#ffc61a');
        ctx.fillStyle = '#14100a';
        for (let k = 0; k < 4; k++) {
          const x0 = w * (0.15 + 0.17 * k);
          ctx.beginPath();
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 + 16, 0);
          ctx.lineTo(x0 - w * 0.1 + 16, h);
          ctx.lineTo(x0 - w * 0.1, h);
          ctx.fill();
        }
        bfBorder(ctx, w, h, foreShape, '#14100a', 44);
        bfDots(ctx, w, h, [[0.88, 0.3], [0.84, 0.46], [0.77, 0.62], [0.66, 0.75], [0.52, 0.82]], 5, '#ffe14d');
      }),
      hind: wTex(256, 192, tailShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#ffe14d', '#ffc61a');
        ctx.fillStyle = '#14100a';
        for (let k = 0; k < 2; k++) {
          const x0 = w * (0.2 + 0.2 * k);
          ctx.beginPath();
          ctx.moveTo(x0, 0);
          ctx.lineTo(x0 + 16, 0);
          ctx.lineTo(x0 - w * 0.08 + 16, h);
          ctx.lineTo(x0 - w * 0.08, h);
          ctx.fill();
        }
        bfBorder(ctx, w, h, tailShape, '#14100a', 40);
        bfDots(ctx, w, h, [[0.88, 0.3], [0.82, 0.48], [0.72, 0.62], [0.55, 0.7], [0.38, 0.7]], 6, '#3b8bff');
        bfEye(ctx, w, h, 0.72, 0.58, 12, [[1, '#14100a'], [0.75, '#ff8a1a'], [0.35, '#14100a']]);
      }),
    },
    {
      // Biru metalik dengan bintik mata (ocelli)
      fore: wTex(256, 192, foreShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#1b4fd8', '#59b8ff');
        bfVeins(ctx, w, h, w * 0.04, h * 0.55, 7, 'rgba(10,20,70,0.55)', 3);
        ctx.fillStyle = 'rgba(8,10,30,0.9)';
        ctx.beginPath();
        ctx.ellipse(w * 0.94, h * 0.18, w * 0.14, h * 0.3, 0.5, 0, 7);
        ctx.fill();
        bfBorder(ctx, w, h, foreShape, '#0b0f26', 36);
        bfDots(ctx, w, h, [[0.9, 0.4], [0.84, 0.58], [0.74, 0.74], [0.6, 0.84], [0.92, 0.2]], 4, '#e8f4ff');
      }),
      hind: wTex(256, 192, hindShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#1b4fd8', '#59b8ff');
        bfVeins(ctx, w, h, w * 0.04, h * 0.2, 6, 'rgba(10,20,70,0.55)', 3);
        bfBorder(ctx, w, h, hindShape, '#0b0f26', 30);
        bfEye(ctx, w, h, 0.68, 0.66, 14, [[1, '#0b0f26'], [0.7, '#ffe9a8'], [0.4, '#0b0f26']]);
        bfEye(ctx, w, h, 0.42, 0.78, 10, [[1, '#0b0f26'], [0.7, '#ffe9a8'], [0.4, '#0b0f26']]);
        bfDots(ctx, w, h, [[0.9, 0.48], [0.82, 0.74], [0.58, 0.92]], 4, '#e8f4ff');
      }),
    },
    {
      // Putih (ujung sayap hitam, dua bintik)
      fore: wTex(256, 192, foreShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#f2ecc0', '#fffef5');
        bfVeins(ctx, w, h, w * 0.04, h * 0.55, 7, 'rgba(90,90,80,0.35)', 2);
        ctx.fillStyle = 'rgba(30,28,24,0.88)';
        ctx.beginPath();
        ctx.ellipse(w * 0.93, h * 0.2, w * 0.17, h * 0.34, 0.5, 0, 7);
        ctx.fill();
        bfDots(ctx, w, h, [[0.55, 0.5, 2.4], [0.62, 0.78, 2]], 6, 'rgba(30,28,24,0.85)');
        bfBorder(ctx, w, h, foreShape, 'rgba(110,108,98,0.6)', 12);
      }),
      hind: wTex(256, 192, hindShape, (ctx, w, h) => {
        bfGrad(ctx, w, h, '#f0e6b0', '#fffdf0');
        bfVeins(ctx, w, h, w * 0.04, h * 0.2, 6, 'rgba(90,90,80,0.35)', 2);
        bfDots(ctx, w, h, [[0.85, 0.1, 1.4]], 6, 'rgba(30,28,24,0.8)');
        bfBorder(ctx, w, h, hindShape, 'rgba(110,108,98,0.6)', 12);
      }),
    },
  ].map((k) => {
    const mat = (map) => new THREE.MeshLambertMaterial({ map, alphaTest: 0.45, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.3 });
    return { foreMat: mat(k.fore), hindMat: mat(k.hind) };
  });
  const foreGeo = new THREE.PlaneGeometry(0.17, 0.12).rotateX(Math.PI / 2).translate(0.085, 0.0006, 0.005);
  const hindGeo = new THREE.PlaneGeometry(0.14, 0.12).rotateX(Math.PI / 2).translate(0.07, -0.0006, -0.05);
  const bfBody = mergeGeometries([
    paint(new THREE.SphereGeometry(1, 8, 6).scale(0.0042, 0.0042, 0.022).translate(0, 0, -0.02), (c) => c.setRGB(0.07, 0.05, 0.04)),
    paint(new THREE.SphereGeometry(1, 8, 6).scale(0.0055, 0.0055, 0.011).translate(0, 0, 0.008), (c) => c.setRGB(0.16, 0.11, 0.08)),
    paint(new THREE.SphereGeometry(1, 8, 6).scale(0.0048, 0.0048, 0.0048).translate(0, 0.0005, 0.0235), (c) => c.setRGB(0.07, 0.05, 0.04)),
    ...[-1, 1].flatMap((sd) => {
      const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(sd * 0.002, 0.002, 0.026), new THREE.Vector3(sd * 0.007, 0.009, 0.04), new THREE.Vector3(sd * 0.013, 0.014, 0.054)]);
      return [
        paint(new THREE.TubeGeometry(cv, 6, 0.0007, 4, false), (c) => c.setRGB(0.06, 0.04, 0.03)),
        paint(new THREE.SphereGeometry(0.0017, 5, 4).translate(sd * 0.013, 0.014, 0.054), (c) => c.setRGB(0.06, 0.04, 0.03)),
      ];
    }),
  ]);
  const bfBodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const butterflies = [];
  for (let i = 0; i < 12; i++) {
    const kind = bfKinds[i % bfKinds.length];
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    g.scale.setScalar(RF(1.1, 1.7));
    g.add(new THREE.Mesh(bfBody, bfBodyMat));
    const wing = (geo, mat, side, pz) => {
      const pv = new THREE.Group();
      pv.position.set(side * 0.004, 0, pz);
      const m = new THREE.Mesh(geo, mat);
      m.scale.x = side;
      pv.add(m);
      g.add(pv);
      return pv;
    };
    const fr = wing(foreGeo, kind.foreMat, 1, 0.01);
    const fl = wing(foreGeo, kind.foreMat, -1, 0.01);
    const hr = wing(hindGeo, kind.hindMat, 1, 0.004);
    const hl = wing(hindGeo, kind.hindMat, -1, 0.004);
    scene.add(g);
    butterflies.push({ g, fr, fl, hr, hl, cx: R(-14, 14), cy: R(0.9, 2.4), cz: R(-24, -3), a: R(0.6, 1.4), b: R(0.5, 1.2), ph: R(0, 6.28), sp: R(0.3, 0.7), fp: RF(0, 6.28), yaw: 0, bank: 0 });
  }

  /* ── Serbuk sari ───────────────────────────────────────────────── */
  const POLLEN = 150;
  const pg = new THREE.BufferGeometry();
  const ppos = new Float32Array(POLLEN * 3);
  const pseed = new Float32Array(POLLEN);
  for (let i = 0; i < POLLEN; i++) {
    ppos.set([R(-10, 10), R(0.4, 6), R(-16, 1)], i * 3);
    pseed[i] = R(0, 10);
  }
  pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
  const pollen = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: softDotTexture('255,240,180'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1b0 }));
  pollen.frustumCulled = false;
  scene.add(pollen);

  return {
    nestPos,
    heightAt,
    update(dt, t) {
      uTime.value = t;
      clouds.forEach((c, i) => {
        c.position.x += dt * (0.7 + (i % 4) * 0.25);
        if (c.position.x > 200) c.position.x = -200;
      });
      for (let i = 0; i < POLLEN; i++) {
        ppos[i * 3] += Math.sin(t * 0.6 + pseed[i]) * dt * 0.25;
        ppos[i * 3 + 1] += (0.12 + Math.sin(t + pseed[i]) * 0.08) * dt;
        if (ppos[i * 3 + 1] > 6.5) ppos[i * 3 + 1] = 0.4;
      }
      pg.attributes.position.needsUpdate = true;
      for (const b of butterflies) {
        const u = t * b.sp + b.ph;
        b.g.position.set(b.cx + Math.sin(u * b.a) * 4 + Math.sin(u * 3.7) * 0.5, b.cy + Math.sin(u * 2.1) * 0.35 + Math.sin(u * 5.3) * 0.12, b.cz + Math.cos(u * b.b) * 3 + Math.cos(u * 4.1) * 0.4);
        const vx = b.a * 4 * Math.cos(u * b.a) + 1.85 * Math.cos(u * 3.7);
        const vz = -b.b * 3 * Math.sin(u * b.b) - 1.64 * Math.sin(u * 4.1);
        const vy = 0.735 * Math.cos(u * 2.1) + 0.636 * Math.cos(u * 5.3);
        const yaw = Math.atan2(vx, vz);
        const dYaw = Math.atan2(Math.sin(yaw - b.yaw), Math.cos(yaw - b.yaw));
        b.yaw = yaw;
        b.bank += (clamp(-dYaw / Math.max(dt, 0.001) * 0.12, -0.5, 0.5) - b.bank) * Math.min(1, dt * 4);
        b.fp += dt * (11 + 8 * (0.5 + 0.5 * Math.sin(t * 0.8 + b.ph * 2)));
        const gl = clamp((Math.sin(t * 0.45 + b.ph * 3) - 0.8) * 5, 0, 1); // sesekali melayang
        const f1 = Math.sin(b.fp) + 0.22 * Math.sin(2 * b.fp);
        const f2 = Math.sin(b.fp - 0.45) + 0.22 * Math.sin(2 * b.fp - 0.9);
        const a1 = (0.45 + 0.8 * f1) * (1 - gl) + 0.55 * gl;
        const a2 = (0.45 + 0.8 * f2) * (1 - gl) + 0.45 * gl;
        b.fr.rotation.z = a1;
        b.fl.rotation.z = -a1;
        b.hr.rotation.z = a2;
        b.hl.rotation.z = -a2;
        b.g.position.y += f1 * 0.025 * (1 - gl);
        b.g.rotation.set(-Math.atan2(vy * 0.8, Math.hypot(vx, vz)) + Math.cos(b.fp) * 0.1 * (1 - gl), yaw, b.bank);
      }
    },
  };
}