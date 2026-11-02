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
  const IC = (d, w = 2) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
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
    globe:   IC('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  };

  const statCard = (cls, ico, label, id) =>
    '<div class="uj2-stat ' + cls + '"><span class="uj2-stat-ico">' + ico + '</span>' +
    '<span class="uj2-stat-txt"><small>' + label + '</small><b id="' + id + '">0</b></span></div>';

  // Tombol aksi layar Ujian & Hasil (cls: ghost | danger | primary | cert)
  const btn = (id, cls, ico, txt) =>
    '<button type="button" id="' + id + '" class="uj2-btn uj2-btn-' + cls + '">' + ico + '<span>' + txt + '</span></button>';

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
        '<span class="uj2-q-badge">' + ICON.hand + 'Peragakan gestur</span>' +
        '<div class="uj2-q-target" id="ujian-question-target">-</div>' +
        '<div class="uj2-q-info">' +
          '<div class="uj2-q-variant" hidden>' + ICON.globe + '<span id="ujian-question-variant"></span></div>' +
          '<div class="ujian-question-feedback" id="ujian-question-feedback"></div>' +
        '</div>' +
      '</div>' +
      '<div class="uj2-actions">' +
        btn('ujian-btn-lewati', 'ghost', ICON.skip, 'Lewati Soal') +
        btn('ujian-btn-selesai', 'danger', ICON.flag, 'Akhiri Ujian') +
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
          btn('ujian-btn-sertifikat', 'cert', ICON.award, 'Sertifikat') +
          btn('ujian-btn-ulangi', 'primary', ICON.refresh, 'Ulangi') +
          btn('ujian-btn-kembali', 'danger', ICON.home, 'Selesai') +
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
  const questionVariant  = document.getElementById('ujian-question-variant');
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
  let lastRiwayat = null;   // hasil ujian terakhir, dipakai untuk sertifikat & riwayat

  const setInvalid = (on) => namaInput.closest('.uj-nama-field')?.classList.toggle('is-invalid', on);
  function tutupNama() { aksiNama = null; modalNama.classList.add('hidden'); }

  function tanyaNama(lanjut) {
    let awal = '';
    try { awal = localStorage.getItem(NAMA_KEY) || ''; } catch (e) {}
    namaInput.value = namaPeserta || awal;
    namaErr.classList.add('hidden');
    setInvalid(false);
    aksiNama = lanjut;
    modalNama.classList.remove('hidden');
    namaInput.focus();
    namaInput.select();
  }
  function kirimNama() {
    const n = namaInput.value.replace(/\s+/g, ' ').trim();
    if (!n) {   // nama peserta wajib diisi: tampilkan popup peringatan
      setInvalid(true);
      const info = window.AstaKandaPeringatan;
      if (info) info('Nama peserta belum diisi', 'Isi nama peserta terlebih dahulu sebelum memulai ujian.', () => namaInput.focus());
      else { namaErr.classList.remove('hidden'); namaInput.focus(); }
      return;
    }
    namaPeserta = n;
    try { localStorage.setItem(NAMA_KEY, n); } catch (e) {}
    modalNama.classList.add('hidden');
    const f = aksiNama;
    aksiNama = null;
    if (f) f();
  }
  namaMulai.addEventListener('click', kirimNama);
  namaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); kirimNama(); } });
  namaInput.addEventListener('input', () => { namaErr.classList.add('hidden'); setInvalid(false); });
  namaBatal.addEventListener('click', tutupNama);
  modalNama.addEventListener('click', (e) => { if (e.target === modalNama) tutupNama(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalNama.classList.contains('hidden')) tutupNama();
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

  // Jenis bahasa isyarat tiap soal: Custom mengikuti pengaturan; selain itu dipilih acak dari bahasa yang punya rekaman soal tsb
  function bahasaSoal(label) {
    if (currentDiff === 'custom') return resolveVariant(soalCfg.variant, soalCfg.jenis) || '';
    const stats = statsBahasa();
    const ada = Object.keys(stats).filter((v) => stats[v][label] > 0);
    return ada.length ? ada[Math.floor(Math.random() * ada.length)] : '';
  }
  // Warna chip bahasa: satu bahasa selalu satu warna (hue 0-359 dari namanya)
  const hueBahasa = (nama) => Array.from(nama).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

  // ---------------- State ujian berlangsung ----------------
  let questions = [];
  let questionVariants = [];   // jenis bahasa isyarat tiap soal (sejajar dengan questions)
  let qIndex = 0;
  let benar = 0;
  let salah = 0;
  let totalWaktuDetik = 0;
  let sisaDetik = 0;
  let timerInterval = null;
  let awaitingDetect = false;
  let labelAbaikan = '';   // sisa gestur soal sebelumnya, diabaikan sampai berubah
  let poolLabel = [];      // semua huruf/kata yang valid sebagai jawaban
  let infoObserver = null;
  let questionLocked = false;
  let jawabanDetail = [];

  // Feedback Benar/Salah berikon (tanpa emoji)
  const IKON_X = IC('<path d="M18 6 6 18M6 6l12 12"/>', 3.2);
  const FB = {
    benar: { cls: 'is-correct', teks: 'Benar', ico: IC('<path d="M20 6 9 17l-5-5"/>', 3.2) },
    salah: { cls: 'is-skip', teks: 'Salah', ico: IKON_X },
    lewat: { cls: 'is-skip', teks: 'Salah · Dilewati', ico: IKON_X },
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
    tanyaNama(() => mulaiBaru(pool, menit, soal));
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

  // Susun soal baru lalu mulai ujian (dipakai tombol Mulai & Ulangi)
  function mulaiBaru(pool, menit, soal) {
    questions = buildQuestions(pool, soal);
    questionVariants = questions.map(bahasaSoal);
    qIndex = benar = salah = 0;
    jawabanDetail = [];
    totalWaktuDetik = sisaDetik = menit * 60;
    startExam();
  }

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
    questionTarget.style.setProperty('--n', String(questions[qIndex]).length);   // dipakai CSS agar soal panjang tidak terpotong
    const bahasa = questionVariants[qIndex] || '';
    const chip = questionVariant.parentElement;
    questionVariant.textContent = bahasa;
    chip.hidden = !bahasa;
    chip.style.setProperty('--vh', hueBahasa(bahasa));
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

  // Pop up konfirmasi Akhiri Ujian (markup & kelas sama dengan pop up peringatan nama peserta)
  let modalAkhiri = null;
  function konfirmasiAkhiri() {
    if (!modalAkhiri) {
      modalAkhiri = document.createElement('div');
      modalAkhiri.className = 'apple-confirm hidden';
      modalAkhiri.setAttribute('role', 'alertdialog');
      modalAkhiri.setAttribute('aria-modal', 'true');
      modalAkhiri.innerHTML =
        '<div class="apple-confirm-card">' +
          '<div class="apple-confirm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg></div>' +
          '<div class="apple-confirm-title">Akhiri ujian sekarang?</div>' +
          '<p class="apple-confirm-text">Ujian dihentikan dan nilai dihitung dari soal yang sudah dijawab.</p>' +
          '<div class="apple-confirm-actions">' +
            '<button type="button" class="apple-confirm-btn apple-confirm-btn--ghost" data-aksi="batal">Batal</button>' +
            '<button type="button" class="apple-confirm-btn apple-confirm-btn--danger" data-aksi="akhiri">Akhiri Ujian</button>' +
          '</div>' +
        '</div>';
      modalAkhiri.addEventListener('click', (e) => {
        const aksi = e.target.closest('[data-aksi]');
        if (!aksi && e.target !== modalAkhiri) return;   // klik di dalam kartu
        modalAkhiri.classList.add('hidden');
        if (aksi && aksi.dataset.aksi === 'akhiri') endExam();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalAkhiri.classList.contains('hidden')) modalAkhiri.classList.add('hidden');
      });
      document.body.appendChild(modalAkhiri);
    }
    modalAkhiri.classList.remove('hidden');
    modalAkhiri.querySelector('[data-aksi="batal"]').focus();
  }
  btnSelesai.addEventListener('click', konfirmasiAkhiri);

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
    if (modalAkhiri) modalAkhiri.classList.add('hidden');   // waktu habis saat pop up terbuka
    clearInterval(timerInterval);
    timerInterval = null;
    stopDeteksi();
    questionLocked = true;

    const dijawab = benar + salah;
    const nilai = dijawab ? Math.round((benar / dijawab) * 100) : 0;
    const durasi = Math.max(0, totalWaktuDetik - Math.max(0, sisaDetik));
if (window.AstaKandaLeaderboardUjian) window.AstaKandaLeaderboardUjian.catat(namaPeserta, nilai, benar, dijawab, durasi);

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
      nilai,
      benar,
      salah,
      total_soal: questions.length,
      kesulitan: currentDiff,
      durasi_detik: Math.max(0, totalWaktuDetik - Math.max(0, sisaDetik)),
      created_at: new Date().toISOString(),
    };

    simpanRiwayat();
    showScreen(screenResult);
  }

  function simpanRiwayat() {
    const api = window.astaKanda;
    if (!api) return;
    const { created_at, ...rekap } = lastRiwayat;   // created_at hanya untuk sertifikat
    fetch('/riwayat', {
      method: 'POST',
      headers: api.jsonHeaders(),
      body: JSON.stringify({ ...rekap, detail: jawabanDetail }),
    })
      .then((r) => { if (r.ok) window.dispatchEvent(new Event('astakanda:riwayat-baru')); })
      .catch(() => {});
  }

  btnSertifikat.addEventListener('click', () => {
    if (lastRiwayat && window.AstaKandaSertifikatUjian) window.AstaKandaSertifikatUjian.buka(lastRiwayat);
  });

  btnUlangi.addEventListener('click', () => {
    const { menit, soal } = updatePreview();
    mulaiBaru(buildPool(), menit, soal);
  });

  btnKembali.addEventListener('click', () => {
    clearInterval(timerInterval);
    showScreen(screenStart);
  });
})();