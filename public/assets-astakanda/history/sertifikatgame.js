/* =====================================================================
   ASTA KANDA — sertifikatgame.js
   Letakkan di: public/assets-astakanda/history/sertifikatgame.js
   Sertifikat peringkat "Peringkat Game": digambar di canvas, diunduh sebagai PNG atau PDF.
   Dipanggil dari leaderboardgame.js lewat window.AstaKandaSertifikatGame.buka(data).
   Desain khas tiap game (Apple Snake, Dino Attack, Snakes & Ladders, Hornet Hunter);
   di dalam tiap game: Juara 1 (emas + mahkota), Juara 2 (perak), Juara 3 (perunggu) masing-masing khas,
   peringkat 4 dst memakai satu desain yang sama.
   Popup memakai kelas .lbc-* dari sertifikatleaderboardujian.css (wajib dimuat).
   ===================================================================== */
(function () {
  const W = 1754, H = 1240; // A4 landscape @150dpi
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Segoe UI", Roboto, Arial, sans-serif';
  const NAVY = '#1e293b', HITAM = '#0f172a';
  const LOGO_SRC = '/assets/images/logo.png';

  // Logam peringkat 1-3 (sama untuk semua game, supaya juara terbaca jelas)
  const LOGAM = {
    1: { light: '#f8de8a', main: '#c9962b', dark: '#8a6212' },
    2: { light: '#eef2f8', main: '#8493a8', dark: '#566579' },
    3: { light: '#f3cfa6', main: '#b87333', dark: '#7a4519' },
  };
  // Tema tiap game: latar, warna utama, warna hias, dan logam untuk peringkat 4 dst (n)
  const GAME = {
    apple:   { nama: 'Apple Snake',      bg1: '#f6fff2', bg2: '#dcf4d3', main: '#2f9e44', dark: '#1b5e20', ink: '#14532d', acc: '#e03131', skor: '#2b8a3e', n: { light: '#b7f0b1', main: '#2f9e44', dark: '#1b5e20' } },
    dino:    { nama: 'Dino Attack',      bg1: '#fff8ef', bg2: '#ffe3c2', main: '#e8590c', dark: '#7c2d12', ink: '#7c2d12', acc: '#2f9e44', skor: '#c2410c', n: { light: '#ffc58f', main: '#e8590c', dark: '#7c2d12' } },
    ladders: { nama: 'Snakes & Ladders', bg1: '#faf5ff', bg2: '#e6dbff', main: '#7048e8', dark: '#3b1f9a', ink: '#3b1f9a', acc: '#f59f00', skor: '#5f3dc4', n: { light: '#cdbbff', main: '#7048e8', dark: '#3b1f9a' } },
    hunter:  { nama: 'Hornet Hunter',    bg1: '#fffbea', bg2: '#ffe9a3', main: '#f59f00', dark: '#1f1f1f', ink: '#1f1f1f', acc: '#f59f00', skor: '#b45309', n: { light: '#ffe08a', main: '#f59f00', dark: '#8a5a00' } },
  };
  const GAMBAR = ['/assets/images/apple.png', '/assets/images/dino.png', '/assets/images/ladders.png', '/assets/images/hornet.png'];

  const SVG_AWARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const SVG_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  const SVG_PDF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  let modal = null, canvas = null, dataAktif = null, fokusAwal = null;

  // Gambar dimuat sejak awal supaya sertifikat langsung tergambar saat dibuka (semuanya satu domain: canvas tetap bisa diunduh)
  const gbr = {};
  const muat = (src) => {
    if (!src) return null;
    if (!gbr[src]) { const im = new Image(); im.onerror = () => { im.gagal = true; }; im.src = src; gbr[src] = im; }
    return gbr[src];
  };
  const siap = (im) => !!(im && im.complete && im.naturalWidth);
  muat(LOGO_SRC);
  GAMBAR.forEach(muat);

  /* ---------- Helper ---------- */
  function tanggal(iso) {
    const d = iso ? new Date(iso) : new Date();
    return isNaN(d) ? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function spasi(g, teks, cx, y, jarak) {   // letterSpacing canvas belum didukung semua browser
    const huruf = Array.from(teks);
    const lebar = huruf.reduce((t, h) => t + g.measureText(h).width + jarak, -jarak);
    let x = cx - lebar / 2;
    g.textAlign = 'left';
    huruf.forEach((h) => { g.fillText(h, x, y); x += g.measureText(h).width + jarak; });
    g.textAlign = 'center';
  }
  function kotak(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function logam(g, x0, y0, x1, y1, M) {   // gradien logam: terang - utama - gelap
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, M.light);
    gr.addColorStop(.5, M.main);
    gr.addColorStop(1, M.dark);
    return gr;
  }
  function pas(g, teks, lebarMax, px, bobot, fam, min) {   // kecilkan font sampai muat
    let s = px;
    g.font = bobot + ' ' + s + 'px ' + fam;
    while (g.measureText(teks).width > lebarMax && s > (min || 20)) { s -= 2; g.font = bobot + ' ' + s + 'px ' + fam; }
    return s;
  }
  const bulat = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const elips = (g, x, y, rx, ry, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fill(); };

  /* ---------- Ornamen umum (logam peringkat) ---------- */
  function sinar(g, cx, cy, M) {   // sinar tipis di belakang isi (Juara 1-3)
    g.save();
    g.beginPath(); g.rect(66, 66, W - 132, H - 132); g.clip();
    g.fillStyle = M.main; g.globalAlpha = 0.09;
    const n = 44;
    for (let i = 0; i < n; i += 2) {
      const a = (Math.PI * 2 * i) / n, b = (Math.PI * 2 * (i + 1)) / n;
      g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 1800, cy + Math.sin(a) * 1800);
      g.lineTo(cx + Math.cos(b) * 1800, cy + Math.sin(b) * 1800);
      g.closePath(); g.fill();
    }
    g.restore();
  }
  function pita(g, cx, y, w, h, M, teks) {   // pita judul dengan ekor
    const x = cx - w / 2;
    g.fillStyle = M.dark;
    g.beginPath();
    g.moveTo(x - 56, y + 12); g.lineTo(x + 24, y + 12); g.lineTo(x + 24, y + h + 12); g.lineTo(x - 56, y + h + 12); g.lineTo(x - 24, y + h / 2 + 12);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(x + w + 56, y + 12); g.lineTo(x + w - 24, y + 12); g.lineTo(x + w - 24, y + h + 12); g.lineTo(x + w + 56, y + h + 12); g.lineTo(x + w + 24, y + h / 2 + 12);
    g.closePath(); g.fill();
    g.fillStyle = logam(g, x, y, x, y + h, M);
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,.28)';
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 24, y + h); g.lineTo(x + 24, y + h + 12); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + w, y + h); g.lineTo(x + w - 24, y + h); g.lineTo(x + w - 24, y + h + 12); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.font = '800 34px ' + SANS;
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    spasi(g, teks, cx, y + h / 2 + 12, 9);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  function daun(g, cx, cy, R, M) {   // karangan daun di kiri-kanan segel; bagian atas terbuka untuk mahkota
    for (const sisi of [1, -1]) {
      for (let i = 0; i < 8; i++) {
        const a = ((118 + i * 14) * Math.PI) / 180;
        const x = cx + sisi * R * Math.cos(a), y = cy + R * Math.sin(a);
        let rot = a + Math.PI / 2 + 0.35;
        if (sisi < 0) rot = Math.PI - rot;
        const s = (1 - i * 0.035) * 0.8;
        g.save();
        g.translate(x, y); g.rotate(rot);
        g.fillStyle = logam(g, -22, -8, 22, 8, M);
        g.beginPath(); g.ellipse(0, 0, 21 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-17 * s, 0); g.lineTo(17 * s, 0); g.stroke();
        g.restore();
      }
    }
  }
  function mahkota(g, cx, y, lebar) {
    g.save();
    g.translate(cx - lebar / 2, y);
    const k = lebar / 64;
    g.scale(k, k);
    const gr = g.createLinearGradient(0, 0, 0, 56);
    gr.addColorStop(0, '#FFE08A'); gr.addColorStop(1, '#F59E0B');
    g.fillStyle = gr; g.strokeStyle = '#a8741a'; g.lineWidth = 2.4; g.lineJoin = 'round';
    const p = new Path2D('M8 46 4 18l14 12 14-20 14 20 14-12-4 28z');
    g.fill(p); g.stroke(p);
    g.fillStyle = '#F5B942';
    kotak(g, 8, 46, 48, 8, 3); g.fill(); g.stroke();
    [['#3B82F6', 32, 38, 4], ['#EF4444', 19, 40, 3], ['#EF4444', 45, 40, 3]].forEach((j) => { g.fillStyle = j[0]; bulat(g, j[1], j[2], j[3]); });
    g.restore();
  }
  function segel(g, cx, cy, M, nomor, top3) {   // segel bergerigi berisi nomor peringkat
    const n = top3 ? 32 : 24, k = 0.75;
    g.fillStyle = logam(g, cx - 60, cy - 60, cx + 60, cy + 60, M);
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n, r = (i % 2 ? 68 : 80) * k;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3.5;
    g.beginPath(); g.arc(cx, cy, 56 * k, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 47 * k, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff';
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
    g.font = '800 ' + Math.round((nomor > 99 ? 40 : nomor > 9 ? 50 : 64) * k) + 'px ' + SERIF;
    g.textBaseline = 'middle';
    g.fillText(String(nomor), cx, cy + 2);
    g.textBaseline = 'alphabetic';
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }

  /* ---------- Hiasan khas tiap game (di pita samping kiri/kanan 100-200px & garis atas/bawah; isi tengah tidak tersentuh) ---------- */
  function apel(g, x, y, r, emas) {
    if (emas) {   // lingkar cahaya lembut di belakang apel emas
      const h = g.createRadialGradient(x, y, r * .5, x, y, r * 1.7);
      h.addColorStop(0, 'rgba(255,214,10,.5)'); h.addColorStop(1, 'rgba(255,214,10,0)');
      g.fillStyle = h; bulat(g, x, y, r * 1.7);
    }
    const gr = g.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
    if (emas) { gr.addColorStop(0, '#fff3bf'); gr.addColorStop(.55, '#fcc419'); gr.addColorStop(1, '#d9730d'); }
    else { gr.addColorStop(0, '#ff8787'); gr.addColorStop(.6, '#e03131'); gr.addColorStop(1, '#a61e1e'); }
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x - r * .38, y, r * .72, Math.PI * .5, Math.PI * 1.5);
    g.arc(x + r * .38, y, r * .72, Math.PI * 1.5, Math.PI * .5);
    g.closePath(); g.fill();
    g.strokeStyle = emas ? 'rgba(146,84,0,.55)' : 'rgba(110,20,20,.45)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; elips(g, x - r * .4, y - r * .3, r * .16, r * .3, .5);
    g.strokeStyle = '#6b3e1a'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y - r * .55); g.quadraticCurveTo(x + 2, y - r * .9, x + 6, y - r * 1.05); g.stroke();
    g.fillStyle = emas ? '#74b816' : '#40c057'; elips(g, x + r * .45, y - r * .8, r * .4, r * .17, -.5);
  }
  function hiasApple(g, T) {
    // deretan apel merah & emas bergantian di kiri dan kanan (hanya objek apel, tanpa ranting)
    [[150, ['m', 'e', 'm', 'e', 'm', 'e']], [W - 150, ['e', 'm', 'e', 'm', 'e', 'm']]].forEach((v) => {
      for (let i = 0; i < 6; i++) apel(g, v[0] + (i % 2 ? 16 : -16), 210 + i * 176, 28, v[1][i] === 'e');
    });
  }
  function jejak(g, x, y, rot, s) {   // jejak kaki dinosaurus tiga jari
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    elips(g, 0, 12, 19, 16, 0);
    elips(g, -22, -14, 7, 14, -.38); elips(g, 0, -24, 7.5, 15, 0); elips(g, 22, -14, 7, 14, .38);
    g.beginPath(); g.moveTo(-26, -29); g.lineTo(-22, -40); g.lineTo(-18, -29); g.moveTo(-4, -39); g.lineTo(0, -51); g.lineTo(4, -39); g.moveTo(18, -29); g.lineTo(22, -40); g.lineTo(26, -29); g.fill();
    g.restore();
  }
  function hiasDino(g, T) {
    g.fillStyle = T.main; g.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      const dx = i % 2 ? 190 : 134, y = 210 + i * 118;
      jejak(g, dx, y, i % 2 ? .22 : -.22, 1);
      jejak(g, W - dx, y + 40, i % 2 ? -.22 : .22, 1);
    }
    g.globalAlpha = 1;
    // duri bergerigi di garis atas & bawah
    for (let x = 150; x < W - 150; x += 40) {
      g.fillStyle = T.main;
      g.beginPath(); g.moveTo(x, 66); g.lineTo(x + 40, 66); g.lineTo(x + 20, 88); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x, 1174); g.lineTo(x + 40, 1174); g.lineTo(x + 20, 1152); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.beginPath(); g.moveTo(x + 6, 66); g.lineTo(x + 20, 66); g.lineTo(x + 20, 84); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(x + 6, 1174); g.lineTo(x + 20, 1174); g.lineTo(x + 20, 1156); g.closePath(); g.fill();
    }
  }
  function hiasLadders(g, T) {
    // tangga di kiri
    const r1 = 122, r2 = 188;
    g.lineCap = 'round';
    g.strokeStyle = '#b45309'; g.lineWidth = 11;
    g.beginPath(); g.moveTo(r1, 150); g.lineTo(r1, 1100); g.moveTo(r2, 150); g.lineTo(r2, 1100); g.stroke();
    g.strokeStyle = '#fbbf24'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(r1 - 2, 152); g.lineTo(r1 - 2, 1098); g.moveTo(r2 - 2, 152); g.lineTo(r2 - 2, 1098); g.stroke();
    g.strokeStyle = '#d97706'; g.lineWidth = 9;
    for (let y = 185; y < 1100; y += 60) { g.beginPath(); g.moveTo(r1, y); g.lineTo(r2, y); g.stroke(); }
    g.fillStyle = '#78350f';
    for (let y = 185; y < 1100; y += 60) { bulat(g, r1, y, 3); bulat(g, r2, y, 3); }
    // ular belang ungu-kuning di kanan (kepala di bawah)
    const cx = (y) => W - 154 + 24 * Math.sin(y / 70 + 1), y0 = 150, y1 = 1050;
    const rr = (y) => 20 - 12 * Math.max(0, (270 - y) / 120);
    for (let y = y0; y <= y1; y += 4) { g.fillStyle = '#2b1670'; bulat(g, cx(y), y, rr(y) + 3); }
    for (let y = y0; y <= y1; y += 4) { g.fillStyle = Math.floor(y / 26) % 2 ? '#ffd43b' : '#7048e8'; bulat(g, cx(y), y, rr(y)); }
    const hx = cx(y1), hy = y1 + 22;
    g.strokeStyle = '#e03131'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(hx, hy + 16); g.lineTo(hx, hy + 36); g.moveTo(hx, hy + 36); g.lineTo(hx - 8, hy + 46); g.moveTo(hx, hy + 36); g.lineTo(hx + 8, hy + 46); g.stroke();
    g.fillStyle = '#2b1670'; elips(g, hx, hy, 30, 25, 0);
    g.fillStyle = '#7048e8'; elips(g, hx, hy, 27, 22, 0);
    g.fillStyle = '#fff'; bulat(g, hx - 10, hy + 2, 7); bulat(g, hx + 10, hy + 2, 7);
    g.fillStyle = '#111'; bulat(g, hx - 10, hy + 3, 3.5); bulat(g, hx + 10, hy + 3, 3.5);
    // papan catur di bawah
    for (let x = 120, i = 0; x < W - 120; x += 20, i++) {
      g.fillStyle = i % 2 ? T.acc : T.main;
      g.fillRect(x, 1146, 20, 20);
    }
  }
  function heks(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i - Math.PI / 6; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    g.closePath();
  }
  function hiasHunter(g, T) {
    // sarang lebah di kiri & kanan
    const r = 22, dx = r * Math.sqrt(3), dy = r * 1.5;
    for (let sisi = 0; sisi < 2; sisi++) {
      for (let row = 0; row < 28; row++) {
        for (let col = 0; col < 3; col++) {
          const x0 = 108 + col * dx + (row % 2 ? dx / 2 : 0), y = 150 + row * dy;
          const x = sisi ? W - x0 : x0;
          const isi = (row * 3 + col * 5) % 7;
          g.fillStyle = isi === 0 ? 'rgba(31,31,31,.75)' : isi < 3 ? 'rgba(245,159,0,.55)' : 'rgba(245,159,0,.18)';
          heks(g, x, y, r - 2); g.fill();
          g.strokeStyle = 'rgba(138,90,0,.55)'; g.lineWidth = 2; g.stroke();
        }
      }
    }
    // pita peringatan hitam-kuning di atas & bawah
    [[70, 18], [1148, 18]].forEach((b) => {
      const y = b[0], h = b[1];
      g.save();
      g.beginPath(); g.rect(130, y, W - 260, h); g.clip();
      g.fillStyle = '#fcc419'; g.fillRect(130, y, W - 260, h);
      g.fillStyle = '#1a1a1a';
      for (let x = 100; x < W - 100; x += 36) {
        g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 18, y + h); g.lineTo(x + 18 + h, y); g.lineTo(x + h, y); g.closePath(); g.fill();
      }
      g.restore();
    });
  }
  const HIAS = { apple: hiasApple, dino: hiasDino, ladders: hiasLadders, hunter: hiasHunter };

  /* ---------- Kotak GAME: ikon game + nama dalam satu baris, rata tengah ---------- */
  function kotakGame(g, x, by, bw, nama, src, M) {
    const s = 50, gap = 14, pad = 20, iy = by + 98;
    // ukuran huruf seragam untuk semua game: mengikuti nama terpanjang agar tetap satu baris
    const maxW = bw - pad * 2 - (s + 6) - gap;
    const px = Math.min(...Object.keys(GAME).map((k) => GAME[k].nama).concat(nama).map((t) => pas(g, t, maxW, 34, '800', SANS, 18)));
    g.font = '800 ' + px + 'px ' + SANS;
    const tw = g.measureText(nama).width, total = s + 6 + gap + tw;
    const ix = x + bw / 2 - total / 2 + (s + 6) / 2;
    g.fillStyle = '#fff'; bulat(g, ix, iy, s / 2 + 3);
    g.strokeStyle = M.main; g.lineWidth = 3; g.beginPath(); g.arc(ix, iy, s / 2 + 3, 0, Math.PI * 2); g.stroke();
    const ik = muat(src);
    if (siap(ik)) {
      const r = Math.min((s - 4) / ik.naturalWidth, (s - 4) / ik.naturalHeight);
      g.save(); g.beginPath(); g.arc(ix, iy, s / 2 - 1, 0, Math.PI * 2); g.clip();
      g.drawImage(ik, ix - (ik.naturalWidth * r) / 2, iy - (ik.naturalHeight * r) / 2, ik.naturalWidth * r, ik.naturalHeight * r);
      g.restore();
    }
    g.fillStyle = NAVY; g.textAlign = 'left';
    g.fillText(nama, ix + (s + 6) / 2 + gap, iy + px * 0.35);
    g.textAlign = 'center';
  }

  /* ---------- Gambar sertifikat ---------- */
  function gambar(d) {
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const rank = Math.max(1, parseInt(d.peringkat, 10) || 1);
    const top3 = rank <= 3;
    const key = GAME[d.game] ? d.game : 'apple';
    const T = GAME[key];
    const M = top3 ? LOGAM[rank] : T.n;          // logam: emas/perak/perunggu untuk 1-3, warna game untuk 4 dst
    const gameNama = String(d.gameNama || T.nama);
    const kemenangan = d.satuan === 'Kemenangan';
    const skor = Number(d.skor) || 0;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    // latar
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, T.bg1); bg.addColorStop(1, T.bg2);
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    if (top3) sinar(g, W / 2, 600, M);

    // hiasan khas game
    g.save();
    g.beginPath(); g.rect(67, 67, W - 134, H - 134); g.clip();
    HIAS[key](g, T);
    g.restore();

    // bingkai ganda + sudut
    g.strokeStyle = logam(g, 0, 0, W, H, M); g.lineWidth = 12;
    g.strokeRect(36, 36, W - 72, H - 72);
    g.strokeStyle = T.dark; g.lineWidth = 2;
    g.strokeRect(66, 66, W - 132, H - 132);
    g.fillStyle = M.main;
    [[36, 36, 0], [W - 36, 36, Math.PI / 2], [W - 36, H - 36, Math.PI], [36, H - 36, Math.PI * 1.5]].forEach((c) => {
      g.beginPath(); g.moveTo(c[0], c[1]); g.arc(c[0], c[1], 84, c[2], c[2] + Math.PI / 2); g.closePath(); g.fill();
    });

    // logo
    const logo = muat(LOGO_SRC);
    if (siap(logo)) {
      const lh = 132, lw = (logo.naturalWidth / logo.naturalHeight) * lh;
      g.drawImage(logo, (W - lw) / 2, 98, lw, lh);
    }
    // judul
    g.fillStyle = T.ink;
    g.font = '700 92px ' + SERIF;
    spasi(g, 'SERTIFIKAT', W / 2, 314, 16);
    g.fillStyle = HITAM;
    g.font = '700 30px ' + SANS;
    spasi(g, 'PENGHARGAAN LEADERBOARD ' + gameNama.toUpperCase(), W / 2, 360, 7);
    pita(g, W / 2, 390, 560, 58, M, top3 ? 'JUARA ' + rank : 'PERINGKAT ' + rank);

    // nama pemain
    g.fillStyle = '#64748b';
    g.font = 'italic 500 32px ' + SERIF;
    g.fillText('Diberikan kepada', W / 2, 526);
    const nama = String(d.nama || 'Pemain').trim();
    pas(g, nama, 1200, 96, 'italic 700', SERIF, 40);
    g.fillStyle = NAVY;
    g.fillText(nama, W / 2, 630);
    const lw2 = Math.max(700, Math.min(1300, g.measureText(nama).width + 120));
    g.strokeStyle = logam(g, (W - lw2) / 2, 0, (W + lw2) / 2, 0, M); g.lineWidth = 4;
    g.beginPath(); g.moveTo((W - lw2) / 2, 658); g.lineTo((W + lw2) / 2, 658); g.stroke();

    // keterangan
    g.fillStyle = '#334155';
    g.font = '500 32px ' + SANS;
    g.fillText('atas prestasinya meraih Peringkat ' + rank + ' dari ' + (d.peserta || rank) + ' pemain pada', W / 2, 716);
    g.fillText('Leaderboard ' + gameNama + ' dengan ' + (kemenangan ? skor + ' kemenangan' : 'skor tertinggi ' + skor), W / 2, 761);

    // kotak hasil
    const item = [
      { l: kemenangan ? 'KEMENANGAN' : 'SKOR', v: String(skor), c: T.skor },
      { l: 'PERINGKAT', v: '#' + rank, c: M.dark },
      { l: 'PEMAIN', v: String(d.peserta || rank), c: NAVY },
      { l: 'GAME', v: gameNama, c: NAVY },
    ];
    const bw = 300, gap = 30, bx = (W - (4 * bw + 3 * gap)) / 2, by = 786, bh = 140;
    item.forEach((it, i) => {
      const x = bx + i * (bw + gap);
      g.fillStyle = '#ffffff'; kotak(g, x, by, bw, bh, 22); g.fill();
      g.strokeStyle = M.main; g.globalAlpha = 0.7; g.lineWidth = 3; g.stroke(); g.globalAlpha = 1;
      g.fillStyle = '#64748b'; g.font = '700 22px ' + SANS;
      spasi(g, it.l, x + bw / 2, by + 50, 4);
      if (i === 3) { kotakGame(g, x, by, bw, it.v, d.gambar, M); return; }
      g.fillStyle = it.c;
      pas(g, it.v, bw - 36, it.v.length > 5 ? 54 : 66, '800', SANS, 24);
      g.fillText(it.v, x + bw / 2, by + 114);
    });

    // kaki: tanggal - segel peringkat - penyelenggara
    const cy = 1064;
    if (top3) daun(g, W / 2, cy, 72, M);
    if (rank === 1) mahkota(g, W / 2, cy - 65 - 54 * (76 / 64), 76);
    segel(g, W / 2, cy, M, rank, top3);
    g.strokeStyle = NAVY; g.lineWidth = 2;
    [[240, 560], [1194, 1514]].forEach((p) => { g.beginPath(); g.moveTo(p[0], cy + 18); g.lineTo(p[1], cy + 18); g.stroke(); });
    g.fillStyle = NAVY;
    g.font = '600 30px ' + SERIF;
    g.fillText(tanggal(d.tanggal), 400, cy + 4);
    g.font = 'italic 700 38px ' + SERIF;
    g.fillText('ASTA KANDA', 1354, cy + 4);
    g.fillStyle = HITAM;
    g.font = '700 26px ' + SANS;
    g.fillText('Tanggal', 400, cy + 52);
    g.fillText('Penyelenggara Game', 1354, cy + 52);
  }

  // PDF A4 landscape berisi 1 gambar JPEG satu halaman penuh, tanpa library.
  // shortcut: hanya 1 halaman & 1 gambar, upgrade ke jsPDF bila perlu teks/vektor atau banyak halaman
  function pdfDariJpeg(jpeg, w, h) {
    const enc = new TextEncoder();
    const bagian = [];
    const offs = [];
    let pos = 0;
    const tambah = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; bagian.push(b); pos += b.length; };
    const obj = (n, isi, aliran) => {
      offs[n] = pos;
      tambah(n + ' 0 obj\n' + isi + (aliran ? '\nstream\n' : '\n'));
      if (aliran) { tambah(aliran); tambah('\nendstream\n'); }
      tambah('endobj\n');
    };
    const isiHalaman = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
    tambah('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    obj(4, '<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>', jpeg);
    obj(5, '<< /Length ' + isiHalaman.length + ' >>', isiHalaman);
    const xref = pos;
    let tabel = 'xref\n0 6\n0000000000 65535 f \n';
    for (let n = 1; n <= 5; n++) tabel += String(offs[n]).padStart(10, '0') + ' 00000 n \n';
    tambah(tabel + 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(bagian, { type: 'application/pdf' });
  }

  /* ---------- Popup ---------- */
  const terbuka = () => !!modal && !modal.classList.contains('hidden');
  function pastikanModal() {
    if (modal) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="sgc-modal" class="lbc hidden">' +
        '<div class="lbc-card" role="dialog" aria-modal="true" aria-labelledby="sgc-title">' +
          '<button type="button" id="sgc-x" class="lbc-x" aria-label="Tutup">' + SVG_X + '</button>' +
          '<div class="lbc-head"><span class="lbc-ico">' + SVG_AWARD + '</span><div class="lbc-title" id="sgc-title">Sertifikat</div></div>' +
          '<div class="lbc-view"><canvas id="sgc-canvas" width="1754" height="1240"></canvas></div>' +
          '<div class="lbc-foot">' +
            '<button type="button" id="sgc-png" class="lbc-btn lbc-img">' + SVG_IMG + '<span>Unduh Image</span></button>' +
            '<button type="button" id="sgc-pdf" class="lbc-btn lbc-pdf">' + SVG_PDF + '<span>Unduh PDF</span></button>' +
          '</div>' +
        '</div></div>');
    modal = document.getElementById('sgc-modal');
    canvas = document.getElementById('sgc-canvas');
    document.getElementById('sgc-x').addEventListener('click', tutup);
    document.getElementById('sgc-png').addEventListener('click', unduhPng);
    document.getElementById('sgc-pdf').addEventListener('click', unduhPdf);
    modal.addEventListener('click', (e) => { if (e.target === modal) tutup(); });   // klik area luar popup
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {   // fokus berputar di dalam popup
        const f = Array.from(modal.querySelectorAll('button')), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && terbuka()) { e.stopPropagation(); tutup(); } });
  }
  function tutup() {
    modal.classList.add('hidden');
    if (fokusAwal && fokusAwal.focus && document.contains(fokusAwal)) fokusAwal.focus();
  }
  function namaFile(ekstensi) {
    const slug = (s, def) => String(s || def).trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || def;
    return 'Sertifikat-' + slug(dataAktif && dataAktif.gameNama, 'Game') + '-Peringkat-' + ((dataAktif && dataAktif.peringkat) || 0) + '-' + slug(dataAktif && dataAktif.nama, 'pemain') + '.' + ekstensi;
  }
  function simpan(blob, nama) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u; a.download = nama;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  function unduhPng() {
    if (!dataAktif) return;
    canvas.toBlob((b) => { if (b) simpan(b, namaFile('png')); }, 'image/png');
  }
  function unduhPdf() {
    if (!dataAktif) return;
    canvas.toBlob(async (b) => {
      if (!b) return;
      const jpeg = new Uint8Array(await b.arrayBuffer());
      simpan(pdfDariJpeg(jpeg, canvas.width, canvas.height), namaFile('pdf'));
    }, 'image/jpeg', 0.95);
  }

  function buka(d) {
    pastikanModal();
    dataAktif = d;
    fokusAwal = document.activeElement;
    const rank = Math.max(1, parseInt(d.peringkat, 10) || 1);
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    document.getElementById('sgc-title').innerHTML = '<span>Sertifikat ' + (rank <= 3 ? 'Juara ' + rank : 'Peringkat ' + rank) + '</span><small>' + esc(d.gameNama || 'Game') + '</small>';
    gambar(d);                                  // langsung tergambar (gambar sudah dimuat di awal)
    const belum = [muat(LOGO_SRC), muat(d.gambar)].filter((im) => im && !im.complete);
    belum.forEach((im) => im.addEventListener('load', () => { if (terbuka() && dataAktif === d) gambar(d); }, { once: true }));
    modal.classList.remove('hidden');
    document.getElementById('sgc-x').focus();
  }

  window.AstaKandaSertifikatGame = { buka: buka, terbuka: terbuka };
})();