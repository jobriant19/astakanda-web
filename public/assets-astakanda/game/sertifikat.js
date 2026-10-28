/* ASTA KANDA — Sertifikat Pencapaian (popup + kanvas), gaya mengikuti certificate.js referensi.
 * AstaSertifikat.buka({ nama, game, kesulitan, skor, waktu(detik), akurasi(%), tanggal(ISO) })
 */
(function () {
  'use strict';
  const FONT = "'Fredoka', 'Poppins', 'Segoe UI', Arial, sans-serif";
  const TEXT = '#111827', MUTED = '#6b7280';
  const THEME = {
    mudah:  { main: '#22c55e', g1: '#4ade80', g2: '#16a34a', bars: 1, label: 'MUDAH' },
    sedang: { main: '#eab308', g1: '#facc15', g2: '#ca8a04', bars: 2, label: 'SEDANG' },
    sulit:  { main: '#ef4444', g1: '#f87171', g2: '#dc2626', bars: 3, label: 'SULIT' },
  };
  const ICON = {
    trophy: ['M8 4h8v4a4 4 0 0 1-8 0V4Z', 'M8 5H5a2 2 0 0 0 0 4h1.5M16 5h3a2 2 0 0 1 0 4h-1.5', 'M12 12v3', 'M9 20h6', 'M10 17h4l.6 3H9.4l.6-3Z'],
    clock:  ['M20.2 13a8.2 8.2 0 1 1-16.4 0 8.2 8.2 0 0 1 16.4 0Z', 'M12 9v4.3l3 2', 'M9.5 2.2h5'],
    target: ['M20.2 12a8.2 8.2 0 1 1-16.4 0 8.2 8.2 0 0 1 16.4 0Z', 'M8.4 12.4l2.5 2.5 4.7-5'],
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function icon(ctx, name, cx, cy, size, color, lw) {
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color; ctx.lineWidth = lw || 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ICON[name].forEach((d) => ctx.stroke(new Path2D(d)));
    ctx.restore();
  }
  function bars(ctx, x, baseY, h, filled, on, off) {
    const bw = h * 0.28, gap = h * 0.16;
    for (let i = 0; i < 3; i++) {
      const bh = h * (0.38 + i * 0.31);
      ctx.fillStyle = i < filled ? on : off;
      rr(ctx, x + i * (bw + gap), baseY - bh, bw, bh, bw * 0.3);
      ctx.fill();
    }
  }
  function instagram(ctx, cx, cy, size) {
    const g = ctx.createLinearGradient(cx - size / 2, cy + size / 2, cx + size / 2, cy - size / 2);
    g.addColorStop(0, '#feda75'); g.addColorStop(0.28, '#fa7e1e'); g.addColorStop(0.52, '#d62976'); g.addColorStop(0.76, '#962fbf'); g.addColorStop(1, '#4f5bd5');
    ctx.save();
    ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = size * 0.1;
    const w = size * 0.78;
    rr(ctx, cx - w / 2, cy - w / 2, w, w, size * 0.22); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + size * 0.23, cy - size * 0.23, size * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function copyright(ctx, cx, y, year) {
    ctx.save();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const fs = 20, gap = 10, ico = 22, pad = 12;
    ctx.font = '700 ' + fs + 'px ' + FONT;
    const wBrand = ctx.measureText('ASTA KANDA').width;
    const wYear = ctx.measureText(String(year)).width;
    const wUser = ctx.measureText('jo_briant19').width;
    const pillW = pad + ico + 8 + wUser + pad;
    let x = cx - (wBrand + gap + ico + gap + wYear + gap + pillW) / 2;
    ctx.fillStyle = '#16a34a'; ctx.fillText('ASTA KANDA', x, y); x += wBrand + gap;
    ctx.strokeStyle = TEXT; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + ico / 2, y, ico / 2 - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + ico / 2, y, ico * 0.2, Math.PI * 0.3, Math.PI * 1.7); ctx.stroke();
    x += ico + gap;
    ctx.fillStyle = TEXT; ctx.fillText(String(year), x, y); x += wYear + gap;
    ctx.fillStyle = '#f3f4f6'; rr(ctx, x, y - 18, pillW, 36, 18); ctx.fill();
    instagram(ctx, x + pad + ico / 2 - 2, y, ico);
    ctx.fillStyle = TEXT; ctx.fillText('jo_briant19', x + pad + ico + 6, y);
    ctx.restore();
  }

  function fmtWaktu(detik) {
    detik = Math.max(0, Math.round(detik || 0));
    return String(Math.floor(detik / 60)).padStart(2, '0') + ':' + String(detik % 60).padStart(2, '0');
  }
  function fmtTanggal(iso) {
    const d = new Date(iso);
    return (isNaN(d) ? new Date() : d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function gambar(canvas, d, logo) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const t = THEME[d.kesulitan] || THEME.mudah;
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    // latar putih + bingkai warna tingkat kesulitan
    ctx.fillStyle = '#ffffff'; rr(ctx, 0, 0, W, H, 40); ctx.fill();
    ctx.lineWidth = 14; ctx.strokeStyle = t.main; rr(ctx, 10, 10, W - 20, H - 20, 34); ctx.stroke();
    ctx.save(); ctx.globalAlpha = 0.35; ctx.lineWidth = 2; rr(ctx, 34, 34, W - 68, H - 68, 22); ctx.stroke(); ctx.restore();

    // ornamen sudut
    ctx.fillStyle = t.main;
    [[58, 58, 1, 1], [W - 58, 58, -1, 1], [58, H - 58, 1, -1], [W - 58, H - 58, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(x + 20 * sx, y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y + 20 * sy, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // logo
    if (logo && logo.naturalWidth > 0) {
      let lh = 118, lw = lh * logo.naturalWidth / logo.naturalHeight;
      if (lw > 420) { lw = 420; lh = lw * logo.naturalHeight / logo.naturalWidth; }
      ctx.drawImage(logo, W / 2 - lw / 2, 50, lw, lh);
    }

    ctx.fillStyle = TEXT; ctx.font = '700 46px ' + FONT;
    ctx.fillText('SERTIFIKAT PENCAPAIAN', W / 2, 222);
    ctx.fillStyle = t.main; rr(ctx, W / 2 - 60, 258, 120, 6, 3); ctx.fill();

    ctx.fillStyle = MUTED; ctx.font = '500 22px ' + FONT;
    ctx.fillText('Dengan bangga diberikan kepada', W / 2, 301);

    // nama (mengecil otomatis jika panjang)
    const nama = String(d.nama || 'Pemain');
    let ns = 60;
    ctx.font = '700 ' + ns + 'px ' + FONT;
    while (ctx.measureText(nama).width > 820 && ns > 28) { ns -= 2; ctx.font = '700 ' + ns + 'px ' + FONT; }
    ctx.fillStyle = TEXT; ctx.fillText(nama, W / 2, 357);
    const lineW = Math.min(Math.max(ctx.measureText(nama).width + 60, 360), 880);
    ctx.fillStyle = t.main; rr(ctx, W / 2 - lineW / 2, 391, lineW, 4, 2); ctx.fill();

    ctx.fillStyle = MUTED; ctx.font = '500 22px ' + FONT;
    ctx.fillText('atas pencapaiannya dalam permainan ' + d.game + ' tingkat', W / 2, 432);

    // lencana tingkat kesulitan
    ctx.font = '700 30px ' + FONT;
    const label = t.label, labelW = ctx.measureText(label).width;
    const barH = 26, barsW = barH * 1.16;
    const pillW = 34 + barsW + 16 + labelW + 38, pillH = 58, pillY = 456, pillX = W / 2 - pillW / 2;
    const pg = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
    pg.addColorStop(0, t.g1); pg.addColorStop(1, t.g2);
    ctx.save();
    ctx.shadowColor = t.main + '66'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
    ctx.fillStyle = pg; rr(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.fill();
    ctx.restore();
    bars(ctx, pillX + 34, pillY + pillH / 2 + barH / 2, barH, t.bars, '#ffffff', 'rgba(255,255,255,0.4)');
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff';
    ctx.fillText(label, pillX + 34 + barsW + 16, pillY + pillH / 2 + 1);
    ctx.textAlign = 'center';

    // kartu statistik
    const cardW = 250, cardH = 116, cardGap = 28, cardY = 546;
    const startX = (W - (cardW * 3 + cardGap * 2)) / 2;
    const stats = [
      ['trophy', 'SKOR', String(d.skor)],
      ['clock', 'WAKTU', fmtWaktu(d.waktu)],
      ['target', 'AKURASI', Math.round(d.akurasi || 0) + '%'],
    ];
    stats.forEach(([ic, nm, val], i) => {
      const x = startX + i * (cardW + cardGap), cx = x + cardW / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(17,24,39,0.14)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#ffffff'; rr(ctx, x, cardY, cardW, cardH, 20); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.4; ctx.lineWidth = 2; ctx.strokeStyle = t.main; rr(ctx, x, cardY, cardW, cardH, 20); ctx.stroke(); ctx.restore();
      icon(ctx, ic, cx, cardY + 26, 28, t.main, 2.1);
      ctx.fillStyle = MUTED; ctx.font = '600 14px ' + FONT; ctx.fillText(nm, cx, cardY + 56);
      ctx.fillStyle = TEXT; ctx.font = '700 36px ' + FONT; ctx.fillText(val, cx, cardY + 87);
    });

    const dt = new Date(d.tanggal);
    const year = isNaN(dt.getTime()) ? new Date().getFullYear() : dt.getFullYear();
    ctx.fillStyle = MUTED; ctx.font = '500 18px ' + FONT;
    ctx.fillText(fmtTanggal(d.tanggal), W / 2, 697);
    copyright(ctx, W / 2, 737, year);
  }

  // ---------------- Popup ----------------
  let modal = null, canvas = null, lastData = null;

  function slug(s) { return String(s || '').trim().replace(/\s+/g, '-').toLowerCase(); }

  function cetak() {
    const url = canvas.toDataURL('image/png');
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    const doc = f.contentWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head><title>Sertifikat</title><style>@page{size:landscape;margin:0}html,body{margin:0;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src="' + url + '"></body></html>');
    doc.close();
    const img = doc.querySelector('img');
    const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 1500); };
    if (img.complete) go(); else img.onload = go;
  }

  function pastikanModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'modal-sertifikat';
    modal.className = 'modal-overlay hidden';
    modal.innerHTML =
      '<div class="modal-box asta-cert-box neu-raised">' +
        '<canvas id="asta-cert-canvas" width="1200" height="800"></canvas>' +
        '<div class="modal-actions asta-cert-actions">' +
          '<button type="button" class="neu-btn btn-danger" id="asta-cert-tutup">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg><span>Tutup</span></button>' +
          '<button type="button" class="neu-btn btn-add" id="asta-cert-unduh">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m0 0-4-4m4 4 4-4"/><path d="M5 19h14"/></svg><span>Unduh PNG</span></button>' +
          '<button type="button" class="neu-btn btn-add" id="asta-cert-cetak">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg><span>Cetak</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    canvas = modal.querySelector('#asta-cert-canvas');
    modal.querySelector('#asta-cert-tutup').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    modal.querySelector('#asta-cert-unduh').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = 'sertifikat-asta-kanda-' + slug(lastData && lastData.nama) + '-' + slug(lastData && lastData.game) + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
    modal.querySelector('#asta-cert-cetak').addEventListener('click', cetak);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) modal.classList.add('hidden'); });
  }

  function buka(data) {
    pastikanModal();
    lastData = data;
    const logo = new Image();
    const logoReady = new Promise((res) => { logo.onload = () => res(logo); logo.onerror = () => res(null); });
    const imgEl = document.querySelector('img.logo');
    logo.src = (imgEl && imgEl.src) || '/assets/images/logo.png';
    const fontsReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load("700 40px 'Fredoka'"), document.fonts.load("500 20px 'Fredoka'")]).catch(() => null)
      : Promise.resolve();
    Promise.all([fontsReady, logoReady]).then(([, img]) => gambar(canvas, data, img));
    modal.classList.remove('hidden');
  }

  window.AstaSertifikat = { buka };
})();