/* ASTA KANDA — game.js
 * Layar: Pilih Game -> Cara Bermain -> (khusus Apple Snake) Atur Permainan
 * (kesulitan + kategori soal) -> Ganti Skin -> Mulai Main.
 * Dino Attack tetap memakai alur lama (Cara Bermain -> Mulai langsung).
 */
(function () {
  const panel = document.getElementById('panel-game');
  if (!panel) return;

  const screenSelect = document.getElementById('game-select');
  const screenDetail = document.getElementById('game-detail');
  const screenNama   = document.getElementById('game-nama');
  const screenSetup  = document.getElementById('game-setup');
  const screenSkin   = document.getElementById('game-skin');
  const screenLeaderboard = document.getElementById('game-leaderboard');
  const screenDinoSetup = document.getElementById('game-dino-setup');
  const screenDinoPlay = document.getElementById('game-dino-play');
  const screenDinoLeaderboard = document.getElementById('game-dino-leaderboard');
  const allScreens   = [screenSelect, screenDetail, screenNama, screenSetup, screenSkin, screenLeaderboard];

  const cards = Array.from(document.querySelectorAll('.game-card'));
  const btnBack  = document.getElementById('game-btn-back');
  const btnMulai = document.getElementById('game-btn-mulai');
  const btnNote  = document.getElementById('game-btn-note');
  const tabBar   = document.querySelector('.tab-bar');

  const detailImg  = document.getElementById('game-detail-img');
  const detailName = document.getElementById('game-detail-name');
  const howtoLists = {
    apple: document.getElementById('game-howto-apple'),
    dino: document.getElementById('game-howto-dino'),
  };

  const GAMES = {
    apple: { name: 'Apple Snake', img: (window.ASTA_IMAGES && window.ASTA_IMAGES.apple) || '' },
    dino:  { name: 'Dino Attack', img: (window.ASTA_IMAGES && window.ASTA_IMAGES.dino) || '' },
  };

  let selectedGame = null;

  const appHeader = document.querySelector('.app-header');
  const screenPlayEl = document.getElementById('game-play');

  // Simpan referensi elemen sejak awal (bukan lewat selector) supaya tetap bisa
  // dikembalikan ke tempat asalnya walau sedang berada di dalam topbar layar lain.
  let brand = null;
  function pindahBrand(slotId) {
    if (!brand) {
      const logoRow = document.querySelector('.app-header .logo-row');
      const tagline = document.getElementById('tagline');
      if (!logoRow || !tagline) return;
      brand = { logoRow, tagline, parent: logoRow.parentElement, logoNext: logoRow.nextElementSibling, tagNext: tagline.nextElementSibling };
    }
    const slot = slotId ? document.getElementById(slotId) : null;
    if (slot) {
      slot.appendChild(brand.logoRow);
      slot.appendChild(brand.tagline);
    } else {
      const ok = (n) => (n && n.parentNode === brand.parent ? n : null);
      brand.parent.insertBefore(brand.tagline, ok(brand.tagNext));
      brand.parent.insertBefore(brand.logoRow, ok(brand.logoNext));
    }
  }

  function showScreen(el) {
    // Query .game-screen langsung (bukan array tetap) supaya layar bermain
    // milik apple.js ikut kena aturan yang sama tanpa perlu didaftarkan manual.
    document.querySelectorAll('.game-screen').forEach((s) => s.classList.add('hidden'));
    el.classList.remove('hidden');
    // Tab bar disembunyikan di semua layar Apple Snake selain "Pilih Game".
    // Header utama (logo + tagline) tetap tampil di semua layar KECUALI saat
    // benar-benar Bermain (layar itu sudah punya topbar ringkas sendiri).
    if (tabBar) tabBar.classList.toggle('hidden', el !== screenSelect);
    if (appHeader) appHeader.classList.toggle('hidden', el === screenPlayEl || el === screenLeaderboard || el === screenDinoPlay || el === screenDinoLeaderboard);
    // Logo + tagline dipindah ke topbar layar Bermain / Leaderboard, dan
    // dikembalikan ke header utama di layar lain (mis. Game Over -> Ganti Pemain).
    const brandSlot = el === screenPlayEl ? 'game-play-brand'
      : el === screenLeaderboard ? 'game-leaderboard-brand'
      : el === screenDinoPlay ? 'game-dino-play-brand'
      : el === screenDinoLeaderboard ? 'game-dino-leaderboard-brand'
      : null;
    pindahBrand(brandSlot);
  }

  function showSelect() { showScreen(screenSelect); }

  // Pop up konfirmasi Keluar (markup & kelas sama dengan pop up Keluar di layar bermain)
  let modalKeluar = null, keluarCb = null;
  function konfirmasiKeluar(onYa) {
    if (!modalKeluar) {
      modalKeluar = document.createElement('div');
      modalKeluar.className = 'apple-confirm hidden';
      modalKeluar.setAttribute('role', 'dialog');
      modalKeluar.setAttribute('aria-modal', 'true');
      modalKeluar.innerHTML =
        '<div class="apple-confirm-card">' +
          '<div class="apple-confirm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg></div>' +
          '<div class="apple-confirm-title">Keluar dari permainan?</div>' +
          '<p class="apple-confirm-text">Kamu akan kembali ke menu Pilih Game.</p>' +
          '<div class="apple-confirm-actions">' +
            '<button type="button" class="apple-confirm-btn apple-confirm-btn--ghost" data-aksi="batal">Batal</button>' +
            '<button type="button" class="apple-confirm-btn apple-confirm-btn--danger" data-aksi="keluar">Keluar</button>' +
          '</div>' +
        '</div>';
      modalKeluar.addEventListener('click', (e) => {
        const aksi = e.target.closest('[data-aksi]');
        if (!aksi && e.target !== modalKeluar) return;
        modalKeluar.classList.add('hidden');
        if (aksi && aksi.dataset.aksi === 'keluar' && keluarCb) keluarCb();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalKeluar.classList.contains('hidden')) modalKeluar.classList.add('hidden');
      });
      document.body.appendChild(modalKeluar);
    }
    keluarCb = onYa;
    modalKeluar.classList.remove('hidden');
    modalKeluar.querySelector('[data-aksi="batal"]').focus();
  }

  function showDetail(key) {
    selectedGame = key;
    const g = GAMES[key];
    if (!g) return;

    detailImg.src = g.img;
    detailImg.alt = g.name;
    detailName.textContent = g.name;

    Object.keys(howtoLists).forEach((k) => howtoLists[k].classList.toggle('hidden', k !== key));

    btnNote.classList.add('hidden');
    btnMulai.classList.remove('hidden');

    showScreen(screenDetail);
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => showDetail(card.dataset.game));
  });
  btnBack.addEventListener('click', showSelect);

  // ---------------- Layar Atur Permainan (khusus Apple Snake) ----------------
  const btnSetupBack   = document.getElementById('game-setup-back');
  const diffChips      = Array.from(document.querySelectorAll('#game-diff-chips .game-chip'));
  const kategoriChips  = Array.from(document.querySelectorAll('#game-kategori-chips .game-chip'));
  const previewWaktu   = document.getElementById('game-setup-preview-waktu');
  const previewSoal    = document.getElementById('game-setup-preview-soal');
  const previewKategori = document.getElementById('game-setup-preview-kategori');
  const btnMulaiMain   = document.getElementById('game-btn-mulai-main');
  const setupNote      = document.getElementById('game-setup-note');
  const btnGantiSkin   = document.getElementById('game-btn-skin');

  // Kolom Nama Pemain, disisipkan DI ATAS "Tingkat Kesulitan" (HTML tidak diubah)
  const inputNamaSetup = document.createElement('input');
  inputNamaSetup.id = 'game-setup-nama-input';
  inputNamaSetup.className = 'game-setup-nama-input';
  inputNamaSetup.type = 'text';
  inputNamaSetup.maxLength = 20;
  inputNamaSetup.placeholder = 'Masukkan nama pemain';
  inputNamaSetup.autocomplete = 'off';
  inputNamaSetup.addEventListener('input', () => inputNamaSetup.classList.remove('is-invalid'));
  inputNamaSetup.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnMulaiMain.click(); });
  (function () {
    const grup = document.createElement('div');
    grup.className = 'game-setup-group game-setup-nama';
    grup.innerHTML = '<div class="game-setup-label">Nama Pemain</div>';
    grup.appendChild(inputNamaSetup);
    const chips = document.getElementById('game-diff-chips');
    // shortcut: kalau HTML tak punya .game-setup-group, disisipkan sebelum label di atas chips; upgrade bila markup layar Atur berubah
    const anchor = chips && (chips.closest('.game-setup-group') || chips.previousElementSibling || chips);
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(grup, anchor);
  })();

  const PRESET_DIFF = {
    mudah:  { menit: 3, soal: 5 },
    sedang: { menit: 5, soal: 10 },
    sulit:  { menit: 7, soal: 15 },
  };
  const LABEL_KATEGORI = { alfabet: 'Alfabet', kata: 'Kata', gabungan: 'Gabungan' };

  let gameDiff = 'mudah';
  let gameKategori = 'alfabet';

  function updateSetupPreview() {
    const p = PRESET_DIFF[gameDiff];
    previewWaktu.textContent = p.menit;
    previewSoal.textContent = p.soal;
    previewKategori.textContent = LABEL_KATEGORI[gameKategori];
  }

  diffChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      diffChips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      gameDiff = chip.dataset.diff;
      updateSetupPreview();
    });
  });
  kategoriChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      kategoriChips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      gameKategori = chip.dataset.kategori;
      updateSetupPreview();
    });
  });

  function showSetup() {
    setupNote.classList.add('hidden');
    inputNamaSetup.value = localStorage.getItem('astakanda_player_nama') || '';
    inputNamaSetup.classList.remove('is-invalid');
    updateSetupPreview();
    showScreen(screenSetup);
  }
  btnSetupBack.addEventListener('click', () => showDetail('apple'));

  btnMulaiMain.addEventListener('click', () => {
    const registry = window.AstaKandaGames || {};
    const nama = inputNamaSetup.value.trim();
    if (!nama) { inputNamaSetup.classList.add('is-invalid'); inputNamaSetup.focus(); return; }
    localStorage.setItem('astakanda_player_nama', nama);
    const game = registry.apple;
    if (game && typeof game.start === 'function') {
      game.start({ kesulitan: gameDiff, kategori: gameKategori });
    } else {
      // Mesin game Apple Snake belum dibuat — tinggal isi apple.js (lihat README)
      setupNote.classList.remove('hidden');
    }
  });

  // ---------------- Layar Ganti Skin (khusus Apple Snake, data dari server) ----------------
  const btnSkinBack = document.getElementById('game-skin-back');
  const listSnakeSkin = document.getElementById('game-skin-snake-list');
  const listAppleSkin = document.getElementById('game-skin-apple-list');

  function guestToken() {
    let t = localStorage.getItem('astakanda_guest_token');
    if (!t) {
      t = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('astakanda_guest_token', t);
    }
    return t;
  }

  function labelSyarat(skin) {
    if (skin.syarat_tipe === 'skor') return 'Skor ≥ ' + skin.syarat_nilai;
    if (skin.syarat_tipe === 'menang') return 'Menang ' + skin.syarat_nilai + 'x';
    return '';
  }

  function renderSkinList(container, skins, storageKey) {
    container.innerHTML = '';
    let dipilih = null;
    try { dipilih = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (e) {}

    skins.forEach((skin) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'game-skin-item' + (!skin.terbuka ? ' is-locked' : '');
      if (skin.terbuka && dipilih && dipilih.kode === skin.kode) btn.classList.add('is-active');
      if (skin.terbuka && !dipilih && skin.syarat_tipe === 'default') btn.classList.add('is-active');
      btn.disabled = !skin.terbuka;
      btn.innerHTML = skin.terbuka
        ? skin.emoji + '<span>' + skin.nama + '</span>'
        : '🔒<span>' + labelSyarat(skin) + '</span>';
      if (skin.terbuka) {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.game-skin-item').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          localStorage.setItem(storageKey, JSON.stringify({ kode: skin.kode, warna_utama: skin.warna_utama, warna_kedua: skin.warna_kedua }));
        });
      }
      container.appendChild(btn);
    });
  }

  function muatSkinDariServer() {
    fetch('/game/skins?guest_token=' + encodeURIComponent(guestToken()))
      .then((r) => r.json())
      .then((data) => {
        const snakeSkins = data.skins.filter((s) => s.tipe === 'snake');
        const appleSkins = data.skins.filter((s) => s.tipe === 'apple');
        renderSkinList(listSnakeSkin, snakeSkins, 'astakanda_skin_snake');
        renderSkinList(listAppleSkin, appleSkins, 'astakanda_skin_apple');
      })
      .catch(() => {
        listSnakeSkin.innerHTML = '<div class="game-btn-note">Gagal memuat skin. Coba lagi.</div>';
      });
  }

  btnGantiSkin.addEventListener('click', () => { showScreen(screenSkin); muatSkinDariServer(); });
  btnSkinBack.addEventListener('click', showSetup);

  // ---------------- Layar Isi Nama Pemain (khusus Apple Snake) ----------------
  const btnNamaBack   = document.getElementById('game-nama-back');
  const inputNama     = document.getElementById('game-nama-input');
  const btnNamaLanjut = document.getElementById('game-nama-lanjut');

  function showNama() {
    inputNama.value = localStorage.getItem('astakanda_player_nama') || '';
    // Logo di layar ini mengikuti game yang dipilih (Apple Snake / Dino Attack)
    const namaImg = document.getElementById('game-nama-img');
    const gm = GAMES[selectedGame] || GAMES.apple;
    if (namaImg) { namaImg.src = gm.img; namaImg.alt = gm.name; }
    showScreen(screenNama);
  }
  btnNamaBack.addEventListener('click', () => showDetail(selectedGame || 'apple'));
  btnNamaLanjut.addEventListener('click', () => {
    const nama = inputNama.value.trim();
    if (!nama) { inputNama.focus(); return; }
    localStorage.setItem('astakanda_player_nama', nama);
    if (selectedGame === 'dino') showDinoSetup(); else showSetup();
  });

  // ---------------- Layar Leaderboard (khusus Apple Snake) ----------------
  const lbPodium = document.getElementById('game-lb-podium');
  const lbList   = document.getElementById('game-lb-list');
  const lbOthers = document.getElementById('game-lb-others');
  const appleLb = { podium: lbPodium, list: lbList, others: lbOthers, icon: '🍎', cache: null };
  const MEDALS = ['🥇', '🥈', '🥉'];

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Render sama seperti referensi: podium peringkat 1-3 + daftar ringkas peringkat 4-5
  function renderLeaderboard(items, els) {
    const rows = (items || []).map((it) => ({ name: it.nama, score: it.skor_tertinggi }));
    els.podium.innerHTML = '';
    els.list.innerHTML = '';
    if (!rows.length) {
      els.podium.innerHTML = `<p class="leaderboard-empty">${els.icon} Belum ada skor. Jadilah yang pertama!</p>`;
      els.others.hidden = true;
      return;
    }
    els.podium.innerHTML = rows.slice(0, 3).map((row, i) => {
      const rank = i + 1;
      return `
        <div class="podium-card podium-card--rank${rank}">
          <div class="podium-card__crown">${rank === 1 ? '👑' : ''}</div>
          ${rank === 1 ? '' : `<div class="podium-card__medal">${MEDALS[i]}</div>`}
          <div class="podium-card__name">${esc(row.name)}</div>
          <div class="podium-card__score">${els.icon} ${esc(row.score)}</div>
          <div class="podium-card__step">${rank}</div>
        </div>`;
    }).join('');

    const others = rows.slice(3, 5);
    els.others.hidden = others.length === 0;
    others.forEach((row, index) => {
      const initial = (row.name || '?').trim().charAt(0).toUpperCase() || '?';
      const tr = document.createElement('tr');
      tr.style.animationDelay = (index * 70) + 'ms';
      tr.innerHTML = `
        <td><span class="rank-badge rank-badge--plain">${index + 4}</span></td>
        <td class="leaderboard-table__name"><span class="leaderboard-table__avatar">${esc(initial)}</span>${esc(row.name)}</td>
        <td>${els.icon} ${esc(row.score)}</td>`;
      els.list.appendChild(tr);
    });
  }

  // Data leaderboard di-cache & dimuat di LATAR BELAKANG sejak panel Game
  // dibuka (lihat prefetch di bawah), supaya saat tombol Leaderboard diklik,
  // datanya langsung tampil dari cache (tanpa "Memuat..." / telat muncul).
  // Fetch tetap jalan tiap kali layar dibuka untuk menyegarkan data di
  // belakang layar (stale-while-revalidate), tapi tidak memblokir tampilan.
  function fetchLeaderboardInto(url, target) {
    return fetch(url)
      .then((r) => r.json())
      .then((items) => {
        const sig = JSON.stringify(items);
        target.cache = items;
        // Data sama dengan yang sudah tergambar -> jangan digambar ulang (penyebab kedip)
        if (sig !== target.sig) { target.sig = sig; renderLeaderboard(items, target); }
        return items;
      })
      .catch(() => { if (!target.cache) target.podium.innerHTML = '<p class="leaderboard-empty">Gagal memuat leaderboard.</p>'; });
  }

  function showLeaderboard() {
    showScreen(screenLeaderboard);
    if (!appleLb.cache) { // kalau cache ada, isinya sudah tergambar sejak prefetch
      appleLb.podium.innerHTML = '<p class="leaderboard-empty">Memuat…</p>';
      appleLb.others.hidden = true;
    }
    fetchLeaderboardInto('/game/leaderboard', appleLb);
  }
  document.getElementById('game-lb-settings').addEventListener('click', showSetup);
  document.getElementById('game-lb-keluar').addEventListener('click', () => konfirmasiKeluar(showSelect));

  // ---------------- Dino Attack: Atur Permainan ----------------
  const dinoDiffChips = Array.from(document.querySelectorAll('#dino-diff-chips .game-chip'));
  const dinoKategoriChips = Array.from(document.querySelectorAll('#dino-kategori-chips .game-chip'));
  const dinoPreviewSpeed = document.getElementById('dino-preview-speed');
  const dinoPreviewKategori = document.getElementById('dino-preview-kategori');
  const dinoSetupNote = document.getElementById('dino-setup-note');
  const DINO_SPEED_LABEL = { mudah: 'Lambat', sedang: 'Normal', sulit: 'Cepat' };
  let dinoDiff = 'mudah';
  let dinoKategori = 'alfabet';

  function updateDinoPreview() {
    dinoPreviewSpeed.textContent = DINO_SPEED_LABEL[dinoDiff];
    dinoPreviewKategori.textContent = LABEL_KATEGORI[dinoKategori];
  }
  dinoDiffChips.forEach((chip) => chip.addEventListener('click', () => {
    dinoDiffChips.forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    dinoDiff = chip.dataset.diff;
    updateDinoPreview();
  }));
  dinoKategoriChips.forEach((chip) => chip.addEventListener('click', () => {
    dinoKategoriChips.forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    dinoKategori = chip.dataset.kategori;
    updateDinoPreview();
  }));

  function showDinoSetup() {
    dinoSetupNote.classList.add('hidden');
    updateDinoPreview();
    showScreen(screenDinoSetup);
  }
  document.getElementById('game-dino-setup-back').addEventListener('click', () => showDetail('dino'));
  document.addEventListener('input', (e) => { if (e.target.id === 'dino-nama-input') e.target.classList.remove('is-invalid'); });
  document.getElementById('dino-btn-mulai-main').addEventListener('click', () => {
    const inp = document.getElementById('dino-nama-input'); // dibuat oleh dino.js
    if (inp && !inp.value.trim()) { inp.classList.add('is-invalid'); inp.focus(); return; }
    const game = (window.AstaKandaGames || {}).dino;
    if (game && typeof game.start === 'function') game.start({ kesulitan: dinoDiff, kategori: dinoKategori });
    else dinoSetupNote.classList.remove('hidden');
  });

  // ---------------- Dino Attack: Leaderboard (terpisah dari Apple Snake) ----------------
  const dinoLb = {
    podium: document.getElementById('dino-lb-podium'),
    list: document.getElementById('dino-lb-list'),
    others: document.getElementById('dino-lb-others'),
    icon: '🦖',
    cache: null,
  };
  function showDinoLeaderboard() {
    showScreen(screenDinoLeaderboard);
    if (!dinoLb.cache) { // kalau cache ada, isinya sudah tergambar sejak prefetch
      dinoLb.podium.innerHTML = '<p class="leaderboard-empty">Memuat…</p>';
      dinoLb.others.hidden = true;
    }
    fetchLeaderboardInto('/game/dino/leaderboard', dinoLb);
  }

  // Prefetch kedua leaderboard begitu panel Game ini dimuat (sebelum pemain
  // sempat klik tombol Leaderboard sama sekali), supaya cache di atas hampir
  // selalu sudah terisi saat tombolnya ditekan.
  fetchLeaderboardInto('/game/leaderboard', appleLb);
  fetchLeaderboardInto('/game/dino/leaderboard', dinoLb);
  document.getElementById('dino-lb-settings').addEventListener('click', showDinoSetup);
  document.getElementById('dino-lb-keluar').addEventListener('click', () => konfirmasiKeluar(showSelect));

  // Supaya apple.js (mesin game) bisa memicu layar-layar ini juga
  window.AstaKandaGameUI = { showSelect, showDetail, showNama, showSetup, showLeaderboard, showDinoSetup, showDinoLeaderboard, showScreen };

  // ---------------- Tombol "Mulai" di layar Cara Bermain ----------------
  btnMulai.addEventListener('click', () => {
    if (selectedGame === 'apple') { showSetup(); return; }
    if (selectedGame === 'dino') { showDinoSetup(); return; }
    // Dino Attack: alur lama, langsung coba start()/tampilkan catatan
    const registry = window.AstaKandaGames || {};
    const game = selectedGame && registry[selectedGame];
    if (game && typeof game.start === 'function') {
      game.start();
    } else {
      btnNote.classList.remove('hidden');
    }
  });
})();

/* =====================================================================
 * KARTU GAME — urutan, deskripsi, Best Score, paging + bottom indicator.
 * Semua kartu & skor disiapkan saat halaman dimuat (bukan saat tab Game
 * dibuka), sehingga tampil seketika begitu tab Game diklik.
 * TEMPEL PALING BAWAH game.js (setelah penutup `})();` terakhir).
 * ===================================================================== */
(function () {
  const screen = document.getElementById('game-select');
  const wrap = screen && screen.querySelector('.game-cards');
  if (!wrap) return;

  // Urutan tampil & data tiap game. Kunci = nilai data-game pada kartu.
  // rekor = endpoint leaderboard (urut skor tertinggi di depan); null = tidak ada.
  const ORDER = ['apple', 'dino', 'ladders', 'hunter'];
  const INFO = {
    apple:   { desc: 'Kendalikan ular, peragakan gestur yang benar untuk memakan apel dan raih skor setinggi-tingginya.', rekor: '/game/leaderboard' },
    dino:    { desc: 'Peragakan gestur tepat waktu untuk menyerang rintangan sebelum dino menabrak. Makin cepat, makin seru!', rekor: '/game/dino/leaderboard' },
    // Ladders belum menyimpan skor (tidak ada leaderboard), jadi Best Score-nya tetap kosong
    // Hornet Hunter menyimpan Best Score di browser (localStorage), tanpa server
    hunter:  { desc: 'Tembak hornet dengan gestur sebelum waktu habis. Makin tinggi gelombang, makin besar poinnya. Bisa battle 2 pemain!', rekor: null, local: 'astakanda.hunterBest' },
    ladders: { desc: 'Lempar dadu, jawab gestur dengan benar untuk naik tangga dan hindari ular sampai garis finis.', rekor: null },
  };

  const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
  const ICON_TROPHY = SVG + '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  const ICON_USER = SVG + '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  const MAX_PER_PAGE = 5, MIN_W = 220, GAP_X = 20, MIN_H = 122, GAP_Y = 10;
  const CACHE_KEY = 'astakanda.gameBest';
  const mobile = window.matchMedia('(max-width: 640px)');
  const dots = document.createElement('div');
  dots.className = 'game-dots';
  screen.appendChild(dots);

  let cards = [], pages = [], perPage = 0, page = 0;
  let best = {};   // { apple: {nama, skor}, ... } — disimpan di localStorage agar skor langsung tampil
  try { best = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { best = {}; }

  // ladders.js membuang semua atribut data-*, jadi kartu Ladders dikenali lewat id-nya
  const keyOf = (c) => c.dataset.game || c.id.replace(/^game-card-/, '');
  const rank = (c) => { const i = ORDER.indexOf(keyOf(c)); return i < 0 ? ORDER.length : i; };

  function bestOf(key) {
    const lk = (INFO[key] || {}).local;
    if (lk) { try { const b = JSON.parse(localStorage.getItem(lk)); if (b && b.skor > 0) return b; } catch (e) { /* abaikan */ } }
    return best[key];
  }

  function applyBest(card) {
    const b = bestOf(keyOf(card));
    if (!b) return;
    card.querySelector('.gc-rk-val').textContent = Number(b.skor).toLocaleString('id-ID');
    card.querySelector('.gc-name').textContent = b.nama;
  }

  // Isi kartu. Aman dipanggil ulang: kartu hasil clone (mis. oleh ladders.js) dibangun ulang sesuai game-nya.
  function decorate(card) {
    const key = keyOf(card);
    if (card.dataset.gcKey === key) return;
    card.dataset.gcKey = key;

    let info = card.querySelector('.game-card-info');
    if (!info) {
      const name = card.querySelector('.game-card-name');
      info = document.createElement('span');
      info.className = 'game-card-info';
      name.replaceWith(info);
      info.append(name);
    }
    info.querySelectorAll('.game-card-desc, .game-card-foot').forEach((el) => el.remove());

    const desc = document.createElement('span');
    desc.className = 'game-card-desc';
    desc.textContent = (INFO[key] || {}).desc || 'Latih gestur sambil bermain.';
    const foot = document.createElement('span');
    foot.className = 'game-card-foot';
    foot.innerHTML =
      '<span class="game-card-rekor">' +
        '<span class="gc-trophy">' + ICON_TROPHY + '</span>' +
        '<span class="gc-rk-txt"><span class="gc-rk-label">BEST SCORE</span>' +
        '<span class="gc-rk-who"><span class="gc-avatar">' + ICON_USER + '</span><span class="gc-name">Belum ada</span></span></span>' +
        '<span class="gc-rk-val">–</span>' +
      '</span>' +
      '<span class="game-card-play" aria-hidden="true">' + ICON_PLAY + '<span>Play</span></span>';
    info.append(desc, foot);
    applyBest(card);

    // Dekode gambar lebih awal supaya langsung tergambar saat tab dibuka
    const img = card.querySelector('img');
    if (img && img.decode) {
      const warm = () => img.decode().catch(() => {});
      warm();
      img.addEventListener('load', warm);
    }
  }

  // Kartu bisa ditambah script lain kapan saja (ladders.js): rapikan & hias, tanpa butuh ukuran layar
  function sync() {
    cards = Array.from(wrap.querySelectorAll('.game-card')).sort((a, b) => rank(a) - rank(b));
    cards.forEach(decorate);
  }

  function loadBest() {
    cards.forEach(applyBest);   // skor lokal (mis. Hornet Hunter) langsung diperbarui
    Object.keys(INFO).forEach((key) => {
      const url = INFO[key].rekor;
      if (!url) return;
      fetch(url)
        .then((r) => r.json())
        .then((items) => {
          const top = Array.isArray(items) ? items[0] : null;
          if (!top) return;
          best[key] = { nama: top.nama, skor: top.skor_tertinggi };
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(best)); } catch (e) { /* abaikan */ }
          cards.filter((c) => keyOf(c) === key).forEach(applyBest);
        })
        .catch(() => {});
    });
  }

  function calcPerPage() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return 0;   // layar sedang tersembunyi
    const n = mobile.matches
      ? Math.floor((h - 16 + GAP_Y) / (MIN_H + GAP_Y))
      : Math.floor((w - 28 + GAP_X) / (MIN_W + GAP_X));
    return Math.min(MAX_PER_PAGE, Math.max(1, n));
  }

  function go(i, animate) {
    page = Math.min(Math.max(i, 0), pages.length - 1);
    pages.forEach((p, k) => {
      p.hidden = k !== page;
      p.classList.toggle('is-turn', !!animate && k === page);
    });
    Array.from(dots.children).forEach((d, k) => d.classList.toggle('is-active', k === page));
  }

  function build() {
    const n = calcPerPage();
    if (!n) return;
    // Kartu yang disisipkan script lain (ladders.js) jatuh langsung di .game-cards: susun ulang
    const stray = wrap.querySelector(':scope > .game-card');
    if (n === perPage && !stray) return;

    const firstIdx = page * (perPage || n);   // pertahankan kartu yang sedang terlihat
    perPage = n;
    sync();

    pages.forEach((p) => p.remove());
    pages = [];
    dots.innerHTML = '';
    const perView = Math.min(n, cards.length);
    for (let i = 0; i < cards.length; i += n) {
      const p = document.createElement('div');
      p.className = 'game-page';
      p.style.setProperty('--gc-n', perView);
      p.append(...cards.slice(i, i + n));
      wrap.appendChild(p);
      pages.push(p);
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'game-dot';
      d.setAttribute('aria-label', 'Halaman ' + pages.length);
      d.addEventListener('click', () => go(pages.indexOf(p), true));
      dots.appendChild(d);
    }
    go(Math.floor(firstIdx / n), false);
  }

  // ---- Semua kartu muncul serentak + shimmer berurutan (kartu 1 → terakhir) ----
  const seqStyle = document.createElement('style');
  document.head.appendChild(seqStyle);
  let seqTotal = 0;
  function seq() {
    const all = Array.from(wrap.querySelectorAll('.game-card')).sort((a, b) => rank(a) - rank(b));
    all.forEach((c, i) => c.style.setProperty('--gc-i', i));   // urutan shimmer
    if (all.length && all.length !== seqTotal) {
      seqTotal = all.length;
      wrap.style.setProperty('--gc-total', seqTotal);
      // keyframes menyapu 1 kartu saja per putaran, jumlahnya mengikuti total kartu
      seqStyle.textContent = '@keyframes gc-seq{0%{transform:translateX(-130%);animation-timing-function:ease-in-out}'
        + (100 / seqTotal) + '%{transform:translateX(130%)}100%{transform:translateX(130%)}}';
    }
    // shortcut: tampil serentak begitu semua kartu di ORDER ada; cadangan 3 detik kalau ada script kartu yang gagal; upgrade bila kartu dibuat dari server
    if (all.length >= ORDER.length) wrap.classList.add('is-ready');
  }
  setTimeout(() => wrap.classList.add('is-ready'), 3000);

  sync();        // siapkan kartu sekarang juga
  seq();
  loadBest();    // dan ambil Best Score sekarang juga
  // RO/MO dijalankan sebelum layar pertama digambar, jadi kartu tersusun sebelum terlihat
  new ResizeObserver(build).observe(wrap);
  new MutationObserver(() => { sync(); build(); seq(); }).observe(wrap, { childList: true });   // kartu baru dari script lain
  // Segarkan Best Score tiap layar Pilih Game dibuka lagi (mis. setelah selesai main)
  new MutationObserver(() => { if (!screen.classList.contains('hidden')) loadBest(); })
    .observe(screen, { attributes: true, attributeFilter: ['class'] });

  // Geser kiri/kanan di HP
  let sx = null;
  wrap.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) go(page + (dx < 0 ? 1 : -1), true);
  }, { passive: true });
})();