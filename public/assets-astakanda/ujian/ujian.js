/* ASTA KANDA — ujian.js
 * Logika tab "Ujian": layar mulai (kesulitan + cara mengerjakan),
 * layar ujian berlangsung (timer + deteksi gestur otomatis lewat kamera
 * yang sama dipakai tab Belajar, lihat window.astaKanda di app.js),
 * dan layar hasil.
 */
(function () {
  const panel = document.getElementById('panel-ujian');
  if (!panel) return;

    /* ---------- Tampilan baru: layar Ujian berlangsung, Hasil & popup Nama (ikon SVG, tanpa emoji) ---------- */
  // shortcut: markup 2 layar ini ditulis ulang lewat JS karena panel.blade.php tidak ikut terkirim; upgrade: pindahkan ke panel.blade.php lalu hapus blok ini
  const IC = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    clock:   IC('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    list:    IC('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
    check:   IC('<path d="M20 6 9 17l-5-5"/>'),
    x:       IC('<path d="M18 6 6 18M6 6l12 12"/>'),
    award:   IC('<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>'),
    trophy:  IC('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    thumb:   IC('<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>'),
    trend:   IC('<path d="M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6"/>'),
    hand:    IC('<path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
    skip:    IC('<path d="m5 4 10 8-10 8V4zM19 5v14"/>'),
    flag:    IC('<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>'),
    refresh: IC('<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>'),
    home:    IC('<path d="m3 11 9-8 9 8M5 10v10h14V10"/>'),
    user:    IC('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    play:    IC('<path d="m6 4 14 8-14 8V4z"/>'),
  };

  const statCard = (cls, ico, label, id) =>
    '<div class="uj2-stat ' + cls + '"><span class="uj2-stat-ico">' + ico + '</span>' +
    '<span class="uj2-stat-txt"><small>' + label + '</small><b id="' + id + '">0</b></span></div>';

  (function bangunLayar() {
    const live = document.getElementById('ujian-live');
    const hasil = document.getElementById('ujian-result');
    if (live) live.innerHTML =
      '<div class="uj2-stats">' +
        statCard('uj2-stat-time uj2-stat-wide', ICON.clock, 'Waktu', 'ujian-stat-waktu') +
        statCard('uj2-stat-soal', ICON.list, 'Soal', 'ujian-stat-soal') +
        statCard('uj2-stat-good', ICON.check, 'Benar', 'ujian-stat-benar') +
        statCard('uj2-stat-bad', ICON.x, 'Salah', 'ujian-stat-salah') +
        statCard('uj2-stat-gold', ICON.trophy, 'Nilai', 'ujian-stat-nilai') +
      '</div>' +
      '<div class="uj2-progress"><i id="ujian-progress-fill"></i></div>' +
      '<div class="uj2-question">' +
        '<span class="uj2-q-badge">' + ICON.hand + 'Peragakan gestur untuk</span>' +
        '<div class="uj2-q-target" id="ujian-question-target">-</div>' +
        '<div class="ujian-question-feedback" id="ujian-question-feedback"></div>' +
      '</div>' +
      '<div class="uj2-actions">' +
        '<button type="button" id="ujian-btn-lewati" class="uj2-btn uj2-btn-ghost">' + ICON.skip + '<span>Lewati Soal</span></button>' +
        '<button type="button" id="ujian-btn-selesai" class="uj2-btn uj2-btn-danger">' + ICON.flag + '<span>Akhiri Ujian</span></button>' +
      '</div>';

    if (hasil) hasil.innerHTML =
      '<div class="uj2-wrap">' +
        '<div class="uj2-hero" id="ujian-result-hero" data-tone="low">' +
          '<span class="uj2-medal" id="ujian-result-emoji">' + ICON.trend + '</span>' +
          '<div class="uj2-hero-text">' +
            '<div class="uj2-result-title">Hasil Ujian</div>' +
            '<div class="uj2-result-sub" id="ujian-result-sub"></div>' +
            '<div class="uj2-result-name">' + ICON.user + '<span id="ujian-result-nama">-</span></div>' +
          '</div>' +
          '<div class="uj2-score-ring" id="ujian-result-ring"><b><span id="ujian-result-nilai">0</span><small>/100</small></b></div>' +
        '</div>' +
        '<div class="uj2-result-stats">' +
          statCard('uj2-stat-soal', ICON.list, 'Total Soal', 'ujian-result-total') +
          statCard('uj2-stat-good', ICON.check, 'Benar', 'ujian-result-benar') +
          statCard('uj2-stat-bad', ICON.x, 'Salah', 'ujian-result-salah') +
        '</div>' +
        '<div class="uj2-actions">' +
          '<button type="button" id="ujian-btn-sertifikat" class="uj2-btn uj2-btn-cert">' + ICON.award + '<span>Sertifikat</span></button>' +
          '<button type="button" id="ujian-btn-ulangi" class="uj2-btn uj2-btn-primary">' + ICON.refresh + '<span>Ulangi</span></button>' +
          '<button type="button" id="ujian-btn-kembali" class="uj2-btn uj2-btn-ghost">' + ICON.home +
            '<span class="lbl-long">Kembali ke Awal</span><span class="lbl-short">Awal</span></button>' +
        '</div>' +
      '</div>';

    if (!document.getElementById('modal-ujian-nama')) {
      panel.insertAdjacentHTML('beforeend',
        '<div id="modal-ujian-nama" class="ujian-set-modal hidden">' +
          '<div class="ujian-set-card uj-nama-card" role="dialog" aria-modal="true" aria-labelledby="ujian-nama-title">' +
            '<div class="ujian-set-head"><span class="ujian-set-head-ico">' + ICON.user + '</span>' +
              '<div><div class="ujian-set-title" id="ujian-nama-title">Nama Peserta</div>' +
              '<div class="ujian-set-sub">Nama dicetak di sertifikat dan riwayat.</div></div></div>' +
            '<label class="uj-nama-field">' + ICON.user +
              '<input id="ujian-nama-input" type="text" maxlength="40" placeholder="Tulis nama lengkapmu" autocomplete="name"></label>' +
            '<div id="ujian-nama-err" class="uj-nama-err hidden">Nama wajib diisi.</div>' +
            '<div class="ujian-set-foot">' +
              '<button type="button" id="ujian-nama-batal" class="ujian-set-cancel">Batal</button>' +
              '<button type="button" id="ujian-nama-mulai" class="ujian-set-ok uj-ok-ico">' + ICON.play + 'Mulai Ujian</button>' +
            '</div>' +
          '</div></div>');
    }
  })();

  const screenStart  = document.getElementById('ujian-start');
  const screenLive   = document.getElementById('ujian-live');
  const screenResult = document.getElementById('ujian-result');

  const diffChips     = Array.from(document.querySelectorAll('.diff-chip'));
  const customFields   = document.getElementById('ujian-custom-fields');
  const customWaktu    = document.getElementById('ujian-custom-waktu');
  const customSoal     = document.getElementById('ujian-custom-soal');
  const previewWaktu   = document.getElementById('ujian-preview-waktu');
  const previewSoal    = document.getElementById('ujian-preview-soal');
  const btnMulai       = document.getElementById('ujian-btn-mulai');

  const btnAtur    = document.getElementById('ujian-btn-atur');
  const aturSub    = document.getElementById('ujian-atur-sub');
  const previewBox = previewWaktu.closest('.ujian-preview');

  const statWaktu = document.getElementById('ujian-stat-waktu');
  const statSoal  = document.getElementById('ujian-stat-soal');
  const statBenar = document.getElementById('ujian-stat-benar');
  const statSalah = document.getElementById('ujian-stat-salah');
  const statNilai = document.getElementById('ujian-stat-nilai');
  const progressFill = document.getElementById('ujian-progress-fill');
  const questionTarget   = document.getElementById('ujian-question-target');
  const questionFeedback = document.getElementById('ujian-question-feedback');
  const btnLewati  = document.getElementById('ujian-btn-lewati');
  const btnSelesai = document.getElementById('ujian-btn-selesai');

  const resultEmoji = document.getElementById('ujian-result-emoji');
  const resultSub   = document.getElementById('ujian-result-sub');
  const resultNilai = document.getElementById('ujian-result-nilai');
  const resultTotal = document.getElementById('ujian-result-total');
  const resultBenar = document.getElementById('ujian-result-benar');
  const resultSalah = document.getElementById('ujian-result-salah');
  const btnUlangi  = document.getElementById('ujian-btn-ulangi');
  const btnKembali = document.getElementById('ujian-btn-kembali');

    const resultNama    = document.getElementById('ujian-result-nama');
  const resultRing    = document.getElementById('ujian-result-ring');
  const resultHero    = document.getElementById('ujian-result-hero');
  const btnSertifikat = document.getElementById('ujian-btn-sertifikat');

  // ---------------- Nama peserta ----------------
  const NAMA_KEY   = 'astaKandaNamaPeserta';
  const modalNama  = document.getElementById('modal-ujian-nama');
  const namaInput  = document.getElementById('ujian-nama-input');
  const namaErr    = document.getElementById('ujian-nama-err');
  const namaBatal  = document.getElementById('ujian-nama-batal');
  const namaMulai  = document.getElementById('ujian-nama-mulai');
  let namaPeserta = '';
  let aksiNama = null;
  let lastRiwayat = null;   // hasil ujian terakhir, dipakai untuk sertifikat

  function tanyaNama(lanjut) {
    let awal = '';
    try { awal = localStorage.getItem(NAMA_KEY) || ''; } catch (e) {}
    namaInput.value = namaPeserta || awal;
    namaErr.classList.add('hidden');
    aksiNama = lanjut;
    modalNama.classList.remove('hidden');
    namaInput.focus();
    namaInput.select();
  }
  function kirimNama() {
    const n = namaInput.value.replace(/\s+/g, ' ').trim();
    if (!n) { namaErr.classList.remove('hidden'); namaInput.focus(); return; }
    namaPeserta = n;
    try { localStorage.setItem(NAMA_KEY, n); } catch (e) {}
    modalNama.classList.add('hidden');
    const f = aksiNama;
    aksiNama = null;
    if (f) f();
  }
  namaMulai.addEventListener('click', kirimNama);
  namaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); kirimNama(); } });
  namaInput.addEventListener('input', () => namaErr.classList.add('hidden'));
  namaBatal.addEventListener('click', () => { aksiNama = null; modalNama.classList.add('hidden'); });
  modalNama.addEventListener('click', (e) => { if (e.target === modalNama) { aksiNama = null; modalNama.classList.add('hidden'); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalNama.classList.contains('hidden')) { aksiNama = null; modalNama.classList.add('hidden'); }
  });

  const PRESET = {
    mudah:  { menit: 3, soal: 5 },
    sedang: { menit: 5, soal: 10 },
    sulit:  { menit: 7, soal: 15 },
  };
  let currentDiff = 'mudah';

  // ---------------- Layar 1: pilih kesulitan ----------------
  function updatePreview() {
    let menit, soal;
    if (currentDiff === 'custom') {
      menit = Math.max(1, parseInt(customWaktu.value, 10) || 1);
      soal  = Math.max(1, parseInt(customSoal.value, 10) || 1);
    } else {
      ({ menit, soal } = PRESET[currentDiff]);
    }
    previewWaktu.textContent = menit;
    previewSoal.textContent = soal;
    return { menit, soal };
  }

  diffChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      diffChips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      currentDiff = chip.dataset.diff;
      const isCustom = currentDiff === 'custom';
      customFields.classList.toggle('hidden', !isCustom);
      btnAtur.classList.toggle('hidden', !isCustom);
      // preview sama dengan isi 2 kolom Custom, jadi diganti tombol Atur Soal agar tinggi baris tetap
      if (previewBox) previewBox.classList.toggle('hidden', isCustom);
      if (isCustom) refreshAturSub();
      updatePreview();
    });
  });
  customWaktu.addEventListener('input', updatePreview);
  customSoal.addEventListener('input', updatePreview);
  updatePreview();

  const MIN_KARTU = 5;
  const modalSyarat      = document.getElementById('modal-ujian-syarat');
  const modalSyaratText  = document.getElementById('modal-ujian-syarat-text');
  const modalSyaratTutup = document.getElementById('modal-ujian-syarat-tutup');
  const modalSyaratBelajar = document.getElementById('modal-ujian-syarat-belajar');

  // ---------------- Atur Soal (khusus mode Custom) ----------------
  const JENIS_LABEL = { alfabet: 'Alfabet', kata: 'Kata', campuran: 'Campuran' };
  const PAGE_BAHASA = 6;   // sama dengan pop up Belajar
  const PAGE_SOAL   = 12;  // 4 kolom x 3 baris
  const SEMUA = '*';       // penanda "semua bahasa isyarat" (dipakai mode Mudah/Sedang/Sulit)

  let soalCfg = { variant: null, mode: 'acak', jenis: 'campuran', picks: new Set() };
  let draft = null;
  let pilihMode = null;    // 'bahasa' | 'soal'
  let pilihPage = 1;

  const byId = (id) => document.getElementById(id);
  const modalAtur       = byId('modal-ujian-atur');
  const aturBahasaBtn   = byId('ujian-atur-bahasa-btn');
  const aturBahasaNama  = byId('ujian-atur-bahasa-nama');
  const aturBahasaSub   = byId('ujian-atur-bahasa-sub');
  const aturMode        = byId('ujian-atur-mode');
  const aturJenis       = byId('ujian-atur-jenis');
  const aturSoalWrap    = byId('ujian-atur-soal-wrap');
  const aturSoalBtn     = byId('ujian-atur-soal-btn');
  const aturSoalSub     = byId('ujian-atur-soal-sub');
  const aturInfo        = byId('ujian-atur-info');
  const aturBatal       = byId('ujian-atur-batal');
  const aturTerapkan    = byId('ujian-atur-terapkan');

  const modalPilih   = byId('modal-ujian-pilih');
  const pilihTitle   = byId('ujian-pilih-title');
  const pilihSub     = byId('ujian-pilih-sub');
  const pilihSearch  = byId('ujian-pilih-search');
  const pilihGrid    = byId('ujian-pilih-grid');
  const pilihPrev    = byId('ujian-pilih-prev');
  const pilihNext    = byId('ujian-pilih-next');
  const pilihDots    = byId('ujian-pilih-dots');
  const pilihFoot    = byId('ujian-pilih-foot');
  const pilihSelesai = byId('ujian-pilih-selesai');
  const pilihClose   = byId('ujian-pilih-close');

  // --- data rekaman (dari pengenal lokal di app.js, tanpa request ke server) ---
  function statsBahasa() {
    const api = window.astaKanda;
    return api && api.getVariantStats ? api.getVariantStats() : {};
  }
  // label -> 'alfabet' | 'kata', sesuai kartu yang ada di tab Belajar
  function labelTypes() {
    const m = new Map();
    document.querySelectorAll('#grid-alfabet .word-card .label').forEach((el) => m.set(el.textContent.trim(), 'alfabet'));
    document.querySelectorAll('#grid-kata .word-card .label').forEach((el) => m.set(el.textContent.trim(), 'kata'));
    return m;
  }
  // Bahasa isyarat yang punya rekaman: [{ nama, alfabet, kata }]
  function variantSummary() {
    const stats = statsBahasa();
    const tipe = labelTypes();
    return Object.keys(stats).sort().map((nama) => {
      const r = { nama, alfabet: 0, kata: 0 };
      Object.keys(stats[nama]).forEach((l) => {
        if (stats[nama][l] > 0 && tipe.has(l)) r[tipe.get(l)] += 1;
      });
      return r;
    }).filter((r) => r.alfabet + r.kata > 0);
  }
  const okJenis = (r, j) => (j === 'alfabet' ? r.alfabet > 0 : j === 'kata' ? r.kata > 0 : true);
  function subJenis(r, j) {
    if (j === 'alfabet') return r.alfabet + ' alfabet';
    if (j === 'kata') return r.kata + ' kata';
    return r.alfabet + ' alfabet · ' + r.kata + ' kata';
  }
  // Huruf/kata yang punya rekaman pada bahasa tertentu (atau SEMUA), disaring menurut jenis
  function itemsOf(variant, jenis) {
    const stats = statsBahasa();
    const out = [];
    labelTypes().forEach((t, label) => {
      if (jenis !== 'campuran' && jenis !== t) return;
      const ada = variant === SEMUA
        ? Object.keys(stats).some((v) => stats[v][label] > 0)
        : !!(stats[variant] && stats[variant][label] > 0);
      if (ada) out.push({ label, tipe: t });
    });
    return out;
  }
  // Pertahankan pilihan bila masih valid; kalau tidak: bahasa aktif di Belajar, lalu yang pertama
  function resolveVariant(pref, jenis) {
    const list = variantSummary().filter((r) => okJenis(r, jenis));
    if (pref && list.some((r) => r.nama === pref)) return pref;
    const api = window.astaKanda;
    const aktif = api && api.getActiveVariant ? api.getActiveVariant() : null;
    if (aktif && list.some((r) => r.nama === aktif)) return aktif;
    return list.length ? list[0].nama : null;
  }
  const maksSoal = () => Math.max(1, parseInt(customSoal.value, 10) || 1);

  // Daftar label yang boleh jadi soal untuk ujian yang akan dimulai
  function buildPool() {
    if (currentDiff !== 'custom') return itemsOf(SEMUA, 'campuran').map((i) => i.label);
    const v = resolveVariant(soalCfg.variant, soalCfg.jenis);
    if (!v) return [];
    const semua = itemsOf(v, soalCfg.jenis).map((i) => i.label);
    return soalCfg.mode === 'atur' ? semua.filter((l) => soalCfg.picks.has(l)) : semua;
  }

  function refreshAturSub() {
    const v = resolveVariant(soalCfg.variant, soalCfg.jenis);
    aturSub.textContent = !v
      ? 'Belum ada rekaman'
      : v + ' · ' + (soalCfg.mode === 'atur' ? soalCfg.picks.size + ' dipilih' : JENIS_LABEL[soalCfg.jenis]);
  }

  // --- pop up utama ---
  function prunePicks() {
    const ada = new Set(itemsOf(draft.variant, draft.jenis).map((i) => i.label));
    draft.picks.forEach((l) => { if (!ada.has(l)) draft.picks.delete(l); });
  }

  function renderAtur() {
    const r = variantSummary().find((x) => x.nama === draft.variant);
    aturBahasaNama.textContent = draft.variant || 'Belum ada rekaman';
    aturBahasaSub.textContent = r ? subJenis(r, draft.jenis) : 'Rekam dulu di tab Belajar';
    Array.from(aturMode.children).forEach((b) => b.classList.toggle('is-on', b.dataset.mode === draft.mode));
    Array.from(aturJenis.children).forEach((b) => b.classList.toggle('is-on', b.dataset.jenis === draft.jenis));
    aturSoalWrap.classList.toggle('hidden', draft.mode !== 'atur');
    aturSoalSub.textContent = draft.picks.size + '/' + maksSoal() + ' dipilih';

    const tersedia = draft.variant ? itemsOf(draft.variant, draft.jenis).length : 0;
    let ok;
    if (draft.mode === 'atur') {
      ok = draft.picks.size >= 1;
      aturInfo.innerHTML = '<b>' + draft.picks.size + '</b> dipilih dari <b>' + tersedia + '</b> tersedia' + (ok ? '' : ' (pilih minimal 1)');
    } else {
      ok = tersedia >= MIN_KARTU;
      aturInfo.innerHTML = '<b>' + tersedia + '</b> huruf/kata tersedia' + (ok ? '' : ' (minimal ' + MIN_KARTU + ')');
    }
    aturInfo.className = 'ujian-set-info' + (ok ? '' : ' is-warn');
    aturTerapkan.disabled = !ok || !draft.variant;
  }

  function openAtur() {
    draft = {
      variant: resolveVariant(soalCfg.variant, soalCfg.jenis),
      mode: soalCfg.mode,
      jenis: soalCfg.jenis,
      picks: new Set(soalCfg.picks),
    };
    prunePicks();
    modalAtur.classList.remove('hidden');
    renderAtur();
  }
  function closeAtur() { modalAtur.classList.add('hidden'); }

  // --- pop up pilih: daftar bahasa isyarat / pilih soal ---
  function pilihItems() {
    const q = pilihSearch.value.trim().toLowerCase();
    const list = pilihMode === 'bahasa'
      ? variantSummary().filter((r) => okJenis(r, draft.jenis))
          .map((r) => ({ key: r.nama, name: r.nama, sub: subJenis(r, draft.jenis), on: r.nama === draft.variant }))
      : itemsOf(draft.variant, draft.jenis)
          .map((i) => ({ key: i.label, name: i.label, sub: i.tipe === 'alfabet' ? 'Alfabet' : 'Kata', on: draft.picks.has(i.label) }));
    return q ? list.filter((x) => x.name.toLowerCase().includes(q)) : list;
  }

  function renderPilih() {
    const isBahasa = pilihMode === 'bahasa';
    const size = isBahasa ? PAGE_BAHASA : PAGE_SOAL;
    const items = pilihItems();
    const pages = Math.max(1, Math.ceil(items.length / size));
    if (pilihPage > pages) pilihPage = pages;
    if (pilihPage < 1) pilihPage = 1;

    pilihGrid.className = 'bh-grid' + (isBahasa ? '' : ' uj-pick-grid');
    pilihGrid.textContent = '';
    const slice = items.slice((pilihPage - 1) * size, pilihPage * size);
    if (!slice.length) {
      const e = document.createElement('div');
      e.className = 'bh-empty';
      e.textContent = isBahasa ? 'Belum ada bahasa isyarat yang direkam.' : 'Tidak ditemukan.';
      pilihGrid.appendChild(e);
    }
    slice.forEach((it) => {
      const card = document.createElement('div');
      card.className = 'bh-card' + (it.on ? ' is-active' : '');
      card.dataset.key = it.key;
      card.setAttribute('role', 'button');
      const info = document.createElement('div');
      info.className = 'bh-card-info';
      const n = document.createElement('span');
      n.className = 'bh-card-name';
      n.textContent = it.name;
      const s = document.createElement('span');
      s.className = 'bh-card-sub';
      s.textContent = it.sub;
      info.appendChild(n);
      info.appendChild(s);
      card.appendChild(info);
      pilihGrid.appendChild(card);
    });

    pilihDots.textContent = '';
    for (let i = 1; i <= pages; i++) {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'bh-dot' + (i === pilihPage ? ' is-active' : '');
      d.dataset.page = i;
      d.setAttribute('aria-label', 'Halaman ' + i);
      pilihDots.appendChild(d);
    }
    pilihPrev.disabled = pilihPage <= 1;
    pilihNext.disabled = pilihPage >= pages;
    if (!isBahasa) pilihSub.textContent = 'Dipilih ' + draft.picks.size + ' dari maks. ' + maksSoal() + ' soal';
  }

  function openPilih(mode) {
    pilihMode = mode;
    pilihPage = 1;
    pilihSearch.value = '';
    const isBahasa = mode === 'bahasa';
    pilihTitle.textContent = isBahasa ? 'Jenis Bahasa Isyarat' : 'Pilih Soal';
    pilihSub.textContent = isBahasa ? 'Hanya bahasa isyarat yang sudah ada rekamannya.' : '';
    pilihFoot.classList.toggle('hidden', isBahasa);
    modalPilih.classList.remove('hidden');
    renderPilih();
  }
  function closePilih() { modalPilih.classList.add('hidden'); }

  // --- event ---
  btnAtur.addEventListener('click', openAtur);
  aturBatal.addEventListener('click', closeAtur);
  modalAtur.addEventListener('click', (e) => { if (e.target === modalAtur) closeAtur(); });
  aturBahasaBtn.addEventListener('click', () => openPilih('bahasa'));
  aturSoalBtn.addEventListener('click', () => { if (draft.variant) openPilih('soal'); });
  aturMode.addEventListener('click', (e) => {
    const b = e.target.closest('.uj-seg');
    if (!b) return;
    draft.mode = b.dataset.mode;
    renderAtur();
  });
  aturJenis.addEventListener('click', (e) => {
    const b = e.target.closest('.uj-seg');
    if (!b) return;
    draft.jenis = b.dataset.jenis;
    draft.variant = resolveVariant(draft.variant, draft.jenis);
    prunePicks();
    renderAtur();
  });
  aturTerapkan.addEventListener('click', () => {
    soalCfg = { variant: draft.variant, mode: draft.mode, jenis: draft.jenis, picks: new Set(draft.picks) };
    refreshAturSub();
    closeAtur();
  });

  pilihClose.addEventListener('click', closePilih);
  pilihSelesai.addEventListener('click', closePilih);
  modalPilih.addEventListener('click', (e) => { if (e.target === modalPilih) closePilih(); });
  pilihSearch.addEventListener('input', () => { pilihPage = 1; renderPilih(); });
  pilihPrev.addEventListener('click', () => { pilihPage -= 1; renderPilih(); });
  pilihNext.addEventListener('click', () => { pilihPage += 1; renderPilih(); });
  pilihDots.addEventListener('click', (e) => {
    const d = e.target.closest('.bh-dot');
    if (d) { pilihPage = parseInt(d.dataset.page, 10) || 1; renderPilih(); }
  });
  pilihGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.bh-card');
    if (!card) return;
    const key = card.dataset.key;
    if (pilihMode === 'bahasa') {
      if (draft.variant !== key) { draft.variant = key; prunePicks(); }
      closePilih();
    } else if (draft.picks.has(key)) {
      draft.picks.delete(key);
    } else if (draft.picks.size < maksSoal()) { // dibatasi sebanyak Jumlah Soal
      draft.picks.add(key);
    }
    if (pilihMode === 'soal') renderPilih();
    renderAtur();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modalPilih.classList.contains('hidden')) closePilih();
    else if (!modalAtur.classList.contains('hidden')) closeAtur();
  });
  refreshAturSub();

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildQuestions(pool, jumlah) {
    if (!pool.length) return [];
    const out = [];
    let bag = shuffle(pool);
    while (out.length < jumlah) {
      if (!bag.length) bag = shuffle(pool);
      out.push(bag.pop());
    }
    return out;
  }

  // ---------------- State ujian berlangsung ----------------
  let questions = [];
  let qIndex = 0;
  let benar = 0;
  let salah = 0;
  let totalWaktuDetik = 0;
  let sisaDetik = 0;
  let timerInterval = null;
  let detectInterval = null;
  let awaitingDetect = false;
  let labelAbaikan = '';   // sisa gestur soal sebelumnya, diabaikan sampai berubah
  let poolLabel = [];      // semua huruf/kata yang valid sebagai jawaban
  let infoObserver = null;
  let questionLocked = false;
  let jawabanDetail = [];

  // Feedback Benar/Salah berikon (tanpa emoji)
  const FB = {
    benar: {
      cls: 'is-correct', teks: 'Benar',
      ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    },
    salah: {
      cls: 'is-skip', teks: 'Salah',
      ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    },
    lewat: {
      cls: 'is-skip', teks: 'Salah · Dilewati',
      ico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    },
  };
  function setFeedback(kind) {
    const f = FB[kind];
    questionFeedback.className = 'ujian-question-feedback ' + f.cls;
    questionFeedback.innerHTML =
      '<span class="fb-chip"><span class="fb-ico">' + f.ico + '</span><span>' + f.teks + '</span></span>';
  }

  function showScreen(el) {
    [screenStart, screenLive, screenResult].forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  function formatTime(totalSec) {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

    btnMulai.addEventListener('click', () => {
    const { menit, soal } = updatePreview();
    const pool = buildPool();
    const atur = currentDiff === 'custom' && soalCfg.mode === 'atur';
    const minimal = atur ? 1 : MIN_KARTU;
    if (pool.length < minimal) {
      modalSyaratText.textContent = atur
        ? 'Pilih minimal 1 huruf/kata lewat tombol Atur Soal dulu.'
        : 'Rekam minimal ' + MIN_KARTU + ' huruf/kata berbeda di tab Belajar dulu (sekarang baru ' + pool.length + '/' + MIN_KARTU + ').';
      modalSyarat.classList.remove('hidden');
      return;
    }
    tanyaNama(() => {
      questions = buildQuestions(pool, soal);
      qIndex = 0;
      benar = 0;
      salah = 0;
      jawabanDetail = [];
      totalWaktuDetik = menit * 60;
      sisaDetik = totalWaktuDetik;
      startExam();
    });
  });

  modalSyaratTutup.addEventListener('click', () => modalSyarat.classList.add('hidden'));
  modalSyarat.addEventListener('click', (e) => {
    if (e.target === modalSyarat) modalSyarat.classList.add('hidden');
  });
  modalSyaratBelajar.addEventListener('click', () => {
    modalSyarat.classList.add('hidden');
    const belajarBtn = document.querySelector('.tab-btn[data-tab="belajar"]');
    if (belajarBtn) belajarBtn.click();
  });

  function startExam() {
    showScreen(screenLive);
    poolLabel = buildPool().concat(itemsOf(SEMUA, 'campuran').map((i) => i.label)).map((l) => String(l).trim().toLowerCase());
    updateStats();
    renderQuestion();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      sisaDetik -= 1;
      statWaktu.textContent = formatTime(Math.max(0, sisaDetik));
      if (sisaDetik <= 0) {
        endExam();
      }
    }, 1000);

    startDeteksi();
  }

  function updateStats() {
    statWaktu.textContent = formatTime(sisaDetik);
    statSoal.textContent = Math.min(qIndex + 1, questions.length) + '/' + questions.length;
    statBenar.textContent = benar;
    statSalah.textContent = salah;
    const dijawab = benar + salah;
    statNilai.textContent = dijawab ? Math.round((benar / dijawab) * 100) : 0;
    progressFill.style.width = questions.length ? Math.round((qIndex / questions.length) * 100) + '%' : '0%';
  }

  function renderQuestion() {
    if (qIndex >= questions.length) { endExam(); return; }
    questionLocked = false;
    labelAbaikan = labelInfo();
    questionFeedback.textContent = '';
    questionFeedback.className = 'ujian-question-feedback';
    questionTarget.textContent = questions[qIndex];
    updateStats();
  }

  function nextQuestion(delayMs) {
    questionLocked = true;
    setTimeout(() => {
      qIndex += 1;
      renderQuestion();
    }, delayMs || 0);
  }

  btnLewati.addEventListener('click', () => {
    if (questionLocked) return;
    salah += 1;
    jawabanDetail.push({ target: questions[qIndex], hasil: 'lewat' });
    setFeedback('lewat');
    updateStats();
    nextQuestion(500);
  });

  btnSelesai.addEventListener('click', () => endExam());

  // ---------------- Deteksi instan: baca langsung Info Deteksi ----------------
  function labelInfo() {
    const el = document.querySelector('.info-panel .info-result');
    const t = el ? el.textContent.trim().toLowerCase() : '';
    return poolLabel.indexOf(t) !== -1 ? t : '';   // teks "Siap Belajar" dsb. tidak dihitung
  }

  function cekJawaban() {
    if (questionLocked) return;
    const label = labelInfo();
    if (!label) { labelAbaikan = ''; return; }      // tangan lepas / belum ada huruf
    if (label === labelAbaikan) return;              // sisa gestur soal sebelumnya
    labelAbaikan = '';

    const target = String(questions[qIndex] || '').trim().toLowerCase();
    const jawabBenar = label === target;
    if (jawabBenar) benar += 1; else salah += 1;
    jawabanDetail.push({ target: questions[qIndex], hasil: jawabBenar ? 'benar' : 'salah' });
    setFeedback(jawabBenar ? 'benar' : 'salah');
    updateStats();
    nextQuestion(700);   // jeda 700ms hanya agar tulisan Benar/Salah sempat terbaca
  }

  function stopDeteksi() {
    if (infoObserver) { infoObserver.disconnect(); infoObserver = null; }
  }

  function startDeteksi() {
    stopDeteksi();
    const root = document.querySelector('.info-panel');
    if (!root) return;
    infoObserver = new MutationObserver(cekJawaban);
    infoObserver.observe(root, { childList: true, characterData: true, subtree: true });
  }

  function endExam() {
    clearInterval(timerInterval);
    clearInterval(detectInterval);
    timerInterval = null;
    detectInterval = null;
    stopDeteksi();
    questionLocked = true;

    const dijawab = benar + salah;
    const nilai = dijawab ? Math.round((benar / dijawab) * 100) : 0;

    resultNilai.textContent = nilai;
    resultTotal.textContent = dijawab;
    resultBenar.textContent = benar;
    resultSalah.textContent = salah;

    const tone = nilai >= 80 ? 'good' : nilai >= 50 ? 'mid' : 'low';
    resultHero.dataset.tone = tone;
    resultEmoji.innerHTML = tone === 'good' ? ICON.trophy : tone === 'mid' ? ICON.thumb : ICON.trend;
    resultSub.textContent = tone === 'good' ? 'Luar biasa, terus pertahankan!'
      : tone === 'mid' ? 'Bagus, sedikit lagi lebih lancar!' : 'Terus berlatih, pasti bisa!';
    resultNama.textContent = namaPeserta || '-';
    resultRing.style.setProperty('--p', nilai);

    lastRiwayat = {
      nama_peserta: namaPeserta,
      nilai: nilai,
      benar: benar,
      salah: salah,
      total_soal: questions.length,
      kesulitan: currentDiff,
      durasi_detik: Math.max(0, totalWaktuDetik - Math.max(0, sisaDetik)),
      created_at: new Date().toISOString(),
    };

    simpanRiwayat(dijawab, nilai);
    showScreen(screenResult);
  }

  function simpanRiwayat(dijawab, nilai) {
    const api = window.astaKanda;
    if (!api) return;
    const durasiDetik = Math.max(0, totalWaktuDetik - Math.max(0, sisaDetik));
    fetch('/riwayat', {
      method: 'POST',
      headers: api.jsonHeaders(),
      body: JSON.stringify({
        nama_peserta: namaPeserta,
        kesulitan: currentDiff,
        total_soal: questions.length,
        benar: benar,
        salah: salah,
        nilai: nilai,
        durasi_detik: durasiDetik,
        detail: jawabanDetail,
      }),
    })
      .then((r) => { if (r.ok) window.dispatchEvent(new Event('astakanda:riwayat-baru')); })
      .catch(() => {});
  }

  btnSertifikat.addEventListener('click', () => {
    if (lastRiwayat && window.AstaKandaSertifikatUjian) window.AstaKandaSertifikatUjian.buka(lastRiwayat);
  });

  btnUlangi.addEventListener('click', () => {
    const { menit, soal } = updatePreview();
    const pool = buildPool();
    questions = buildQuestions(pool, soal);
    qIndex = 0;
    benar = 0;
    salah = 0;
    jawabanDetail = [];
    totalWaktuDetik = menit * 60;
    sisaDetik = totalWaktuDetik;
    startExam();
  });

  btnKembali.addEventListener('click', () => {
    clearInterval(timerInterval);
    clearInterval(detectInterval);
    showScreen(screenStart);
  });
})();

/* ---------- Sertifikat Ujian (digambar di canvas, diunduh sebagai PNG) ---------- */
(function () {
  const W = 1754, H = 1240; // A4 landscape @150dpi
  const SERIF = 'Georgia, "Times New Roman", serif';
  const SANS = '"Segoe UI", Roboto, Arial, sans-serif';
  const LABEL = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit', custom: 'Custom' };
  const NAVY = '#1e293b';
  const GOLD = '#c9962b';
  const WARNA = { good: '#10b981', mid: '#f59e0b', low: '#f43f5e' };
  const SVG_AWARD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';
  const SVG_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>';

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
  function kotak(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function segel(g, cx, cy) {
    const gr = g.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 80);
    gr.addColorStop(0, '#f6d777');
    gr.addColorStop(1, '#b8861b');
    g.fillStyle = gr;
    g.beginPath();
    for (let i = 0; i < 56; i++) {
      const a = (Math.PI * i) / 28;
      const r = i % 2 ? 66 : 76;
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.85)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(cx, cy, 54, 0, Math.PI * 2);
    g.stroke();
    g.save();
    g.translate(cx - 31, cy - 31);
    g.scale(2.6, 2.6);
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.arc(12, 8, 6, 0, Math.PI * 2);
    g.stroke();
    g.stroke(new Path2D('M15.477 12.89 17 22l-5-3-5 3 1.523-9.11'));
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
    g.fillStyle = aksen;
    g.font = '700 34px ' + SANS;
    spasi(g, 'UJIAN BAHASA ISYARAT', W / 2, 398, 10);
    ['#10b981', '#f59e0b', '#4E86F0', '#f43f5e'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect((W - 480) / 2 + i * 120, 428, 120, 8);
    });

    // nama peserta
    g.fillStyle = '#64748b';
    g.font = 'italic 400 32px ' + SERIF;
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
    g.font = '400 32px ' + SANS;
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

    // predikat
    g.fillStyle = aksen;
    g.font = '800 36px ' + SANS;
    spasi(g, 'PREDIKAT: ' + predikat(nilai), W / 2, 998, 6);

    // kaki: tanggal - segel - penyelenggara
    segel(g, W / 2, 1090);
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
    g.fillStyle = '#64748b';
    g.font = '400 22px ' + SANS;
    g.fillText('Tanggal Ujian', 400, 1142);
    g.fillText('Penyelenggara Ujian', 1354, 1142);
  }

  function pastikanModal() {
    if (modal) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="modal-ujian-sertifikat" class="ujian-set-modal hidden">' +
        '<div class="ujian-set-card uj-cert-card" role="dialog" aria-modal="true" aria-labelledby="uj-cert-title">' +
          '<div class="ujian-set-head"><span class="ujian-set-head-ico">' + SVG_AWARD + '</span>' +
            '<div><div class="ujian-set-title" id="uj-cert-title">Sertifikat Ujian</div>' +
            '<div class="ujian-set-sub" id="uj-cert-sub"></div></div></div>' +
          '<div class="uj-cert-view"><canvas id="uj-cert-canvas" width="1754" height="1240"></canvas></div>' +
          '<div class="ujian-set-foot">' +
            '<button type="button" id="uj-cert-tutup" class="ujian-set-cancel">Tutup</button>' +
            '<button type="button" id="uj-cert-unduh" class="ujian-set-ok uj-ok-ico">' + SVG_DL + 'Unduh PNG</button>' +
          '</div>' +
        '</div></div>');
    modal = document.getElementById('modal-ujian-sertifikat');
    canvas = document.getElementById('uj-cert-canvas');
    document.getElementById('uj-cert-tutup').addEventListener('click', tutup);
    document.getElementById('uj-cert-unduh').addEventListener('click', unduh);
    modal.addEventListener('click', (e) => { if (e.target === modal) tutup(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) tutup();
    });
  }
  function tutup() { modal.classList.add('hidden'); }

  function unduh() {
    if (!dataAktif) return;
    const slug = String(dataAktif.nama_peserta || 'peserta').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'peserta';
    const simpan = (href) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = 'Sertifikat-Ujian-' + slug + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    if (canvas.toBlob) {
      canvas.toBlob((b) => {
        if (!b) return;
        const u = URL.createObjectURL(b);
        simpan(u);
        setTimeout(() => URL.revokeObjectURL(u), 4000);
      }, 'image/png');
    } else {
      simpan(canvas.toDataURL('image/png'));
    }
  }

  function buka(d) {
    pastikanModal();
    dataAktif = d;
    document.getElementById('uj-cert-sub').textContent = (d.nama_peserta || 'Tanpa nama') + ' · Nilai ' + (Number(d.nilai) || 0);
    modal.classList.remove('hidden');
    const logo = new Image();
    logo.onload = () => gambar(d, logo);
    logo.onerror = () => gambar(d, null);   // logo gagal dimuat: sertifikat tetap dibuat tanpa logo
    logo.src = '/assets/images/logo.png';
  }

  window.AstaKandaSertifikatUjian = { buka: buka };
})();