/* =====================================================================
   ASTA KANDA — sertifikatujian.js
   Letakkan di: public/assets-astakanda/ujian/sertifikatujian.js
   Popup Sertifikat Ujian: digambar di canvas, diunduh sebagai PNG atau PDF.
   Dipanggil dari ujian.js lewat window.AstaKandaSertifikatUjian.buka(data).
   Pasangan CSS: sertifikatujian.css (popup memakai kelas dasar .ujian-set-* dari ujian.css).
   ===================================================================== */
(function () {
  const W = 1754, H = 1240; // A4 landscape @150dpi
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Segoe UI", Roboto, Arial, sans-serif';
  const LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit', custom: 'Custom' };
  const NAVY = '#1e293b';
  const HITAM = '#0f172a';
  const GOLD = '#c9962b';
  const WARNA = { good: '#10b981', mid: '#f59e0b', low: '#f43f5e' };
  const SVG_AWARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
  const SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const SVG_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>';
  const SVG_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
  const SVG_PDF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';

  let modal = null;
  let canvas = null;
  let dataAktif = null;

  const tone = (n) => (n >= 80 ? 'good' : n >= 50 ? 'mid' : 'low');
  const predikat = (n) => (n >= 80 ? 'SANGAT BAIK' : n >= 50 ? 'BAIK' : 'PESERTA');

  function mmss(detik) {
    detik = Math.max(0, parseInt(detik, 10) || 0);
    return String(Math.floor(detik / 60)).padStart(2, '0') + ':' + String(detik % 60).padStart(2, '0');
  }
  function tanggal(iso) {
    const d = new Date(iso);
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
  const lebar = (g, t, j) => Array.from(t).reduce((s, h) => s + g.measureText(h).width + j, -j);
  function kotak(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  const SEGEL = {
    good: { a: '#f6d777', b: '#b8861b', n: 28, ring: '#fff', s: 'bintang' },
    mid:  { a: '#f8fafc', b: '#8b9bb0', n: 20, ring: '#475569', s: 'award' },
    low:  { a: '#f0b98a', b: '#9a5a24', n: 12, ring: '#fff', s: 'cek' },
  };
  function segel(g, cx, cy, t) {
    const s = SEGEL[t];
    const gr = g.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 80);
    gr.addColorStop(0, s.a);
    gr.addColorStop(1, s.b);
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < s.n * 2; i++) {
      const a = (Math.PI * i) / s.n;
      const r = i % 2 ? 66 : 76;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = s.ring;
    g.fillStyle = s.ring;
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.arc(cx, cy, 54, 0, Math.PI * 2);
    g.stroke();
    g.save();
    g.translate(cx, cy);
    if (s.s === 'bintang') {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 13 : 32, a = (Math.PI * i) / 5 - Math.PI / 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
    } else if (s.s === 'cek') {
      g.lineWidth = 9;
      g.stroke(new Path2D('M-22 2 L-8 16 L22 -14'));
    } else {
      g.translate(-31, -31);
      g.scale(2.6, 2.6);
      g.lineWidth = 2;
      g.beginPath();
      g.arc(12, 8, 6, 0, Math.PI * 2);
      g.stroke();
      g.stroke(new Path2D('M15.477 12.89 17 22l-5-3-5 3 1.523-9.11'));
    }
    g.restore();
  }

  function gambar(d, logo) {
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const nilai = Math.max(0, Math.min(100, Number(d.nilai) || 0));
    const aksen = WARNA[tone(nilai)];
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';

    // latar & bingkai
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fffdf7');
    bg.addColorStop(1, '#fff6e0');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = GOLD;
    g.lineWidth = 12;
    g.strokeRect(36, 36, W - 72, H - 72);
    g.strokeStyle = NAVY;
    g.lineWidth = 2;
    g.strokeRect(66, 66, W - 132, H - 132);
    g.fillStyle = GOLD;
    [[36, 36, 0], [W - 36, 36, Math.PI / 2], [W - 36, H - 36, Math.PI], [36, H - 36, Math.PI * 1.5]].forEach((c) => {
      g.beginPath();
      g.moveTo(c[0], c[1]);
      g.arc(c[0], c[1], 84, c[2], c[2] + Math.PI / 2);
      g.closePath();
      g.fill();
    });

    // logo + judul
    if (logo && logo.naturalWidth) {
      const lh = 120;
      const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
      g.drawImage(logo, (W - lw) / 2, 100, lw, lh);
    }
    g.fillStyle = NAVY;
    g.font = '700 100px ' + SERIF;
    spasi(g, 'SERTIFIKAT', W / 2, 340, 16);
    g.fillStyle = HITAM;
    g.font = '700 34px ' + SANS;
    spasi(g, 'UJIAN BAHASA ISYARAT', W / 2, 398, 10);
    ['#10b981', '#f59e0b', '#4E86F0', '#f43f5e'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect((W - 480) / 2 + i * 120, 428, 120, 8);
    });

    // nama peserta
    g.fillStyle = '#64748b';
    g.font = 'italic 500 32px ' + SERIF;
    g.fillText('Diberikan kepada', W / 2, 505);
    const nama = String(d.nama_peserta || 'Peserta').trim();
    let fs = 96;
    g.font = 'italic 700 ' + fs + 'px ' + SERIF;
    while (g.measureText(nama).width > 1200 && fs > 40) {
      fs -= 4;
      g.font = 'italic 700 ' + fs + 'px ' + SERIF;
    }
    g.fillStyle = NAVY;
    g.fillText(nama, W / 2, 615);
    const lw2 = Math.max(700, Math.min(1300, g.measureText(nama).width + 120));
    g.strokeStyle = GOLD;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo((W - lw2) / 2, 645);
    g.lineTo((W + lw2) / 2, 645);
    g.stroke();

    // keterangan
    g.fillStyle = '#334155';
    g.font = '500 32px ' + SANS;
    const total = d.total_soal != null ? ' (' + d.total_soal + ' soal)' : '';
    g.fillText('telah mengikuti Ujian Bahasa Isyarat tingkat ' + (LABEL[d.kesulitan] || d.kesulitan || '-') + total, W / 2, 710);
    g.fillText('dengan hasil sebagai berikut', W / 2, 755);

    // kotak hasil
    const item = [
      { l: 'NILAI', v: nilai + '/100', c: aksen },
      { l: 'BENAR', v: String(Number(d.benar) || 0), c: '#10b981' },
      { l: 'SALAH', v: String(Number(d.salah) || 0), c: '#f43f5e' },
      { l: 'DURASI', v: mmss(d.durasi_detik), c: NAVY },
    ];
    const bw = 300, gap = 30, bx = (W - (4 * bw + 3 * gap)) / 2, by = 795, bh = 140;
    item.forEach((it, i) => {
      const x = bx + i * (bw + gap);
      g.fillStyle = '#ffffff';
      kotak(g, x, by, bw, bh, 22);
      g.fill();
      g.strokeStyle = 'rgba(201,150,43,.6)';
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#64748b';
      g.font = '700 22px ' + SANS;
      spasi(g, it.l, x + bw / 2, by + 50, 4);
      g.fillStyle = it.c;
      g.font = '800 ' + (it.v.length > 5 ? 54 : 66) + 'px ' + SANS;
      g.fillText(it.v, x + bw / 2, by + 114);
    });

    // predikat: label hitam, nilai tetap berwarna
    g.font = '800 36px ' + SANS;
    const j = 6, p1 = 'PREDIKAT: ', p2 = predikat(nilai);
    const w1 = lebar(g, p1, j), w2 = lebar(g, p2, j), x0 = (W - (w1 + j + w2)) / 2;
    g.fillStyle = HITAM;
    spasi(g, p1, x0 + w1 / 2, 998, j);
    g.fillStyle = aksen;
    spasi(g, p2, x0 + w1 + j + w2 / 2, 998, j);

    // kaki: tanggal - segel - penyelenggara
    segel(g, W / 2, 1090, tone(nilai));
    g.strokeStyle = NAVY;
    g.lineWidth = 2;
    [[240, 560], [1194, 1514]].forEach((p) => {
      g.beginPath();
      g.moveTo(p[0], 1108);
      g.lineTo(p[1], 1108);
      g.stroke();
    });
    g.fillStyle = NAVY;
    g.font = '600 30px ' + SERIF;
    g.fillText(tanggal(d.created_at), 400, 1094);
    g.font = 'italic 700 38px ' + SERIF;
    g.fillText('ASTA KANDA', 1354, 1094);
    g.fillStyle = HITAM;
    g.font = '700 26px ' + SANS;
    g.fillText('Tanggal Ujian', 400, 1142);
    g.fillText('Penyelenggara Ujian', 1354, 1142);
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
      '<div id="modal-ujian-sertifikat" class="ujian-set-modal hidden">' +
        '<div class="ujian-set-card uj-cert-card" role="dialog" aria-modal="true" aria-labelledby="uj-cert-title">' +
          '<button type="button" id="uj-cert-x" class="uj-cert-x" aria-label="Tutup">' + SVG_X + '</button>' +
          '<div class="ujian-set-head"><span class="ujian-set-head-ico">' + SVG_AWARD + '</span>' +
            '<div class="ujian-set-title" id="uj-cert-title">Sertifikat Ujian</div></div>' +
          '<div class="uj-cert-view"><canvas id="uj-cert-canvas" width="1754" height="1240"></canvas></div>' +
          '<div class="ujian-set-foot">' +
            '<button type="button" id="uj-cert-png" class="ujian-set-ok uj-ok-ico uj-cert-img">' + SVG_IMG + 'Unduh Image</button>' +
            '<button type="button" id="uj-cert-pdf" class="ujian-set-ok uj-ok-ico uj-cert-pdf">' + SVG_PDF + 'Unduh PDF</button>' +
          '</div>' +
        '</div></div>');
    modal = document.getElementById('modal-ujian-sertifikat');
    canvas = document.getElementById('uj-cert-canvas');
    document.getElementById('uj-cert-x').addEventListener('click', tutup);
    document.getElementById('uj-cert-png').addEventListener('click', unduhPng);
    document.getElementById('uj-cert-pdf').addEventListener('click', unduhPdf);
    modal.addEventListener('click', (e) => { if (e.target === modal) tutup(); });   // klik area luar popup
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) tutup();
    });
  }
  function tutup() { modal.classList.add('hidden'); }

  function namaFile(ekstensi) {
    const slug = String((dataAktif && dataAktif.nama_peserta) || 'peserta').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'peserta';
    return 'Sertifikat-Ujian-' + slug + '.' + ekstensi;
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
    modal.classList.remove('hidden');
    const logo = new Image();
    logo.onload = () => gambar(d, logo);
    logo.onerror = () => gambar(d, null);   // logo gagal dimuat: sertifikat tetap dibuat tanpa logo
    logo.src = '/assets/images/logo.png';
  }

  window.AstaKandaSertifikatUjian = { buka: buka };
})();