/* ASTA KANDA — Hornet Hunter (TAMPILAN). Skrip biasa yang ringan: kartu, layar cara bermain, atur permainan,
 * layar bermain & popup hasil dibuat SEKETIKA saat halaman dimuat. Mesin 3D-nya (hunter.js + Three.js) dimuat
 * di belakang layar, jadi kartu tidak menunggu unduhan Three.js.
 * Mandiri seperti ladders.js. Soal dari huruf/kata yang sudah direkam di tab Belajar.
 */
(function () {
  'use strict';

  const SRC = document.currentScript && document.currentScript.src;
  const ENGINE_URL = new URL('hunter.js', SRC || location.href).href;
  const HORNET_IMG = (window.ASTA_IMAGES && window.ASTA_IMAGES.hornet) || '/assets/images/hornet.png';

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICON = {
    back: SV + '><path d="m15 18-6-6 6-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    atur: SV + '><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.8.7-5.1 4.6 1.5 6.7L12 16.9 5.9 20.3l1.5-6.7L2.3 9l6.8-.7z"/></svg>',
    exit: SV + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    abc: SV + ' class="game-chip-ico"><path d="M4 20 10 5l6 15"/><path d="M6.5 14h7"/><path d="M19 8v12"/></svg>',
    kata: SV + ' class="game-chip-ico"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>',
    semua: SV + ' class="game-chip-ico"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    solo: SV + ' class="game-chip-ico"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    duo: SV + ' class="game-chip-ico"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    podium: SV + '><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
    person: SV + '><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  };

  let selectScreen, host, detailEl, setupEl, playEl, camSlot, loadingEl;
  let enginePromise = null, engineRef = null, lastCfg = null, token = 0, brandHome = false;
  const setup = { kategori: 'alfabet', mode: 1 };

  const namaTersimpan = () => localStorage.getItem('astakanda_player_nama') || '';

  function kumpulkanSoal(kategori) {
    const sel = kategori === 'alfabet' ? '#grid-alfabet .word-card'
      : kategori === 'kata' ? '#grid-kata .word-card'
      : '#grid-alfabet .word-card, #grid-kata .word-card';
    return Array.from(document.querySelectorAll(sel))
      .filter((c) => (parseInt(c.querySelector('.count').textContent, 10) || 0) > 0)
      .map((c) => c.querySelector('.label').textContent.trim())
      .filter(Boolean);
  }

  /* ════════════════ Mesin 3D: dimuat di belakang layar ════════════════ */
  function engine() {
    if (!enginePromise) {
      enginePromise = import(ENGINE_URL).then((m) => (engineRef = m.default)).catch((err) => { enginePromise = null; throw err; });
    }
    return enginePromise;
  }
  function warm() { engine().then((e) => e.siapkan()).catch(() => {}); } // unduh mesin + bangun arena saat senggang

  /* ════════════════ Membangun UI ════════════════ */
  function build() {
    const cardsEl = document.querySelector('.game-cards');
    if (!cardsEl || $('game-card-hunter')) return !!$('game-card-hunter');
    selectScreen = cardsEl.closest('.game-screen') || cardsEl.parentElement;
    host = selectScreen.parentElement;

    // Kartu pilihan game (isi nama/deskripsi/Best Score/Play dilengkapi blok KARTU GAME di game.js)
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'game-card';
    card.id = 'game-card-hunter';
    card.innerHTML = '<span class="game-card-img-wrap"><img src="' + HORNET_IMG + '" alt="Hornet Hunter" decoding="sync" fetchpriority="high"></span><span class="game-card-name">Hornet Hunter</span>';
    cardsEl.appendChild(card);
    card.addEventListener('click', (e) => { e.stopPropagation(); showMy(detailEl); });

    detailEl = document.createElement('div');
    detailEl.id = 'game-hunter-detail';
    detailEl.className = 'game-screen game-detail hidden';
    detailEl.innerHTML =
      '<button type="button" class="game-back-btn" id="hunter-detail-back" aria-label="Kembali">' + ICON.back + '</button>' +
      '<div class="game-detail-body">' +
        '<img class="game-detail-img" src="' + HORNET_IMG + '" alt="">' +
        '<div class="game-detail-name">Hornet Hunter</div>' +
        '<div class="game-howto"><div class="game-howto-title">CARA BERMAIN</div><ul class="game-howto-list">' +
          '<li>🖐️ Peragakan gestur huruf/kata yang tampil di atas hornet yang menyala.</li>' +
          '<li>✅ Gestur <b>benar</b> = blaster menembak hornet itu otomatis.</li>' +
          '<li>❌ Gestur <b>salah</b> atau waktu habis = hornet menyerang, nyawa -1, gelombang tidak berganti.</li>' +
          '<li>🌊 Tembak 5 hornet untuk naik gelombang: waktu makin singkat, poin makin besar.</li>' +
          '<li>⚔️ Mode 2 Pemain: kamera terbagi dua. Yang benar lebih dulu dapat poin, nyawa habis = kalah.</li>' +
        '</ul></div>' +
        '<button type="button" class="neu-btn btn-add game-btn-mulai" id="hunter-detail-mulai">' + ICON.play + ' Mulai</button>' +
      '</div>';
    host.appendChild(detailEl);

    setupEl = document.createElement('div');
    setupEl.id = 'game-hunter-setup';
    setupEl.className = 'game-screen game-setup hidden';
    setupEl.innerHTML =
      '<button type="button" class="game-back-btn" id="hunter-setup-back" aria-label="Kembali">' + ICON.back + '</button>' +
      '<div class="game-setup-inner">' +
        '<div class="game-setup-head"><img class="game-setup-img" src="' + HORNET_IMG + '" alt=""><div class="game-setup-title">Atur Permainan</div><div class="game-setup-sub">Hornet Hunter</div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label">Mode</div><div class="game-setup-chips" id="hunter-mode-chips">' +
          '<button type="button" class="game-chip is-active" data-mode="1">' + ICON.solo + '<span>1 Pemain</span></button>' +
          '<button type="button" class="game-chip" data-mode="2">' + ICON.duo + '<span>2 Pemain · Battle</span></button>' +
        '</div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label" id="hunter-nama-label">Nama Pemain</div>' +
          '<div class="hunter-names">' +
            '<input type="text" id="hunter-nama" class="neu-inset game-nama-input" maxlength="20" placeholder="Nama Pemain 1" autocomplete="off">' +
            '<input type="text" id="hunter-nama2" class="neu-inset game-nama-input hidden" maxlength="20" placeholder="Nama Pemain 2" autocomplete="off">' +
          '</div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label">Kategori Soal</div><div class="game-setup-chips" id="hunter-kategori-chips">' +
          '<button type="button" class="game-chip is-active" data-kategori="alfabet">' + ICON.abc + '<span>Alfabet</span></button>' +
          '<button type="button" class="game-chip" data-kategori="kata">' + ICON.kata + '<span>Kata</span></button>' +
          '<button type="button" class="game-chip" data-kategori="campuran">' + ICON.semua + '<span>Campuran</span></button>' +
        '</div></div>' +
        '<button type="button" class="neu-btn btn-add game-btn-mulai" id="hunter-btn-mulai">' + ICON.play + ' Mulai Main</button>' +
      '</div>';
    host.appendChild(setupEl);

    // Layar bermain (overlay layar penuh) + popup hasil (struktur sama dengan popup Dino).
    // HUD di dalam arena (#hunter-hud) diisi oleh mesin 3D sesuai mode.
    playEl = document.createElement('div');
    playEl.id = 'game-hunter-play';
    playEl.className = 'hunter-play hidden';
    playEl.innerHTML =
      '<div class="game-play-topbar">' +
        '<div class="game-play-brand"></div>' +
        '<div class="game-play-actions">' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="hunter-btn-atur">' + ICON.atur + '<span>Atur</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="hunter-btn-leaderboard">' + ICON.podium + '<span>Leaderboard</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" id="hunter-btn-keluar">' + ICON.exit + '<span>Keluar</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="game-play-grid">' +
        '<section class="game-play-field">' +
          '<div class="game-play-canvas-wrap" id="hunter-wrap">' +
            '<canvas id="hunter-canvas" tabindex="0"></canvas>' +
            '<div class="hunter-dmg" id="hunter-dmg" data-side="all"></div>' +
            '<div class="hunter-banner" id="hunter-banner"></div>' +
            '<div class="hunter-popups" id="hunter-popups"></div>' +

          '</div>' +
          '<div class="game-play-stats" id="hunter-stats"></div>' +
        '</section>' +
        '<div class="game-play-side">' +
          '<div class="game-play-camera-slot" id="game-hunter-camera-slot">' +
            '<div class="game-play-player-badge" id="hunter-player-badge"></div>' +
            '<div class="hunter-split hidden" id="hunter-split">' +
              '<i class="hunter-split-line"></i>' +
              '<span class="hunter-split-name p1" id="hunter-sn1"></span>' +
              '<span class="hunter-split-name p2" id="hunter-sn2"></span>' +
            '</div>' +
          '</div>' +
          '<div class="game-play-question neu-inset hunter-q" id="hunter-q">' +
            '<div class="game-play-question-headrow">' +
              '<span class="game-play-question-label">Peragakan</span>' +
              '<span class="game-play-question-progress" id="hunter-progress">0/5</span>' +
            '</div>' +
            '<div class="game-play-question-body">' +
              '<div class="game-play-question-target" id="hunter-target">A</div>' +
              '<div class="hunter-meta">' +
                '<div class="hunter-time"><div class="hunter-timer"><i id="hunter-timer"></i></div><span class="hunter-time-text"><b id="hunter-time">12.0</b> dtk</span></div>' +
                '<div class="game-play-question-feedback" id="hunter-feedback"></div>' +
                '<div class="hunter-detect">Terdeteksi: <b id="hunter-detect">—</b></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hunter-loading hidden" id="hunter-loading"><div class="hunter-loading-card"><i></i><b>Menyiapkan Hornet Hunter</b><span id="hunter-loading-teks">Memuat arena 3D…</span></div></div>';
    document.body.appendChild(playEl);

    // Popup hasil: struktur sama persis dengan popup Dino Attack, di level halaman (sejajar popup sertifikat)
    const hasil = document.createElement('div');
    hasil.id = 'hunter-result';
    hasil.className = 'modal-overlay hidden';
    hasil.innerHTML =
      '<div class="modal-box game-over-inner">' +
        '<div class="game-over-title" id="hunter-result-title">Game Over</div>' +
        '<div class="game-over-score hunter-result-score">' + ICON.star + '<span>Skor:</span> <span id="hunter-result-skor">0</span></div>' +
        '<div id="hunter-result-rekor" class="game-result-unlock hidden"></div>' +
        '<button type="button" id="hunter-btn-ulangi" class="game-over-btn game-over-btn--main">Main Lagi</button>' +
        '<div class="game-over-row">' +
          '<button type="button" id="hunter-btn-lb2" class="game-over-btn game-over-btn--sub hunter-rbtn">' + ICON.podium + '<span>Leaderboard</span></button>' +
          '<button type="button" id="hunter-btn-atur2" class="game-over-btn game-over-btn--sub hunter-rbtn">' + ICON.atur + '<span>Atur Ulang</span></button>' +
          '<button type="button" id="hunter-btn-keluar2" class="game-over-btn game-over-btn--sub hunter-rbtn hunter-exit">' + ICON.exit + '<span>Keluar</span></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(hasil);

    // Popup konfirmasi keluar (tampilan sama dengan Apple Snake: kelas .apple-confirm* dari apple.css)
    const konfirm = document.createElement('div');
    konfirm.id = 'hunter-confirm';
    konfirm.className = 'apple-confirm hidden';
    konfirm.setAttribute('role', 'dialog');
    konfirm.setAttribute('aria-modal', 'true');
    konfirm.innerHTML =
      '<div class="apple-confirm-card">' +
        '<div class="apple-confirm-ico">' + ICON.exit + '</div>' +
        '<div class="apple-confirm-title">Keluar dari permainan?</div>' +
        '<p class="apple-confirm-text">Permainan yang sedang berjalan akan dihentikan dan skor tidak disimpan.</p>' +
        '<div class="apple-confirm-actions">' +
          '<button type="button" class="apple-confirm-btn apple-confirm-btn--ghost" id="hunter-confirm-batal">Batal</button>' +
          '<button type="button" class="apple-confirm-btn apple-confirm-btn--danger" id="hunter-confirm-ya">Keluar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(konfirm);

    // Layar Leaderboard penuh: podium 1-3 + daftar peringkat berikutnya (sama seperti Apple Snake; kelas dari apple.css)
    const lb = document.createElement('div');
    lb.id = 'game-hunter-leaderboard';
    lb.className = 'hunter-lb hidden';
    lb.innerHTML =
      '<div class="game-play-topbar">' +
        '<div class="game-play-brand" id="hunter-lb-brand"></div>' +
        '<div class="game-play-actions">' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="hunter-lb-kembali">' + ICON.back + '<span>Kembali</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="hunter-lb-atur">' + ICON.atur + '<span>Atur</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--active">' + ICON.podium + '<span>Leaderboard</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" id="hunter-lb-keluar">' + ICON.exit + '<span>Keluar</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="game-lb-body">' +
        '<h2 class="leaderboard-screen__title"><span class="leaderboard-screen__trophy">🏆</span> Leaderboard</h2>' +
        '<p class="leaderboard-screen__subtitle">Hornet Hunter · Skor Tertinggi Setiap Pemain</p>' +
        '<div class="leaderboard-podium" id="hunter-lb-podium"></div>' +
        '<div class="leaderboard-others" id="hunter-lb-others" hidden>' +
          '<p class="leaderboard-others__label">Peringkat Lainnya</p>' +
          '<table class="leaderboard-table">' +
            '<colgroup><col class="leaderboard-table__col-rank"><col><col class="leaderboard-table__col-score"></colgroup>' +
            '<thead><tr><th>Peringkat</th><th>Pemain</th><th>Skor</th></tr></thead>' +
            '<tbody id="hunter-lb-list"></tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);
    camSlot = $('game-hunter-camera-slot');
    loadingEl = $('hunter-loading');

    bind();
    // Layar Hornet Hunter ditutup otomatis bila pemain kembali ke layar Pilih Game
    new MutationObserver(() => {
      const hidden = selectScreen.classList.contains('hidden') || getComputedStyle(selectScreen).display === 'none';
      if (!hidden) [detailEl, setupEl].forEach((s) => s.classList.add('hidden'));
    }).observe(selectScreen, { attributes: true, attributeFilter: ['class', 'style'] });
    // Panel Game dibuka: siapkan mesin 3D selagi pemain memilih game
    const panel = $('panel-game');
    if (panel) {
      const cek = () => { if (!panel.classList.contains('hidden') && getComputedStyle(panel).display !== 'none') warm(); };
      new MutationObserver(cek).observe(panel, { attributes: true, attributeFilter: ['class', 'style'] });
      cek();
    }
    return true;
  }

  /* ════════════════ Perpindahan layar ════════════════ */
  function showMy(screen) {
    [detailEl, setupEl].forEach((s) => s.classList.add('hidden'));
    if (screen) screen.classList.remove('hidden');
    selectScreen.classList.toggle('hidden', !!screen);
    if (screen === setupEl) $('hunter-nama').value = namaTersimpan();
    if (screen) warm();
  }
  function keSelect() {
    showMy(null);
    try { if (window.AstaKandaGameUI && window.AstaKandaGameUI.showSelect) window.AstaKandaGameUI.showSelect(); } catch (e) { /* abaikan */ }
  }

  // Logo + tagline dipindah ke topbar (sama seperti Apple/Dino/Ladders)
  function pindahBrand(masuk) {
    const brand = playEl.querySelector('.game-play-brand');
    const header = document.querySelector('.app-header');
    const logoRow = document.querySelector('.logo-row'), tag = $('tagline');
    if (!brand || !header || !logoRow || !tag) return;
    if (masuk) { if (!brandHome) { brand.appendChild(logoRow); brand.appendChild(tag); brandHome = true; } }
    else if (brandHome) { header.appendChild(logoRow); header.appendChild(tag); brandHome = false; }
  }
  function pindahkanKamera(masuk) {
    const leftCol = $('left-col');
    if (!leftCol) return;
    if (masuk) {
      window.__astaLeftColParent = window.__astaLeftColParent || leftCol.parentElement;
      window.__astaLeftColNext = window.__astaLeftColNext || leftCol.nextElementSibling;
      camSlot.appendChild(leftCol);
      leftCol.classList.remove('hidden');
      leftCol.style.display = '';
    } else if (window.__astaLeftColParent && leftCol.parentElement === camSlot) {
      window.__astaLeftColParent.insertBefore(leftCol, window.__astaLeftColNext || null);
      leftCol.classList.add('hidden');
    }
  }

  /* ════════════════ Mulai / tutup ════════════════ */
  async function mulai(cfg) {
    const pool = kumpulkanSoal(cfg.kategori);
    if (!pool.length) {
      const m = $('modal-game-syarat'), t = $('modal-game-syarat-text');
      const msg = 'Belum ada huruf/kata yang direkam untuk kategori "' + cfg.kategori + '". Rekam dulu di tab Belajar, ya.';
      if (m && t) { t.textContent = msg; m.classList.remove('hidden'); } else { alert(msg); }
      return;
    }
    lastCfg = cfg;
    const tok = ++token;
    const duo = cfg.mode === 2;

    // Layar bermain tampil SEKETIKA; arena 3D menyusul begitu mesin siap (biasanya sudah siap)
    $('hunter-result').classList.add('hidden');
    playEl.classList.toggle('is-duo', duo);
    $('hunter-split').classList.toggle('hidden', !duo);
    $('hunter-player-badge').classList.toggle('hidden', duo);
    $('hunter-player-badge').innerHTML = ICON.person + ' ' + esc(cfg.names[0]);
    $('hunter-sn1').innerHTML = '<b></b>' + esc(cfg.names[0]);
    $('hunter-sn2').innerHTML = '<b></b>' + esc(cfg.names[1] || '');
    playEl.classList.remove('hidden');
    pindahBrand(true);
    pindahkanKamera(true);
    $('hunter-loading-teks').textContent = 'Memuat arena 3D…';
    loadingEl.classList.remove('hidden'); // popup pemuatan selalu tampil; mesin yang menutupnya setelah semuanya siap

    try {
      const eng = await engine();
      if (tok !== token) return; // pemain sudah keluar saat mesin dimuat
      await eng.start({ pool, mode: cfg.mode, names: cfg.names });
    } catch (err) {
      console.error(err);
      if (tok !== token) return;
      loadingEl.classList.add('hidden');
      alert('Arena 3D tidak bisa dimuat (WebGL tidak tersedia atau koneksi ke CDN three.js gagal). Coba muat ulang halaman.');
      tutup();
      keSelect();
    }
  }

  function tutup() {
    token += 1;
    if (engineRef) engineRef.stop();
    pindahkanKamera(false);
    pindahBrand(false);
    playEl.classList.add('hidden');
    $('hunter-result').classList.add('hidden');
    $('hunter-confirm').classList.add('hidden');
    $('game-hunter-leaderboard').classList.add('hidden');
    loadingEl.classList.add('hidden');
  }

  /* ════════════════ Leaderboard (urut skor, tersimpan di browser ini) ════════════════ */
  // shortcut: disimpan di localStorage (per perangkat), belum ke server; upgrade: kirim ke endpoint seperti /game/leaderboard milik Apple Snake
  const LB_KEY = 'astakanda.hunterBoard', LB_MAX = 10, MEDALS = ['🥇', '🥈', '🥉'];
  let hasilTampil = false; // popup hasil sedang terbuka saat leaderboard dibuka (dikembalikan saat Kembali)
  const kunci = (n) => String(n).trim().toLowerCase();
  const lbTerbuka = () => !$('game-hunter-leaderboard').classList.contains('hidden');
  function bacaBoard() {
    try { const a = JSON.parse(localStorage.getItem(LB_KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function catat(daftar) { // daftar = [{ nama, skor }]; satu skor terbaik per nama, 10 teratas
    const board = bacaBoard();
    daftar.forEach(({ nama, skor }) => {
      if (!(skor > 0)) return;
      const ada = board.find((b) => kunci(b.nama) === kunci(nama));
      if (!ada) board.push({ nama, skor }); else if (skor > ada.skor) ada.skor = skor;
    });
    board.sort((a, b) => b.skor - a.skor);
    try { localStorage.setItem(LB_KEY, JSON.stringify(board.slice(0, LB_MAX))); } catch (e) { /* abaikan */ }
  }
  function gambarBoard() { // podium peringkat 1-3 + daftar peringkat 4 dst (markup & kelas sama dengan renderLeaderboard di game.js)
    const rows = bacaBoard();
    const podium = $('hunter-lb-podium'), others = $('hunter-lb-others'), list = $('hunter-lb-list');
    list.innerHTML = '';
    if (!rows.length) { podium.innerHTML = '<p class="leaderboard-empty">🐝 Belum ada skor. Jadilah yang pertama!</p>'; others.hidden = true; return; }
    podium.innerHTML = rows.slice(0, 3).map((r, i) => {
      const rank = i + 1;
      return '<div class="podium-card podium-card--rank' + rank + '">' +
        '<div class="podium-card__crown">' + (rank === 1 ? '👑' : '') + '</div>' +
        (rank === 1 ? '' : '<div class="podium-card__medal">' + MEDALS[i] + '</div>') +
        '<div class="podium-card__name">' + esc(r.nama) + '</div>' +
        '<div class="podium-card__score">🐝 ' + Number(r.skor) + '</div>' +
        '<div class="podium-card__step">' + rank + '</div></div>';
    }).join('');
    const lain = rows.slice(3);
    others.hidden = !lain.length;
    lain.forEach((r, i) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = (i * 70) + 'ms';
      tr.innerHTML = '<td><span class="rank-badge rank-badge--plain">' + (i + 4) + '</span></td>' +
        '<td class="leaderboard-table__name"><span class="leaderboard-table__avatar">' + esc((String(r.nama).trim().charAt(0) || '?').toUpperCase()) + '</span>' + esc(r.nama) + '</td>' +
        '<td>🐝 ' + Number(r.skor) + '</td>';
      list.appendChild(tr);
    });
  }
  function brandKe(slot) { // logo + tagline ikut pindah ke topbar layar yang sedang tampil
    const logoRow = document.querySelector('.logo-row'), tag = $('tagline');
    if (slot && logoRow && tag) { slot.appendChild(logoRow); slot.appendChild(tag); }
  }
  function bukaBoard() {
    const hasil = $('hunter-result');
    hasilTampil = !hasil.classList.contains('hidden');
    hasil.classList.add('hidden');
    if (engineRef) engineRef.jeda(true); // permainan berhenti sementara selagi melihat leaderboard
    gambarBoard();
    brandKe($('hunter-lb-brand'));
    $('game-hunter-leaderboard').classList.remove('hidden');
  }
  function tutupBoard() { // kembali ke permainan: lanjut main, atau popup hasil bila game sudah selesai
    $('game-hunter-leaderboard').classList.add('hidden');
    brandKe(playEl.querySelector('.game-play-brand'));
    if (hasilTampil) $('hunter-result').classList.remove('hidden');
    else if (engineRef) engineRef.jeda(false);
  }

  /* ════════════════ Konfirmasi keluar ════════════════ */
  function tutupKonfirmasi(lanjut) {
    $('hunter-confirm').classList.add('hidden');
          if (lanjut && engineRef && !lbTerbuka()) engineRef.jeda(false); // leaderboard masih terbuka: tetap jeda
  }
  function mintaKeluar() {
    if (engineRef) engineRef.jeda(true); // permainan berhenti sementara selagi pemain memutuskan
    $('hunter-confirm').classList.remove('hidden');
    $('hunter-confirm-batal').focus();
  }

  /* ════════════════ Event ════════════════ */
  function bind() {
    $('hunter-detail-back').addEventListener('click', keSelect);
    $('hunter-detail-mulai').addEventListener('click', () => showMy(setupEl));
    $('hunter-setup-back').addEventListener('click', () => showMy(detailEl));
    $('hunter-kategori-chips').addEventListener('click', (e) => {
      const b = e.target.closest('.game-chip'); if (!b) return;
      Array.from($('hunter-kategori-chips').children).forEach((c) => c.classList.toggle('is-active', c === b));
      setup.kategori = b.dataset.kategori;
    });
    $('hunter-mode-chips').addEventListener('click', (e) => {
      const b = e.target.closest('.game-chip'); if (!b) return;
      Array.from($('hunter-mode-chips').children).forEach((c) => c.classList.toggle('is-active', c === b));
      setup.mode = Number(b.dataset.mode);
      $('hunter-nama2').classList.toggle('hidden', setup.mode !== 2);
      $('hunter-nama-label').textContent = setup.mode === 2 ? 'Nama Pemain (kiri & kanan)' : 'Nama Pemain';
    });
    $('hunter-btn-mulai').addEventListener('click', () => {
      const n1 = $('hunter-nama').value.trim() || (setup.mode === 2 ? 'Pemain 1' : 'Pemain');
      let n2 = $('hunter-nama2').value.trim() || 'Pemain 2';
      if (n2.toLowerCase() === n1.toLowerCase()) n2 += ' 2';
      if ($('hunter-nama').value.trim()) localStorage.setItem('astakanda_player_nama', n1);
      mulai({ kategori: setup.kategori, mode: setup.mode, names: setup.mode === 2 ? [n1, n2] : [n1] });
    });
    $('hunter-btn-atur').addEventListener('click', () => { tutup(); showMy(setupEl); });
    $('hunter-btn-keluar').addEventListener('click', mintaKeluar);
    $('hunter-btn-ulangi').addEventListener('click', () => { if (lastCfg) mulai(lastCfg); });
    $('hunter-btn-atur2').addEventListener('click', () => { tutup(); showMy(setupEl); });
    $('hunter-btn-keluar2').addEventListener('click', mintaKeluar);
    $('hunter-btn-leaderboard').addEventListener('click', bukaBoard);
    $('hunter-btn-lb2').addEventListener('click', bukaBoard);
    $('hunter-lb-kembali').addEventListener('click', tutupBoard);
    $('hunter-lb-atur').addEventListener('click', () => { tutup(); showMy(setupEl); });
    $('hunter-lb-keluar').addEventListener('click', mintaKeluar);
    $('hunter-confirm-batal').addEventListener('click', () => tutupKonfirmasi(true));
    $('hunter-confirm').addEventListener('click', (e) => { if (e.target === e.currentTarget) tutupKonfirmasi(true); });
    $('hunter-confirm-ya').addEventListener('click', () => { tutupKonfirmasi(false); tutup(); keSelect(); });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!$('hunter-confirm').classList.contains('hidden')) tutupKonfirmasi(true);
      else if (lbTerbuka()) tutupBoard();
    });
  }

  /* ════════════════ Init ════════════════ */
  if (!build()) {
    const mo = new MutationObserver(() => { if (build()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  window.addEventListener('load', () => setTimeout(() => engine().catch(() => {}), 800)); // unduh mesin setelah halaman selesai
  window.AstaKandaGames = window.AstaKandaGames || {};
  window.AstaKandaGames.hunter = { start: mulai, stop: tutup, catat };
})();