/* =====================================================================
   ASTA KANDA — sertifikatleaderboardujian.js
   Letakkan di: public/assets-astakanda/ujian/sertifikatleaderboardujian.js
   Sertifikat peringkat Leaderboard Ujian: digambar di canvas, diunduh sebagai PNG atau PDF.
   Dipanggil dari leaderboardujian.js lewat window.AstaKandaSertifikatLeaderboard.buka(data).
   Desain: Juara 1 (emas + mahkota), Juara 2 (perak), Juara 3 (perunggu) masing-masing khas;
   peringkat 4 dst memakai satu desain yang sama (toska).
   Pasangan CSS: sertifikatleaderboardujian.css (mandiri, tidak butuh kelas dari ujian.css).
   ===================================================================== */
(function () {
  const W = 1754, H = 1240; // A4 landscape @150dpi
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Segoe UI", Roboto, Arial, sans-serif';
  const LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit', custom: 'Custom' };
  const NAVY = '#1e293b', HITAM = '#0f172a';
  const LOGO_SRC = '/assets/images/logo.png';

  // Palet per peringkat: bg1/bg2 latar, main/light/dark warna logam, ink warna judul
  const TEMA = {
    1: { bg1: '#fffdf4', bg2: '#fff1c4', main: '#c9962b', light: '#f8de8a', dark: '#8a6212', ink: '#6b4a06', label: 'JUARA 1', rays: true },
    2: { bg1: '#fcfdff', bg2: '#e4eaf3', main: '#8493a8', light: '#eef2f8', dark: '#566579', ink: '#334155', label: 'JUARA 2', rays: true },
    3: { bg1: '#fffaf4', bg2: '#f7e2cc', main: '#b87333', light: '#f3cfa6', dark: '#7a4519', ink: '#6b3a12', label: 'JUARA 3', rays: true },
    n: { bg1: '#f9fffe', bg2: '#e2f6f3', main: '#1aa89b', light: '#9cefe4', dark: '#0f766e', ink: '#0f4f4a', label: 'PERINGKAT', rays: false },
  };
  const tema = (p) => TEMA[p <= 3 ? p : 'n'];

  const SVG_AWARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const SVG_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  const SVG_PDF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  let modal = null, canvas = null, dataAktif = null, fokusAwal = null;

  // Logo dimuat sekali di awal supaya sertifikat langsung tergambar saat dibuka
  const logo = new Image();
  let logoSiap = false;
  logo.onload = () => { logoSiap = true; };
  logo.src = LOGO_SRC;

  function mmss(detik) {
    detik = Math.max(0, parseInt(detik, 10) || 0);
    return String(Math.floor(detik / 60)).padStart(2, '0') + ':' + String(detik % 60).padStart(2, '0');
  }
  function tanggal(iso) {
    const d = iso ? new Date(iso) : new Date();
    return isNaN(d) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  // teks dengan jarak antar huruf (letterSpacing canvas belum didukung semua browser)
  function spasi(g, teks, cx, y, jarak) {
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
  function logam(g, x0, y0, x1, y1, t) {   // gradien logam: terang - utama - gelap
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, t.light);
    gr.addColorStop(.5, t.main);
    gr.addColorStop(1, t.dark);
    return gr;
  }

  // Sinar matahari tipis di belakang isi (hanya Juara 1-3)
  function sinar(g, cx, cy, t) {
    g.save();
    g.beginPath();
    g.rect(66, 66, W - 132, H - 132);
    g.clip();
    g.fillStyle = t.main;
    g.globalAlpha = 0.09;
    const n = 44;
    for (let i = 0; i < n; i += 2) {
      const a = (Math.PI * 2 * i) / n, b = (Math.PI * 2 * (i + 1)) / n;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 1800, cy + Math.sin(a) * 1800);
      g.lineTo(cx + Math.cos(b) * 1800, cy + Math.sin(b) * 1800);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  // Pita judul (JUARA 1 / PERINGKAT 7) dengan ekor
  function pita(g, cx, y, w, h, t, teks) {
    const x = cx - w / 2;
    g.fillStyle = t.dark;
    g.beginPath();
    g.moveTo(x - 56, y + 12); g.lineTo(x + 24, y + 12); g.lineTo(x + 24, y + h + 12); g.lineTo(x - 56, y + h + 12); g.lineTo(x - 24, y + h / 2 + 12);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(x + w + 56, y + 12); g.lineTo(x + w - 24, y + 12); g.lineTo(x + w - 24, y + h + 12); g.lineTo(x + w + 56, y + h + 12); g.lineTo(x + w + 24, y + h / 2 + 12);
    g.closePath(); g.fill();
    g.fillStyle = logam(g, x, y, x, y + h, t);
    g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,.28)';   // lipatan
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + 24, y + h); g.lineTo(x + 24, y + h + 12); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(x + w, y + h); g.lineTo(x + w - 24, y + h); g.lineTo(x + w - 24, y + h + 12); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.font = '800 34px ' + SANS;
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 4; g.shadowOffsetY = 2;
    spasi(g, teks, cx, y + h / 2 + 12, 9);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }
  // Karangan daun di kiri-kanan segel
  function daun(g, cx, cy, R, t) {
    for (const sisi of [1, -1]) {
      for (let i = 0; i < 8; i++) {
        const a = ((118 + i * 14) * Math.PI) / 180;   // 118..216 derajat: bagian atas dibiarkan terbuka untuk mahkota
        const x = cx + sisi * R * Math.cos(a), y = cy + R * Math.sin(a);
        let rot = a + Math.PI / 2 + 0.35;               // menyinggung lingkaran, sedikit condong keluar
        if (sisi < 0) rot = Math.PI - rot;
        const s = (1 - i * 0.035) * 0.8;
        g.save();
        g.translate(x, y);
        g.rotate(rot);
        g.fillStyle = logam(g, -22, -8, 22, 8, t);
        g.beginPath();
        g.ellipse(0, 0, 21 * s, 9 * s, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)';
        g.lineWidth = 1.5;
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
    [['#3B82F6', 32, 38, 4], ['#EF4444', 19, 40, 3], ['#EF4444', 45, 40, 3]].forEach((j) => {
      g.fillStyle = j[0]; g.beginPath(); g.arc(j[1], j[2], j[3], 0, Math.PI * 2); g.fill();
    });
    g.restore();
  }
  // Segel bergerigi berisi nomor peringkat
  function segel(g, cx, cy, t, nomor, top3) {
    const n = top3 ? 32 : 24, k = 0.75;
    g.fillStyle = logam(g, cx - 60, cy - 60, cx + 60, cy + 60, t);
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (Math.PI * i) / n, r = (i % 2 ? 68 : 80) * k;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)';
    g.lineWidth = 3.5;
    g.beginPath(); g.arc(cx, cy, 56 * k, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, 47 * k, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff';
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 5; g.shadowOffsetY = 2;
    g.font = '800 ' + Math.round((nomor > 99 ? 40 : nomor > 9 ? 50 : 64) * k) + 'px ' + SERIF;
    g.textBaseline = 'middle';
    g.fillText(String(nomor), cx, cy + 2);
    g.textBaseline = 'alphabetic';
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  }

  function gambar(d) {
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const rank = Math.max(1, parseInt(d.peringkat, 10) || 1);
    const top3 = rank <= 3;
    const t = tema(rank);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    // latar
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, t.bg1);
    bg.addColorStop(1, t.bg2);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    if (t.rays) sinar(g, W / 2, 600, t);

    // bingkai ganda + sudut
    g.strokeStyle = logam(g, 0, 0, W, H, t);
    g.lineWidth = 12;
    g.strokeRect(36, 36, W - 72, H - 72);
    g.strokeStyle = NAVY;
    g.lineWidth = 2;
    g.strokeRect(66, 66, W - 132, H - 132);
    if (top3) {
      g.strokeStyle = t.main;
      g.lineWidth = 1.5;
      g.strokeRect(80, 80, W - 160, H - 160);
    }
    g.fillStyle = t.main;
    [[36, 36, 0], [W - 36, 36, Math.PI / 2], [W - 36, H - 36, Math.PI], [36, H - 36, Math.PI * 1.5]].forEach((c) => {
      g.beginPath();
      g.moveTo(c[0], c[1]);
      g.arc(c[0], c[1], 84, c[2], c[2] + Math.PI / 2);
      g.closePath();
      g.fill();
    });

    // logo + judul
    if (logoSiap && logo.naturalWidth) {
      const lh = 132, lw = (logo.naturalWidth / logo.naturalHeight) * lh;
      g.drawImage(logo, (W - lw) / 2, 98, lw, lh);
    }
    g.fillStyle = t.ink;
    g.font = '700 92px ' + SERIF;
    spasi(g, 'SERTIFIKAT', W / 2, 314, 16);
    g.fillStyle = HITAM;
    g.font = '700 30px ' + SANS;
    spasi(g, 'PENGHARGAAN LEADERBOARD UJIAN BAHASA ISYARAT', W / 2, 360, 7);
    pita(g, W / 2, 390, 560, 58, t, top3 ? t.label : t.label + ' ' + rank);

    // nama peserta
    g.fillStyle = '#64748b';
    g.font = 'italic 500 32px ' + SERIF;
    g.fillText('Diberikan kepada', W / 2, 526);
    const nama = String(d.nama || 'Peserta').trim();
    let fs = 96;
    g.font = 'italic 700 ' + fs + 'px ' + SERIF;
    while (g.measureText(nama).width > 1200 && fs > 40) {
      fs -= 4;
      g.font = 'italic 700 ' + fs + 'px ' + SERIF;
    }
    g.fillStyle = NAVY;
    g.fillText(nama, W / 2, 630);
    const lw2 = Math.max(700, Math.min(1300, g.measureText(nama).width + 120));
    g.strokeStyle = logam(g, (W - lw2) / 2, 0, (W + lw2) / 2, 0, t);
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo((W - lw2) / 2, 658);
    g.lineTo((W + lw2) / 2, 658);
    g.stroke();

    // keterangan
    g.fillStyle = '#334155';
    g.font = '500 32px ' + SANS;
    g.fillText('atas prestasinya meraih Peringkat ' + rank + ' dari ' + (d.peserta || rank) + ' peserta pada', W / 2, 716);
    const tingkat = LABEL[d.kesulitan] ? ' tingkat ' + LABEL[d.kesulitan] : '';
    g.fillText('Leaderboard Ujian Bahasa Isyarat' + tingkat + ', dengan hasil sebagai berikut', W / 2, 761);

    // kotak hasil
    const item = [
      { l: 'NILAI', v: (Number(d.nilai) || 0) + '/100', c: t.dark },
      { l: 'BENAR', v: String(Number(d.benar) || 0), c: '#059669' },
      { l: 'SALAH', v: String(Number(d.salah) || 0), c: '#e11d48' },
      { l: 'WAKTU', v: d.durasi != null ? mmss(d.durasi) : '-', c: NAVY },
    ];
    const bw = 300, gap = 30, bx = (W - (4 * bw + 3 * gap)) / 2, by = 786, bh = 140;
    item.forEach((it, i) => {
      const x = bx + i * (bw + gap);
      g.fillStyle = '#ffffff';
      kotak(g, x, by, bw, bh, 22);
      g.fill();
      g.strokeStyle = t.main;
      g.globalAlpha = 0.7;
      g.lineWidth = 3;
      g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = '#64748b';
      g.font = '700 22px ' + SANS;
      spasi(g, it.l, x + bw / 2, by + 50, 4);
      g.fillStyle = it.c;
      g.font = '800 ' + (it.v.length > 5 ? 54 : 66) + 'px ' + SANS;
      g.fillText(it.v, x + bw / 2, by + 114);
    });

    // kaki: tanggal - segel peringkat - penyelenggara
    const cy = 1064;                  // pusat segel; seluruh badge (mahkota s.d. karangan daun) berada di antara kotak hasil dan garis bingkai
    if (top3) daun(g, W / 2, cy, 72, t);
    if (rank === 1) mahkota(g, W / 2, cy - 65 - 54 * (76 / 64), 76);   // mahkota duduk tepat di atas segel, di celah terbuka karangan daun
    segel(g, W / 2, cy, t, rank, top3);
    g.strokeStyle = NAVY;
    g.lineWidth = 2;
    [[240, 560], [1194, 1514]].forEach((p) => {
      g.beginPath();
      g.moveTo(p[0], cy + 18);
      g.lineTo(p[1], cy + 18);
      g.stroke();
    });
    g.fillStyle = NAVY;
    g.font = '600 30px ' + SERIF;
    g.fillText(tanggal(d.tanggal), 400, cy + 4);
    g.font = 'italic 700 38px ' + SERIF;
    g.fillText('ASTA KANDA', 1354, cy + 4);
    g.fillStyle = HITAM;
    g.font = '700 26px ' + SANS;
    g.fillText('Tanggal Ujian', 400, cy + 52);
    g.fillText('Penyelenggara Ujian', 1354, cy + 52);
  }

  // PDF A4 landscape berisi 1 gambar JPEG satu halaman penuh, tanpa library.
  // shortcut: hanya 1 halaman & 1 gambar, upgrade ke jsPDF bila perlu teks/vektor atau banyak halaman
  function pdfDariJpeg(jpeg, w, h) {
    const enc = new TextEncoder();
    const bagian = [];
    const offs = [];
    let pos = 0;
    const tambah = (x) => {
      const b = typeof x === 'string' ? enc.encode(x) : x;
      bagian.push(b);
      pos += b.length;
    };
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

  function pastikanModal() {
    if (modal) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="lbc-modal" class="lbc hidden">' +
        '<div class="lbc-card" role="dialog" aria-modal="true" aria-labelledby="lbc-title">' +
          '<button type="button" id="lbc-x" class="lbc-x" aria-label="Tutup">' + SVG_X + '</button>' +
          '<div class="lbc-head"><span class="lbc-ico">' + SVG_AWARD + '</span><div class="lbc-title" id="lbc-title">Sertifikat</div></div>' +
          '<div class="lbc-view"><canvas id="lbc-canvas" width="1754" height="1240"></canvas></div>' +
          '<div class="lbc-foot">' +
            '<button type="button" id="lbc-png" class="lbc-btn lbc-img">' + SVG_IMG + '<span>Unduh Image</span></button>' +
            '<button type="button" id="lbc-pdf" class="lbc-btn lbc-pdf">' + SVG_PDF + '<span>Unduh PDF</span></button>' +
          '</div>' +
        '</div></div>');
    modal = document.getElementById('lbc-modal');
    canvas = document.getElementById('lbc-canvas');
    document.getElementById('lbc-x').addEventListener('click', tutup);
    document.getElementById('lbc-png').addEventListener('click', unduhPng);
    document.getElementById('lbc-pdf').addEventListener('click', unduhPdf);
    modal.addEventListener('click', (e) => { if (e.target === modal) tutup(); });   // klik area luar popup
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {   // fokus berputar di dalam popup
        const f = Array.from(modal.querySelectorAll('button')), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && terbuka()) { e.stopPropagation(); tutup(); }
    });
  }
  const terbuka = () => !!modal && !modal.classList.contains('hidden');
  function tutup() {
    modal.classList.add('hidden');
    if (fokusAwal && fokusAwal.focus && document.contains(fokusAwal)) fokusAwal.focus();
  }

  function namaFile(ekstensi) {
    const slug = String((dataAktif && dataAktif.nama) || 'peserta').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'peserta';
    return 'Sertifikat-Leaderboard-Peringkat-' + ((dataAktif && dataAktif.peringkat) || 0) + '-' + slug + '.' + ekstensi;
  }
  function simpan(blob, nama) {
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = nama;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
    document.getElementById('lbc-title').textContent = 'Sertifikat ' + (rank <= 3 ? 'Juara ' + rank : 'Peringkat ' + rank);
    modal.querySelector('.lbc-card').dataset.tier = rank <= 3 ? String(rank) : 'n';
    gambar(d);                         // langsung tergambar (logo sudah dimuat di awal)
    if (!logoSiap) {                   // logo belum siap: gambar ulang begitu selesai dimuat
      logo.addEventListener('load', () => { if (terbuka() && dataAktif === d) gambar(d); }, { once: true });
    }
    modal.classList.remove('hidden');
    document.getElementById('lbc-x').focus();
  }

  window.AstaKandaSertifikatLeaderboard = { buka: buka, terbuka: terbuka };
})();