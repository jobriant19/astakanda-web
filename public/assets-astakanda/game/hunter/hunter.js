/* ASTA KANDA — Hornet Hunter (MESIN GAME, modul 3D). Dimuat di belakang layar oleh hunter-ui.js.
 * Tiap gelombang ada 5 hornet, masing-masing membawa soal huruf/kata. Peragakan gestur soal pada hornet yang menyala:
 *   BENAR  -> blaster menembak hornet itu otomatis.
 *   SALAH / WAKTU HABIS -> hornet itu menyerang, nyawa -1, gelombang TIDAK berganti (soal diganti baru).
 * 5 hornet tertembak = gelombang selesai. Makin tinggi gelombang: waktu soal makin singkat & poin makin besar.
 * MODE 1 PEMAIN : 5 nyawa, rekor disimpan di browser.
 * MODE 2 PEMAIN : battle. Kamera terbagi dua (kiri = Pemain 1, kanan = Pemain 2). Siapa yang benar lebih dulu
 *                 dapat poin; gestur salah = nyawa pemain itu -1; waktu habis = nyawa keduanya -1.
 *                 Nyawa salah satu pemain habis -> battle selesai.
 * API: start(cfg) | stop() | siapkan()  (cfg = { pool, mode, names })
 */
import * as THREE from 'three';
import { createWorld } from './world.js';
import { Weapon, makeDart } from './weapon.js';
import { Particles } from './particles.js';
import { HornetSwarm, loadHornetAssets } from './hornets.js';
import { clamp, rand, damp } from './lib.js';

/* ════════════════ Konfigurasi (gampang diubah) ════════════════ */
const HORNET_IMG = (window.ASTA_IMAGES && window.ASTA_IMAGES.hornet) || '/assets/images/hornet.png';
const MAX_LIVES = 5;        // nyawa tiap pemain
const PER_WAVE = 5;         // hornet yang harus ditembak per gelombang
const TIME_BASE = 12;       // detik per soal di gelombang 1
const TIME_STEP = 1.5;      // pengurangan detik per gelombang
const TIME_MIN = 4;         // batas waktu tercepat
const POINT_BASE = 10;      // poin dasar x gelombang (+ sisa detik x gelombang)
const GRACE_MS = 1200;      // jeda awal tiap soal: gestur salah belum dihitung (tangan sedang berpindah pose)
const WRONG_STREAK = 3;     // gestur salah harus terdeteksi stabil sebanyak ini baru dihitung salah
const POLL_MS = 70;         // jeda antar pengecekan gestur
const MIRROR = true;        // true bila tampilan kamera dicerminkan (selfie): tangan di sisi KIRI layar = x besar
const BEST_KEY = 'astakanda.hunterBest';
const DART_SPEED = 80;     // kecepatan dart (satuan dunia / detik)
const HIT_R = 0.25;        // dart dianggap mengenai hornet bila sudah sedekat ini
const AIM_Y = -0.07;          // titik bidik relatif ke pusat hornet: naikkan (+) bila dart mengenai terlalu rendah, turunkan (-) bila terlalu tinggi
const MAX_DPR = 2;          // sama seperti Hornet Attack: gambar tajam sampai 2x
const SFX_DIR = '/assets/sounds/'; // public/assets/sounds/damage.mp3 & gameover.mp3
const SFX_VOL = 0.8;
const AIM_RATE = 16;       // kecepatan blaster berputar ke hornet (makin besar makin cepat)
const AIM_OK = 0.92;       // blaster dianggap sudah lurus ke hornet bila putarannya sudah segini (0..1)
const AIM_MAX_MS = 450;    // batas tunggu membidik; lewat ini dart tetap ditembakkan
const AIM_HOLD_MS = 220;   // blaster tetap mengarah ke hornet sesaat setelah menembak
const AIM_MAX_YAW = 0.85;  // batas putaran kiri-kanan blaster (radian)

/* ════════════════ Efek suara (damage & gameover) ════════════════ */
const sfx = {};
function ambilSfx(nama) {
  if (!sfx[nama]) { sfx[nama] = new Audio(SFX_DIR + nama + '.mp3'); sfx[nama].preload = 'auto'; sfx[nama].volume = SFX_VOL; }
  return sfx[nama];
}
function bunyi(nama) { // ikut tombol suara di topbar: bila sedang bisu, efek tidak dibunyikan
  if (document.querySelector('.asta-sound-btn.is-muted')) return;
  try {
    const a = ambilSfx(nama);
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(() => {}); // browser menolak otoplay: abaikan
  } catch (e) { /* abaikan */ }
}

/* ════════════════ Pembantu ════════════════ */
const $ = (id) => document.getElementById(id);
function teksMuat(t) { const e = $('hunter-loading-teks'); if (e) e.textContent = t; }
function siapSuara(nama) { // tunggu efek suara selesai dimuat (maks 1,5 dtk) supaya bunyi pertama tidak terlambat
  return new Promise((ok) => {
    const a = ambilSfx(nama);
    if (a.readyState >= 3) return ok();
    a.addEventListener('canplaythrough', ok, { once: true });
    a.addEventListener('error', ok, { once: true });
    setTimeout(ok, 1500);
  });
}
const frameSiap = (n) => new Promise((ok) => { // tunggu n frame digambar (shader & tekstur sudah naik ke GPU)
  const s = G.session;
  const f = () => (n-- <= 0 || s !== G.session ? ok() : requestAnimationFrame(f));
  requestAnimationFrame(f);
});
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
const ICON_OK = SV + '><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_NO = SV + '><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';
const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5a2 2 0 0 0 0 4h1.5M16 5h3a2 2 0 0 1 0 4h-1.5"/><path d="M12 12v3"/><path d="M9 20h6"/><path d="M10 17h4l.6 3H9.4l.6-3Z"/></svg>';
const ICON_JAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const HEART = '<i><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.3 5c2 0 3.7 1.1 4.7 2.7h2C14 6.1 15.7 5 17.7 5 21 5 23.1 8.4 21.6 11.8 19.5 16.4 12 21 12 21z"/></svg></i>';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const formatWaktu = (d) => String(Math.floor(d / 60)).padStart(2, '0') + ':' + String(Math.floor(d % 60)).padStart(2, '0');
const waktuSoal = (wave) => Math.max(TIME_MIN, TIME_BASE - (wave - 1) * TIME_STEP);
const tingkat = (wave) => (wave >= 5 ? 'sulit' : wave >= 3 ? 'sedang' : 'mudah'); // sertifikat hanya mengenal 3 tingkat
function bacaBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { nama: '', skor: 0 }; } catch (e) { return { nama: '', skor: 0 }; }
}
function setHearts(box, n) {
  for (let i = 0; i < MAX_LIVES; i++) box.children[i].classList.toggle('off', i >= n);
}

/* Posisi tangan di kamera (0..1) dari data landmark; 0.5 bila bentuk datanya tidak dikenal */
function handX(lm) {
  const p = Array.isArray(lm) ? lm[0] : null;
  const x = typeof p === 'number' ? p : Array.isArray(p) ? p[0] : p && typeof p === 'object' ? p.x : NaN;
  return x >= 0 && x <= 1 ? x : 0.5;
}
/* Semua tangan yang terlihat. Memakai api.getLatestHands() bila ada, kalau tidak 1 tangan dari getLatestLandmarks(). */
function bacaTangan() {
  const api = window.astaKanda;
  if (!api) return [];
  let hands = [];
  if (typeof api.getLatestHands === 'function') {
    const hs = api.getLatestHands();
    if (Array.isArray(hs)) hands = hs.filter(Boolean);
  }
  if (!hands.length) { const lm = api.getLatestLandmarks(); if (lm) hands = [lm]; }
  return hands.map((lm) => ({ lm, x: handX(lm) }));
}
const sisiPemain = (x) => ((MIRROR ? x > 0.5 : x < 0.5) ? 0 : 1); // 0 = kiri layar (Pemain 1), 1 = kanan (Pemain 2)

/* ════════════════ Scene 3D (dibuat sekali, di belakang layar) ════════════════ */
let R = null, scenePromise = null;
function buatScene() {
  if (scenePromise) return scenePromise;
  scenePromise = (async () => {
    const assets = await loadHornetAssets(HORNET_IMG);
    const canvas = $('hunter-canvas');
    // Pengaturan renderer sama persis dengan Hornet Attack (tajam & halus)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    (assets.relief || assets).tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
    camera.rotation.order = 'YXZ';
    camera.position.set(0, 1.6, 0);
    scene.add(camera);
    const world = createWorld(scene);
    const weapon = new Weapon(camera);
    weapon.mag = weapon.ammo = 9999; // tembakan otomatis: tidak perlu isi ulang
    const particles = new Particles(scene);
    R = { renderer, scene, camera, world, weapon, particles, darts: [], dartPool: [], shots: [], aim: null, swarm: null, ratio: renderer.getPixelRatio() };
    R.swarm = new HornetSwarm(scene, world.nestPos, assets, { onSting: (h) => sengat(h) });
    R.swarm.hideAll();
    renderer.compile(scene, camera); // siapkan shader sekarang agar frame pertama tidak tersendat
    return R;
  })().catch((err) => { scenePromise = null; throw err; });
  return scenePromise;
}
function siapkan() {
  if (scenePromise) return scenePromise;
  const go = () => buatScene().catch(() => {});
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 150);
  return null;
}

/* ════════════════ State permainan ════════════════ */
const G = {
  status: 'idle', // idle | playing | over
  session: 0, mode: 1, wave: 1, kills: 0, players: [], queue: [], active: null,
  paused: false, qLeft: 0, qMax: 1, waveOver: false, graceUntil: 0, pool: [], cfg: null, bestSebelum: 0, detik: 0, detect: ['—', '—'],
};
let el = {}, wrapEl, hud = {};
let rafId = null, pollTimer = null, clockTimer = null, timers = [], resizeObs = null;
let awaiting = false, T = 0, lastT = 0, yaw = 0, pitch = 0, shake = 0, dmg = 0;
let ema = 16, lambat = 0, kualitas = 0, txtWaktu = '', rasioTimer = -1, dmgTampil = -1, aimK = 0;

const later = (fn, ms) => { const s = G.session; const id = setTimeout(() => { if (s === G.session) fn(); }, ms); timers.push(id); return id; };
function ambilEl() {
  ['progress', 'target', 'timer', 'time', 'feedback', 'detect', 'popups', 'banner', 'dmg', 'wrap', 'stats', 'split', 'loading', 'q']
    .forEach((k) => { el[k] = $('hunter-' + k); });
  wrapEl = el.wrap;
}

/* ════════════════ HUD: baris statistik di bawah arena ════════════════ */
function susunHud() {
  const hearts = '<div class="hh-hearts">' + HEART.repeat(MAX_LIVES) + '</div>';
  if (G.mode === 1) {
    el.stats.innerHTML =
      '<div class="stat-card"><span class="stat-label">🐝 SKOR</span><span class="stat-value" id="h-s0">0</span></div>' +
      '<div class="stat-card"><span class="stat-label">⭐ REKOR</span><span class="stat-value" id="h-rekor">0</span></div>' +
      '<div class="stat-card"><span class="stat-label">🌊 GELOMBANG</span><span class="stat-value" id="h-gel">1</span></div>' +
      '<div class="stat-card"><span class="stat-label">❤️ NYAWA</span>' + hearts + '</div>';
  } else {
    const kartu = (i) => '<div class="stat-card hunter-pcard p' + (i + 1) + '"><span class="stat-label">' + esc(G.players[i].nama) + '</span>' +
      '<span class="stat-value" id="h-s' + i + '">0</span>' + hearts + '</div>';
    el.stats.innerHTML = kartu(0) +
      '<div class="stat-card"><span class="stat-label">🌊 GELOMBANG</span><span class="stat-value" id="h-gel">1</span></div>' + kartu(1);
  }
  const kartuNyawa = Array.from(el.stats.querySelectorAll('.hh-hearts'));
  hud = { s: G.players.map((_, i) => $('h-s' + i)), n: kartuNyawa, gel: $('h-gel'), rekor: $('h-rekor') };
}
function renderHud() {
  G.players.forEach((P, i) => {
    hud.s[i].textContent = P.score;
    setHearts(hud.n[i], P.lives);
  });
  hud.gel.textContent = G.wave;
  el.progress.textContent = G.kills + '/' + PER_WAVE;
}
function setDetect() {
  el.detect.textContent = G.mode === 1 ? G.detect[0] : 'P1 ' + G.detect[0] + ' · P2 ' + G.detect[1];
}
function feedback(ok, text) {
  el.feedback.innerHTML = (ok ? ICON_OK : ICON_NO) + ' ' + text;
  el.feedback.className = 'game-play-question-feedback ' + (ok ? 'is-correct' : 'is-wrong');
  later(() => { el.feedback.innerHTML = ''; el.feedback.className = 'game-play-question-feedback'; }, 1100);
}
function popup(text, cls, sisi) {
  const d = document.createElement('div');
  d.className = 'hunter-pop ' + (cls || '');
  if (G.mode === 2 && sisi !== undefined && sisi !== null) d.style.left = sisi === 0 ? '28%' : '72%';
  d.textContent = text;
  el.popups.appendChild(d);
  setTimeout(() => d.remove(), 1200);
}
function banner(text, sub) {
  el.banner.innerHTML = '<b>' + esc(text) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '');
  el.banner.classList.remove('show');
  void el.banner.offsetWidth;
  el.banner.classList.add('show');
}

/* ════════════════ Alur gelombang & soal ════════════════ */
function pilihLabel(jumlah, hindari) {
  const bebas = G.pool.filter((p) => !hindari.includes(p));
  const acak = shuffle(bebas.length >= jumlah ? bebas : G.pool);
  while (acak.length < jumlah) acak.push(...shuffle(G.pool));
  return acak.slice(0, jumlah);
}

function bannerGelombang() {
  banner('GELOMBANG ' + G.wave, 'Waktu soal ' + waktuSoal(G.wave).toFixed(1).replace('.0', '') + ' detik · poin x' + G.wave);
}

function mulaiGelombang(tanpaBanner) {
  G.kills = 0;
  G.waveOver = false;
  R.swarm.flySpeed = 1.6 + G.wave * 0.25; // hornet terbang masuk lebih cepat di gelombang tinggi
  R.swarm.assign(pilihLabel(PER_WAVE, []));
  G.queue = shuffle(R.swarm.hornets.map((h) => h.i));
  if (!tanpaBanner) bannerGelombang(); // gelombang 1 dimunculkan setelah popup pemuatan hilang
  aktifkan();
  renderHud();
}

function aktifkan() {
  R.swarm.hornets.forEach((h) => h.setActive(false));
  const idx = G.queue[0];
  G.active = idx === undefined ? null : R.swarm.hornets[idx];
  if (!G.active) return;
  G.active.setActive(true);
  G.qMax = G.qLeft = waktuSoal(G.wave);
  G.graceUntil = performance.now() + GRACE_MS;
  G.players.forEach((P) => { P.wrongLabel = null; P.wrongCount = 0; });
  el.target.textContent = G.active.answer;
  el.target.classList.toggle('long', String(G.active.answer).length > 3); // kata panjang: huruf lebih kecil
  el.target.classList.remove('pop'); void el.target.offsetWidth; el.target.classList.add('pop');
}

function benar(p) {
  const h = G.active;
  const P = G.players[p];
  if (!h) return;
  G.queue.shift();
  G.active = null;
  P.benar += 1; G.kills += 1;
  const poin = POINT_BASE * G.wave + Math.round(G.qLeft) * G.wave;
  P.score += poin;
  h.active = false;
  h.setLabelMode('right');
  feedback(true, (G.mode === 2 ? esc(P.nama) + ' ' : '') + 'Benar! +' + poin);
  popup('+' + poin, 'good', p);
  tembak(h, () => {
    R.particles.burst(h.pos, 0xffd23f, 22, 4, 0.7);
    R.particles.burst(h.pos, 0x6dffa6, 14, 3, 0.8);
    h.pulse = 1;
    h.kill();
  });
  if (G.kills >= PER_WAVE) {
    G.waveOver = true;
    later(() => { G.wave += 1; mulaiGelombang(); }, 1700);
  } else {
    aktifkan();
  }
  renderHud();
}

// Salah / waktu habis: hornet itu menyerang. Nyawa berkurang saat sengatan mengenai (sengat).
// p = indeks pemain yang salah; waktu habis (p = -1) mengurangi nyawa semua pemain.
function gagal(alasan, p) {
  const h = G.active;
  if (!h) return;
  G.queue.shift();
  G.active = null;
  if (p >= 0) G.players[p].salah += 1; else G.players.forEach((P) => { P.salah += 1; });
  h.sasaran = p;
  h.attack();
  feedback(false, alasan === 'waktu' ? 'Waktu habis' : (G.mode === 2 ? esc(G.players[p].nama) + ': ' : '') + 'Salah');
  aktifkan();
  renderHud();
}

function sengat(h) {
  if (G.status !== 'playing') return;
  const kena = h.sasaran >= 0 ? [h.sasaran] : G.players.map((_, i) => i);
  kena.forEach((i) => { const P = G.players[i]; P.lives = Math.max(0, P.lives - 1); popup('-1 ❤️', 'bad', G.mode === 2 ? i : null); });
  el.dmg.dataset.side = G.mode === 2 && kena.length === 1 ? (kena[0] === 0 ? 'left' : 'right') : 'all';
  dmg = 1; shake = 1;
  renderHud();
  if (G.players.some((P) => P.lives <= 0)) { selesai(); return; }
  bunyi('damage');
  if (!G.waveOver) { // gelombang belum selesai: hornet kembali dengan soal baru, gelombang tetap sama
    const hidup = R.swarm.hornets.filter((x) => x !== h && x.state !== 'gone').map((x) => x.answer);
    h.respawn();
    h.setTint(false);
    h.setAnswer(pilihLabel(1, hidup)[0]);
    G.queue.push(h.i);
    if (!G.active) aktifkan();
  }
}

/* ════════════════ Tembak otomatis ════════════════ */
const _from = new THREE.Vector3(), _to = new THREE.Vector3(), _dir = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, -1);
const bidik = (h, out) => { out.copy(h.pos); out.y += AIM_Y; return out; }; // titik bidik = posisi hornet SAAT INI
function tembak(h, saatTiba) { // masuk antrean: blaster diarahkan ke hornet DULU, baru menembak (diproses aturBidik di update)
  R.shots.push({ h, saatTiba });
}
function lepaskan(s) { // blaster sudah lurus ke hornet: tembakkan dart dari moncong
  const { weapon, camera, scene } = R;
  weapon.ammo = weapon.mag;
  weapon.fire();
  camera.updateMatrixWorld(true);
  weapon.muzzleWorld(_from);
  const m = R.dartPool.pop() || makeDart(); // dart dipakai ulang agar tidak membebani memori
  m.position.copy(_from);
  scene.add(m);
  R.darts.push({ m, h: s.h, saatTiba: s.saatTiba }); // arah dihitung ulang tiap frame di update(), jadi dart mengejar hornet yang bergerak
}
// Putar blaster ke hornet yang akan ditembak (ditumpuk di atas gerak senjata bawaan, dipanggil setelah weapon.update)
const _ba = new THREE.Vector3(), _bp = new THREE.Vector3();
let aimH = null;
function aturBidik(dt) {
  const { weapon, camera } = R;
  const A = R.aim || (R.shots.length ? (R.aim = { s: R.shots.shift(), t: 0, fired: false }) : null);
  if (A) aimH = A.s.h;
  aimK = damp(aimK, A ? 1 : 0, AIM_RATE, dt);
  if (A) {
    A.t += dt * 1000;
    if (!A.fired && (aimK >= AIM_OK || A.t >= AIM_MAX_MS)) { lepaskan(A.s); A.fired = true; A.t = 0; }
    else if (A.fired && A.t >= AIM_HOLD_MS) R.aim = null;
  }
  if (!aimH || aimK < 0.002) return;
  bidik(aimH, _ba);
  weapon.rig.getWorldPosition(_bp); // memperbarui matriks dunia rantai kamera -> rig
  camera.worldToLocal(_ba); camera.worldToLocal(_bp);
  _ba.sub(_bp).normalize();
  const yawT = clamp(Math.asin(clamp(-_ba.x, -1, 1)), -AIM_MAX_YAW, AIM_MAX_YAW);
  const pitchT = clamp(Math.atan2(_ba.y, -_ba.z), -0.5, 0.7);
  weapon.rig.rotation.x += aimK * (pitchT - weapon.baseRot.x);
  weapon.rig.rotation.y += aimK * (yawT - weapon.baseRot.y);
}

/* ════════════════ Deteksi gestur ════════════════ */
function proses(p, data, soal) {
  const P = G.players[p];
  if (G.status !== 'playing' || G.active !== soal || P.lives <= 0) return; // soal sudah berganti / pemain sudah kalah
  if (!data.ok || !data.label) { P.wrongLabel = null; P.wrongCount = 0; G.detect[p] = '—'; return; }
  G.detect[p] = data.label + (data.variant ? ' · ' + data.variant : '');
  const low = String(data.label).trim().toLowerCase();
  const target = String(soal.answer).trim().toLowerCase();
  if (low === target) { P.lastLabel = low; benar(p); return; }
  if (low === P.lastLabel) { P.wrongLabel = null; P.wrongCount = 0; return; } // gestur jawaban sebelumnya masih ditahan
  if (performance.now() < G.graceUntil) return;
  if (low === P.wrongLabel) P.wrongCount += 1; else { P.wrongLabel = low; P.wrongCount = 1; }
  if (P.wrongCount >= WRONG_STREAK) { P.lastLabel = low; gagal('salah', p); }
}

function pollDetect() {
  if (G.status !== 'playing' || G.paused || G.hold || !G.active || awaiting) return;
  const api = window.astaKanda;
  if (!api) return;
  const tangan = bacaTangan();
  const slot = [null, null]; // satu tangan per pemain
  if (G.mode === 1) slot[0] = tangan[0] || null;
  else tangan.forEach((t) => { const s = sisiPemain(t.x); if (!slot[s]) slot[s] = t; });
  el.split.classList.toggle('hand-1', !!slot[0]);
  el.split.classList.toggle('hand-2', !!slot[1]);
  G.players.forEach((P, i) => { if (!slot[i]) { P.lastLabel = null; P.wrongLabel = null; P.wrongCount = 0; G.detect[i] = '—'; } });
  setDetect();
  const kerja = slot.map((t, i) => (t ? { t, i } : null)).filter(Boolean);
  if (!kerja.length) return;
  awaiting = true;
  const sesi = G.session, soal = G.active;
  Promise.all(kerja.map(({ t, i }) =>
    fetch('/gesture/recognize', { method: 'POST', headers: api.jsonHeaders(), body: JSON.stringify({ landmarks: t.lm }) })
      .then((r) => r.json()).then((data) => ({ i, data })).catch(() => null),
  )).then((hasil) => {
    if (sesi !== G.session) return;
    hasil.filter(Boolean).forEach(({ i, data }) => proses(i, data, soal));
    setDetect();
  }).finally(() => { awaiting = false; });
}

/* ════════════════ Loop render ════════════════ */
let ukW = 0, ukH = 0, perluUkuran = true;
function ukuran() { // dipanggil di awal frame, tepat sebelum menggambar, jadi kanvas tidak pernah sempat kosong
  perluUkuran = false;
  const w = wrapEl.clientWidth, h = wrapEl.clientHeight;
  if (!w || !h || (w === ukW && h === ukH)) return;
  ukW = w; ukH = h;
  R.renderer.setSize(w, h, false);
  R.camera.aspect = w / h;
  // FOV 72 seperti referensi; di layar yang lebih tinggi dinaikkan sampai ~96° horizontal agar kelima hornet tetap utuh
  const perlu = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(48)) / R.camera.aspect));
  R.camera.fov = clamp(perlu, 72, 84);
  R.camera.updateProjectionMatrix();
}

// Turunkan resolusi bertahap bila perangkat benar-benar tidak sanggup (tidak pernah dinaikkan lagi, supaya tidak berkedip)
const RATIO_TURUN = [1.5, 1.25, 1];
function sesuaikanKualitas(dtMs) {
  ema += (dtMs - ema) * 0.04;
  lambat = ema > 24 ? lambat + 1 : Math.max(0, lambat - 2);
  if (lambat > 150 && kualitas < RATIO_TURUN.length) {   // ~2,5 detik terus-menerus di bawah ±40 fps
    const r = Math.min(R.ratio, RATIO_TURUN[kualitas]);
    kualitas += 1; lambat = 0; ema = 16;
    R.swarm.relStride = Math.min(4, R.swarm.relStride + 1); // animasi relief lebih jarang, gambar tetap tajam
    if (r < R.ratio) { R.ratio = r; R.renderer.setPixelRatio(r); ukW = 0; perluUkuran = true; }
  }
}

function update(dt) {
  T += dt;
  const { world, camera, weapon, particles, darts, swarm } = R;
  world.update(dt, T);

  if (G.status === 'playing' && G.active && !G.hold) {
    G.qLeft -= dt;
    if (G.qLeft <= 0) gagal('waktu', -1);
  }
  const ratio = G.active ? clamp(G.qLeft / G.qMax, 0, 1) : 0;
  if (Math.abs(ratio - rasioTimer) > 0.004) { // tulis ke DOM hanya bila berubah
    rasioTimer = ratio;
    el.timer.style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
    el.q.classList.toggle('mid', ratio < 0.5 && ratio >= 0.25);
    el.q.classList.toggle('low', ratio < 0.25 && !!G.active);
  }
  const tw = G.active ? Math.max(0, G.qLeft).toFixed(1) : '—';
  if (tw !== txtWaktu) { txtWaktu = tw; el.time.textContent = tw; }

  swarm.update(dt, T, camera.position);
  particles.update(dt);

  // Kamera menoleh halus (kecil) ke hornet yang dibidik; seluruh hornet tetap terlihat
  let ty = 0, tp = 0.05;
  if (G.active && G.status === 'playing') {
    const p = G.active.pos;
    ty = Math.atan2(-p.x, -p.z) * 0.18;
    tp = Math.atan2(p.y - 1.6, Math.hypot(p.x, p.z)) * 0.3;
  }
  const ny = damp(yaw, ty, 5, dt), np = damp(pitch, tp, 5, dt);
  const vYaw = (ny - yaw) / Math.max(dt, 1e-3), vPitch = (np - pitch) / Math.max(dt, 1e-3);
  yaw = ny; pitch = np;
  weapon.update(dt, T, vYaw, vPitch);
  aturBidik(dt);

  for (let i = darts.length - 1; i >= 0; i--) {
    const d = darts[i];
    bidik(d.h, _to);
    _dir.copy(_to).sub(d.m.position);
    const dist = _dir.length(), step = DART_SPEED * dt;
    if (dist > step + HIT_R) { // masih di jalan: terus mengejar posisi hornet terbaru
      _dir.multiplyScalar(1 / dist);
      d.m.position.addScaledVector(_dir, step);
      d.m.quaternion.setFromUnitVectors(_z, _dir);
    } else { // tepat mengenai hornet
      d.m.position.copy(_to);
      R.scene.remove(d.m);
      R.dartPool.push(d.m);
      darts.splice(i, 1);
      if (d.saatTiba) d.saatTiba();
    }
  }

  dmg = Math.max(0, dmg - dt * 1.6);
  if (Math.abs(dmg - dmgTampil) > 0.02 || (dmg === 0 && dmgTampil !== 0)) { dmgTampil = dmg; el.dmg.style.opacity = dmg.toFixed(2); }
  shake = Math.max(0, shake - dt * 2.4);
  const sh = shake * shake;
  camera.position.set(sh ? rand(-1, 1) * sh * 0.05 : 0, 1.6 + (sh ? rand(-1, 1) * sh * 0.05 : 0), 0);
  camera.rotation.set(pitch + (sh ? rand(-1, 1) * sh * 0.02 : 0), yaw + (sh ? rand(-1, 1) * sh * 0.02 : 0), sh ? rand(-1, 1) * sh * 0.04 : 0);
}

function frame(now) {
  rafId = requestAnimationFrame(frame);
  if (perluUkuran) ukuran();
  const dtMs = now - lastT;
  lastT = now;
  update(Math.min(0.05, dtMs / 1000));
  R.renderer.render(R.scene, R.camera);
  if (dtMs < 200) sesuaikanKualitas(dtMs); // abaikan lonjakan sesaat (mis. pindah tab)
}

/* ════════════════ Mulai / selesai ════════════════ */
function bersih() {
  G.session += 1;
  timers.forEach(clearTimeout); timers = [];
  clearInterval(pollTimer); clearInterval(clockTimer);
  pollTimer = clockTimer = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null; awaiting = false;
  Object.values(sfx).forEach((a) => { a.pause(); a.currentTime = 0; }); // suara game over tidak terbawa ke permainan berikutnya
  if (R) {
    R.darts.forEach((d) => { R.scene.remove(d.m); R.dartPool.push(d.m); });
    R.darts.length = 0;
    R.shots.length = 0; R.aim = null; aimK = 0; aimH = null;
    R.swarm.hideAll();
  }
}

async function start(cfg) {
  ambilEl();
  bersih();
  const sesi = G.session;
  G.cfg = cfg;
  G.pool = cfg.pool;
  G.mode = cfg.mode; G.wave = 1; G.kills = 0;
  G.players = cfg.names.map((nama) => ({ nama, lives: MAX_LIVES, score: 0, benar: 0, salah: 0, lastLabel: null, wrongLabel: null, wrongCount: 0 }));
  susunHud();
  renderHud();
  el.loading.classList.remove('hidden'); // popup pemuatan SELALU tampil dulu; hilang setelah semuanya siap
  teksMuat('Memuat arena 3D…');

  try { await buatScene(); } catch (err) {
    console.error(err);
    el.loading.classList.add('hidden');
    throw err;
  }
  if (sesi !== G.session) return; // pemain sudah keluar saat arena dimuat

  R.swarm.relStride = 2;
  Object.assign(G, { status: 'playing', paused: false, hold: true, queue: [], active: null, waveOver: false, detik: 0, detect: ['—', '—'] }); // hold: waktu & deteksi ditahan sampai popup hilang
  G.bestSebelum = bacaBest().skor;
  if (G.mode === 1) hud.rekor.textContent = G.bestSebelum;
  yaw = 0; pitch = 0.05; shake = dmg = 0; T = 0; rasioTimer = dmgTampil = -1; txtWaktu = '';
  ema = 16; lambat = 0; kualitas = 0;
  ukW = 0; perluUkuran = true;
  if (!resizeObs) { resizeObs = new ResizeObserver(() => { perluUkuran = true; }); resizeObs.observe(wrapEl); }

  if (window.AstaSound) { try { window.AstaSound.prepare(['backsound']); window.AstaSound.mount($('hunter-btn-atur')); window.AstaSound.startMusic(); } catch (e) { /* abaikan */ } }
  teksMuat('Menyiapkan hornet & suara…');
  await Promise.all([siapSuara('damage'), siapSuara('gameover')]); // muat lebih dulu agar tanpa jeda saat dibunyikan
  if (sesi !== G.session) return;
  mulaiGelombang(true);
  majukanHornet(); // hornet sudah berada di posisinya sebelum layar dibuka
  lastT = performance.now();
  rafId = requestAnimationFrame(frame);
  await frameSiap(3); // gambar beberapa frame di belakang popup agar tidak ada yang telat muncul
  if (sesi !== G.session) return;
  el.loading.classList.add('hidden');
  G.hold = false;
  G.graceUntil = performance.now() + GRACE_MS;
  bannerGelombang();
  pollTimer = setInterval(pollDetect, POLL_MS);
  clockTimer = setInterval(() => { if (G.status === 'playing' && !G.paused && !G.hold) G.detik += 1; }, 1000);
}

// Percepat animasi terbang-masuk hornet di belakang popup pemuatan (tanpa menggambar), berhenti saat semua hornet tenang
// shortcut: memakai posisi h.pos (hornets.js tidak ikut dicek), batas 160 langkah; upgrade: pakai fungsi 'langsung di posisi' bila ada di HornetSwarm
function majukanHornet() {
  const { swarm, camera } = R;
  const prev = swarm.hornets.map((h) => h.pos.clone());
  let tenang = 0;
  for (let i = 1; i <= 160; i++) {
    T += 0.05;
    swarm.update(0.05, T, camera.position);
    let maks = 0;
    swarm.hornets.forEach((h, k) => { maks = Math.max(maks, h.pos.distanceTo(prev[k])); prev[k].copy(h.pos); });
    tenang = maks < 0.04 ? tenang + 1 : 0;
    if (i >= 50 && tenang >= 4) break;
  }
}

// Jeda saat popup konfirmasi keluar tampil (timer, deteksi & render berhenti)
function jeda(on) {
  if (G.status !== 'playing') return;
  if (on && !G.paused) {
    G.paused = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  } else if (!on && G.paused) {
    G.paused = false;
    G.graceUntil = Math.max(G.graceUntil, performance.now() + 600);
    lastT = performance.now();
    rafId = requestAnimationFrame(frame);
  }
}

function stop() {
  bersih();
  G.paused = false;
  G.status = 'idle';
  if (window.AstaSound) { try { window.AstaSound.stopMusic(); } catch (e) { /* abaikan */ } }
  bunyi('gameover');
}

function sertifikatPemain(P, duo) {
  const dijawab = P.benar + P.salah;
  return {
    nama: P.nama, game: duo ? 'Hornet Hunter Battle' : 'Hornet Hunter', kesulitan: tingkat(G.wave), skor: P.score,
    waktu: G.detik, akurasi: dijawab ? Math.round((P.benar / dijawab) * 100) : 0,
    tanggal: new Date().toISOString(),
  };
}

// Mode 2 pemain: tiap pemain mendapat tombol & sertifikat sendiri (pemenang di kiri)
function pasangDuaSertifikat(popupEl, urut) {
  const asli = popupEl.querySelector('.asta-btn-sertifikat');
  if (!asli) return;
  popupEl.querySelectorAll('.hunter-cert-row').forEach((r) => r.remove());
  const row = document.createElement('div');
  row.className = 'hunter-cert-row';
  asli.insertAdjacentElement('afterend', row);
  urut.forEach((P) => {
    const b = asli.cloneNode(true); // salinan tidak membawa event lama; klik dipasang ulang di bawah
    b.classList.add('hunter-cert-btn');
    b.querySelector('span').textContent = 'Sertifikat ' + P.nama;
    b.title = 'Sertifikat ' + P.nama;
    b.addEventListener('click', () => { if (window.AstaSertifikat) window.AstaSertifikat.buka(sertifikatPemain(P, true)); });
    row.appendChild(b);
  });
  asli.remove();
}

// Pop up Game Over ala Apple Snake: tanpa emoji + 4 kartu statistik (Skor · Waktu · Benar · Salah). Memakai kelas .apple-stat* dari apple.css.
function rapikanPopupHasil(popupEl, judul, skorEl, skor, waktu, benar, salah) {
  judul.textContent = judul.textContent.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').trim();
  const lbl = Array.from(popupEl.querySelectorAll('*')).find((e) => !e.children.length && /^\s*waktu\s*$/i.test(e.textContent));
  const baris = lbl && lbl.parentElement && lbl.parentElement.parentElement;
  if (!baris) return; // shortcut: markup hasil.js berubah -> kartu bawaan dibiarkan; upgrade dengan menyesuaikan pencarian baris
  const kartu = (kelas, ikon, nilai, label) =>
    '<div class="apple-stat apple-stat--' + kelas + '"><span class="apple-stat-ico">' + ikon + '</span>' +
    '<span class="apple-stat-val">' + nilai + '</span><span class="apple-stat-lbl">' + label + '</span></div>';
  baris.classList.add('apple-stats');
  baris.innerHTML = kartu('skor', ICON_TROPHY, skor, 'Skor') + kartu('waktu', ICON_JAM, waktu, 'Waktu') +
    kartu('benar', ICON_OK, benar, 'Benar') + kartu('salah', ICON_NO, salah, 'Salah');
  const lama = skorEl.parentElement; // baris "Skor: n" lama sudah jadi kartu pertama
  if (lama && lama !== baris) {
    if (lama.contains(baris)) {
      lama.childNodes.forEach((n) => { if (n.nodeType === 3) n.nodeValue = ''; });
      Array.from(lama.children).forEach((e) => { if (e !== baris && !e.contains(baris)) e.style.display = 'none'; });
    } else lama.style.display = 'none';
  }
}

// Mode 2 pemain memakai tampilan bawaan: batalkan perapian dari permainan 1 pemain sebelumnya (popup dipakai ulang)
function pulihkanPopupHasil(popupEl, skorEl) {
  const row = popupEl.querySelector('.asta-hasil-stats');
  if (row) row.classList.remove('apple-stats');
  if (skorEl.parentElement) Array.from(skorEl.parentElement.children).forEach((e) => { e.style.display = ''; });
}

function selesai() {
  if (G.status !== 'playing') return;
  G.status = 'over';
  clearInterval(pollTimer); clearInterval(clockTimer);
  pollTimer = clockTimer = null;
  if (window.AstaSound) { try { window.AstaSound.stopMusic(); } catch (e) { /* abaikan */ } }

  const duo = G.mode === 2;
  let menang = 0; // pemain yang dirayakan (1 pemain: dirinya sendiri)
  let seri = false;
  if (duo) {
    const [a, b] = G.players;
    if (a.lives <= 0 && b.lives > 0) menang = 1;
    else if (b.lives <= 0 && a.lives > 0) menang = 0;
    else if (a.score === b.score) seri = true;
    else menang = a.score > b.score ? 0 : 1;
  }
  const W = G.players[menang];
  const rekorBaru = !duo && W.score > 0 && W.score > G.bestSebelum;
  if (rekorBaru) { try { localStorage.setItem(BEST_KEY, JSON.stringify({ nama: W.nama, skor: W.score })); } catch (e) { /* abaikan */ } }
  if (!duo) hud.rekor.textContent = Math.max(G.bestSebelum, W.score);

  const popupEl = $('hunter-result'), judul = $('hunter-result-title'), skor = $('hunter-result-skor'), badge = $('hunter-result-rekor');
  skor.textContent = seri ? G.players[0].score : W.score;
  badge.classList.toggle('hidden', !rekorBaru);
  badge.innerHTML = rekorBaru ? ICON_TROPHY + '<span>Skor tertinggimu meningkat!</span>' : '';
  const stats = duo
    ? [
      { label: esc(G.players[0].nama), nilai: G.players[0].score },
      { label: esc(G.players[1].nama), nilai: G.players[1].score },
      { label: 'Gelombang', nilai: G.wave },
      { label: 'Waktu', nilai: formatWaktu(G.detik) },
    ]
    : [
      { label: 'Waktu', nilai: formatWaktu(G.detik) },
      { label: 'Benar', nilai: W.benar, kelas: 'stat-good' },
      { label: 'Salah', nilai: W.salah, kelas: 'stat-bad' },
    ];
  const judulNormal = !duo ? 'Game Over' : seri ? 'Seri!' : W.nama + ' Menang!';
  popupEl.querySelectorAll('.hunter-cert-row').forEach((r) => r.remove()); // sisa tombol dari battle sebelumnya
  if (window.AstaHasil) {
    window.AstaHasil.terapkan({
      popup: popupEl, judul, skor, tombolAnchor: $('hunter-btn-ulangi'),
      rekor: rekorBaru, judulNormal, stats, sertifikat: sertifikatPemain(W, duo),
    });
    if (duo) pasangDuaSertifikat(popupEl, menang === 0 ? [G.players[0], G.players[1]] : [G.players[1], G.players[0]]);
  } else {
    judul.textContent = judulNormal;
  }
  if (!duo) rapikanPopupHasil(popupEl, judul, skor, W.score, formatWaktu(G.detik), W.benar, W.salah);
  else pulihkanPopupHasil(popupEl, skor);
  // Leaderboard (berdasarkan skor): disimpan oleh hunter-ui.js
  const ui = window.AstaKandaGames && window.AstaKandaGames.hunter;
  if (ui && ui.catat) ui.catat(G.players.map((P) => ({ nama: P.nama, skor: P.score })));
  popupEl.classList.remove('hidden');
}

export default { start, stop, siapkan, jeda };