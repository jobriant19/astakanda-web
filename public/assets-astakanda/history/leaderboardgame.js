/* =====================================================================
   ASTA KANDA — leaderboardgame.js
   Letakkan di: public/assets-astakanda/history/leaderboardgame.js
   Popup detail peringkat untuk "Peringkat Game" (tab Hasil): Apple Snake, Dino Attack, Snakes & Ladders, Hornet Hunter.
   Dipanggil dari riwayat.js:  window.AstaKandaLeaderboardGame.buka({ game, gameNama, gambar, satuan, kategori,
     peringkat, peserta, nama, skor, skorJuara1, tanggal })
   Tombol "Lihat Sertifikat" -> window.AstaKandaSertifikatGame.buka(...) (sertifikatgame.js).
   Tampilan memakai kelas .uj-lbd-* dari leaderboardujian.css (wajib dimuat), ditambah leaderboardgame.css.
   ===================================================================== */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC_AWARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
  const IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- Emblem per peringkat (id gradien sendiri: tidak bentrok dengan popup Ujian) ---------- */
  const star = (cx, cy, R, r, n) => {
    const p = [];
    for (let k = 0; k < n * 2; k++) { const a = (Math.PI * k) / n - Math.PI / 2, d = k % 2 ? r : R; p.push((cx + Math.cos(a) * d).toFixed(1) + ',' + (cy + Math.sin(a) * d).toFixed(1)); }
    return p.join(' ');
  };
  const grad = (id, a, b, c) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".55" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient></defs>';
  const shine = (id, shape) => '<clipPath id="' + id + '">' + shape + '</clipPath><g clip-path="url(#' + id + ')"><g class="em-shine"><rect x="-16" y="-4" width="9" height="72" fill="#fff" opacity=".6" transform="skewX(-20)"/></g></g>';
  function emblem(i) {
    if (i === 0) {
      return '<svg viewBox="0 3 64 54" aria-hidden="true"><defs><linearGradient id="lgEm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>' +
        '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z" fill="url(#lgEm1)" stroke="#B07A12" stroke-width="2" stroke-linejoin="round"/>' +
        '<rect x="8" y="46" width="48" height="8" rx="3" fill="#F5B942" stroke="#B07A12" stroke-width="2"/>' +
        shine('lgEm1c', '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z"/><rect x="8" y="46" width="48" height="8" rx="3"/>') +
        '<circle class="em-gem" cx="32" cy="38" r="4" fill="#3B82F6"/><circle class="em-gem" style="animation-delay:.5s" cx="19" cy="40" r="3" fill="#EF4444"/><circle class="em-gem" style="animation-delay:1s" cx="45" cy="40" r="3" fill="#EF4444"/></svg>';
    }
    if (i === 1) {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' + grad('lgEm2', '#FFFFFF', '#C8D1DE', '#8793A6') +
        '<path d="M13 2h14l10 26-13 3z" fill="#3b82f6"/><path d="M51 2H37L27 28l13 3z" fill="#1d4ed8"/>' +
        '<circle cx="32" cy="42" r="19" fill="url(#lgEm2)" stroke="#64748b" stroke-width="2"/>' +
        '<circle cx="32" cy="42" r="13.5" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>' +
        '<polygon class="em-pulse" points="' + star(32, 42, 9.5, 4.2, 5) + '" fill="#fff" stroke="#64748b" stroke-width="1.3" stroke-linejoin="round"/>' +
        shine('lgEm2c', '<circle cx="32" cy="42" r="19"/>') + '</svg>';
    }
    if (i === 2) {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' + grad('lgEm3', '#FBD9B5', '#D58B4A', '#8E4B14') +
        '<path d="M32 3 55 11v20c0 15-10 25-23 30C19 56 9 46 9 31V11z" fill="url(#lgEm3)" stroke="#7a4519" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M32 10 48.5 15.5v15.5c0 10.5-7 18.5-16.5 22.5C22.5 49.5 15.5 41.5 15.5 31V15.5z" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<polygon class="em-pulse" points="' + star(32, 31, 11, 4.8, 5) + '" fill="#fff" stroke="#7a4519" stroke-width="1.3" stroke-linejoin="round"/>' +
        shine('lgEm3c', '<path d="M32 3 55 11v20c0 15-10 25-23 30C19 56 9 46 9 31V11z"/>') + '</svg>';
    }
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' + grad('lgEm4', '#B6F7EE', '#2EC4B6', '#0f766e') +
      '<path d="M19 40 13 62l10-5 5 6 3-21z" fill="#0f766e"/><path d="M45 40 51 62l-10-5-5 6-3-21z" fill="#0d9488"/>' +
      '<polygon class="em-spin" points="' + star(32, 27, 26, 22, 16) + '" fill="url(#lgEm4)" stroke="#0f766e" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="32" cy="27" r="16" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>' +
      '<polygon class="em-pulse" points="' + star(32, 27, 9, 4, 5) + '" fill="#fff" stroke="#0f766e" stroke-width="1.2" stroke-linejoin="round"/>' +
      shine('lgEm4c', '<circle cx="32" cy="27" r="22"/>') + '</svg>';
  }

  /* ---------- Angka naik dari 0 (dimatikan bila perangkat meminta gerakan dikurangi) ---------- */
  const gerak = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function hitung(el, target, ms, tunda) {
    cancelAnimationFrame(el._raf);
    if (!gerak || !(target > 0)) { el.textContent = target; return; }
    const t0 = performance.now() + tunda;
    el.textContent = 0;
    const f = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(f);
    };
    el._raf = requestAnimationFrame(f);
  }
  const fmtTanggal = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  /* ---------- Popup ---------- */
  let pop = null, fokusAwal = null, dataAktif = null;
  const q = (id) => pop.querySelector('#game-lbd-' + id);
  const terbuka = () => !!pop && !pop.classList.contains('hidden');

  function bangun() {
    if (pop) return;
    pop = document.createElement('div');
    pop.id = 'game-lbd';
    pop.className = 'uj-lbd lgd hidden';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');
    pop.setAttribute('aria-labelledby', 'game-lbd-name');
    pop.innerHTML =
      '<div class="uj-lbd-card" data-tier="n" tabindex="-1">' +
        '<button type="button" id="game-lbd-x" class="uj-lbd-x" aria-label="Tutup">' + IC_X + '</button>' +
        '<div class="uj-lbd-hero">' +
          '<span class="uj-lbd-fx" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>' +
          '<div class="uj-lbd-emblem" id="game-lbd-emblem"></div>' +
          '<div class="uj-lbd-tier" id="game-lbd-tier">Juara 1</div>' +
          '<h3 class="uj-lbd-name" id="game-lbd-name">-</h3>' +
          '<div class="uj-lbd-sub" id="game-lbd-sub"></div>' +
        '</div>' +
        '<div class="uj-lbd-body">' +
          '<div class="uj-lbd-grid lgd-grid3">' +
            '<div class="uj-lbd-stat is-benar"><span id="game-lbd-satuan">Skor</span><b id="game-lbd-skor">0</b></div>' +
            '<div class="uj-lbd-stat"><span>Peringkat</span><b id="game-lbd-rank">#1</b></div>' +
            '<div class="uj-lbd-stat"><span>Pemain</span><b id="game-lbd-peserta">0</b></div>' +
          '</div>' +
          '<ul class="uj-lbd-info" id="game-lbd-info"></ul>' +
          '<button type="button" id="game-lbd-cert" class="uj-lbd-cert">' + IC_AWARD + '<span>Lihat Sertifikat</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(pop);

    pop.addEventListener('click', (e) => { if (e.target === pop) tutup(); });   // klik area luar popup
    pop.querySelector('#game-lbd-x').addEventListener('click', tutup);
    pop.querySelector('#game-lbd-cert').addEventListener('click', sertifikat);
    pop.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); tutup(); }
      else if (e.key === 'Tab') {   // fokus berputar di dalam popup
        const f = Array.from(pop.querySelectorAll('button')).filter((b) => !b.hidden), i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1)].focus();
      }
    });
    // Escape saat sertifikat terbuka hanya menutup sertifikat
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !terbuka()) return;
      if (window.AstaKandaSertifikatGame && window.AstaKandaSertifikatGame.terbuka()) return;
      tutup();
    });
  }

  function buka(d) {
    bangun();
    dataAktif = d;
    fokusAwal = document.activeElement;
    const i = Math.max(0, (parseInt(d.peringkat, 10) || 1) - 1);
    const kemenangan = d.satuan === 'Kemenangan';
    pop.querySelector('.uj-lbd-card').dataset.tier = i < 3 ? String(i + 1) : 'n';
    q('emblem').innerHTML = emblem(i);
    q('tier').textContent = i < 3 ? 'Juara ' + (i + 1) : 'Peringkat ' + (i + 1);
    q('name').textContent = d.nama;
    q('name').title = d.nama;
    q('sub').textContent = 'dari ' + d.peserta + ' pemain';
    q('satuan').textContent = d.satuan || 'Skor';
    hitung(q('skor'), Number(d.skor) || 0, 800, 380);
    q('rank').textContent = '#' + (i + 1);
    hitung(q('peserta'), Number(d.peserta) || 0, 600, 480);

    const info = [
      ['Game', '<img class="lgd-gimg" src="' + esc(d.gambar) + '" alt="" onerror="this.remove()">' + esc(d.gameNama)],
      ['Kategori', esc(d.kategori || '')],
    ];
    if (i === 0) info.push(['Status', 'Peringkat teratas']);
    else {
      const selisih = Math.max(0, (Number(d.skorJuara1) || 0) - (Number(d.skor) || 0));
      info.push(['Selisih dari Juara 1', selisih + (kemenangan ? ' kemenangan' : ' poin') + ' lagi']);
    }
    if (fmtTanggal(d.tanggal)) info.push([kemenangan ? 'Kemenangan terakhir' : 'Tanggal', esc(fmtTanggal(d.tanggal))]);
    q('info').innerHTML = info.map((x) => '<li><span>' + x[0] + '</span><b>' + x[1] + '</b></li>').join('');

    q('cert').hidden = !window.AstaKandaSertifikatGame;
    pop.classList.remove('hidden');
    pop.querySelector('.uj-lbd-card').focus();
  }
  function tutup() {
    pop.classList.add('hidden');
    if (fokusAwal && fokusAwal.focus && document.contains(fokusAwal)) fokusAwal.focus();
  }
  function sertifikat() {
    if (!dataAktif || !window.AstaKandaSertifikatGame) return;
    window.AstaKandaSertifikatGame.buka(dataAktif);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bangun); else bangun();   // dibangun sejak awal: buka = instan

  window.AstaKandaLeaderboardGame = { buka: buka, tutup: function () { if (terbuka()) tutup(); }, terbuka: terbuka };
})();