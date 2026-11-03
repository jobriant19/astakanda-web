/* ASTA KANDA — leaderboardujian.js
 * Layar Leaderboard Ujian (dipisah dari ujian.js).
 * - Tombol pembuka: #ujian-btn-lb (ada di panel Ujian, ditangkap lewat delegasi klik).
 * - ujian.js memanggil window.AstaKandaLeaderboardUjian.catat(nama, nilai, benar, total, durasiDetik, kesulitan) saat ujian selesai.
 * - Klik peringkat -> popup detail -> tombol Sertifikat (sertifikatleaderboardujian.js: window.AstaKandaSertifikatLeaderboard.buka).
 * Urutan peringkat: nilai tertinggi -> jumlah benar terbanyak -> jumlah soal terbanyak -> waktu tercepat.
 * Satu nama = satu baris (hasil terbaik menurut urutan yang sama).
 * Tampil instan: semua markup dibangun & digambar saat halaman dimuat; data server di-cache di localStorage dan disegarkan
 * di latar belakang (perubahan baru dipasang saat layar tertutup, jadi tidak ada baris yang muncul terlambat).
 */
(function () {
  // shortcut: data lokal di localStorage (per perangkat) + riwayat dari /riwayat; upgrade: endpoint peringkat khusus ujian di server
  const LB_KEY = 'astakanda.ujianBoard', LB_SRV = 'astakanda.ujianBoardSrv', LB_MAX = 10;
  const LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit', custom: 'Custom' };

  const lbEsc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lbIc = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC_TROPHY = lbIc('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>');
  const IC_CHECK = lbIc('<path d="M20 6 9 17l-5-5"/>');
  const IC_CLOCK = lbIc('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
  const IC_AWARD = lbIc('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>');
  const IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Perbandingan peringkat (negatif = a lebih tinggi). Durasi tak diketahui = Infinity (dianggap paling lambat)
  const lbBanding = (a, b) => (b.nilai - a.nilai) || (b.benar - a.benar) || (b.total - a.total) || (a.durasi - b.durasi) || 0;

  function lbNormal(r) {
    if (!r || typeof r.nama !== 'string' || !(r.nilai > 0)) return null;
    const nama = r.nama.replace(/\s+/g, ' ').trim();
    if (!nama) return null;
    const tgl = r.tanggal && !isNaN(new Date(r.tanggal)) ? String(r.tanggal) : '';
    return {
      nama,
      nilai: Math.round(r.nilai),
      benar: r.benar | 0,
      total: r.total | 0,
      durasi: r.durasi != null && r.durasi >= 0 ? Math.round(r.durasi) : Infinity,
      tanggal: tgl,
      kesulitan: LABEL[r.kesulitan] ? String(r.kesulitan) : '',
    };
  }
  // Satu nama = satu baris (tanpa beda huruf besar/kecil, spasi ganda, atau bentuk Unicode); dipakai hasil terbaik menurut lbBanding.
  // Bila setara, dipilih yang datanya lebih lengkap (ada tingkat/tanggal).
  function lbRapikan(arr) {
    const best = new Map();
    arr.forEach((r) => {
      const e = lbNormal(r);
      if (!e) return;
      const k = e.nama.normalize('NFC').toLowerCase();
      const o = best.get(k), c = o ? lbBanding(e, o) : -1;
      if (!o || c < 0 || (c === 0 && e.kesulitan && !o.kesulitan)) best.set(k, e);
    });
    return Array.from(best.values()).sort(lbBanding).slice(0, LB_MAX);
  }
  const lbBacaKey = (key) => { try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const lbBaca = () => lbRapikan(lbBacaKey(LB_KEY));
  function lbCatat(nama, nilai, benar, total, durasi, kesulitan) {
    // Infinity tersimpan sebagai null di JSON; dibaca kembali sebagai "tak diketahui"
    try {
      localStorage.setItem(LB_KEY, JSON.stringify(lbRapikan(lbBaca().concat({ nama, nilai, benar, total, durasi, kesulitan, tanggal: new Date().toISOString() }))));
    } catch (e) { /* abaikan */ }
    if (lbEl) { lbGambarAman(); setTimeout(lbMuatServer, 2500); }   // server menyimpan hasil secara asinkron; segarkan sebentar lagi
  }

  // Riwayat ujian dari server (tab Hasil) ikut jadi sumber peringkat. Disimpan juga di localStorage agar langsung ada saat halaman dibuka.
  let lbServer = lbRapikan(lbBacaKey(LB_SRV)), lbRows = [], lbTertunda = false, lbMuat = false;
  const lbSemua = () => lbRapikan(lbBaca().concat(lbServer));
  const lbBuang = (r) => ({ nama: r.nama, nilai: r.nilai, benar: r.benar, total: r.total, durasi: isFinite(r.durasi) ? r.durasi : null, tanggal: r.tanggal, kesulitan: r.kesulitan });
  function lbMuatServer() {
    if (lbMuat) return;
    lbMuat = true;
    fetch('/riwayat', { headers: { 'Accept': 'application/json' } })
      .then((r) => r.json())
      .then((a) => {
        if (!Array.isArray(a)) throw new Error('format');
        const baru = lbRapikan(a.map((x) => {
          const benar = Number(x.benar) || 0;
          return {
            nama: String(x.nama_peserta || ''),
            nilai: Number(x.nilai) || 0,
            benar,
            total: benar + (Number(x.salah) || 0),
            durasi: x.durasi_detik != null && x.durasi_detik !== '' ? Number(x.durasi_detik) : null,
            tanggal: x.created_at || '',
            kesulitan: x.kesulitan || '',
          };
        }));
        const lama = JSON.stringify(lbServer.map(lbBuang));
        lbServer = baru;
        try { localStorage.setItem(LB_SRV, JSON.stringify(baru.map(lbBuang))); } catch (e) { /* abaikan */ }
        if (JSON.stringify(baru.map(lbBuang)) !== lama) lbGambarAman();
      })
      .catch(() => { /* gagal: tetap pakai cache & data lokal */ })
      .then(() => { lbMuat = false; });
  }

  const LB_CROWN = (id) =>
    '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD66B"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>' +
    '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z" fill="url(#' + id + ')" stroke="#C98F1F" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="8" y="46" width="48" height="8" rx="3" fill="#F5B942" stroke="#C98F1F" stroke-width="2"/>' +
    '<circle cx="32" cy="38" r="4" fill="#3B82F6"/><circle cx="19" cy="40" r="3" fill="#EF4444"/><circle cx="45" cy="40" r="3" fill="#EF4444"/></svg>';
  // Toggle tema: markup sama dengan #theme-btn di tab bar (gayanya dari style.css), supaya tetap bisa ganti tema saat leaderboard menutupi layar
  const LB_TOGGLE =
    '<button id="ujian-lb-theme" class="theme-toggle uj-lb-theme" type="button" role="switch" aria-checked="false" aria-label="Ganti tema terang / gelap">' +
      '<span class="tt-night"></span><span class="tt-sun"></span>' +
      '<span class="tt-moon"><i class="cr" style="top:10px;left:8px;width:6px;height:6px"></i><i class="cr" style="bottom:12px;left:14px;width:8px;height:8px"></i><i class="cr" style="top:20px;left:24px;width:4px;height:4px"></i></span>' +
      '<span class="tt-stars"><i style="top:8px;left:40px;width:2px;height:2px" class="twinkle"></i><i style="top:16px;left:65px;width:1.5px;height:1.5px"></i><i style="top:6px;left:75px;width:1px;height:1px"></i><i style="top:26px;left:50px;width:1px;height:1px"></i><i style="top:32px;left:85px;width:2px;height:2px"></i></span>' +
      '<span class="tt-clouds">' +
        '<span class="cl c1" style="top:16px;left:10px;width:22px;height:8px"><i style="bottom:2px;left:2px;width:10px;height:10px"></i><i style="bottom:2px;left:8px;width:12px;height:12px"></i></span>' +
        '<span class="cl c2" style="top:28px;left:35px;width:26px;height:10px"><i style="bottom:4px;left:4px;width:12px;height:12px"></i><i style="bottom:4px;left:11px;width:14px;height:14px"></i></span>' +
        '<span class="cl c3" style="top:12px;left:50px;width:18px;height:7px"><i style="bottom:2px;left:2px;width:8px;height:8px"></i><i style="bottom:2px;left:7px;width:10px;height:10px"></i></span>' +
      '</span>' +
      '<span class="tt-knob"><span class="tt-beam"></span>' +
        '<svg viewBox="0 0 30 40" class="tt-lh" aria-hidden="true"><path d="M5,40 L9,12 L21,12 L25,40 Z" fill="#ef4444"/><path d="M6,32 L24,32 L22,21 L8,21 Z" fill="#f8fafc"/><rect x="7" y="10" width="16" height="2" fill="#334155"/><rect x="9" y="12" width="12" height="2" fill="#475569"/><rect class="lh-room" x="10" y="4" width="10" height="6"/><circle class="lh-glow" cx="15" cy="7" r="2.5" fill="#fef08a"/><path d="M12,4 L12,10 M15,4 L15,10 M18,4 L18,10" stroke="#475569" stroke-width=".75"/><path d="M8,4 L15,0 L22,4 Z" fill="#ef4444"/><circle cx="15" cy="0" r="1.5" fill="#334155"/></svg>' +
      '</span></button>';

  // Emblem popup detail: 1 = mahkota emas, 2 = medali perak, 3 = perisai perunggu, 4+ = lencana toska (sama untuk semua)
  const lbStar = (cx, cy, R, r, n) => {
    const p = [];
    for (let k = 0; k < n * 2; k++) { const a = (Math.PI * k) / n - Math.PI / 2, d = k % 2 ? r : R; p.push((cx + Math.cos(a) * d).toFixed(1) + ',' + (cy + Math.sin(a) * d).toFixed(1)); }
    return p.join(' ');
  };
  const lbGrad = (id, a, b, c) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>';
  // Kilau: pita putih miring yang menyapu bentuk emblem (dipotong clipPath), digerakkan oleh CSS (.em-shine)
  const lbShine = (id, shape) => '<clipPath id="' + id + '">' + shape + '</clipPath><g clip-path="url(#' + id + ')"><g class="em-shine"><rect x="-16" y="-4" width="9" height="72" fill="#fff" opacity=".6" transform="skewX(-20)"/></g></g>';
  function lbEmblem(i) {
    if (i === 0) {
      return '<svg viewBox="0 3 64 54" aria-hidden="true"><defs><linearGradient id="ujEm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>' +
        '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z" fill="url(#ujEm1)" stroke="#B07A12" stroke-width="2" stroke-linejoin="round"/>' +
        '<rect x="8" y="46" width="48" height="8" rx="3" fill="#F5B942" stroke="#B07A12" stroke-width="2"/>' +
        lbShine('ujEm1c', '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z"/><rect x="8" y="46" width="48" height="8" rx="3"/>') +
        '<circle class="em-gem" cx="32" cy="38" r="4" fill="#3B82F6"/><circle class="em-gem" style="animation-delay:.5s" cx="19" cy="40" r="3" fill="#EF4444"/><circle class="em-gem" style="animation-delay:1s" cx="45" cy="40" r="3" fill="#EF4444"/></svg>';
    }
    if (i === 1) {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' + lbGrad('ujEm2', '#FFFFFF', '#C8D1DE', '#8793A6') +
        '<path d="M13 2h14l10 26-13 3z" fill="#3b82f6"/><path d="M51 2H37L27 28l13 3z" fill="#1d4ed8"/>' +
        '<circle cx="32" cy="42" r="19" fill="url(#ujEm2)" stroke="#64748b" stroke-width="2"/>' +
        '<circle cx="32" cy="42" r="13.5" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>' +
        '<polygon class="em-pulse" points="' + lbStar(32, 42, 9.5, 4.2, 5) + '" fill="#fff" stroke="#64748b" stroke-width="1.3" stroke-linejoin="round"/>' +
        lbShine('ujEm2c', '<circle cx="32" cy="42" r="19"/>') + '</svg>';
    }
    if (i === 2) {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' + lbGrad('ujEm3', '#FBD9B5', '#D58B4A', '#8E4B14') +
        '<path d="M32 3 55 11v20c0 15-10 25-23 30C19 56 9 46 9 31V11z" fill="url(#ujEm3)" stroke="#7a4519" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M32 10 48.5 15.5v15.5c0 10.5-7 18.5-16.5 22.5C22.5 49.5 15.5 41.5 15.5 31V15.5z" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<polygon class="em-pulse" points="' + lbStar(32, 31, 11, 4.8, 5) + '" fill="#fff" stroke="#7a4519" stroke-width="1.3" stroke-linejoin="round"/>' +
        lbShine('ujEm3c', '<path d="M32 3 55 11v20c0 15-10 25-23 30C19 56 9 46 9 31V11z"/>') + '</svg>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + lbGrad('ujEm4', '#B6F7EE', '#2EC4B6', '#0f766e') +
      '<path d="M19 40 13 62l10-5 5 6 3-21z" fill="#0f766e"/><path d="M45 40 51 62l-10-5-5 6-3-21z" fill="#0d9488"/>' +
      '<polygon class="em-spin" points="' + lbStar(32, 27, 26, 22, 16) + '" fill="url(#ujEm4)" stroke="#0f766e" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="27" r="16" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>' +
      '<polygon class="em-pulse" points="' + lbStar(32, 27, 9, 4, 5) + '" fill="#fff" stroke="#0f766e" stroke-width="1.2" stroke-linejoin="round"/>' +
      lbShine('ujEm4c', '<circle cx="32" cy="27" r="22"/>') + '</svg>';
  }
  // Angka naik dari 0 (hanya bila gerakan tidak dimatikan di perangkat)
  const lbGerak = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function lbHitung(el, target, ms, tunda) {
    cancelAnimationFrame(el._raf);
    if (!lbGerak || !(target > 0)) { el.textContent = target; return; }
    const t0 = performance.now() + tunda;
    el.textContent = 0;
    const f = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(f);
    };
    el._raf = requestAnimationFrame(f);
  }

  const lbTone = (n) => (n >= 80 ? 'good' : n >= 50 ? 'mid' : 'low');
  const lbMmss = (d) => Math.floor(d / 60) + ':' + String(d % 60).padStart(2, '0');
  const lbTanggal = (iso) => { const d = new Date(iso); return iso && !isNaN(d) ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; };
  // Chip "benar": ikon centang + jumlah benar / total soal
  const lbBenar = (r) => (r.total
    ? '<span class="uj-benar" title="' + r.benar + ' dari ' + r.total + ' soal benar"><i class="uj-benar-ic">' + IC_CHECK + '</i><span class="uj-benar-t"><b>' + r.benar + '</b>/' + r.total + '<em> benar</em></span></span>'
    : '');
  // Chip waktu pengerjaan mm:ss (kosong bila durasi tidak diketahui, mis. data lokal lama)
  const lbWaktu = (r) => (isFinite(r.durasi)
    ? '<span class="uj-waktu" title="Waktu pengerjaan ' + lbMmss(r.durasi) + '">' + IC_CLOCK + '<span>' + lbMmss(r.durasi) + '</span></span>'
    : '');

  let lbEl = null, lbDet = null, lbFokus = null, lbDetFokus = null, lbDetIdx = -1;
  const lbTerbuka = () => !!lbEl && !lbEl.classList.contains('hidden');
  const lbDetTerbuka = () => !!lbDet && !lbDet.classList.contains('hidden');

  function lbTemaCat() {
    const b = lbEl && lbEl.querySelector('#ujian-lb-theme');
    if (b) b.setAttribute('aria-checked', String(document.documentElement.dataset.theme === 'dark'));
  }
  function lbTema() {
    const asli = document.getElementById('theme-btn');
    if (asli) asli.click();   // pakai logika tema yang sudah ada di app.js
    else {
      const root = document.documentElement, next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('astakanda.theme', next); } catch (e) { /* abaikan */ }
    }
    lbTemaCat();
  }

  function lbBangun() {
    lbEl = document.createElement('div');
    lbEl.id = 'ujian-lb';
    lbEl.className = 'uj-lb hidden';
    lbEl.setAttribute('role', 'dialog');
    lbEl.setAttribute('aria-modal', 'true');
    lbEl.setAttribute('aria-labelledby', 'ujian-lb-title');
    lbEl.innerHTML =
      '<div class="uj-lb-card">' +
        '<div class="uj-lb-head">' +
          '<span class="uj-lb-head-ico">' + IC_TROPHY + '</span>' +
          '<div class="uj-lb-head-txt"><h2 id="ujian-lb-title">Leaderboard Ujian</h2><p>Nilai tertinggi setiap peserta</p></div>' +
          '<div class="uj-lb-actions">' +
            '<button type="button" id="ujian-lb-tutup" class="uj-lb-back" aria-label="Kembali">' + lbIc('<path d="m15 6-6 6 6 6"/>') + '<span>Kembali</span></button>' +
            LB_TOGGLE +
          '</div>' +
        '</div>' +
        '<div class="uj-lb-podium" id="ujian-lb-podium"></div>' +
        '<div class="uj-lb-list" id="ujian-lb-list"></div>' +
        '<div class="uj-lb-foot" id="ujian-lb-foot"></div>' +
      '</div>';
    document.body.appendChild(lbEl);

    lbDet = document.createElement('div');
    lbDet.id = 'ujian-lbd';
    lbDet.className = 'uj-lbd hidden';
    lbDet.setAttribute('role', 'dialog');
    lbDet.setAttribute('aria-modal', 'true');
    lbDet.setAttribute('aria-labelledby', 'ujian-lbd-name');
    lbDet.innerHTML =
      '<div class="uj-lbd-card" data-tier="n" tabindex="-1">' +
        '<button type="button" id="ujian-lbd-x" class="uj-lbd-x" aria-label="Tutup">' + IC_X + '</button>' +
        '<div class="uj-lbd-hero">' +
          '<span class="uj-lbd-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
          '<div class="uj-lbd-emblem" id="ujian-lbd-emblem"></div>' +
          '<div class="uj-lbd-tier" id="ujian-lbd-tier">Juara 1</div>' +
          '<h3 class="uj-lbd-name" id="ujian-lbd-name">-</h3>' +
          '<div class="uj-lbd-sub" id="ujian-lbd-sub"></div>' +
        '</div>' +
        '<div class="uj-lbd-body">' +
          '<div class="uj-lbd-grid">' +
            '<div class="uj-lbd-stat"><span>Nilai</span><b id="ujian-lbd-nilai">0</b></div>' +
            '<div class="uj-lbd-stat is-benar"><span>Benar</span><b id="ujian-lbd-benar">0</b></div>' +
            '<div class="uj-lbd-stat is-salah"><span>Salah</span><b id="ujian-lbd-salah">0</b></div>' +
            '<div class="uj-lbd-stat"><span>Waktu</span><b id="ujian-lbd-waktu">-</b></div>' +
          '</div>' +
          '<ul class="uj-lbd-info" id="ujian-lbd-info"></ul>' +
          '<button type="button" id="ujian-lbd-cert" class="uj-lbd-cert">' + IC_AWARD + '<span>Lihat Sertifikat</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lbDet);

    lbEl.querySelector('#ujian-lb-tutup').addEventListener('click', lbTutup);
    lbEl.querySelector('#ujian-lb-theme').addEventListener('click', lbTema);
    lbEl.addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (t) lbBukaDetail(+t.dataset.i); });
    lbEl.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') lbTutup();
      else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-i]')) { e.preventDefault(); lbBukaDetail(+e.target.dataset.i); }
      else if (e.key === 'Tab') {   // fokus berputar di antara elemen interaktif, tidak keluar dari dialog
        const f = Array.from(lbEl.querySelectorAll('button, [data-i]')), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
      }
    });
    lbDet.addEventListener('click', (e) => { if (e.target === lbDet) lbTutupDetail(); });   // klik area luar popup
    lbDet.querySelector('#ujian-lbd-x').addEventListener('click', lbTutupDetail);
    lbDet.querySelector('#ujian-lbd-cert').addEventListener('click', lbSertifikat);
    lbDet.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); lbTutupDetail(); }
      else if (e.key === 'Tab') {
        const f = Array.from(lbDet.querySelectorAll('button')).filter((b) => !b.hidden), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
      }
    });
  }

  function lbGambar() {
    const rows = lbRows = lbSemua();
    const podium = lbEl.querySelector('#ujian-lb-podium'), list = lbEl.querySelector('#ujian-lb-list'), foot = lbEl.querySelector('#ujian-lb-foot');
    lbTertunda = false;
    if (!rows.length) {
      podium.hidden = true;
      list.innerHTML = '<p class="uj-lb-empty">' + IC_TROPHY + '<span>Belum ada nilai.<br>Selesaikan ujian pertamamu!</span></p>';
      foot.innerHTML = '<span class="uj-lb-foot-dot is-off"></span><span>Belum ada peserta</span>';
      return;
    }
    const aksi = (r, i) => ' role="button" tabindex="0" data-i="' + i + '" aria-label="Peringkat ' + (i + 1) + ', ' + lbEsc(r.nama) + ', nilai ' + r.nilai + '. Buka detail"';
    podium.hidden = false;
    podium.innerHTML = rows.slice(0, 3).map((r, i) =>
      '<div class="uj-pod uj-pod--' + (i + 1) + '" title="' + lbEsc(r.nama) + '"' + aksi(r, i) + '>' +
        '<div class="uj-pod-crown">' + (i === 0 ? LB_CROWN('ujCrownG') : '') + '</div>' +
        '<div class="uj-pod-name">' + lbEsc(r.nama) + '</div>' +
        '<div class="uj-pod-score" data-tone="' + lbTone(r.nilai) + '"><b>' + r.nilai + '</b></div>' +
        lbBenar(r) + lbWaktu(r) +
        '<div class="uj-pod-step">' + (i + 1) + '</div></div>').join('');
    list.innerHTML = rows.slice(3).map((r, k) =>
      '<div class="uj-lb-row" title="' + lbEsc(r.nama) + '"' + aksi(r, k + 3) + '><span class="uj-lb-rank">' + (k + 4) + '</span>' +
        '<span class="uj-lb-nama"><i class="uj-lb-ava">' + lbEsc(Array.from(r.nama)[0].toUpperCase()) + '</i><span>' + lbEsc(r.nama) + '</span></span>' +
        lbBenar(r) + (lbWaktu(r) || '<span></span>') + '<b class="uj-lb-nilai" data-tone="' + lbTone(r.nilai) + '">' + r.nilai + '</b></div>').join('');
    // Indikator bawah: jumlah peserta + petunjuk (selalu terlihat, tidak ikut ter-scroll)
    foot.innerHTML = '<span class="uj-lb-foot-dot"></span><span><b>' + rows.length + '</b> peserta</span><i class="uj-lb-foot-sep"></i>' +
      '<span class="uj-lb-foot-hint"><span class="uj-lb-foot-long">Ketuk peringkat untuk detail &amp; sertifikat</span><span class="uj-lb-foot-short">Ketuk untuk detail</span></span>';
  }
  // Saat layar terbuka, daftar tidak diganti di depan mata (kecuali masih kosong); pembaruan dipasang begitu layar ditutup
  function lbGambarAman() {
    if (lbTerbuka() && lbRows.length) lbTertunda = true; else lbGambar();
  }

  function lbBukaDetail(i) {
    const r = lbRows[i];
    if (!r) return;
    lbDetIdx = i;
    lbDetFokus = document.activeElement;
    const card = lbDet.querySelector('.uj-lbd-card'), salah = Math.max(0, r.total - r.benar);
    const q = (id) => lbDet.querySelector('#ujian-lbd-' + id);
    card.dataset.tier = i < 3 ? String(i + 1) : 'n';
    q('emblem').innerHTML = lbEmblem(i);
    q('tier').textContent = i < 3 ? 'Juara ' + (i + 1) : 'Peringkat ' + (i + 1);
    q('name').textContent = r.nama;
    q('name').title = r.nama;
    q('sub').textContent = 'dari ' + lbRows.length + ' peserta';
    q('nilai').parentNode.dataset.tone = lbTone(r.nilai);
    lbHitung(q('nilai'), r.nilai, 800, 380);
    lbHitung(q('benar'), r.benar, 700, 450);
    lbHitung(q('salah'), salah, 700, 520);
    q('waktu').textContent = isFinite(r.durasi) ? lbMmss(r.durasi) : '-';
    const info = [['Jumlah Soal', r.total + ' soal']];
    if (r.kesulitan) info.unshift(['Tingkat', LABEL[r.kesulitan]]);
    if (lbTanggal(r.tanggal)) info.push(['Tanggal', lbTanggal(r.tanggal)]);
    q('info').innerHTML = info.map((x) => '<li><span>' + x[0] + '</span><b>' + lbEsc(x[1]) + '</b></li>').join('');
    q('cert').hidden = !window.AstaKandaSertifikatLeaderboard;
    lbDet.classList.remove('hidden');
    card.focus();
  }
  function lbTutupDetail() {
    lbDet.classList.add('hidden');
    if (lbDetFokus && lbDetFokus.focus && document.contains(lbDetFokus)) lbDetFokus.focus();
  }
  function lbSertifikat() {
    const r = lbRows[lbDetIdx];
    if (!r || !window.AstaKandaSertifikatLeaderboard) return;
    window.AstaKandaSertifikatLeaderboard.buka({
      peringkat: lbDetIdx + 1, peserta: lbRows.length, nama: r.nama, nilai: r.nilai, benar: r.benar,
      salah: Math.max(0, r.total - r.benar), total: r.total, durasi: isFinite(r.durasi) ? r.durasi : null,
      kesulitan: r.kesulitan, tanggal: r.tanggal,
    });
  }

  function lbBuka() {
    if (!lbEl) return;
    lbTemaCat();
    lbFokus = document.activeElement;
    lbEl.classList.remove('hidden');
    lbMuatServer();                                   // segarkan diam-diam; hasilnya baru terlihat saat layar ditutup
    const kartu = lbEl.querySelector('.uj-lb-card');   // fokus awal di kartu (bukan tombol) agar tidak ada ring saat dibuka dengan mouse
    kartu.tabIndex = -1;
    kartu.focus();
  }
  function lbTutup() {
    if (lbDetTerbuka()) lbDet.classList.add('hidden');
    lbEl.classList.add('hidden');
    if (lbTertunda) lbGambar();
    if (lbFokus && lbFokus.focus) lbFokus.focus();
  }

  // Delegasi klik: tombol ada di markup panel Ujian, tidak peduli urutan pemuatan script
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#ujian-btn-lb')) lbBuka(); });
  // Escape di dalam sertifikat hanya menutup sertifikat (popup lain tetap)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || (window.AstaKandaSertifikatLeaderboard && window.AstaKandaSertifikatLeaderboard.terbuka())) return;
    if (lbDetTerbuka()) lbTutupDetail(); else if (lbTerbuka()) lbTutup();
  });
  // Tab kembali aktif: segarkan data di latar belakang
  document.addEventListener('visibilitychange', () => { if (!document.hidden && lbEl) lbMuatServer(); });

  function lbInit() { lbBangun(); lbGambar(); lbMuatServer(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lbInit); else lbInit();

  window.AstaKandaLeaderboardUjian = { catat: lbCatat };
})();