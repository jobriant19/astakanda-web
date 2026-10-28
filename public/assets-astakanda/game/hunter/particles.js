import * as THREE from 'three';
import { softDotTexture } from './lib.js';

/** Sistem partikel sederhana (percikan, ledakan kecil) berbasis THREE.Points. */
export class Particles {
  constructor(scene, count = 360) {
    this.N = count;
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.base = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    this.max = new Float32Array(count).fill(1);
    this.next = 0;
    for (let i = 0; i < count; i++) this.pos[i * 3 + 1] = -999;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      map: softDotTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
  }

  burst(origin, hex = 0xffd23f, n = 16, speed = 3.2, life = 0.6) {
    const c = new THREE.Color(hex);
    for (let k = 0; k < n; k++) {
      const i = this.next++ % this.N;
      const a = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const s = Math.sqrt(1 - u * u);
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.pos.set([origin.x, origin.y, origin.z], i * 3);
      this.vel.set([Math.cos(a) * s * sp, u * sp + 0.6, Math.sin(a) * s * sp], i * 3);
      this.base.set([c.r, c.g, c.b], i * 3);
      this.col.set([c.r, c.g, c.b], i * 3);
      this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.7);
    }
  }

  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.pos[i3 + 1] = -999;
        this.col[i3] = this.col[i3 + 1] = this.col[i3 + 2] = 0;
        continue;
      }
      this.vel[i3 + 1] -= 7 * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const f = this.life[i] / this.max[i];
      this.col[i3] = this.base[i3] * f;
      this.col[i3 + 1] = this.base[i3 + 1] * f;
      this.col[i3 + 2] = this.base[i3 + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}