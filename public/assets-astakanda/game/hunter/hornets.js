import * as THREE from 'three';
import { softDotTexture, rand, damp } from './lib.js';
import { ReliefModel, loadRelief } from './relief.js';

/* Hornet Hunter — hornet RELIEF 3D dari hornet-3d.{webp,json} (sama persis dengan Hornet Attack): sayap, lengan,
   cakar, asap, kepala & perut bergerak sendiri-sendiri. Bila file hornet-3d tidak ditemukan, dipakai cadangan
   sederhana dari hornet.png (bidang yang ditonjolkan sesuai siluet). */
const RELIEF_HEIGHT = 1.75; // tinggi hornet relief (meter), sama dengan referensi

const HORNET_H = 2.0; // tinggi hornet di dunia 3D (meter)
const DEPTH = 0.3;    // tebal relief

/* ════════════════ Aset: gambar + geometri relief (dibuat sekali, dipakai 5 hornet) ════════════════ */
function gambarCadangan() { // dipakai hanya bila hornet.png gagal dimuat
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd23f'; g.beginPath(); g.ellipse(128, 140, 84, 96, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1a1200';
  [100, 140, 180].forEach((y) => g.fillRect(52, y, 152, 16));
  g.fillStyle = '#e11d1d'; g.beginPath(); g.arc(96, 96, 10, 0, Math.PI * 2); g.arc(160, 96, 10, 0, Math.PI * 2); g.fill();
  return c;
}
function muatGambar(url) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(gambarCadangan());
    im.src = url;
  });
}
function blur(src, w, h, r) { // blur kotak terpisah (horizontal lalu vertikal)
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
      tmp[y * w + x] = s / n;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

export async function loadHornetAssets(url) {
  const relief = await loadRelief('hornet-3d', url.replace(/[^/]*$/, '')); // folder yang sama dengan hornet.png
  if (relief) return { relief };
  const img = await muatGambar(url);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const aspect = iw / ih;

  // peta tinggi = alpha gambar yang diburamkan (tengah badan paling menonjol, tepi landai)
  const cw = 96, ch = Math.max(24, Math.round(96 / aspect));
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cw, ch);
  const px = ctx.getImageData(0, 0, cw, ch).data;
  let a = new Float32Array(cw * ch);
  for (let i = 0; i < a.length; i++) a[i] = px[i * 4 + 3] / 255;
  a = blur(blur(a, cw, ch, 5), cw, ch, 4);

  const segX = 56, segY = Math.max(16, Math.round(56 / aspect));
  const geo = new THREE.PlaneGeometry(HORNET_H * aspect, HORNET_H, segX, segY);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (HORNET_H * aspect) + 0.5;
    const v = pos.getY(i) / HORNET_H + 0.5;
    const s = a[Math.min(ch - 1, Math.round((1 - v) * (ch - 1))) * cw + Math.min(cw - 1, Math.round(u * (cw - 1)))];
    const t = Math.min(1, Math.max(0, (s - 0.12) / 0.8));
    pos.setZ(i, t * t * (3 - 2 * t) * DEPTH);
  }
  geo.computeVertexNormals();

  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { geo, tex, aspect };
}

/* ════════════════ Label jawaban di atas hornet ════════════════ */
function makeLabel() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
  sprite.scale.set(1.9, 0.95, 1);
  sprite.renderOrder = 20;
  const draw = (text, mode) => {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 256, 128);
    if (mode !== 'hidden') {
      const fill = { normal: '#fff7df', active: '#ffe066', wrong: '#ff5d5d', right: '#3ddc84' }[mode] ?? '#fff7df';
      const ink = mode === 'normal' || mode === 'active' ? '#2a2216' : '#ffffff';
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.roundRect(14, 20, 228, 96, 30);
      ctx.fill();
      ctx.fillStyle = fill;
      ctx.strokeStyle = '#2a2216';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(10, 12, 228, 96, 30);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fs = 70; // kata panjang mengecil agar muat
      do {
        ctx.font = `800 ${fs}px "Segoe UI", system-ui, Arial, sans-serif`;
        fs -= 4;
      } while (ctx.measureText(String(text)).width > 196 && fs > 24);
      ctx.fillText(String(text), 124, 64);
    }
    tex.needsUpdate = true;
  };
  draw('', 'hidden');
  return { sprite, draw };
}

/* ════════════════ Satu hornet ════════════════ */
class Hornet {
  constructor(index, swarm) {
    this.i = index;
    this.swarm = swarm;
    this.state = 'flyin'; // flyin | hover | attack | dying | gone
    this.answer = null;
    this.active = false;
    this.t = 0;
    this.pulse = 0;
    this.group = new THREE.Group();
    this.pos = this.group.position;
    this.prev = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.fall = new THREE.Vector3();
    this.scale = 1;
    this.phase = Math.random() * 10;
    this.f = [rand(0.45, 0.9), rand(0.8, 1.4), rand(0.35, 0.8)];
    this.amp = [rand(0.6, 1.1), rand(0.35, 0.7), rand(0.5, 1.0)];
    this.anchor = new THREE.Vector3(THREE.MathUtils.lerp(-5.4, 5.4, index / 4) + rand(-0.3, 0.3), rand(1.9, 3.4), -rand(7.0, 9.2));

    const A = swarm.assets;
    this.angry = false;
    this.tick = index; // animasi relief diperbarui bergantian antar hornet (hemat CPU)
    if (A.relief) {
      this.rel = new ReliefModel(A.relief, { height: RELIEF_HEIGHT, profile: 'hornet' });
      this.root = this.rel.group;
      this.labelY = 1.42;
    } else {
      this.mat = new THREE.MeshStandardMaterial({ map: A.tex, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: A.tex, emissiveIntensity: 0.35 });
      this.root = new THREE.Mesh(A.geo, this.mat);
      this.labelY = HORNET_H * 0.5 + 0.55;
    }
    this.yawGroup = new THREE.Group();
    this.yawGroup.add(this.root);
    this.group.add(this.yawGroup);

    // Cahaya penanda hornet yang sedang dibidik
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture('255,224,102'), color: 0xffe066, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.glow.scale.set(3.6, 3.6, 1);
    this.glow.position.z = -0.2;
    this.glow.visible = false;
    this.group.add(this.glow);

    this.label = makeLabel();
    this.label.sprite.position.y = this.labelY;
    this.group.add(this.label.sprite);
    swarm.scene.add(this.group);
    this.respawn();
  }

  hoverTarget(t, out) {
    return out.set(
      this.anchor.x + Math.sin(t * this.f[0] + this.phase) * this.amp[0],
      this.anchor.y + Math.sin(t * this.f[1] + this.phase * 1.7) * this.amp[1],
      this.anchor.z + Math.sin(t * this.f[2] + this.phase * 0.6) * this.amp[2],
    );
  }

  respawn() {
    const n = this.swarm.nestPos;
    this.state = 'flyin';
    this.group.visible = true;
    this.scale = 1;
    this.group.scale.setScalar(1);
    this.pos.set(n.x + rand(-0.4, 0.4), n.y - 0.8, n.z + 1.6);
    this.prev.copy(this.pos);
    this.vel.set(0, 0, 0);
    this.fall.set(0, 0, 0);
    this.active = false;
    this.setTint(false);
    this.label.draw('', 'hidden');
    this.label.sprite.material.opacity = 1;
    this.answer = null;
    this.root.rotation.set(0, 0, 0);
  }

  update(dt, t, camPos) {
    this.t = t;
    const tmp = this.swarm._tmp;

    if (this.state === 'flyin' || this.state === 'hover') {
      this.hoverTarget(t, tmp);
      if (this.state === 'flyin') {
        this.pos.lerp(tmp, 1 - Math.exp(-this.swarm.flySpeed * dt));
        if (this.pos.distanceTo(tmp) < 0.5) this.state = 'hover';
      } else {
        this.pos.lerp(tmp, 1 - Math.exp(-7 * dt));
      }
    } else if (this.state === 'attack') {
      this.attackT += dt;
      tmp.copy(camPos);
      tmp.y -= 0.15;
      tmp.z -= 0.2;
      const dir = tmp.sub(this.pos);
      const d = dir.length();
      dir.normalize();
      this.pos.addScaledVector(dir, Math.min(d, (7 + this.attackT * 22) * dt));
      this.pos.x += Math.sin(t * 38) * 0.02;
      this.group.scale.setScalar(1 + Math.min(1.1, this.attackT * 0.8));
      if (d < 0.9) {
        this.state = 'gone';
        this.group.visible = false;
        this.swarm.cb.onSting?.(this);
        return;
      }
    } else if (this.state === 'dying') {
      this.fall.y -= 14 * dt;
      this.pos.addScaledVector(this.fall, dt);
      if (this.pos.y < 0.25) {
        this.pos.y = 0.25;
        this.fall.multiplyScalar(0.3);
        this.scale -= dt * 1.4;
        this.group.scale.setScalar(Math.max(0.001, this.scale));
        if (this.scale <= 0.02) { this.state = 'gone'; this.group.visible = false; return; }
      }
      this.root.rotation.z += this.spin * dt;
      this.root.rotation.x += this.spin * 0.4 * dt;
      this.label.sprite.material.opacity = Math.max(0, this.label.sprite.material.opacity - dt * 0.8);
    }

    if (dt > 0) this.vel.copy(this.pos).sub(this.prev).divideScalar(dt);
    this.prev.copy(this.pos);
    this.pulse = Math.max(0, this.pulse - dt * 5);

    // Menghadap pemain, bergoyang kiri-kanan sehingga relief terlihat bervolume
    const yaw = Math.atan2(camPos.x - this.pos.x, camPos.z - this.pos.z);
    this.yawGroup.rotation.y = yaw + (this.state === 'dying' ? 0 : Math.sin(t * 1.2 + this.phase) * (this.rel ? 0.34 : 0.14));
    if (this.state !== 'dying') {
      this.root.rotation.z = THREE.MathUtils.clamp(-this.vel.x * 0.05, -0.25, 0.25);
      this.root.rotation.x = this.state === 'attack' ? 0.35 : THREE.MathUtils.clamp(this.vel.y * 0.03, -0.15, 0.15);
    }
    const k = 1 + this.pulse * 0.1;
    if (this.rel) {
      this.root.scale.setScalar(k);
      this.tick += 1;
      if (this.tick % this.swarm.relStride === 0 || this.state === 'attack') {
        this.rel.update(t, { angry: this.angry ? 1 : 0, flinch: this.pulse, tint: this.pulse });
      }
    } else {
      const flap = this.state === 'dying' ? 1 : 1 + Math.sin(t * 16 + this.phase) * 0.03; // getaran sayap
      this.root.scale.set(k * (2 - flap), k * flap, k);
    }

    // Penanda hornet yang dibidik: cahaya berdenyut
    const g = this.active ? 0.45 + Math.sin(t * 6) * 0.2 : 0;
    this.glow.material.opacity = damp(this.glow.material.opacity, g, 12, dt);
    this.glow.visible = this.glow.material.opacity > 0.01;
    const ls = this.active ? 1.2 : 1;
    this.label.sprite.scale.set(1.9 * ls, 0.95 * ls, 1);
  }

  hide() { this.state = 'gone'; this.group.visible = false; this.active = false; }
  setAnswer(v) { this.answer = v; this.label.draw(v, 'normal'); }
  setLabelMode(mode) { if (this.answer !== null) this.label.draw(this.answer, mode); }
  setActive(on) {
    if (this.active === on) return;
    this.active = on;
    if (this.state !== 'dying' && this.state !== 'attack') this.setLabelMode(on ? 'active' : 'normal');
  }
  setTint(angry) {
    this.angry = angry;
    if (this.mat) this.mat.color.setRGB(1, angry ? 0.55 : 1, angry ? 0.55 : 1);
  }
  attack() { this.state = 'attack'; this.attackT = 0; this.active = false; this.setTint(true); this.setLabelMode('wrong'); }
  kill() {
    this.state = 'dying';
    this.active = false;
    this.fall.set(rand(-1.5, 1.5), rand(2.2, 3.4), rand(-0.6, 0.6));
    this.spin = rand(-9, 9);
    this.setLabelMode('right');
  }
}

/* ════════════════ Kawanan 5 hornet ════════════════ */
export class HornetSwarm {
  constructor(scene, nestPos, assets, callbacks = {}) {
    this.scene = scene;
    this.nestPos = nestPos;
    this.assets = assets;
    this.cb = callbacks;
    this.flySpeed = 1.6; // kecepatan terbang masuk (dinaikkan per gelombang)
    this.relStride = 2;  // animasi relief diperbarui tiap N frame per hornet (dinaikkan bila perangkat lambat)
    this._tmp = new THREE.Vector3();
    this.hornets = Array.from({ length: 5 }, (_, i) => new Hornet(i, this));
  }
  assign(options) {
    this.hornets.forEach((h, i) => { h.respawn(); h.setTint(false); h.setAnswer(options[i]); });
  }
  hideAll() { this.hornets.forEach((h) => h.hide()); }
  update(dt, t, camPos) {
    this.hornets.forEach((h) => { if (h.group.visible) h.update(dt, t, camPos); });
  }
}