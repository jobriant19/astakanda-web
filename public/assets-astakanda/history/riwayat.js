/* ASTA KANDA — riwayat.js
 * Tab Hasil: Riwayat Ujian (daftar, detail, hapus, sertifikat) dan Peringkat Game
 * (podium 3 besar + tabel). Semua tampil langsung dari cache/memori, tanpa layar "memuat".
 * Data: GET /riwayat (sudah berisi rincian per soal), DELETE /riwayat/{id}, leaderboard game.
 * Pasangan CSS: history/historyresponsive.css.
 */
// shortcut: hapus satu per satu & tanpa pemeriksaan kepemilikan (riwayat belum per-user); upgrade bila ada login / perlu "hapus semua"
(function () {
  const panel = document.getElementById('panel-riwayat');
  if (!panel) return;

  const $ = (id) => document.getElementById(id);
  const svg = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IC = {
    trash:   svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>'),
    prev:    svg('<path d="M15 18l-6-6 6-6"/>'),
    next:    svg('<path d="M9 18l6-6-6-6"/>'),
    user:    svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    award:   svg('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>'),
    ok:      svg('<path d="M20 6 9 17l-5-5"/>'),
    no:      svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    list:    svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    clip:    svg('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>'),
    history: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
    trophy:  svg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    thumb:   svg('<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>'),
    trend:   svg('<path d="M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6"/>'),
  };
  const CROWN =
    '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rkCrownG" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#FFD66B"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>' +
    '<path d="M8 46 4 18l14 12 14-20 14 20 14-12-4 28z" fill="url(#rkCrownG)" stroke="#C98F1F" stroke-width="2" stroke-linejoin="round"/>' +
    '<rect x="8" y="46" width="48" height="8" rx="3" fill="#F5B942" stroke="#C98F1F" stroke-width="2"/>' +
    '<circle cx="32" cy="38" r="4" fill="#3B82F6"/><circle cx="19" cy="40" r="3" fill="#EF4444"/><circle cx="45" cy="40" r="3" fill="#EF4444"/></svg>';

  const LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit', custom: 'Custom' };
  const CACHE_KEY = 'riwayat-cache-v3';
  const RANK_KEY = 'riwayat-rank-v1';
  // Leaderboard lokal (localStorage, sama dengan yang ditulis ladders.js & hunter-ui.js): dibaca sinkron, jadi instan
  const bacaLokal = (kunci) => { try { return JSON.parse(localStorage.getItem(kunci)); } catch (e) { return null; } };
  const RANK_SUMBER = {
    apple: { nama: 'Apple Snake', gambar: '/assets/images/apple.png', url: '/game/leaderboard' },
    dino:  { nama: 'Dino Attack', gambar: '/assets/images/dino.png',  url: '/game/dino/leaderboard' },
    ladders: {
      nama: 'Snakes & Ladders', gambar: '/assets/images/ladders.png',   // peringkat = jumlah kemenangan
      lokal: () => Object.values(bacaLokal('astakanda_ladders_menang') || {})
        .sort((a, b) => (b.menang - a.menang) || (a.terakhir - b.terakhir))
        .map((r) => ({ nama: String(r.nama || 'Pemain'), skor: Number(r.menang) || 0 }))
        .filter((r) => r.skor > 0),
    },
    hunter: {
      nama: 'Hornet Hunter', gambar: '/assets/images/hornet.png',        // peringkat = skor tertinggi
      lokal: () => (Array.isArray(bacaLokal('astakanda.hunterBoard')) ? bacaLokal('astakanda.hunterBoard') : [])
        .map((r) => ({ nama: String(r.nama || 'Pemain'), skor: Number(r.skor) || 0 }))
        .filter((r) => r.skor > 0)
        .sort((a, b) => b.skor - a.skor),
    },
  };
  const TEKS_TAB = {
    riwayat: ['Riwayat Ujian', 'Semua hasil ujian yang pernah kamu kerjakan.'],
    rank:    ['Peringkat Game', 'Skor tertinggi per game · Snakes & Ladders: jumlah kemenangan.'],
  };

  /* ---------- Helper ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v) => Number(v) || 0;
  const tone = (n) => (n >= 80 ? 'good' : n >= 50 ? 'mid' : 'low');
  const predikat = (n) => (n >= 80 ? 'Sangat Baik' : n >= 50 ? 'Baik' : 'Peserta');
  const ikonNilai = (n) => (n >= 80 ? IC.trophy : n >= 50 ? IC.thumb : IC.trend);
  const pesan = (t) => '<div class="riwayat-review-empty">' + esc(t) + '</div>';
  const bukaSertifikat = (item) => { if (window.AstaKandaSertifikatUjian) window.AstaKandaSertifikatUjian.buka(item); };

  function formatTanggal(iso, singkat) {
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: singkat ? 'short' : 'long', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDurasi(detik) {
    detik = Math.max(0, parseInt(detik, 10) || 0);
    return String(Math.floor(detik / 60)).padStart(2, '0') + ':' + String(detik % 60).padStart(2, '0');
  }

  function headerCsrf() {
    const h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
    const meta = document.querySelector('meta[name="csrf-token"]');
    const m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
    if (meta && meta.content) h['X-CSRF-TOKEN'] = meta.content;
    else if (m) h['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
    return h;
  }

  const bacaCache = (kunci) => { try { return JSON.parse(sessionStorage.getItem(kunci)); } catch (e) { return null; } };
  const simpanCache = (kunci, nilai) => { try { sessionStorage.setItem(kunci, JSON.stringify(nilai)); } catch (e) {} };

  /* ---------- Markup layar detail ---------- */
  // shortcut: markup layar detail ditulis lewat JS karena history/panel.blade.php tidak ikut terkirim; upgrade: pindahkan ke panel.blade.php lalu hapus blok ini
  (function bangunDetail() {
    const host = $('riwayat-detail-screen');
    if (!host) return;
    const stat = (cls, ico, label, id) =>
      '<div class="rd-stat ' + cls + '"><span class="rd-stat-ico">' + ico + '</span>' +
      '<span class="rd-stat-txt"><small>' + label + '</small><b id="' + id + '">0</b></span></div>';
    (host.querySelector('.riwayat-inner') || host).innerHTML =
      '<div class="rd-bar">' +
        '<button type="button" class="riwayat-back-btn" id="riwayat-btn-back" aria-label="Kembali">' + IC.prev + '</button>' +
        '<div class="rd-bar-title">Detail Hasil Ujian</div>' +
        '<div class="rd-actions">' +
          '<button type="button" class="rd-btn rd-btn-cert" id="riwayat-btn-cert" aria-label="Lihat sertifikat">' + IC.award + '<span>Sertifikat</span></button>' +
          '<button type="button" class="rd-btn rd-btn-del" id="riwayat-btn-del" aria-label="Hapus riwayat ini" title="Hapus riwayat ini">' + IC.trash + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="rd-hero">' +
        '<span class="rd-medal" id="riwayat-detail-emoji"></span>' +
        '<div class="rd-info">' +
          '<div class="rd-nama">' + IC.user + '<span>-</span></div>' +
          '<div class="rd-chips"><span class="rd-chip" id="riwayat-detail-kesulitan"></span><span class="rd-chip rd-chip-ghost" id="riwayat-detail-predikat"></span></div>' +
          '<div class="rd-tanggal" id="riwayat-detail-tanggal"></div>' +
          '<div class="rd-meta" id="riwayat-detail-meta"></div>' +
        '</div>' +
        '<div class="rd-ring" id="riwayat-detail-ring"><div class="rd-ring-in"><b id="riwayat-detail-nilai">0</b><small>dari 100</small></div></div>' +
      '</div>' +
      '<div class="rd-stats">' +
        stat('rd-stat-total', IC.clip, 'Total Soal', 'riwayat-detail-total') +
        stat('rd-stat-good', IC.ok, 'Benar', 'riwayat-detail-benar') +
        stat('rd-stat-bad', IC.no, 'Salah', 'riwayat-detail-salah') +
      '</div>' +
      '<div class="rd-akurasi"><span>Akurasi</span><span class="rd-akurasi-track"><i id="riwayat-detail-akurasi-bar"></i></span><b id="riwayat-detail-akurasi">0%</b></div>' +
      '<div class="rd-section"><span class="rd-section-ico">' + IC.list + '</span>Rincian per Soal</div>' +
      '<div class="riwayat-review-list" id="riwayat-review-list"></div>';
  })();

  const screenList = $('riwayat-list-screen');
  const screenDetail = $('riwayat-detail-screen');
  const emptyState = $('riwayat-empty');
  const listEl = $('riwayat-list');
  const D = {};
  ['emoji', 'tanggal', 'nilai', 'meta', 'total', 'benar', 'salah', 'ring', 'kesulitan', 'predikat', 'akurasi', 'akurasi-bar']
    .forEach((k) => { D[k] = $('riwayat-detail-' + k); });

  let semua = [];          // seluruh riwayat (urutan dari server)
  let detailAktif = null;  // riwayat yang sedang dibuka di layar detail
  let dimuat = false;      // true setelah data pertama (cache/server) tersedia

  /* ---------- Pembagi halaman (tanpa scroll) + indikator bawah ---------- */
  function buatPager(el, renderItem, fallback) {
    const bar = document.createElement('div');
    bar.className = 'riwayat-pager is-single';
    bar.innerHTML =
      '<button type="button" class="riwayat-pager-btn" aria-label="Halaman sebelumnya">' + IC.prev + '</button>' +
      '<div class="riwayat-dots"></div>' +
      '<button type="button" class="riwayat-pager-btn" aria-label="Halaman berikutnya">' + IC.next + '</button>';
    el.insertAdjacentElement('afterend', bar);
    const [btnPrev, btnNext] = bar.querySelectorAll('.riwayat-pager-btn');
    const dots = bar.querySelector('.riwayat-dots');
    let items = [], page = 0, perPage = fallback, emptyHtml = '';

    const jumlahHalaman = () => Math.max(1, Math.ceil(items.length / perPage));

    // berapa item muat di tinggi daftar saat ini (null bila panel sedang tersembunyi)
    function ukur() {
      const cs = getComputedStyle(el);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (!(h > 0)) return null;
      const itemH = parseFloat(cs.getPropertyValue('--pg-h')) || 76;
      const gap = parseFloat(cs.getPropertyValue('--pg-gap')) || 8;
      return Math.max(1, Math.floor((h + gap) / (itemH + gap)));
    }

    function render() {
      const pages = jumlahHalaman();
      page = Math.min(page, pages - 1);
      el.innerHTML = items.length ? '' : emptyHtml;
      items.slice(page * perPage, (page + 1) * perPage)
        .forEach((it, i) => el.appendChild(renderItem(it, page * perPage + i)));

      // titik indikator (maks. 7, bergeser mengikuti halaman aktif)
      dots.innerHTML = '';
      const awal = pages <= 7 ? 0 : Math.min(Math.max(page - 3, 0), pages - 7);
      const akhir = Math.min(pages, awal + 7);
      for (let i = awal; i < akhir; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'riwayat-dot' + (i === page ? ' is-active' : '') +
          (pages > 7 && ((i === awal && awal > 0) || (i === akhir - 1 && akhir < pages)) ? ' is-edge' : '');
        b.setAttribute('aria-label', 'Halaman ' + (i + 1));
        b.addEventListener('click', () => go(i));
        dots.appendChild(b);
      }
      bar.classList.toggle('is-single', pages <= 1);
      btnPrev.disabled = page <= 0;
      btnNext.disabled = page >= pages - 1;
    }

    function go(n) {
      n = Math.max(0, Math.min(n, jumlahHalaman() - 1));
      if (n !== page) { page = n; render(); }
    }

    function set(list, opsi) {
      opsi = opsi || {};
      items = list || [];
      emptyHtml = opsi.emptyHtml || '';
      if (opsi.reset) page = 0;
      perPage = ukur() || perPage;
      render();
    }

    btnPrev.addEventListener('click', () => go(page - 1));
    btnNext.addEventListener('click', () => go(page + 1));

    // ukuran berubah (rotasi, resize, tab dibuka) -> hitung ulang, tetap di item yang sama
    if (window.ResizeObserver) {
      new ResizeObserver(() => {
        const n = ukur();
        if (n && n !== perPage) {
          const pertama = page * perPage;
          perPage = n;
          page = Math.floor(pertama / perPage);
          render();
        }
      }).observe(el);
    }

    // geser jari / roda mouse = ganti halaman
    let sx = null, kunciRoda = 0;
    el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 45) go(page + (dx < 0 ? 1 : -1));
    });
    el.addEventListener('wheel', (e) => {
      if (jumlahHalaman() <= 1 || Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      const t = Date.now();
      if (t - kunciRoda < 350) return;
      kunciRoda = t;
      go(page + (e.deltaY > 0 ? 1 : -1));
    }, { passive: false });

    return { set, bar };
  }

  /* ---------- Kartu & baris ---------- */
  function buatKartu(item) {
    const nilai = Math.max(0, Math.min(100, num(item.nilai)));
    const benar = num(item.benar), salah = num(item.salah), dijawab = benar + salah;
    const persen = dijawab ? Math.round(benar / dijawab * 100) : 0;
    const nama = String(item.nama_peserta || '').trim();
    const meta = (item.total_soal != null ? item.total_soal + ' soal' : dijawab + ' soal dijawab') +
      (item.durasi_detik != null ? ' · ' + formatDurasi(item.durasi_detik) : '');

    const row = document.createElement('div');
    row.className = 'riwayat-item neu-raised tone-' + tone(nilai);
    row.dataset.id = item.id;
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.innerHTML =
      '<span class="riwayat-ring" style="--p:' + nilai + '"><b>' + nilai + '</b></span>' +
      '<span class="riwayat-item-info">' +
        '<span class="riwayat-item-top">' +
          '<span class="riwayat-badge diff-' + esc(item.kesulitan) + '">' + esc(LABEL[item.kesulitan] || item.kesulitan || '-') + '</span>' +
          '<span class="riwayat-item-tanggal"><span class="tgl-long">' + formatTanggal(item.created_at) + '</span>' +
            '<span class="tgl-short">' + formatTanggal(item.created_at, true) + '</span></span>' +
        '</span>' +
        '<span class="riwayat-item-nama' + (nama ? '' : ' is-kosong') + '">' + IC.user + '<span>' + esc(nama || 'Tanpa nama') + '</span></span>' +
        '<span class="riwayat-item-meta">' + esc(meta) + '</span>' +
        '<span class="riwayat-bar' + (dijawab ? '' : ' is-empty') + '"><i style="width:' + persen + '%"></i></span>' +
      '</span>' +
      '<span class="riwayat-item-stats">' +
        '<span class="riwayat-item-benar">' + IC.ok + benar + '</span>' +
        '<span class="riwayat-item-salah">' + IC.no + salah + '</span>' +
      '</span>' +
      '<span class="riwayat-actions">' +
        '<button type="button" class="riwayat-cert" aria-label="Lihat sertifikat" title="Sertifikat">' + IC.award + '</button>' +
        '<button type="button" class="riwayat-del" aria-label="Hapus riwayat" title="Hapus">' + IC.trash + '</button>' +
      '</span>';

    const buka = () => openDetail(item.id);
    row.addEventListener('click', (e) => { if (!e.target.closest('.riwayat-actions')) buka(); });
    row.addEventListener('keydown', (e) => {
      if (e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); buka(); }
    });
    row.querySelector('.riwayat-cert').addEventListener('click', (e) => { e.stopPropagation(); bukaSertifikat(item); });
    row.querySelector('.riwayat-del').addEventListener('click', (e) => { e.stopPropagation(); konfirmasiHapus(item, false); });
    return row;
  }

  function buatBarisReview(soal, idx) {
    const benar = soal.hasil === 'benar';
    const row = document.createElement('div');
    row.className = 'riwayat-review-item ' + (benar ? 'is-benar' : 'is-salah');
    row.innerHTML =
      '<span class="riwayat-review-no">' + (idx + 1) + '</span>' +
      '<span class="riwayat-review-target">' + esc(soal.target) + '</span>' +
      '<span class="riwayat-review-hasil">' + (benar ? IC.ok + 'Benar' : IC.no + 'Dilewati') + '</span>';
    return row;
  }

  const pagerList = buatPager(listEl, buatKartu, 5);
  const pagerReview = buatPager($('riwayat-review-list'), buatBarisReview, 6);

  /* ---------- Tab: Riwayat Ujian | Peringkat Game ---------- */
  let tabAktif = 'riwayat';
  let gameAktif = 'apple';
  const rankData = bacaCache(RANK_KEY) || {};   // { apple: [{nama, skor}], dino: [...] } — langsung tersedia dari cache

  const judulEl = screenList.querySelector('.riwayat-title');
  const subEl = screenList.querySelector('.riwayat-sub');
  const headEl = screenList.querySelector('.riwayat-head');

  const tabs = document.createElement('div');
  tabs.className = 'rk-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.innerHTML =
    '<button type="button" class="rk-tab is-active" role="tab" data-tab="riwayat" aria-selected="true">' + IC.history + '<span>Riwayat Ujian</span></button>' +
    '<button type="button" class="rk-tab" role="tab" data-tab="rank" aria-selected="false">' + IC.trophy + '<span>Peringkat Game</span></button>';
  (headEl || listEl.parentElement).insertAdjacentElement(headEl ? 'afterend' : 'afterbegin', tabs);

  const rankView = document.createElement('div');
  rankView.className = 'riwayat-rank hidden';
  rankView.innerHTML = '<div class="rk-games"></div><div class="leaderboard-podium rk-podium"></div><div class="riwayat-rank-list"></div>';
  listEl.parentElement.appendChild(rankView);
  const gamesEl = rankView.querySelector('.rk-games');
  const podiumEl = rankView.querySelector('.rk-podium');
  const rankList = rankView.querySelector('.riwayat-rank-list');

  Object.keys(RANK_SUMBER).forEach((k) => {
    new Image().src = RANK_SUMBER[k].gambar;   // gambar sudah di cache browser saat tab dibuka
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rk-game' + (k === gameAktif ? ' is-active' : '');
    b.dataset.game = k;
    b.innerHTML = '<img src="' + RANK_SUMBER[k].gambar + '" alt="" onerror="this.remove()"><span>' + RANK_SUMBER[k].nama + '</span>';
    gamesEl.appendChild(b);
  });

  // Kartu podium 3 besar (kelas .podium-card* sama dengan leaderboard di dalam game, lihat apple.css)
  function buatKartuPodium(r, rank) {
    const k = document.createElement('div');
    k.className = 'podium-card podium-card--rank' + rank;
    k.innerHTML =
      '<div class="podium-card__crown">' + (rank === 1 ? CROWN : '') + '</div>' +
      '<div class="podium-card__name">' + esc(r.nama) + '</div>' +
      '<div class="podium-card__score"><img class="rk-gicon" src="' + RANK_SUMBER[gameAktif].gambar + '" alt="" onerror="this.remove()"><span>' + esc(r.skor) + '</span></div>' +
      '<div class="podium-card__step">' + rank + '</div>';
    return k;
  }

  // Baris tabel peringkat 4 dst
  function buatBarisRank(row) {
    const el = document.createElement('div');
    el.className = 'rk-row';
    el.innerHTML =
      '<span class="rk-badge">' + row.rank + '</span>' +
      '<span class="rk-nama"><i class="rk-avatar">' + esc((Array.from(row.nama)[0] || '?').toUpperCase()) + '</i><span>' + esc(row.nama) + '</span></span>' +
      '<span class="rk-skor"><b>' + esc(row.skor) + '</b></span>';
    return el;
  }
  const pagerRank = buatPager(rankList, buatBarisRank, 3);

  function renderRank(gagal) {
    const rows = RANK_SUMBER[gameAktif].lokal ? RANK_SUMBER[gameAktif].lokal() : rankData[gameAktif];
    podiumEl.innerHTML = rows
      ? (rows.length ? '' : pesan('Belum ada skor untuk ' + RANK_SUMBER[gameAktif].nama + '.'))
      : (gagal ? pesan('Peringkat belum bisa dimuat. Coba lagi nanti.') : '');   // belum ada data: kosong, bukan "memuat"
    (rows || []).slice(0, 3).forEach((r, i) => podiumEl.appendChild(buatKartuPodium(r, i + 1)));
    const sisa = (rows || []).slice(3).map((r, i) => ({ nama: r.nama, skor: r.skor, rank: i + 4 }));
    rankList.classList.toggle('hidden', !sisa.length);
    pagerRank.bar.classList.toggle('hidden', !sisa.length);
    pagerRank.set(sisa, { reset: true });
  }

  const normalisasiRank = (d) =>
    (Array.isArray(d) ? d : ((d && (d.leaderboard || d.data || d.rows || d.items)) || []))
      .map((r) => ({
        nama: String(r.nama || r.name || r.pemain || 'Pemain'),
        skor: num(r.skor_tertinggi != null ? r.skor_tertinggi : (r.skor != null ? r.skor : r.score)),
      }))
      .sort((a, b) => b.skor - a.skor);

  // Ambil dari server diam-diam; tampilan hanya digambar ulang bila datanya berubah
  function segarkanRank(game) {
    if (RANK_SUMBER[game].lokal) return Promise.resolve();   // data lokal sudah ditampilkan sinkron oleh renderRank
    const aktif = () => tabAktif === 'rank' && game === gameAktif;
    return fetch(RANK_SUMBER[game].url, { headers: { 'Accept': 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => {
        const rows = normalisasiRank(d);
        const berubah = JSON.stringify(rows) !== JSON.stringify(rankData[game]);
        rankData[game] = rows;
        simpanCache(RANK_KEY, rankData);
        if (berubah && aktif()) renderRank();
      })
      .catch(() => { if (!rankData[game] && aktif()) renderRank(true); });
  }

  function tampilkanTab() {
    const rank = tabAktif === 'rank';
    const adaItem = semua.length > 0;
    tabs.querySelectorAll('.rk-tab').forEach((b) => {
      const on = b.dataset.tab === tabAktif;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (judulEl) judulEl.textContent = TEKS_TAB[tabAktif][0];
    if (subEl) subEl.textContent = TEKS_TAB[tabAktif][1];
    rankView.classList.toggle('hidden', !rank);
    emptyState.classList.toggle('hidden', rank || !dimuat || adaItem);   // pesan kosong tidak muncul sebelum data tiba
    listEl.classList.toggle('hidden', rank || !adaItem);
    pagerList.bar.classList.toggle('hidden', rank || !adaItem);
  }

  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.rk-tab');
    if (!b || b.dataset.tab === tabAktif) return;
    tabAktif = b.dataset.tab;
    tampilkanTab();
    if (tabAktif === 'rank') { renderRank(); segarkanRank(gameAktif); }
    else pagerList.set(semua);
  });

  gamesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.rk-game');
    if (!b || b.dataset.game === gameAktif) return;
    gameAktif = b.dataset.game;
    gamesEl.querySelectorAll('.rk-game').forEach((x) => x.classList.toggle('is-active', x === b));
    renderRank();
    segarkanRank(gameAktif);
  });

  /* ---------- Daftar ---------- */
  function renderList(items) {
    semua = items;
    dimuat = true;
    tampilkanTab();
    if (tabAktif === 'riwayat') pagerList.set(semua);
  }

  function muatDaftar() {
    const cache = bacaCache(CACHE_KEY);
    if (Array.isArray(cache)) renderList(cache);   // tampil langsung dari cache
    fetch('/riwayat', { headers: { 'Accept': 'application/json' } })
      .then((r) => r.json())
      .then((items) => {
        if (!Array.isArray(items)) throw new Error('format');
        if (!dimuat || JSON.stringify(items) !== JSON.stringify(semua)) { renderList(items); simpanCache(CACHE_KEY, semua); }
      })
      .catch(() => { if (!dimuat) renderList([]); });
  }

  /* ---------- Detail / review ---------- */
  function openDetail(id) {
    const item = semua.find((x) => String(x.id) === String(id));
    if (!item) return;
    renderDetail(item);
    if (!Array.isArray(item.detail)) {   // cache lama tanpa rincian: ambil dari server
      fetch('/riwayat/' + id, { headers: { 'Accept': 'application/json' } })
        .then((r) => r.json()).then(renderDetail).catch(() => {});
    }
  }

  function renderDetail(item) {
    detailAktif = item;
    const nilai = Math.max(0, Math.min(100, num(item.nilai)));
    const benar = num(item.benar), salah = num(item.salah), dijawab = benar + salah;
    const akurasi = dijawab ? Math.round(benar / dijawab * 100) : 0;

    screenDetail.dataset.tone = tone(nilai);
    D.emoji.innerHTML = ikonNilai(nilai);
    screenDetail.querySelector('.rd-nama span').textContent = String(item.nama_peserta || '').trim() || 'Tanpa nama';
    D.kesulitan.textContent = LABEL[item.kesulitan] || item.kesulitan || '-';
    D.predikat.textContent = predikat(nilai);
    D.tanggal.textContent = formatTanggal(item.created_at);
    D.meta.textContent = (item.total_soal != null ? item.total_soal : dijawab) + ' soal · ' + formatDurasi(item.durasi_detik);
    D.nilai.textContent = nilai;
    D.ring.style.setProperty('--p', nilai);
    D.total.textContent = dijawab;
    D.benar.textContent = benar;
    D.salah.textContent = salah;
    D.akurasi.textContent = akurasi + '%';
    D['akurasi-bar'].style.width = akurasi + '%';

    screenList.classList.add('hidden');
    screenDetail.classList.remove('hidden');   // tampilkan dulu agar tinggi daftar review bisa diukur
    pagerReview.set(Array.isArray(item.detail) ? item.detail : [], {
      reset: true,
      emptyHtml: Array.isArray(item.detail) ? pesan('Rincian per soal tidak tersedia untuk riwayat ini.') : '',
    });
  }

  function kembaliKeDaftar() {
    detailAktif = null;
    screenDetail.classList.add('hidden');
    screenList.classList.remove('hidden');
    pagerList.set(semua);   // ukur ulang setelah daftar tampil kembali
  }

  $('riwayat-btn-back').addEventListener('click', kembaliKeDaftar);
  $('riwayat-btn-cert').addEventListener('click', () => { if (detailAktif) bukaSertifikat(detailAktif); });
  $('riwayat-btn-del').addEventListener('click', () => { if (detailAktif) konfirmasiHapus(detailAktif, true); });

  /* ---------- Hapus riwayat ---------- */
  const modal = document.createElement('div');
  modal.className = 'riwayat-modal hidden';
  modal.innerHTML =
    '<div class="riwayat-modal-box" role="dialog" aria-modal="true">' +
      '<div class="riwayat-modal-ico">' + IC.trash + '</div>' +
      '<div class="riwayat-modal-title">Hapus riwayat ini?</div>' +
      '<div class="riwayat-modal-text"></div>' +
      '<div class="riwayat-modal-err hidden"></div>' +
      '<div class="riwayat-modal-actions">' +
        '<button type="button" class="riwayat-modal-cancel">Batal</button>' +
        '<button type="button" class="riwayat-modal-ok">Hapus</button>' +
      '</div>' +
    '</div>';
  panel.appendChild(modal);
  const mText = modal.querySelector('.riwayat-modal-text');
  const mErr = modal.querySelector('.riwayat-modal-err');
  const mOk = modal.querySelector('.riwayat-modal-ok');
  const mCancel = modal.querySelector('.riwayat-modal-cancel');
  let idHapus = null, dariDetail = false;

  function tutupModal() { modal.classList.add('hidden'); idHapus = null; }

  function konfirmasiHapus(item, detail) {
    idHapus = item.id;
    dariDetail = detail;
    mText.innerHTML = 'Nilai <b>' + esc(item.nilai) + '</b> · ' + esc(LABEL[item.kesulitan] || item.kesulitan) +
      '<br>' + esc(formatTanggal(item.created_at)) + '<br>Riwayat yang dihapus tidak bisa dikembalikan.';
    mErr.classList.add('hidden');
    mOk.disabled = false;
    mOk.textContent = 'Hapus';
    modal.classList.remove('hidden');
    mCancel.focus();
  }

  function jalankanHapus() {
    if (idHapus == null) return;
    const id = idHapus;
    mOk.disabled = true;
    mOk.textContent = 'Menghapus…';
    mErr.classList.add('hidden');
    fetch('/riwayat/' + id, { method: 'DELETE', headers: headerCsrf() })
      .then((r) => { if (!r.ok) throw new Error('gagal'); })
      .then(() => {
        semua = semua.filter((x) => String(x.id) !== String(id));
        simpanCache(CACHE_KEY, semua);
        tutupModal();
        if (dariDetail) kembaliKeDaftar();
        renderList(semua);
      })
      .catch(() => {
        mOk.disabled = false;
        mOk.textContent = 'Hapus';
        mErr.textContent = 'Gagal menghapus. Coba lagi.';
        mErr.classList.remove('hidden');
      });
  }

  modal.addEventListener('click', (e) => { if (e.target === modal) tutupModal(); });
  mCancel.addEventListener('click', tutupModal);
  mOk.addEventListener('click', jalankanHapus);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) tutupModal(); });

  // Tab Hasil dibuka lagi (mis. setelah bermain game) -> peringkat digambar ulang dari data terbaru
  const tombolHasil = document.querySelector('.tab-btn[data-tab="riwayat"]');
  if (tombolHasil) tombolHasil.addEventListener('click', () => { if (tabAktif === 'rank') { renderRank(); segarkanRank(gameAktif); } });

  // Ujian selesai & tersimpan -> muat ulang daftar tanpa reload halaman
  window.addEventListener('astakanda:riwayat-baru', muatDaftar);

  /* ---------- Mulai ---------- */
  tampilkanTab();
  muatDaftar();
  Object.keys(RANK_SUMBER).forEach(segarkanRank);   // peringkat diambil sejak halaman dibuka, jadi siap saat tab dibuka
})();