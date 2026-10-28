import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTexture, damp, smooth, softDotTexture } from './lib.js';

/* ════════════════════════════════════════════════════════════════
   Blaster busa bergaya "nerf" (generik, tanpa logo merek)
   Tangan kanan di gagang • tangan kiri memompa • magasen berisi dart busa
   ════════════════════════════════════════════════════════════════ */

const RELOAD_TIME = 1.5; // detik

const M = {
  blue: () => new THREE.MeshStandardMaterial({ color: 0x1b6fe0, roughness: 0.38, metalness: 0.05 }),
  white: () => new THREE.MeshStandardMaterial({ color: 0xf2f5fa, roughness: 0.42 }),
  orange: () => new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.4, emissive: 0x331100, emissiveIntensity: 0.5 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.6 }),
  gray: () => new THREE.MeshStandardMaterial({ color: 0x8d96a3, roughness: 0.45, metalness: 0.3 }),
  clear: () => new THREE.MeshStandardMaterial({ color: 0x4aa8ff, roughness: 0.15, transparent: true, opacity: 0.45, depthWrite: false }),
  skin: () => new THREE.MeshStandardMaterial({ color: 0xe6b08c, roughness: 0.62 }),
  skinDark: () => new THREE.MeshStandardMaterial({ color: 0xcf9873, roughness: 0.7 }),
  nail: () => new THREE.MeshStandardMaterial({ color: 0xf4cdb9, roughness: 0.3 }),
  sleeve: () => new THREE.MeshStandardMaterial({ color: 0x23324d, roughness: 0.9 }),
  yellow: () => new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5 }),
};

const rbox = (w, h, d, mat, r = 0.006) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

/** Satu dart busa (moncong ke arah −Z). Dipakai juga untuk proyektil. */
export function makeDart() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.05, 10).rotateX(Math.PI / 2), M.orange());
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 10, 8), M.yellow());
  tip.position.z = -0.027;
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, 0.006, 10).rotateX(Math.PI / 2), M.white());
  tail.position.z = 0.027;
  g.add(body, tip, tail);
  return g;
}

/** Segmen jari meruncing berujung bulat (sumbu +Y; tutup bawah berpusat di y=0, tutup atas di y=len). */
function taperSeg(r0, r1, len, mat, tip = false) {
  const prof = [];
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.0001, r0 * Math.cos(a)), r0 * Math.sin(a)));
  }
  for (let i = 1; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.max(0.0001, r1 * Math.cos(a)), len + r1 * Math.sin(a)));
  }
  const g = new THREE.LatheGeometry(prof, 14);
  g.scale(1, 1, 0.92);
  // warna vertex: lipatan agak gelap di dekat sendi, ujung jari sedikit kemerahan
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp(p.getY(i) / len, 0, 1);
    const k = 1 - 0.1 * (1 - smooth(0, 0.16, t)) - 0.08 * smooth(0.86, 1, t);
    let gr = k;
    let bl = k;
    if (tip) {
      const f = smooth(0.55, 1, t);
      gr = k * (1 - 0.06 * f);
      bl = k * (1 - 0.1 * f);
    }
    col[i * 3] = k;
    col[i * 3 + 1] = gr * 0.985;
    col[i * 3 + 2] = bl * 0.97;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Mesh(g, mat);
}

/**
 * Jari bersendi dengan segmen meruncing, bonggol sendi, dan kuku.
 * lens = panjang tiap ruas (sendi ke sendi). Awalnya menunjuk +Y lokal; tekukan positif memutar +Y ke −X lokal.
 */
function makeFinger(r, lens, curls, skin, nailMat, knuckleMat) {
  const root = new THREE.Group();
  const segs = [];
  root.userData.segs = segs;
  let parent = root;
  lens.forEach((L, i) => {
    const r0 = r * (1 - i * 0.1);
    const r1 = Math.max(r * (1 - (i + 1) * 0.1), r * 0.62);
    const seg = new THREE.Group();
    seg.rotation.z = curls[i];
    segs.push(seg);
    parent.add(seg);
    seg.add(taperSeg(r0, r1, L, skin, i === lens.length - 1));
    if (i > 0 && knuckleMat) {
      const kn = new THREE.Mesh(new THREE.SphereGeometry(r0 * 0.9, 10, 8), knuckleMat);
      kn.scale.set(0.8, 0.75, 0.95);
      kn.position.set(r0 * 0.38, 0, 0);
      seg.add(kn);
    }
    if (i === lens.length - 1 && nailMat) {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), nailMat);
      nail.scale.set(r1 * 0.2, r1 * 1.15, r1 * 0.78);
      nail.position.set(r1 * 0.8, L - r1 * 0.2, 0);
      seg.add(nail);
    }
    const next = new THREE.Group();
    next.position.y = L;
    seg.add(next);
    parent = next;
  });
  return root;
}

export class Weapon {
  constructor(camera) {
    this.camera = camera;
    this.mag = 10;
    this.ammo = 10;
    this.reloading = false;
    this.rt = 0;
    this.recoil = 0;
    this.pumpKick = 0;
    this.flash = 0;
    this.sx = 0;
    this.sy = 0;
    this.onReloadDone = null;
    this.onSound = null; // (nama) => void : magOut | magIn | rack
    this._flags = {};

    this.root = new THREE.Group();
    camera.add(this.root);
    this.rig = new THREE.Group();
    this.root.add(this.rig);
    this.base = new THREE.Vector3(0.17, -0.14, -0.46);
    this.baseRot = new THREE.Vector3(0, 0.1, 0);
    this._build();
  }

  _build() {
    const blue = M.blue();
    const white = M.white();
    const orange = M.orange();
    const dark = M.dark();
    const gray = M.gray();
    const skin = M.skin();
    const skinDark = M.skinDark();
    const nail = M.nail();
    const sleeve = M.sleeve();

    const gun = new THREE.Group();
    gun.scale.setScalar(0.88);
    this.gun = gun;
    this.rig.add(gun);

    /* ── Badan ─────────────────────────────────────────────────── */
    const body = rbox(0.056, 0.072, 0.22, blue, 0.016);
    body.position.set(0, 0, 0.02);
    gun.add(body);
    const top = rbox(0.05, 0.03, 0.2, white, 0.01);
    top.position.set(0, 0.046, 0.03);
    gun.add(top);
    const shroud = rbox(0.062, 0.062, 0.15, blue, 0.016);
    shroud.position.set(0, 0.006, -0.15);
    gun.add(shroud);
    const stock = rbox(0.05, 0.05, 0.07, white, 0.012);
    stock.position.set(0, -0.004, 0.16);
    gun.add(stock);
    const pad = rbox(0.054, 0.052, 0.012, orange, 0.004);
    pad.position.set(0, -0.004, 0.2);
    gun.add(pad);

    // Dekal samping (garis oranye + ventilasi)
    for (const s of [-1, 1]) {
      const stripe = rbox(0.0016, 0.012, 0.19, orange, 0.0006);
      stripe.position.set(s * 0.0286, 0.014, 0.025);
      gun.add(stripe);
      for (let i = 0; i < 4; i++) {
        const vent = rbox(0.0016, 0.026, 0.008, dark, 0.0005);
        vent.position.set(s * 0.0318, 0.006, -0.1 - i * 0.02);
        gun.add(vent);
      }
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.012, 16), white);
      badge.position.set(s * 0.0287, -0.012, 0.075);
      badge.rotation.y = s * Math.PI / 2;
      gun.add(badge);
    }

    /* ── Laras & ujung oranye ─────────────────────────────────── */
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.13, 20).rotateX(Math.PI / 2), gray);
    barrel.position.set(0, 0.012, -0.27);
    gun.add(barrel);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 22).rotateX(Math.PI / 2), orange);
    tip.position.set(0, 0.012, -0.338);
    gun.add(tip);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.0175, 18).rotateY(Math.PI), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    bore.position.set(0, 0.012, -0.3535);
    gun.add(bore);

    /* ── Rel atas + pembidik ──────────────────────────────────── */
    const rail = rbox(0.022, 0.007, 0.2, gray, 0.002);
    rail.position.set(0, 0.0665, 0.0);
    gun.add(rail);
    for (let i = 0; i < 10; i++) {
      const slot = rbox(0.024, 0.0045, 0.008, dark, 0.001);
      slot.position.set(0, 0.0715, -0.075 + i * 0.019);
      gun.add(slot);
    }
    const fsight = rbox(0.007, 0.016, 0.01, orange, 0.002);
    fsight.position.set(0, 0.08, -0.105);
    gun.add(fsight);
    for (const s of [-1, 1]) {
      const rs = rbox(0.006, 0.014, 0.012, dark, 0.002);
      rs.position.set(s * 0.008, 0.078, 0.085);
      gun.add(rs);
    }

    /* ── Gagang ───────────────────────────────────────────────── */
    const gripTex = canvasTexture(64, 64, (ctx, w, h) => {
      ctx.fillStyle = '#20242b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#343a44';
      for (let y = 4; y < h; y += 7) for (let x = 4; x < w; x += 7) ctx.fillRect(x, y, 3, 3);
    });
    const grip = rbox(0.044, 0.125, 0.062, dark, 0.014);
    grip.position.set(0, -0.092, 0.087);
    grip.rotation.x = -0.2;
    gun.add(grip);
    for (const s of [-1, 1]) {
      const plate = rbox(0.0016, 0.085, 0.044, new THREE.MeshStandardMaterial({ map: gripTex, roughness: 0.9 }), 0.0005);
      plate.position.set(s * 0.0226, -0.09, 0.087);
      plate.rotation.x = -0.2;
      gun.add(plate);
    }
    const gcap = rbox(0.048, 0.012, 0.066, orange, 0.004);
    gcap.position.set(0, -0.155, 0.1);
    gcap.rotation.x = -0.2;
    gun.add(gcap);

    // Pelindung pelatuk (setengah lingkaran) + pelatuk
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0045, 8, 18, Math.PI).rotateX(Math.PI).rotateY(Math.PI / 2), dark);
    guard.position.set(0, -0.032, 0.0);
    gun.add(guard);
    this.trigger = rbox(0.008, 0.026, 0.01, orange, 0.002);
    this.trigger.position.set(0, -0.042, 0.004);
    this.trigger.rotation.x = 0.3;
    gun.add(this.trigger);

    /* ── Magasen transparan berisi dart ───────────────────────── */
    const mag = new THREE.Group();
    this.magGroup = mag;
    this.magSlot = new THREE.Vector3(0, -0.092, -0.048);
    mag.position.copy(this.magSlot);
    mag.add(new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.1, 0.052, 3, 0.006), M.clear()));
    const mbase = rbox(0.044, 0.012, 0.056, orange, 0.003);
    mbase.position.y = -0.055;
    mag.add(mbase);
    this.magDarts = [];
    for (let i = 0; i < 10; i++) {
      const d = makeDart();
      d.scale.setScalar(0.62);
      d.position.set(i % 2 ? 0.009 : -0.009, -0.035 + Math.floor(i / 2) * 0.0175, 0);
      mag.add(d);
      this.magDarts.push(d);
    }
    gun.add(mag);

    /* ── Pompa (forend) ───────────────────────────────────────── */
    const pump = new THREE.Group();
    this.pump = pump;
    this.pumpHome = new THREE.Vector3(0, -0.052, -0.165);
    pump.position.copy(this.pumpHome);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.105, 22).rotateX(Math.PI / 2), white);
    pump.add(handle);
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0275, 0.0042, 6, 20), orange);
      ring.position.z = -0.04 + i * 0.02;
      pump.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.008, 22).rotateX(Math.PI / 2), blue);
    cap.position.z = -0.056;
    pump.add(cap);
    const link = rbox(0.018, 0.045, 0.03, gray, 0.004);
    link.position.set(0, 0.04, 0.0);
    pump.add(link);
    gun.add(pump);

        /* ── Bahan kulit (dipakai kedua tangan) ───────────────────── */
    const physSkin = new THREE.MeshPhysicalMaterial({ color: 0xe8b592, roughness: 0.58, sheen: 0.6, sheenColor: new THREE.Color(0xffc9a8), sheenRoughness: 0.5 });
    const fingSkin = new THREE.MeshStandardMaterial({ color: 0xe8b592, roughness: 0.58, vertexColors: true });
    const knuckleSkin = new THREE.MeshStandardMaterial({ color: 0xe2a986, roughness: 0.6 });
    const nailMat = new THREE.MeshStandardMaterial({ color: 0xeab9a2, roughness: 0.45 });
    const ell = (parent, mat, rx, ry, rz, x, y, z) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), mat);
      m.scale.set(rx, ry, rz);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    /* ── Tangan kanan: telapak di belakang & sisi kanan gagang, 3 jari melingkar di depan gagang,
          ibu jari bersandar di sisi kiri bodi, telunjuk di pelatuk ───────────────────────────── */
    const rh = new THREE.Group();
    gun.add(rh);
    const gf = new THREE.Group(); // kerangka gagang (miring sama seperti gagang)
    gf.position.set(0, -0.092, 0.087);
    gf.rotation.x = -0.2;
    rh.add(gf);
    ell(gf, physSkin, 0.014, 0.054, 0.04, 0.032, 0.002, 0.008); // telapak di sisi kanan gagang
    ell(gf, physSkin, 0.036, 0.054, 0.02, 0.006, 0.002, 0.045); // punggung/telapak di belakang gagang
    ell(gf, physSkin, 0.016, 0.018, 0.02, 0.028, -0.04, 0.03); // tumit telapak
    ell(gf, physSkin, 0.024, 0.022, 0.026, -0.006, 0.04, 0.05); // pangkal ibu jari (thenar)
    ell(gf, physSkin, 0.0135, 0.056, 0.0145, 0.03, 0.004, -0.03); // barisan buku jari (di sudut depan-kanan)

    // 3 jari melingkari bagian depan gagang, ujungnya merapat di sisi kiri
    const qWrap = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, -1), V(-1, 0, 0), V(0, 1, 0)));
    [
      [0.029, 0.0122, [0.058, 0.03, 0.02], [0.02, 1.4, 0.3]], // tengah
      [0.0045, 0.0117, [0.056, 0.029, 0.019], [0.02, 1.4, 0.3]], // manis
      [-0.0195, 0.0106, [0.05, 0.025, 0.017], [0.02, 1.36, 0.32]], // kelingking
    ].forEach(([y, r, lens, curls]) => {
      const f = makeFinger(r, lens, curls, fingSkin, nailMat, knuckleSkin);
      f.quaternion.copy(qWrap);
      f.position.set(0.028, y, -0.0415);
      gf.add(f);
    });

    // Telunjuk: memanjang di sisi kanan lalu menekuk ke pelatuk
    const qIdx = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 0, -1), V(0, 1, 0)));
    const index = makeFinger(0.0108, [0.04, 0.024, 0.02], [0.35, 0.8, 0.5], fingSkin, nailMat, knuckleSkin);
    index.quaternion.copy(qIdx);
    index.position.set(0.028, 0.062, -0.036);
    gf.add(index);

    // Ibu jari: pangkalnya menyatu dengan gundukan telapak (thenar) di belakang-kiri gagang,
    // lalu merebah ke depan menyusuri sisi kiri bodi (tidak lagi menembus muka depan gagang)
    const thA = V(-0.006, -0.043, 0.128); // pusat thenar (di belakang gagang)
    const thB = V(-0.033, -0.034, 0.104); // pangkal ibu jari (sendi pangkal)
    const thD = thB.clone().sub(thA);
    const thenar = ell(rh, physSkin, 0.0195, 0.0175, thD.length() / 2 + 0.017, (thA.x + thB.x) / 2, (thA.y + thB.y) / 2, (thA.z + thB.z) / 2);
    thenar.quaternion.setFromUnitVectors(V(0, 0, 1), thD.clone().normalize()); // gundukan memanjang dari telapak ke pangkal jempol
    ell(rh, physSkin, 0.0165, 0.0155, 0.02, thB.x, thB.y, thB.z + 0.002); // penutup sendi pangkal agar tersambung halus
    const thumb = makeFinger(0.0128, [0.044, 0.034], [0.0, -0.25], fingSkin, nailMat, knuckleSkin);
    thumb.quaternion.setFromUnitVectors(V(0, 1, 0), V(-0.12, 0.1, -0.97).normalize());
    thumb.position.copy(thB);
    rh.add(thumb);

    // Pergelangan + lengan baju (jaket) + manset karet — pangkal pergelangan "tertanam" di punggung telapak
    const dir = V(0.34, -0.3, 0.9).normalize();
    const arm = new THREE.Group();
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.0285, 0.0335, 0.12, 20), physSkin);
    wrist.position.y = 0.06;
    arm.add(wrist);
    const wristBase = new THREE.Mesh(new THREE.SphereGeometry(0.0335, 20, 14), physSkin); // penutup bulat → menyatu dengan telapak
    arm.add(wristBase);
    const cuffRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.026, 20), orange);
    cuffRing.position.y = 0.123;
    arm.add(cuffRing);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.0395, 0.05, 1.0, 20), sleeve);
    sl.position.y = 0.637;
    arm.add(sl);
    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.0425, 0.006, 8, 24), sleeve);
    fold.rotation.x = Math.PI / 2;
    fold.position.y = 0.147;
    arm.add(fold);
    arm.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    arm.position.set(0.022, -0.09, 0.128);
    rh.add(arm);

    /* ── Tangan kiri: genggaman "C" di bawah pompa (telapak di kiri-bawah, jari melingkar ke kanan) ──
          Titik asal = pusat telapak. Sumbu pompa berada di (+0.036, +0.036, 0) dari titik asal. */
    const lh = new THREE.Group();
    this.leftHand = lh;
    ell(lh, physSkin, 0.031, 0.023, 0.058, 0.0, 0.0, 0.0); // telapak
    ell(lh, physSkin, 0.019, 0.017, 0.026, -0.008, 0.013, 0.05); // pangkal ibu jari (thenar)
    ell(lh, physSkin, 0.0145, 0.0145, 0.056, 0.011, 0.011, 0.0); // barisan buku jari
    // jari: telunjuk (depan) → kelingking (belakang); tiap jari melingkari pompa (radius ± 0.027)
    this.lhFingers = [];
    [
      [-0.0345, 0.0122, [0.036, 0.027, 0.022]],
      [-0.0115, 0.0124, [0.04, 0.03, 0.023]],
      [0.0115, 0.0116, [0.038, 0.028, 0.022]],
      [0.0345, 0.0106, [0.031, 0.023, 0.019]],
    ].forEach(([z, r, lens]) => {
      const R = 0.027 + r; // radius lingkar jari mengelilingi pompa
      const th0 = Math.PI * 1.25; // 225°: sudut awal (kiri-bawah)
      const f = makeFinger(r, lens, [0, 0, 0], fingSkin, nailMat, knuckleSkin);
      f.position.set(0.036 + R * Math.cos(th0), 0.036 + R * Math.sin(th0), z);
      lh.add(f);
      const kn = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 14, 10), knuckleSkin); // bonggol buku jari
      kn.position.copy(f.position);
      lh.add(kn);
      this.lhFingers.push({ f, base: th0 + lens[0] / (2 * R), curls: [0, (lens[0] + lens[1]) / (2 * R), (lens[1] + lens[2]) / (2 * R)] });
    });
    this._setLeftOpen(0);
    const larm = new THREE.Group();
    const lwrist = new THREE.Mesh(new THREE.CylinderGeometry(0.0295, 0.0345, 0.11, 20), physSkin);
    lwrist.position.y = 0.055;
    larm.add(lwrist);
    const lwristBase = new THREE.Mesh(new THREE.SphereGeometry(0.0345, 20, 14), physSkin);
    larm.add(lwristBase);
    const lcuffRing = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.026, 20), orange);
    lcuffRing.position.y = 0.113;
    larm.add(lcuffRing);
    const lsl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.051, 1.0, 20), sleeve);
    lsl.position.y = 0.626;
    larm.add(lsl);
    // jam tangan digital di pergelangan kiri
    const watch = rbox(0.036, 0.012, 0.032, dark, 0.004);
    watch.position.set(0, 0.07, 0.03);
    larm.add(watch);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.021), new THREE.MeshBasicMaterial({ color: 0x38d6ff }));
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.0765, 0.03);
    larm.add(screen);
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.0372, 0.0372, 0.017, 20), dark);
    strap.position.y = 0.07;
    larm.add(strap);
    larm.quaternion.setFromUnitVectors(V(0, 1, 0), V(-0.5, -0.34, 0.8).normalize());
    larm.position.set(-0.012, -0.004, 0.052);
    lh.add(larm);
    // magasen cadangan yang dipegang saat reload
    this.mag2 = new THREE.Group();
    this.mag2.add(new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.1, 0.052, 3, 0.006), M.clear()));
    const m2b = rbox(0.044, 0.012, 0.056, orange, 0.003);
    m2b.position.y = -0.055;
    this.mag2.add(m2b);
    for (let i = 0; i < 10; i++) {
      const d = makeDart();
      d.scale.setScalar(0.62);
      d.position.set(i % 2 ? 0.009 : -0.009, -0.035 + Math.floor(i / 2) * 0.0175, 0);
      this.mag2.add(d);
    }
    this.mag2.visible = false;
    lh.add(this.mag2);
    gun.add(lh);
    // posisi tangan kiri (koordinat senjata)
    this.lhPump = new THREE.Vector3(-0.036, -0.088, -0.165);
    this.lhMag = new THREE.Vector3(-0.055, -0.173, -0.048);
    this.lhOff = new THREE.Vector3(-0.22, -0.45, 0.12);
    lh.position.copy(this.lhPump);

    // lampu pengisi agar tangan terbaca jelas
    const fill = new THREE.PointLight(0xfff1e0, 0.9, 2.2, 2);
    fill.position.set(0.25, 0.35, 0.25);
    this.root.add(fill);

    /* ── Semburan udara di moncong ────────────────────────────── */
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.012, -0.375);
    gun.add(this.muzzle);
    this.puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture('255,255,255'), transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending }));
    this.puff.scale.set(0.12, 0.12, 1);
    this.muzzle.add(this.puff);
    this.flashLight = new THREE.PointLight(0xffe2b0, 0, 3, 2);
    this.muzzle.add(this.flashLight);

    this.rig.position.copy(this.base);
    this.rig.rotation.y = 0.03;
  }

  /** k=0: jari menggenggam pompa • k=1: telapak terbuka (menopang magasen saat reload) */
  _setLeftOpen(k) {
    for (const o of this.lhFingers) {
      o.f.rotation.z = THREE.MathUtils.lerp(o.base, Math.PI * 1.5, k);
      const segs = o.f.userData.segs;
      for (let i = 1; i < segs.length; i++) segs[i].rotation.z = o.curls[i] * (1 - 0.88 * k);
    }
  }

  /** @returns {'shot'|'empty'|'reloading'} */
  fire() {
    if (this.reloading) return 'reloading';
    if (this.ammo <= 0) return 'empty';
    this.ammo -= 1;
    this.recoil = 1;
    this.pumpKick = 1;
    this.flash = 1;
    return 'shot';
  }

  reload() {
    if (this.reloading || this.ammo >= this.mag) return false;
    this.reloading = true;
    this.rt = 0;
    this._flags = {};
    return true;
  }

  muzzleWorld(target = new THREE.Vector3()) {
    this.camera.updateMatrixWorld(true);
    return this.muzzle.getWorldPosition(target);
  }

  update(dt, t, vYaw = 0, vPitch = 0) {
    // ayunan mengikuti bidikan
    this.sx = damp(this.sx, THREE.MathUtils.clamp(-vYaw * 0.012, -0.05, 0.05), 10, dt);
    this.sy = damp(this.sy, THREE.MathUtils.clamp(vPitch * 0.012, -0.04, 0.04), 10, dt);
    const breath = Math.sin(t * 1.7) * 0.0018;
    const sway = Math.sin(t * 0.9) * 0.0015;

    this.recoil = Math.max(0, this.recoil - dt * 7.5);
    this.pumpKick = Math.max(0, this.pumpKick - dt * 6);
    const kick = this.recoil * this.recoil;

    let tilt = 0;
    let pumpOff = this.pumpKick * 0.018;
    const lh = this.lhPump.clone();
    let lhFollowsPump = true;
    let lhOpen = 0;

    if (this.reloading) {
      this.rt += dt;
      const p = Math.min(1, this.rt / RELOAD_TIME);
      tilt = smooth(0, 0.12, p) * (1 - smooth(0.9, 1, p));

      // 1) tangan kiri lepas dari pompa
      // 2) magasen lama jatuh
      if (p >= 0.14 && !this._flags.out) {
        this._flags.out = true;
        this.onSound?.('magOut');
      }
      this.magGroup.position.y = this.magSlot.y - smooth(0.14, 0.32, p) * 0.24;
      this.magGroup.visible = p < 0.32 || p >= 0.68;
      if (p >= 0.68) this.magGroup.position.copy(this.magSlot);

      // 3) tangan kiri membawa magasen baru lalu menekannya masuk
      if (p < 0.08) lh.copy(this.lhPump);
      else if (p < 0.3) lh.lerpVectors(this.lhPump, this.lhOff, smooth(0.08, 0.3, p));
      else if (p < 0.52) lh.lerpVectors(this.lhOff, this.lhMag, smooth(0.3, 0.52, p));
      else if (p < 0.68) lh.copy(this.lhMag);
      else if (p < 0.82) lh.lerpVectors(this.lhMag, this.lhPump, smooth(0.68, 0.82, p));
      lhFollowsPump = p >= 0.82;
      lhOpen = p < 0.3 ? smooth(0.08, 0.26, p) : p < 0.68 ? 1 : 1 - smooth(0.68, 0.8, p);
      const holding = p >= 0.3 && p < 0.68;
      this.mag2.visible = holding;
      if (holding) {
        const push = smooth(0.52, 0.68, p);
        this.mag2.position.copy(this.magSlot).sub(this.lhMag).add(new THREE.Vector3(0, -0.075 * (1 - push), 0));
      }
      if (p >= 0.68 && !this._flags.in) {
        this._flags.in = true;
        this.onSound?.('magIn');
        this.recoil = Math.max(this.recoil, 0.2);
      }

      // 4) pompa ditarik & didorong (priming)
      if (p >= 0.82 && p < 0.96) {
        const u = (p - 0.82) / 0.14;
        pumpOff = (u < 0.5 ? smooth(0, 0.5, u) : 1 - smooth(0.5, 1, u)) * 0.06;
        if (!this._flags.rack1) {
          this._flags.rack1 = true;
          this.onSound?.('rack');
        }
        if (u > 0.5 && !this._flags.rack2) {
          this._flags.rack2 = true;
          this.onSound?.('rack');
        }
      }

      if (p >= 1) {
        this.reloading = false;
        this.ammo = this.mag;
        this.magGroup.visible = true;
        this.magGroup.position.copy(this.magSlot);
        this.mag2.visible = false;
        this.onReloadDone?.();
      }
    }

    // Terapkan
    this.pump.position.set(this.pumpHome.x, this.pumpHome.y, this.pumpHome.z + pumpOff);
    if (lhFollowsPump) lh.z += pumpOff;
    this.leftHand.position.copy(lh);
    this._setLeftOpen(lhOpen);

    this.rig.position.set(this.base.x + this.sx + sway - tilt * 0.04, this.base.y + breath + this.sy - tilt * 0.05 - kick * 0.004, this.base.z + kick * 0.05);
    this.rig.rotation.set(this.baseRot.x + kick * 0.14 + tilt * 0.45 + this.sy * 0.6, this.baseRot.y + this.sx * 1.2 + tilt * 0.3, this.baseRot.z - tilt * 0.45);
    this.trigger.rotation.x = 0.3 + this.recoil * 0.4;

    // dart tersisa di magasen
    for (let i = 0; i < this.magDarts.length; i++) this.magDarts[i].visible = i < this.ammo;

    // semburan udara
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 12);
      const s = 0.1 + (1 - this.flash) * 0.16;
      this.puff.scale.set(s, s, 1);
      this.puff.material.opacity = this.flash * 0.9;
      this.flashLight.intensity = this.flash * 3.2;
    } else {
      this.puff.material.opacity = 0;
      this.flashLight.intensity = 0;
    }
  }
}