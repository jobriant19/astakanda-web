/* ASTA KANDA — Snakes & Ladders (ular tangga) dengan kamera bergantian.
 * Mandiri: menambah kartu ke .game-cards, layar cara bermain & atur permainan di panel Game,
 * serta layar bermain (overlay layar penuh). Soal & deteksi gestur sama seperti Apple/Dino:
 * fetch('/gesture/recognize') + window.astaKanda (lihat app.js).
 */
(function () {
  'use strict';

  const IMG = (window.ASTA_IMAGES && window.ASTA_IMAGES.ladders) || '/assets/images/ladders.png';
  const logoNode = document.querySelector('img.logo');
  const LOGO = (logoNode && logoNode.src) || '/assets/images/logo.png';
  const FONT = "'Fredoka', 'Baloo 2', 'Poppins', 'Segoe UI', Arial, sans-serif";
  const croppedIcon = cropImage(IMG); // mulai memproses ikon begitu skrip dimuat

  // ---------------- Board ----------------
  // Tiap ular/tangga menempati jalur kolomnya sendiri (jarak antar-jalur >= 1 kotak) -> tidak ada yang bersilangan
  // Semua jalur diagonal 45°, tiap jalur punya kotak sendiri & jarak aman antar-jalur (tidak bersilangan)
  const LADDERS = { 6: 50, 8: 30, 18: 40, 24: 54, 38: 60, 56: 78 };
  const SNAKES  = { 62: 44, 70: 26, 84: 66, 86: 68, 94: 72, 98: 80 };
  const SNAKE_COLORS = [['#16a34a', '#bbf7d0'], ['#dc2626', '#fecaca'], ['#7c3aed', '#ddd6fe'], ['#ea580c', '#fed7aa'], ['#0891b2', '#a5f3fc'], ['#2563eb', '#bfdbfe']];
  const SHARE = [ // geser bidak hanya jika beberapa bidak berada di kotak yang sama
    [[-0.17, 0], [0.17, 0]],
    [[-0.2, 0.05], [0.2, 0.05], [0, -0.14]],
    [[-0.17, -0.12], [0.17, -0.12], [-0.17, 0.12], [0.17, 0.12]],
  ];
  const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];
  const PAWN_OFFSETS = [[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.2], [0.2, 0.2]];
  const DICE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const AI_CHANCE = 0.7;   // peluang AI menjawab benar
  const STEP_MS = 260;     // lama tiap langkah bidak (sama untuk setiap kotak)
  const JUMP_MS = 850;     // lama naik tangga / turun ular

  // ---------------- Ikon ----------------
  const SV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICON = {
    back:  SV + '><path d="m15 18-6-6 6-6"/></svg>',
    user:  SV + ' class="game-chip-ico"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    users: SV + ' class="game-chip-ico"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    ai:    SV + ' class="game-chip-ico"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M9.5 17.5h5"/></svg>',
    abc:   SV + ' class="game-chip-ico"><path d="M4 20 10 5l6 15"/><path d="M6.5 14h7"/><path d="M19 8v12"/></svg>',
    kata:  SV + ' class="game-chip-ico"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/></svg>',
    person: SV + '><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    robot:  SV + '><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><circle cx="9" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="14" r="1.2" fill="currentColor"/><path d="M9.5 17.5h5"/></svg>',
    play:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    atur:  SV + '><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>',
    exit:  SV + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    skip:  SV + '><path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/></svg>',
    podium: SV + '><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
    trophy: SV + '><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5a2 2 0 0 0 0 4h1.5M16 5h3a2 2 0 0 1 0 4h-1.5"/><path d="M12 12v3"/><path d="M9 20h6"/><path d="M10 17h4l.6 3H9.4l.6-3Z"/></svg>',
    check: SV.replace('stroke-width="2"', 'stroke-width="3"') + '><path d="M20 6 9 17l-5-5"/></svg>',
    cross: SV.replace('stroke-width="2"', 'stroke-width="3"') + '><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------- State ----------------
  let selectScreen = null, host = null;
  let detailEl, setupEl, playEl, resultEl;
  let canvas, ctx, playersEl, turnNameEl, turnCountEl, targetEl, feedbackEl, diceEl, diceInfoEl, detectEl, btnLewati, camSlot;
  let namesEl, badgeEl, dice3dEl, cubeEl, cubeShadowEl, cubeValueEl, cubeAnim = null, shadowAnim = null, brandHome = false;

  const setup = { mode: 'ai', kategori: 'alfabet', names: ['', '', '', ''] };
  let config = null, players = [], pool = [];
  let cur = 0, turnCount = 0, phase = 'idle'; // idle | question | ai | rolling | ended
  let soalAktif = '', lastAnswerLabel = null, awaiting = false;
  let session = 0, running = false, rafId = null, pollTimer = null, diceTimer = null, timers = [];
  let anim = null;
  let paused = false, lastT = 0; // jeda saat pop up konfirmasi Keluar terbuka
  let dpr = 1, W = 0, H = 0, cell = 0, bx = 0, by = 0, boardCache = null;

  function later(fn, ms) {
    const s = session;
    const run = () => {
      if (s !== session) return;
      if (paused) { timers.push(setTimeout(run, 150)); return; } // jeda: tunda sampai dilanjutkan
      fn();
    };
    const id = setTimeout(run, ms);
    timers.push(id);
    return id;
  }

  // ---------------- Membangun UI ----------------
  function build() {
    if ($('game-card-ladders')) return;

    // Kartu pilihan game
    const cardsEl = document.querySelector('.game-cards');
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'game-card';
    card.id = 'game-card-ladders';
        const ref = cardsEl.querySelector('.game-card'); // kartu Apple Snake dipakai sebagai contoh -> ukuran & tulisan otomatis sejajar
    if (ref) {
      card.className = ref.className;
      card.setAttribute('style', ref.getAttribute('style') || '');
      card.innerHTML = ref.innerHTML;
    } else {
      card.innerHTML = '<div class="game-card-img-wrap"><img src="' + IMG + '" alt=""></div><span class="game-card-name"></span>';
    }
    const cImg = card.querySelector('img'), cName = card.querySelector('.game-card-name') || card.lastElementChild;
    if (cImg) { cImg.removeAttribute('id'); cImg.removeAttribute('srcset'); cImg.src = IMG; cImg.alt = 'Snakes Ladders'; cImg.classList.add('ladders-img'); }
    if (cName) cName.textContent = 'Snakes Ladders';
    Array.from(card.attributes).forEach((a) => { if (a.name.indexOf('data-') === 0) card.removeAttribute(a.name); });
    setTimeout(() => document.querySelectorAll('.ladders-img').forEach((im) => im.classList.add('is-ready')), 3000); // pengaman
    cardsEl.appendChild(card);
    card.addEventListener('click', (e) => { e.stopPropagation(); showMy(detailEl); });

    // Layar cara bermain
    detailEl = document.createElement('div');
    detailEl.id = 'game-ladders-detail';
    detailEl.className = 'game-screen game-detail hidden';
    detailEl.innerHTML =
      '<button type="button" class="game-back-btn" id="ladders-detail-back" aria-label="Kembali">' + ICON.back + '</button>' +
      '<div class="game-detail-body">' +
        '<img class="game-detail-img ladders-img" src="' + IMG + '" alt="">' +
        '<div class="game-detail-name">Snakes Ladders</div>' +
        '<div class="game-howto"><div class="game-howto-title">CARA BERMAIN</div><ul class="game-howto-list">' +
          '<li>👥 Pilih lawan <b>AI</b> atau 2–4 pemain, lalu isi nama pemain.</li>' +
          '<li>🤟 Tiap giliran, peragakan gestur huruf/kata yang muncul di depan kamera.</li>' +
          '<li>🎲 Gestur <b>benar</b> = kocok dadu. ⏭️ Gestur <b>salah</b> = giliran dilewati.</li>' +
          '<li>🪜 Naik tangga, 🐍 turun karena ular. Dapat angka <b>6</b> = kocok lagi!</li>' +
          '<li>🏆 Yang lebih dulu sampai kotak <b>100</b> menang.</li>' +
        '</ul></div>' +
        '<button type="button" class="neu-btn btn-add game-btn-mulai" id="ladders-detail-mulai">' + ICON.play + ' Mulai</button>' +
      '</div>';
    host.appendChild(detailEl);

    // Layar atur permainan
    setupEl = document.createElement('div');
    setupEl.id = 'game-ladders-setup';
    setupEl.className = 'game-screen game-setup hidden';
    const modes = [['ai', '1 vs AI', ICON.ai], ['2', '2 Pemain', ICON.users], ['3', '3 Pemain', ICON.users], ['4', '4 Pemain', ICON.users]];
    setupEl.innerHTML =
      '<button type="button" class="game-back-btn" id="ladders-setup-back" aria-label="Kembali">' + ICON.back + '</button>' +
      '<div class="game-setup-inner">' +
        '<div class="game-setup-head"><img class="game-setup-img ladders-img" src="' + IMG + '" alt=""><div class="game-setup-title">Atur Permainan</div><div class="game-setup-sub">Snakes Ladders</div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label">Jumlah Pemain</div><div class="game-setup-chips" id="ladders-mode-chips">' +
          modes.map((m, i) => '<button type="button" class="game-chip' + (i === 0 ? ' is-active' : '') + '" data-mode="' + m[0] + '">' + m[2] + '<span>' + m[1] + '</span></button>').join('') +
        '</div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label">Nama Pemain</div><div id="ladders-names" class="ladders-names"></div></div>' +
        '<div class="game-setup-group"><div class="game-setup-label">Kategori Soal</div><div class="game-setup-chips" id="ladders-kategori-chips">' +
          '<button type="button" class="game-chip is-active" data-kategori="alfabet">' + ICON.abc + '<span>Alfabet</span></button>' +
          '<button type="button" class="game-chip" data-kategori="kata">' + ICON.kata + '<span>Kata</span></button>' +
        '</div></div>' +
        '<button type="button" class="neu-btn btn-add game-btn-mulai" id="ladders-btn-mulai">' + ICON.play + ' Mulai Main</button>' +
      '</div>';
    host.appendChild(setupEl);
    namesEl = $('ladders-names');

    // Layar bermain (overlay layar penuh)
    playEl = document.createElement('div');
    playEl.id = 'game-ladders-play';
    playEl.className = 'ladders-play hidden';
    playEl.innerHTML =
      '<div class="game-play-topbar">' +
        '<div class="game-play-brand"></div>' +
        '<div class="game-play-actions">' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="ladders-btn-atur">' + ICON.atur + '<span>Atur</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide" id="ladders-btn-lb">' + ICON.podium + '<span>Leaderboard</span></button>' +
          '<button type="button" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" id="ladders-btn-keluar">' + ICON.exit + '<span>Keluar</span></button>' +
        '</div>' +
      '</div>' +
      '<div class="game-play-grid">' +
        '<div class="game-play-field">' +
          '<div class="game-play-canvas-wrap"><canvas id="ladders-canvas"></canvas></div>' +
          '<div class="game-play-stats ladders-players" id="ladders-players"></div>' +
        '</div>' +
        '<div class="game-play-side">' +
          '<div class="game-play-camera-slot" id="game-ladders-camera-slot"><div class="ladders-cam-badge" id="ladders-cam-badge"></div></div>' +
          '<div class="game-play-question ladders-turn">' +
            '<div class="game-play-question-headrow"><span class="game-play-question-label">Giliran</span><span class="game-play-question-progress" id="ladders-turn-count">1</span></div>' +
            '<div class="game-play-question-body">' +
              '<div class="ladders-turn-name" id="ladders-turn-name"></div>' +
              '<div class="game-play-question-target" id="ladders-target">A</div>' +
              '<div class="game-play-question-feedback" id="ladders-feedback"></div>' +
              '<div class="ladders-detect">Terdeteksi: <b id="ladders-detect">—</b></div>' +
              '<div class="ladders-hint" id="ladders-hint"></div>' +
              '<button type="button" class="neu-btn ladders-btn-lewati" id="ladders-btn-lewati">' + ICON.skip + '<span>Lewati Giliran</span></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="ladders-result" class="ladders-modal hidden">' +
        '<div class="game-over-inner asta-hasil-card ladders-result-card">' +
          '<div class="ladders-result-ico">' + ICON.trophy + '</div>' +
          '<div class="game-over-title" id="ladders-result-title"></div>' +
          '<div class="game-over-score ladders-result-sub" id="ladders-result-sub"></div>' +
          '<div class="ujian-stats-row asta-hasil-stats" id="ladders-stats"></div>' +
          '<div class="ladders-rank" id="ladders-rank"></div>' +
          '<button type="button" class="game-over-btn game-over-btn--main" id="ladders-btn-ulangi">Main Lagi</button>' +
          '<div class="game-over-row">' +
            '<button type="button" class="game-over-btn" id="ladders-btn-lb2">' + ICON.podium + '<span>Leaderboard</span></button>' +
            '<button type="button" class="game-over-btn" id="ladders-btn-atur2">' + ICON.atur + '<span>Atur Ulang</span></button>' +
            '<button type="button" class="game-over-btn ladders-btn-keluar-red" id="ladders-btn-keluar2">' + ICON.exit + '<span>Keluar</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(playEl);

    canvas = $('ladders-canvas'); ctx = canvas.getContext('2d');
    playersEl = $('ladders-players'); turnNameEl = $('ladders-turn-name'); turnCountEl = $('ladders-turn-count');
    targetEl = $('ladders-target'); feedbackEl = $('ladders-feedback'); diceInfoEl = $('ladders-hint');
    detectEl = $('ladders-detect'); btnLewati = $('ladders-btn-lewati'); camSlot = $('game-ladders-camera-slot'); resultEl = $('ladders-result');
    showFace(1);
    badgeEl = $('ladders-cam-badge');
    buildDice3d();
    // Ikon dipotong dari bagian transparan di sekelilingnya supaya ukurannya sama dengan ikon game lain
    croppedIcon.then((u) => document.querySelectorAll('.ladders-img').forEach((im) => { im.src = u; im.classList.add('is-ready'); }));

    bind();
    renderNames();
  }

  // ---------------- Perpindahan layar ----------------
  function showMy(screen) {
    [detailEl, setupEl].forEach((s) => s.classList.add('hidden'));
    if (screen) screen.classList.remove('hidden');
    selectScreen.classList.toggle('hidden', !!screen);
  }
  function toSelect() {
    if (typeof tutupLb === 'function') tutupLb();
    showMy(null);
    try { if (window.AstaKandaGameUI && window.AstaKandaGameUI.showSelect) window.AstaKandaGameUI.showSelect(); } catch (e) {}
  }

  // ---------------- Atur permainan ----------------
  function renderNames() {
    const ai = setup.mode === 'ai';
    const count = ai ? 1 : parseInt(setup.mode, 10);
    namesEl.className = 'ladders-names' + (count === 1 && !ai ? ' is-single' : '');
    namesEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const row = document.createElement('label');
      row.className = 'ladders-name';
      row.innerHTML = '<span class="ladders-name-dot" style="background:' + PLAYER_COLORS[i] + '"></span>' +
        '<input type="text" maxlength="14" placeholder="Pemain ' + (i + 1) + '" autocomplete="off" value="' + esc(setup.names[i]) + '">';
      const input = row.querySelector('input');
      input.addEventListener('input', () => { setup.names[i] = input.value; });
      namesEl.appendChild(row);
    }
    if (ai) {
      const row = document.createElement('div');
      row.className = 'ladders-name is-ai';
      row.innerHTML = '<span class="ladders-name-dot" style="background:' + PLAYER_COLORS[1] + '"></span><span>AI (komputer)</span>';
      namesEl.appendChild(row);
    }
  }

  function kumpulkanSoal(kategori) {
    const sel = kategori === 'alfabet' ? '#grid-alfabet .word-card' : '#grid-kata .word-card';
    return Array.from(document.querySelectorAll(sel))
      .filter((c) => (parseInt(c.querySelector('.count').textContent, 10) || 0) > 0)
      .map((c) => c.querySelector('.label').textContent.trim())
      .filter(Boolean);
  }

  function mulaiDariSetup() {
    const ai = setup.mode === 'ai';
    const count = ai ? 1 : parseInt(setup.mode, 10);
    const names = [];
    for (let i = 0; i < count; i++) names.push((setup.names[i] || '').trim() || ('Pemain ' + (i + 1)));
    start({ mode: setup.mode, kategori: setup.kategori, names });
  }

  // Panel MULAI di kiri bawah: berjarak ~0,5 kotak dari bingkai papan
  function startPanel() {
    const n = players.length || 2;
    const pw = cell * 1.35, ph = cell * (n > 2 ? 2.0 : 1.42);
    return { px: bx - cell * 0.5 - pw, py: by + cell * 10 - ph - cell * 0.02, pw, ph };
  }
  // ---------------- Papan ----------------
  function squareCenter(n, idx) {
    if (n <= 0) { // slot bidak di dalam panel MULAI (maks. 2 kolom x 2 baris)
      const s = startPanel(), i = idx || 0, col = i % 2, row = Math.floor(i / 2);
      return { x: s.px + s.pw / 2 + (col ? 1 : -1) * cell * 0.34, y: s.py + cell * (0.98 + 0.6 * row) };
    }
    const i = n - 1, row = Math.floor(i / 10), c = i % 10, col = (row % 2 === 0) ? c : 9 - c;
    return { x: bx + col * cell + cell / 2, y: by + (9 - row) * cell + cell / 2 };
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function fitCanvas() {
    const wrap = canvas.parentElement;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = wrap.clientWidth; H = wrap.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const startCol = 1.95, pad = 12;
    cell = Math.max(20, Math.floor(Math.min((W - pad * 2) / (10 + startCol), (H - pad * 2) / 10)));
    const bw = cell * (10 + startCol), bh = cell * 10;
    bx = Math.round((W - bw) / 2 + cell * startCol);
    by = Math.round((H - bh) / 2);
    boardCache = renderBoard();
    if (dice3dEl) {
      dice3dEl.style.left = (bx + cell * 5) + 'px';
      dice3dEl.style.top = (by + cell * 5) + 'px';
      dice3dEl.style.setProperty('--s', Math.max(64, Math.round(cell * 1.25)) + 'px');
    }
  }

  function drawLadder(c, A, B) {
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const inset = cell * 0.14;
    const a = { x: A.x + ux * inset, y: A.y + uy * inset }, b = { x: B.x - ux * inset, y: B.y - uy * inset };
    const L = len - inset * 2, half = cell * 0.16;
    const n = Math.max(3, Math.round(L / (cell * 0.36)));
    const rail = (s, ox, oy, color, w) => {
      c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(a.x + nx * half * s + ox, a.y + ny * half * s + oy);
      c.lineTo(b.x + nx * half * s + ox, b.y + ny * half * s + oy);
      c.stroke();
    };
    const rung = (t, ox, oy, color, w) => {
      const px = a.x + (b.x - a.x) * t + ox, py = a.y + (b.y - a.y) * t + oy;
      c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round';
      c.beginPath(); c.moveTo(px - nx * half, py - ny * half); c.lineTo(px + nx * half, py + ny * half); c.stroke();
    };
    [-1, 1].forEach((s) => rail(s, 2.5, 3.5, 'rgba(15,23,42,.22)', cell * 0.1));              // bayangan
    for (let k = 0; k < n; k++) rung((k + 0.5) / n, 2.5, 3.5, 'rgba(15,23,42,.2)', cell * 0.08);
    [-1, 1].forEach((s) => rail(s, 0, 0, '#5b2c0c', cell * 0.1));                              // rel: tepi gelap
    [-1, 1].forEach((s) => rail(s, 0, 0, '#c9812f', cell * 0.07));                             // kayu
    [-1, 1].forEach((s) => rail(s, -cell * 0.012, -cell * 0.012, '#f3c27a', cell * 0.022));    // kilau
    for (let k = 0; k < n; k++) {                                                              // anak tangga
      const t = (k + 0.5) / n;
      rung(t, 0, 0, '#5b2c0c', cell * 0.08);
      rung(t, 0, 0, '#e8a64f', cell * 0.055);
      rung(t, -cell * 0.008, -cell * 0.01, '#fbd99b', cell * 0.018);
      [-1, 1].forEach((s) => {
        const px = a.x + (b.x - a.x) * t + nx * half * s, py = a.y + (b.y - a.y) * t + ny * half * s;
        c.fillStyle = '#6b3410'; c.beginPath(); c.arc(px, py, cell * 0.02, 0, TAU); c.fill();
      });
    }
  }

  function drawSnake(c, A, B, pal, seed) {
    const pts = snakePath(A, B, seed), N = pts.length - 1;
    const base = pal[0], light = pal[1], dark = shade(base, -0.5);
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const seg = (ox, oy, color, extra, k) => {
      c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = 0; i < N; i++) {
        c.lineWidth = Math.max(1, (pts[i].d + pts[i + 1].d) * k + extra);
        c.beginPath(); c.moveTo(pts[i].x + ox, pts[i].y + oy); c.lineTo(pts[i + 1].x + ox, pts[i + 1].y + oy); c.stroke();
      }
    };
    const ol = Math.max(3, cell * 0.075);          // tebal garis tepi
    seg(3, 4, 'rgba(15,23,42,.28)', ol * 2.4, 1);  // bayangan
    seg(0, 0, 'rgba(255,255,255,.92)', ol * 2, 1); // tepi putih: ular menonjol dari papan & tangga
    seg(0, 0, dark, ol, 1);                        // garis tepi gelap
    seg(0, 0, base, 0, 1);                         // badan
    seg(0, 0, shade(base, 0.22), 0, 0.6);          // punggung lebih terang

    // pola belah ketupat sepanjang punggung (lebih besar & renggang agar rapi)
    const step = Math.max(8, Math.round(N / (len / (cell * 0.4))));
    for (let i = step; i < N - 6; i += step) {
      const a = pts[i], b = pts[i + 2], ang = Math.atan2(b.y - a.y, b.x - a.x);
      c.save(); c.translate(a.x, a.y); c.rotate(ang);
      c.fillStyle = shade(base, -0.34); c.beginPath(); c.moveTo(a.d * 1.25, 0); c.lineTo(0, -a.d * 0.9); c.lineTo(-a.d * 1.25, 0); c.lineTo(0, a.d * 0.9); c.closePath(); c.fill();
      c.fillStyle = light; c.beginPath(); c.moveTo(a.d * 0.6, 0); c.lineTo(0, -a.d * 0.42); c.lineTo(-a.d * 0.6, 0); c.lineTo(0, a.d * 0.42); c.closePath(); c.fill();
      c.restore();
    }
    seg(-1.2, -1.6, 'rgba(255,255,255,.45)', 0, 0.12); // kilau memanjang

    // kepala: lebih besar dari badan, moncong membulat, mata besar, lidah bercabang
    const p0 = pts[0], p1 = pts[5], ang0 = Math.atan2(p0.y - p1.y, p0.x - p1.x), hr = cell * 0.25;
    c.save(); c.translate(p0.x, p0.y); c.rotate(ang0);
    c.strokeStyle = '#e11d48'; c.lineWidth = Math.max(2, cell * 0.045); c.lineCap = 'round'; // lidah
    c.beginPath();
    c.moveTo(hr * 1.45, 0); c.lineTo(hr * 2.0, 0);
    c.moveTo(hr * 2.0, 0); c.lineTo(hr * 2.4, -hr * 0.28);
    c.moveTo(hr * 2.0, 0); c.lineTo(hr * 2.4, hr * 0.28);
    c.stroke();
    const head = () => {
      c.beginPath(); c.moveTo(hr * 1.5, 0);
      c.bezierCurveTo(hr * 1.5, -hr * 0.62, hr * 0.8, -hr * 1.12, -hr * 0.3, -hr * 1.0);
      c.bezierCurveTo(-hr * 1.0, -hr * 0.85, -hr * 1.0, hr * 0.85, -hr * 0.3, hr * 1.0);
      c.bezierCurveTo(hr * 0.8, hr * 1.12, hr * 1.5, hr * 0.62, hr * 1.5, 0);
      c.closePath();
    };
    head(); c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = ol * 2; c.lineJoin = 'round'; c.stroke(); // tepi putih
    head(); c.strokeStyle = dark; c.lineWidth = ol; c.stroke();
    const hg = c.createRadialGradient(hr * 0.2, -hr * 0.5, hr * 0.1, 0, 0, hr * 1.7);
    hg.addColorStop(0, shade(base, 0.45)); hg.addColorStop(0.6, base); hg.addColorStop(1, shade(base, -0.25));
    c.fillStyle = hg; head(); c.fill();
    c.fillStyle = light; c.globalAlpha = 0.5; // dagu terang
    c.beginPath(); c.ellipse(hr * 0.8, 0, hr * 0.55, hr * 0.38, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
    c.strokeStyle = dark; c.lineWidth = Math.max(1.2, cell * 0.016); c.beginPath(); // senyum
    c.moveTo(hr * 1.15, -hr * 0.34); c.quadraticCurveTo(hr * 1.45, 0, hr * 1.15, hr * 0.34); c.stroke();
    c.fillStyle = dark;
    [-1, 1].forEach((s) => { c.beginPath(); c.arc(hr * 1.28, s * hr * 0.2, hr * 0.07, 0, TAU); c.fill(); }); // lubang hidung
    [-1, 1].forEach((s) => { // mata besar bersorot
      c.fillStyle = '#fff'; c.beginPath(); c.arc(hr * 0.38, s * hr * 0.58, hr * 0.4, 0, TAU); c.fill();
      c.strokeStyle = dark; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = '#0f172a'; c.beginPath(); c.arc(hr * 0.52, s * hr * 0.58, hr * 0.22, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(hr * 0.6, s * hr * 0.5, hr * 0.085, 0, TAU); c.fill();
    });
    c.restore();
  }

  function renderBoard() {
    const off = document.createElement('canvas');
    off.width = Math.round(W * dpr); off.height = Math.round(H * dpr);
    const c = off.getContext('2d');
    c.scale(dpr, dpr);

    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#cfe9ff'); bg.addColorStop(0.55, '#e4f4ff'); bg.addColorStop(1, '#ddf2c6');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);

    // bingkai papan
    c.save();
    c.shadowColor = 'rgba(15,23,42,.3)'; c.shadowBlur = 20; c.shadowOffsetY = 7;
    const fr = c.createLinearGradient(bx, by, bx + cell * 10, by + cell * 10);
    fr.addColorStop(0, '#6366f1'); fr.addColorStop(0.5, '#3b82f6'); fr.addColorStop(1, '#14b8a6');
    c.fillStyle = fr; rr(c, bx - 11, by - 11, cell * 10 + 22, cell * 10 + 22, 20); c.fill();
    c.restore();
    c.fillStyle = '#ffffff'; rr(c, bx - 4, by - 4, cell * 10 + 8, cell * 10 + 8, 14); c.fill();

    // kotak (kaki/puncak tangga = hijau, kepala ular = merah muda, ekor ular = oranye muda)
    const ladderTop = {}; Object.keys(LADDERS).forEach((k) => { ladderTop[LADDERS[k]] = true; });
    const snakeTail = {}; Object.keys(SNAKES).forEach((k) => { snakeTail[SNAKES[k]] = true; });
    c.save();
    rr(c, bx, by, cell * 10, cell * 10, 11); c.clip();
    for (let n = 1; n <= 100; n++) {
      const p = squareCenter(n), x = p.x - cell / 2, y = p.y - cell / 2;
      const i = n - 1, row = Math.floor(i / 10), col = (row % 2 === 0) ? i % 10 : 9 - (i % 10);
      if (n === 100) {
        const g = c.createLinearGradient(x, y, x + cell, y + cell);
        g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#f59e0b'); c.fillStyle = g;
      } else c.fillStyle = ((row + col) % 2 === 0) ? '#fff6dc' : '#e3f2ff';
      c.fillRect(x, y, cell, cell);
      if (LADDERS[n]) { c.fillStyle = 'rgba(34,197,94,.30)'; c.fillRect(x, y, cell, cell); }
      else if (ladderTop[n]) { c.fillStyle = 'rgba(34,197,94,.16)'; c.fillRect(x, y, cell, cell); }
      if (SNAKES[n]) { c.fillStyle = 'rgba(244,63,94,.24)'; c.fillRect(x, y, cell, cell); }
      else if (snakeTail[n]) { c.fillStyle = 'rgba(251,146,60,.20)'; c.fillRect(x, y, cell, cell); }
      c.strokeStyle = 'rgba(100,116,139,.22)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }
    c.restore();

    // panel MULAI: berjarak dari bingkai papan
    const sp = startPanel();
    const pg = c.createLinearGradient(sp.px, sp.py, sp.px, sp.py + sp.ph);
    pg.addColorStop(0, '#e6f0ff'); pg.addColorStop(1, '#bfd8ff');
    c.save();
    c.shadowColor = 'rgba(37,99,235,.25)'; c.shadowBlur = 10; c.shadowOffsetY = 3;
    c.fillStyle = pg; rr(c, sp.px, sp.py, sp.pw, sp.ph, 14); c.fill();
    c.restore();
    c.strokeStyle = '#7fb0f5'; c.lineWidth = 2.5; c.setLineDash([7, 5]); rr(c, sp.px, sp.py, sp.pw, sp.ph, 14); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#1d4ed8'; c.font = '800 ' + Math.max(10, cell * 0.2) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('MULAI', sp.px + sp.pw / 2, sp.py + cell * 0.28);

    // tangga dulu, lalu ular di atasnya
    Object.keys(LADDERS).forEach((k) => drawLadder(c, squareCenter(+k), squareCenter(LADDERS[k])));
    Object.keys(SNAKES).forEach((k, i) => drawSnake(c, squareCenter(+k), squareCenter(SNAKES[k]), SNAKE_COLORS[i % SNAKE_COLORS.length], snakeSeed(k)));

    // Bentuk semua ular & tangga (titik + jari-jari) untuk mencari sudut kotak yang bebas bagi angka
    const obst = [];
    Object.keys(LADDERS).forEach((k) => {
      const A = squareCenter(+k), B = squareCenter(LADDERS[k]), m = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) / (cell * 0.1));
      for (let i = 0; i <= m; i++) obst.push({ x: A.x + (B.x - A.x) * i / m, y: A.y + (B.y - A.y) * i / m, r: cell * 0.26 });
    });
    Object.keys(SNAKES).forEach((k) => {
      const A = squareCenter(+k), pts = snakePath(A, squareCenter(SNAKES[k]), snakeSeed(k));
      pts.forEach((p) => obst.push({ x: p.x, y: p.y, r: p.d + cell * 0.09 }));
      const a = Math.atan2(pts[0].y - pts[4].y, pts[0].x - pts[4].x), ux = Math.cos(a), uy = Math.sin(a);
      obst.push({ x: A.x, y: A.y, r: cell * 0.32 }, { x: A.x + ux * cell * 0.34, y: A.y + uy * cell * 0.34, r: cell * 0.22 }, { x: A.x + ux * cell * 0.58, y: A.y + uy * cell * 0.58, r: cell * 0.09 });
    });
    const clearance = (x, y, w, h) => {
      let m = 1e9;
      for (let i = 0; i < obst.length; i++) {
        const o = obst[i], dx = Math.max(x - o.x, 0, o.x - (x + w)), dy = Math.max(y - o.y, 0, o.y - (y + h));
        const d = Math.hypot(dx, dy) - o.r;
        if (d < m) m = d;
      }
      return m;
    };

    // angka kotak: di sudut yang bebas (kiri-atas, lalu kanan-atas, kiri-bawah, kanan-bawah) -> tidak menutupi/tertutupi
    const fs = Math.max(9, cell * 0.19);
    c.font = '800 ' + fs + 'px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'top'; c.lineJoin = 'round';
    for (let n = 1; n <= 100; n++) {
      const p = squareCenter(n), x0 = p.x - cell / 2, y0 = p.y - cell / 2;
      const label = String(n), tw = c.measureText(label).width + cell * 0.03, th = fs * 1.15, mg = cell * 0.05;
      const spots = [[x0 + mg, y0 + mg * 0.8], [x0 + cell - mg - tw, y0 + mg * 0.8], [x0 + mg, y0 + cell - mg * 0.8 - th], [x0 + cell - mg - tw, y0 + cell - mg * 0.8 - th]];
      let best = spots[0], bestClear = -1e9;
      for (let s = 0; s < spots.length; s++) {
        const cl = clearance(spots[s][0], spots[s][1], tw, th);
        if (cl >= cell * 0.02) { best = spots[s]; break; }
        if (cl > bestClear) { bestClear = cl; best = spots[s]; }
      }
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.92)'; c.strokeText(label, best[0] + cell * 0.015, best[1]);
      c.fillStyle = n === 100 ? '#92400e' : '#334155'; c.fillText(label, best[0] + cell * 0.015, best[1]);
    }

    // bintang & tulisan FINISH di kotak 100
    const f = squareCenter(100);
    c.save(); c.translate(f.x + cell * 0.05, f.y + cell * 0.02);
    c.fillStyle = '#fff7d1'; c.strokeStyle = '#b45309'; c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k < 10; k++) { const r = k % 2 === 0 ? cell * 0.2 : cell * 0.09, a = -Math.PI / 2 + k * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.stroke(); c.restore();
    c.fillStyle = '#92400e'; c.font = '800 ' + Math.max(8, cell * 0.16) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'bottom';
    c.fillText('FINISH', f.x, f.y + cell / 2 - 3);
    return off;
  }

  function drawPawn(c, p, idx, aktif, now) {
    const gx = p.vx + (p.ox || 0) * cell, gy = p.vy + (p.oy || 0) * cell + cell * 0.3; // titik pijak -> pion berada di tengah kotak
    const lift = p.hop + (aktif ? Math.sin(now / 240) * cell * 0.012 : 0);
    const sh = Math.max(0.5, 1 - p.hop / (cell * 0.5));
    c.fillStyle = 'rgba(15,23,42,.3)';
    c.beginPath(); c.ellipse(gx, gy + cell * 0.012, cell * 0.23 * sh, cell * 0.07 * sh, 0, 0, TAU); c.fill();

    c.save();
    c.translate(gx, gy - lift);
    if (p.tilt) c.rotate(p.tilt);
    const col = p.warna, dark = shade(col, -0.55), mid = shade(col, -0.2), lite = shade(col, 0.55);
    const bw = cell * 0.2, bh = cell * 0.34, nw = cell * 0.075, hr = cell * 0.15, hy = -bh - hr * 0.72;

    if (aktif) { // cincin cahaya giliran
      const pulse = 0.5 + 0.5 * Math.sin(now / 220), k = 1.2 + 0.14 * pulse;
      c.strokeStyle = col; c.globalAlpha = 0.3 + 0.4 * pulse; c.lineWidth = 3;
      c.beginPath(); c.ellipse(0, 2, bw * k, bw * 0.4 * k, 0, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    }
    const bodyPath = () => {
      c.beginPath();
      c.moveTo(-bw, 0);
      c.quadraticCurveTo(-bw * 0.8, -bh * 0.55, -nw, -bh);
      c.lineTo(nw, -bh);
      c.quadraticCurveTo(bw * 0.8, -bh * 0.55, bw, 0);
      c.quadraticCurveTo(0, bw * 0.7, -bw, 0);
      c.closePath();
    };
    // garis tepi putih supaya bidak menonjol dari papan
    c.lineJoin = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = 4.5;
    c.beginPath(); c.ellipse(0, 0, bw * 1.1, bw * 0.38, 0, 0, TAU); c.stroke();
    bodyPath(); c.stroke();
    c.beginPath(); c.arc(0, hy, hr, 0, TAU); c.stroke();

    // alas
    c.fillStyle = dark; c.beginPath(); c.ellipse(0, 0, bw * 1.1, bw * 0.38, 0, 0, TAU); c.fill();
    c.fillStyle = mid; c.beginPath(); c.ellipse(0, -bw * 0.06, bw * 0.98, bw * 0.3, 0, 0, TAU); c.fill();
    // badan
    const g = c.createLinearGradient(-bw, 0, bw, 0);
    g.addColorStop(0, lite); g.addColorStop(0.4, col); g.addColorStop(1, dark);
    c.fillStyle = g; bodyPath(); c.fill();
    c.lineWidth = 1.4; c.strokeStyle = dark; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.3)';
    c.beginPath(); c.ellipse(-bw * 0.5, -bh * 0.5, bw * 0.1, bh * 0.28, 0.2, 0, TAU); c.fill();
    // kerah
    c.fillStyle = lite; c.strokeStyle = dark; c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(0, -bh, nw * 2, nw * 0.7, 0, 0, TAU); c.fill(); c.stroke();

    // kepala bola
    const hg = c.createRadialGradient(-hr * 0.35, hy - hr * 0.4, hr * 0.1, 0, hy, hr * 1.1);
    hg.addColorStop(0, shade(col, 0.7)); hg.addColorStop(0.5, col); hg.addColorStop(1, dark);
    c.fillStyle = hg; c.beginPath(); c.arc(0, hy, hr, 0, TAU); c.fill();
    c.lineWidth = 1.4; c.strokeStyle = dark; c.stroke();

    if (p.ai) { // robot: antena bercahaya + visor
      c.strokeStyle = dark; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, hy - hr); c.lineTo(0, hy - hr - cell * 0.07); c.stroke();
      c.save(); c.shadowColor = '#67e8f9'; c.shadowBlur = 6;
      c.fillStyle = '#67e8f9'; c.beginPath(); c.arc(0, hy - hr - cell * 0.085, cell * 0.022, 0, TAU); c.fill(); c.restore();
      c.fillStyle = '#0f172a'; rr(c, -hr * 0.78, hy - hr * 0.3, hr * 1.56, hr * 0.62, hr * 0.28); c.fill();
      c.save(); c.shadowColor = '#22d3ee'; c.shadowBlur = 5; c.fillStyle = '#22d3ee';
      [-1, 1].forEach((s) => { c.beginPath(); c.arc(s * hr * 0.33, hy, hr * 0.15, 0, TAU); c.fill(); }); c.restore();
    } else { // wajah ramah
      [-1, 1].forEach((s) => {
        c.fillStyle = 'rgba(244,114,182,.55)'; c.beginPath(); c.ellipse(s * hr * 0.62, hy + hr * 0.3, hr * 0.2, hr * 0.13, 0, 0, TAU); c.fill();
        c.fillStyle = '#0f172a'; c.beginPath(); c.ellipse(s * hr * 0.36, hy - hr * 0.05, hr * 0.14, hr * 0.2, 0, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(s * hr * 0.32, hy - hr * 0.13, hr * 0.06, 0, TAU); c.fill();
      });
      c.strokeStyle = '#0f172a'; c.lineWidth = Math.max(1.2, cell * 0.014); c.lineCap = 'round';
      c.beginPath(); c.arc(0, hy + hr * 0.18, hr * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,.65)';
    c.beginPath(); c.ellipse(-hr * 0.38, hy - hr * 0.55, hr * 0.28, hr * 0.15, -0.55, 0, TAU); c.fill();

    // lencana nomor pemain di badan (AI = "AI")
    const by2 = -bh * 0.42, br = cell * 0.085;
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, by2, br, 0, TAU); c.fill();
    c.lineWidth = 1.6; c.strokeStyle = dark; c.stroke();
    c.fillStyle = dark; c.font = '800 ' + Math.round(br * (p.ai ? 1.05 : 1.4)) + 'px ' + FONT;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(p.ai ? 'AI' : String(idx + 1), 0, by2 + 0.5);
    c.restore();
  }

  function frame(now) {
    if (!running) return;
    if (paused && anim && anim.t0 !== null) anim.t0 += now - (lastT || now); // bekukan waktu animasi bidak
    lastT = now;
    stepAnim(now);
    players.forEach((p) => {
      let tx = 0, ty = 0;
      if (p.pos > 0 && !(anim && anim.pl === p)) {
        const sh = players.filter((q) => q.pos === p.pos && !(anim && anim.pl === q));
        if (sh.length > 1) { const o = SHARE[sh.length - 2][sh.indexOf(p)]; tx = o[0]; ty = o[1]; }
      }
      p.ox += (tx - p.ox) * 0.2; p.oy += (ty - p.oy) * 0.2;
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (boardCache) ctx.drawImage(boardCache, 0, 0, W, H);
    players.forEach((p, i) => { if (i !== cur) drawPawn(ctx, p, i, false, now); });
    if (players[cur]) drawPawn(ctx, players[cur], cur, phase !== 'ended', now);
    rafId = requestAnimationFrame(frame);
  }

  // ---------------- Animasi bidak ----------------
  function animateMove(pl, segs, onSeg, done) {
    anim = { pl, segs, onSeg, done, i: 0, t0: null, started: -1 };
  }
  function stepAnim(now) {
    if (!anim) return;
    const a = anim, s = a.segs[a.i];
    if (a.t0 === null) a.t0 = now;
    if (a.started !== a.i) { a.started = a.i; if (a.onSeg) a.onSeg(a.i); }
    const p = Math.max(0, Math.min(1, (now - a.t0) / s.dur)), e = s.ease(p), pt = s.pos(e);
    a.pl.vx = pt.x; a.pl.vy = pt.y;
    a.pl.hop = s.hop ? s.hop(e) : 0;
    a.pl.tilt = s.tilt ? s.tilt(e) : 0;
    if (p >= 1) {
      a.t0 += s.dur; // tidak ada selisih waktu antar-langkah -> ritme tetap konsisten
      a.i += 1;
      if (a.i >= a.segs.length) { a.pl.hop = 0; a.pl.tilt = 0; anim = null; if (a.done) a.done(); }
    }
  }

    // ---------------- Pembantu: warna, easing, jalur ular, gambar, brand, dadu 3D ----------------
  function shade(hex, amt) { // amt -1 (gelap) .. 1 (terang)
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  const easeSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const smooth = (t) => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutSine = (t) => Math.sin(t * Math.PI / 2);
  const holdIO = (t) => (t < 0.12 ? 0 : easeIO((t - 0.12) / 0.88)); // jeda singkat, lalu naik/turun mulus
  const SNAKE_KEYS = Object.keys(SNAKES).map(Number);
  const snakeSeed = (k) => SNAKE_KEYS.indexOf(+k) * 1.7;

  /** Titik pada tubuh ular (t 0..1). Dipakai untuk MENGGAMBAR ular dan untuk jalur bidak saat meluncur turun. */
  function snakePoint(A, B, seed, t) {
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const waves = Math.max(1, len / (cell * 1.9)), amp = cell * 0.15;
    const env = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.5); // 0 di kepala & ekor -> pas di tengah kotak
    const off = Math.sin(t * waves * Math.PI * 2 + seed) * amp * env;
    return { x: A.x + dx * t + nx * off, y: A.y + dy * t + ny * off };
  }
  function snakePath(A, B, seed) {
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const N = Math.max(60, Math.round(len / (cell * 0.04)));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = snakePoint(A, B, seed, t);
      const g = t < 0.16 ? 0.82 + 0.18 * (t / 0.16) : 1 - 0.78 * Math.pow((t - 0.16) / 0.84, 1.25); // leher ramping -> badan tebal -> ekor runcing
      p.d = cell * (0.17 * g + 0.025); // jari-jari tubuh
      pts.push(p);
    }
    return pts;
  }

  // Satu langkah = satu kotak: gerak lurus berkecepatan konstan + lompatan kecil. Durasi sama untuk tiap kotak.
  function segStep(from, sq, last) { // satu langkah = satu kotak, kecepatan konstan + lompatan kecil
    const to = squareCenter(sq);
    const dist = Math.hypot(to.x - from.x, to.y - from.y) / cell;
    return {
      dur: STEP_MS * Math.min(2.2, Math.max(1, dist)),
      ease: last ? easeOutSine : (t) => t, // langkah terakhir melambat halus
      pos: (t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }),
      hop: (t) => Math.sin(t * Math.PI) * cell * 0.24,
      to,
    };
  }

  // Segmen mengikuti jalur titik-titik dengan kecepatan konstan terhadap panjang busur (mulus)
  function pathSeg(pts, dur, ease, hopFn, tiltFn) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const L = cum[cum.length - 1] || 1;
    const at = (e) => {
      const d = Math.max(0, Math.min(1, e)) * L;
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
      const k = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
      return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * k, y: pts[lo].y + (pts[hi].y - pts[lo].y) * k };
    };
    return { dur, ease, pos: at, hop: hopFn || (() => 0), tilt: tiltFn ? (e) => tiltFn(e, at) : undefined };
  }

  function segLadder(k) { // naik tangga: mengikuti garis tangga, goyangan kecil mengikuti anak tangga
    const A = squareCenter(k), B = squareCenter(LADDERS[k]);
    const len = Math.hypot(B.x - A.x, B.y - A.y), rungs = Math.max(3, Math.round(len / (cell * 0.36)));
    return pathSeg([A, B], Math.max(1400, (len / cell) * 230), holdIO,
      (e) => Math.abs(Math.sin(e * rungs * Math.PI)) * cell * 0.03,
      (e) => Math.sin(e * rungs * Math.PI) * 0.04 * Math.sin(Math.PI * e));
  }

  function segSnake(k) { // turun lewat ular: meluncur mengikuti lekuk tubuh (jalur sama dengan gambar ular)
    const A = squareCenter(k), B = squareCenter(SNAKES[k]);
    const pts = snakePath(A, B, snakeSeed(k)).map((p) => ({ x: p.x, y: p.y }));
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return pathSeg(pts, Math.max(1600, (L / cell) * 250), holdIO, () => 0, (e, at) => {
      const a = at(Math.max(0, e - 0.03)), b = at(Math.min(1, e + 0.03));
      const dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1;
      return (dx / m) * 0.3 * Math.sin(Math.PI * e); // bidak condong ke arah gerak
    });
  }

  function cropImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth, h = img.naturalHeight;
          const sc = Math.min(1, 512 / Math.max(w, h)), sw = Math.max(1, Math.round(w * sc)), sh = Math.max(1, Math.round(h * sc));
          const c = document.createElement('canvas'); c.width = sw; c.height = sh;
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, sw, sh);
          const d = g.getImageData(0, 0, sw, sh).data;
          const bgT = d[3] < 10, br = d[0], bgc = d[1], bb = d[2]; // piksel sudut = latar
          let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
          for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
            const i = (y * sw + x) * 4;
            const isi = bgT ? d[i + 3] > 24 : (d[i + 3] > 24 && (Math.abs(d[i] - br) + Math.abs(d[i + 1] - bgc) + Math.abs(d[i + 2] - bb)) > 48);
            if (isi) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          }
          if (x1 < 0) return resolve(src);
          const PAD = 0.05; // sisa ruang di tepi (ubah jika ikon terasa terlalu besar/kecil dibanding apple/dino)
          const px = Math.round((x1 - x0 + 1) * PAD), py = Math.round((y1 - y0 + 1) * PAD);
          x0 = Math.max(0, x0 - px); y0 = Math.max(0, y0 - py); x1 = Math.min(sw - 1, x1 + px); y1 = Math.min(sh - 1, y1 + py);
          const k = 1 / sc, cw = Math.round((x1 - x0 + 1) * k), ch = Math.round((y1 - y0 + 1) * k);
          const out = Math.min(1, 320 / Math.max(cw, ch));
          const o = document.createElement('canvas');
          o.width = Math.max(1, Math.round(cw * out)); o.height = Math.max(1, Math.round(ch * out));
          o.getContext('2d').drawImage(img, x0 * k, y0 * k, cw, ch, 0, 0, o.width, o.height);
          resolve(o.toDataURL('image/png'));
        } catch (e) { resolve(src); }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  // Logo + tulisan BELAJAR BAHASA ISYARAT & BERMAIN: elemen aslinya dipindah ke topbar (sama persis seperti Apple/Dino)
  function pindahBrand(masuk, slot) {
    const brand = slot || (playEl && playEl.querySelector('.game-play-brand'));
    const header = document.querySelector('.app-header');
    const logoRow = document.querySelector('.logo-row'), tag = $('tagline');
    if (!brand || !header || !logoRow || !tag) return;
    if (masuk) { brand.appendChild(logoRow); brand.appendChild(tag); brandHome = true; }
    else if (brandHome) { header.appendChild(logoRow); header.appendChild(tag); brandHome = false; }
  }

  // Keterangan pemain di pojok kiri bawah kamera
  function updateBadge(pl) {
    if (!badgeEl) return;
    badgeEl.style.setProperty('--pc', pl.warna);
    badgeEl.innerHTML = '<span class="ladders-cam-ico">' + (pl.ai ? ICON.robot : ICON.person) + '</span>' +
      '<span class="ladders-cam-txt"><small>' + (pl.ai ? 'GILIRAN AI' : 'GILIRAN') + '</small><b>' + esc(pl.nama) + '</b></span>';
  }

  // Dadu 3D di tengah papan
  function buildDice3d() {
    const wrap = canvas.parentElement;
    const faces = [1, 2, 3, 4, 5, 6].map((v) => '<div class="ladders-face f' + v + '">' +
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => '<i class="' + (DICE_PIPS[v].indexOf(i) >= 0 ? 'on' + (v === 1 ? ' red' : '') : '') + '"></i>').join('') + '</div>').join('');
    wrap.insertAdjacentHTML('beforeend',
      '<div class="ladders-dice3d" id="ladders-dice3d"><div class="ladders-dice3d-stage"><div class="ladders-cube" id="ladders-cube">' + faces + '</div></div>' +
      '<div class="ladders-dice3d-shadow" id="ladders-dice3d-shadow"></div><div class="ladders-dice3d-value" id="ladders-dice3d-value"></div></div>');
    dice3dEl = $('ladders-dice3d'); cubeEl = $('ladders-cube'); cubeShadowEl = $('ladders-dice3d-shadow'); cubeValueEl = $('ladders-dice3d-value');
  }

  function rollCube(v, onEnd) {
    const rot = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] }[v]; // putaran akhir agar angka v menghadap depan
    const fx = rot[0], fy = rot[1], h = Math.round(cell * 1.7);
    const T = (y, x, yy, z, s) => 'translateY(' + y + 'px) rotateX(' + x + 'deg) rotateY(' + yy + 'deg) rotateZ(' + z + 'deg) scale(' + s + ')';
    if (cubeAnim) cubeAnim.cancel();
    if (shadowAnim) shadowAnim.cancel();
    cubeValueEl.classList.remove('show');
    dice3dEl.classList.add('show');
    if (!cubeEl.animate) { cubeEl.style.transform = T(0, fx, fy, 0, 1); later(onEnd, 800); return; }
    cubeAnim = cubeEl.animate([
      { transform: T(-h, 0, 0, -25, 0.5), offset: 0, easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: T(0, fx + 360, fy + 520, 12, 1.06), offset: 0.42, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: T(-h * 0.28, fx + 520, fy + 760, -7, 1.08), offset: 0.6, easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: T(0, fx + 640, fy + 940, 5, 1), offset: 0.78, easing: 'cubic-bezier(.2,.6,.4,1)' },
      { transform: T(-h * 0.07, fx + 700, fy + 1040, -2, 1.02), offset: 0.9, easing: 'cubic-bezier(.5,0,.9,.5)' },
      { transform: T(0, fx + 720, fy + 1080, 0, 1), offset: 1 },
    ], { duration: 1400, fill: 'forwards' });
    shadowAnim = cubeShadowEl.animate([
      { transform: 'scale(.3)', opacity: 0.05, offset: 0 }, { transform: 'scale(1)', opacity: 0.4, offset: 0.42 },
      { transform: 'scale(.72)', opacity: 0.24, offset: 0.6 }, { transform: 'scale(1)', opacity: 0.4, offset: 0.78 },
      { transform: 'scale(.9)', opacity: 0.3, offset: 0.9 }, { transform: 'scale(1)', opacity: 0.4, offset: 1 },
    ], { duration: 1400, fill: 'forwards' });
    cubeAnim.onfinish = () => {
      cubeValueEl.textContent = (players[cur] ? players[cur].nama + ' dapat ' : '') + v;
      cubeValueEl.classList.add('show');
      onEnd();
    };
  }

  const HINT_ICON = {
    gesture: SV + '><path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v4.5"/><path d="M12 10.5V5a1.5 1.5 0 0 1 3 0v5.5"/><path d="M15 10.5V6.5a1.5 1.5 0 0 1 3 0V13c0 4.4-3 7-6.5 7-2.2 0-3.6-.8-4.8-2.3l-3-4a1.4 1.4 0 0 1 2.1-1.8L8 14"/></svg>',
    ai: ICON.robot,
    roll: SV + '><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>',
    skip: SV + '><path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/></svg>',
    up: SV + '><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>',
    down: SV + '><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>',
    info: ICON.check,
  };
  function setHint(text, kind) {
    diceInfoEl.className = 'ladders-hint is-' + kind;
    diceInfoEl.innerHTML = '<span class="ladders-hint-ico">' + (HINT_ICON[kind] || HINT_ICON.info) + '</span><span class="ladders-hint-txt">' + esc(text) + '</span>';
  }

  // ---------------- Dadu ----------------
  function showFace(v) { // dadu kecil sudah dihapus dari panel; dibiarkan aman dipanggil
    if (!diceEl) return;
    const dots = DICE_PIPS[v] || [];
    Array.from(diceEl.children).forEach((d, i) => d.classList.toggle('on', dots.indexOf(i) >= 0));
  }

  function rollDice(cb) {
    const final = 1 + Math.floor(Math.random() * 6), s = session;
    rollCube(final, () => { // dadu 3D di tengah papan
      if (s !== session) return;
      later(() => { dice3dEl.classList.remove('show'); cb(final); }, 650); // jeda singkat, lalu bidak bergerak
    });
  }

  // ---------------- Alur permainan ----------------
  function feedback(html, ok) {
    feedbackEl.innerHTML = html;
    feedbackEl.className = 'game-play-question-feedback' + (ok === true ? ' is-correct' : ok === false ? ' is-wrong' : '');
  }

  function renderPlayers() {
    playersEl.innerHTML = players.map((p, i) =>
      '<div class="ladders-player' + (i === cur && phase !== 'ended' ? ' is-active' : '') + '" style="--pc:' + p.warna + '">' +
        '<span class="ladders-player-dot"></span><span class="ladders-player-info"><b>' + esc(p.nama) + '</b><small>' +
        (p.pos ? 'Kotak ' + p.pos : 'Belum mulai') + '</small></span></div>').join('');
  }

  function pilihSoal() {
    if (pool.length === 1) return pool[0];
    let s;
    do { s = pool[Math.floor(Math.random() * pool.length)]; } while (s === soalAktif);
    return s;
  }

  function mulaiGiliran() {
    if (phase === 'ended') return;
    const pl = players[cur];
    turnCount += 1;
    soalAktif = pilihSoal();
    phase = pl.ai ? 'ai' : 'question';
    turnNameEl.innerHTML = '<span class="ladders-turn-dot" style="background:' + pl.warna + '"></span>' + esc(pl.nama);
    turnCountEl.textContent = turnCount;
    targetEl.textContent = soalAktif;
    feedback('', null);
    setHint(pl.ai ? 'AI sedang berpikir...' : 'Peragakan gestur untuk mengocok dadu', pl.ai ? 'ai' : 'gesture');
    detectEl.textContent = '—';
    btnLewati.disabled = !!pl.ai;
    updateBadge(pl);
    renderPlayers();
    if (pl.ai) later(() => jawab(Math.random() < AI_CHANCE, false), 1500);
  }

  function jawab(benar, lewat) {
    if (phase === 'ended') return;
    phase = 'rolling';
    btnLewati.disabled = true;
    if (benar) {
      feedback(ICON.check + ' Benar!', true);
      later(() => lempar(false), 500);
    } else {
      feedback(ICON.cross + (lewat ? ' Giliran dilewati' : ' Salah — giliran dilewati'), false);
      setHint('Giliran berpindah ke pemain berikutnya', 'skip');
      later(giliranBerikut, 1200);
    }
  }

  function lempar(bonus) {
    if (phase === 'ended') return;
    phase = 'rolling';
    const pl = players[cur];
    setHint(bonus ? 'Dapat 6! Kocok lagi...' : 'Mengocok dadu...', 'roll');
    rollDice((v) => {
      setHint(pl.nama + ' dapat angka ' + v, 'info');
      gerak(pl, v, () => setelahGerak(pl, v));
    });
  }

  function gerak(pl, v, done) {
    const squares = [];
    let target = pl.pos + v;
    if (target <= 100) {
      for (let s = pl.pos + 1; s <= target; s++) squares.push(s);
    } else { // melebihi 100: memantul mundur
      for (let s = pl.pos + 1; s <= 100; s++) squares.push(s);
      const mundur = target - 100;
      for (let k = 1; k <= mundur; k++) squares.push(100 - k);
      target = 100 - mundur;
    }
    const segs = [];
    let from = { x: pl.vx, y: pl.vy };
    squares.forEach((sq, i) => { const s = segStep(from, sq, i === squares.length - 1); segs.push(s); from = s.to; });
    pl.pos = target;
    let note = '', kind = 'info';
    if (LADDERS[target]) { segs.push(segLadder(target)); pl.pos = LADDERS[target]; note = 'Naik tangga ke kotak ' + pl.pos + '!'; kind = 'up'; }
    else if (SNAKES[target]) { segs.push(segSnake(target)); pl.pos = SNAKES[target]; note = 'Dimakan ular! Turun ke kotak ' + pl.pos; kind = 'down'; }
    const jumpIndex = segs.length - 1;
    animateMove(pl, segs, (i) => { if (note && i === jumpIndex) setHint(note, kind); }, () => { renderPlayers(); done(); });
  }

  function setelahGerak(pl, v) {
    if (pl.pos === 100) return menang(pl);
    if (v === 6) { later(() => lempar(true), 1000); return; } // dapat 6: kocok lagi
    later(giliranBerikut, 900);
  }

  function giliranBerikut() {
    cur = (cur + 1) % players.length;
    mulaiGiliran();
  }

  // ---------------- Leaderboard kemenangan ----------------
  // shortcut: disimpan di localStorage (per perangkat). Upgrade bila perlu: POST/GET ke server seperti /game/dino/score.
  const LB_KEY = 'astakanda_ladders_menang';
  const bacaMenang = () => { try { const o = JSON.parse(localStorage.getItem(LB_KEY)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  function tambahMenang(nama) {
    const k = String(nama).trim().toLowerCase(), o = bacaMenang(), r = o[k] || { nama, menang: 0 };
    r.nama = nama; r.menang += 1; r.terakhir = Date.now(); o[k] = r;
    try { localStorage.setItem(LB_KEY, JSON.stringify(o)); } catch (e) {}
    return r.menang;
  }
  const daftarMenang = () => Object.values(bacaMenang()).sort((a, b) => (b.menang - a.menang) || (a.terakhir - b.terakhir));

  let lbEl = null;
  const MEDALI = ['🥇', '🥈', '🥉'];
  function buatLb() { // layar leaderboard = salinan layar leaderboard Dino Attack (tampilan identik), id diganti
    if (lbEl) return true;
    const src = $('game-dino-leaderboard');
    if (!src) return false;
    const lb = src.cloneNode(true);
    lb.querySelectorAll('[id]').forEach((n) => { n.id = n.id.replace('dino', 'ladders'); });
    lb.id = 'game-ladders-leaderboard';
    lb.classList.remove('hidden');
    const tw = document.createTreeWalker(lb, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) n.nodeValue = n.nodeValue.replace(/Dino Attack/g, 'Snakes Ladders').replace(/Skor Tertinggi/g, 'Kemenangan Terbanyak');
    lbEl = document.createElement('div');
    lbEl.className = 'ladders-lb hidden';
    lbEl.appendChild(lb);
    document.body.appendChild(lbEl);
    const gear = $('ladders-lb-settings'), out = $('ladders-lb-keluar');
    if (gear) gear.addEventListener('click', () => { tutupLb(); showMy(setupEl); });
    if (out) out.addEventListener('click', () => konfirmasiKeluar(() => { tutupLb(); toSelect(); }, false));
    return true;
  }
  function renderLb() {
    const podium = $('ladders-lb-podium'), list = $('ladders-lb-list'), others = $('ladders-lb-others');
    const rows = daftarMenang().slice(0, 5).map((r) => ({ name: r.nama, score: r.menang }));
    podium.innerHTML = ''; list.innerHTML = '';
    if (!rows.length) { podium.innerHTML = '<p class="leaderboard-empty">🏆 Belum ada pemenang. Jadilah yang pertama!</p>'; others.hidden = true; return; }
    podium.innerHTML = rows.slice(0, 3).map((row, i) =>
      '<div class="podium-card podium-card--rank' + (i + 1) + '"><div class="podium-card__crown">' + (i === 0 ? '👑' : '') + '</div>' +
      (i === 0 ? '' : '<div class="podium-card__medal">' + MEDALI[i] + '</div>') +
      '<div class="podium-card__name">' + esc(row.name) + '</div><div class="podium-card__score">🏆 ' + row.score + '</div>' +
      '<div class="podium-card__step">' + (i + 1) + '</div></div>').join('');
    const sisa = rows.slice(3);
    others.hidden = !sisa.length;
    sisa.forEach((row, i) => {
      const tr = document.createElement('tr');
      tr.style.animationDelay = (i * 70) + 'ms';
      tr.innerHTML = '<td><span class="rank-badge rank-badge--plain">' + (i + 4) + '</span></td>' +
        '<td class="leaderboard-table__name"><span class="leaderboard-table__avatar">' + esc((row.name || '?').trim().charAt(0).toUpperCase() || '?') + '</span>' + esc(row.name) + '</td>' +
        '<td>🏆 ' + row.score + '</td>';
      list.appendChild(tr);
    });
  }
  function bukaLb() {
    if (!buatLb()) return;
    renderLb(); // data lokal -> langsung tampil, sekali gambar (tanpa kedip)
    lbEl.classList.remove('hidden');
    pindahBrand(true, lbEl.querySelector('[id$="leaderboard-brand"]'));
  }
  function tutupLb() {
    if (!lbEl) return;
    lbEl.classList.add('hidden');
    pindahBrand(false);
  }

  // ---------------- Pop up konfirmasi Keluar (kelas sama dengan Dino/Apple) ----------------
  let modalKeluar = null, keluarCb = null, keluarJeda = false;
  function setJeda(v) {
    paused = v;
    [cubeAnim, shadowAnim].forEach((a) => { if (a && a.playState !== 'finished') { if (v) a.pause(); else a.play(); } });
  }
  function tutupKonfirmasi() {
    modalKeluar.classList.add('hidden');
    if (keluarJeda) setJeda(false);
  }
  function konfirmasiKeluar(onYa, jeda) {
    if (!modalKeluar) {
      modalKeluar = document.createElement('div');
      modalKeluar.className = 'apple-confirm hidden';
      modalKeluar.style.zIndex = '200'; // di atas layar bermain & leaderboard (z-index 80)
      modalKeluar.setAttribute('role', 'dialog');
      modalKeluar.setAttribute('aria-modal', 'true');
      modalKeluar.innerHTML =
        '<div class="apple-confirm-card">' +
          '<div class="apple-confirm-ico">' + ICON.exit + '</div>' +
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
        tutupKonfirmasi();
        if (aksi && aksi.dataset.aksi === 'keluar' && keluarCb) keluarCb();
      });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalKeluar.classList.contains('hidden')) tutupKonfirmasi(); });
      document.body.appendChild(modalKeluar);
    }
    keluarCb = onYa; keluarJeda = !!jeda;
    if (keluarJeda) setJeda(true);
    modalKeluar.classList.remove('hidden');
    modalKeluar.querySelector('[data-aksi="batal"]').focus();
  }

  // ---------------- Pop up Game Over ----------------
  function menang(pl) {
    phase = 'ended';
    renderPlayers();
    const urut = players.slice().sort((a, b) => ((b === pl) - (a === pl)) || (b.pos - a.pos));
    const total = pl.ai ? null : tambahMenang(pl.nama); // hanya pemain manusia yang dicatat di leaderboard
    $('ladders-result-title').textContent = pl.ai ? 'AI Menang!' : (players.length > 1 ? pl.nama + ' Menang!' : 'Selamat, ' + pl.nama + '!');
    $('ladders-result-sub').textContent = pl.ai ? 'Komputer lebih dulu sampai kotak 100' : 'Lebih dulu sampai kotak 100 🎉';
    $('ladders-stats').innerHTML = [['Giliran', turnCount], ['Total Menang', total === null ? '—' : total], ['Pemain', players.length]].map((x) =>
      '<div class="stat-card"><span class="stat-label">' + x[0] + '</span><span class="stat-value">' + x[1] + '</span></div>').join('');
    $('ladders-rank').innerHTML = urut.map((p, i) =>
      '<div class="ladders-rank-item' + (i === 0 ? ' is-winner' : '') + '"><span class="ladders-rank-no">' + (MEDALI[i] || (i + 1)) + '</span><span class="ladders-rank-dot" style="background:' + p.warna + '"></span>' +
      '<span class="ladders-rank-name">' + esc(p.nama) + '</span><span class="ladders-rank-pos">Kotak ' + p.pos + '</span></div>').join('');
    later(() => resultEl.classList.remove('hidden'), 900);
  }

  // ---------------- Deteksi gestur (kamera) ----------------
  function pollDetect() {
    if (phase !== 'question' || awaiting || paused) return;
    const api = window.astaKanda;
    if (!api) return;
    const lm = api.getLatestLandmarks();
    if (!lm) { lastAnswerLabel = null; detectEl.textContent = '—'; return; }
    awaiting = true;
    fetch('/gesture/recognize', { method: 'POST', headers: api.jsonHeaders(), body: JSON.stringify({ landmarks: lm }) })
      .then((r) => r.json())
      .then((data) => {
        if (phase !== 'question') return;
        if (!data.ok || !data.label) { lastAnswerLabel = null; detectEl.textContent = '—'; return; }
        detectEl.textContent = data.label + (data.variant ? ' · ' + data.variant : '');
        const low = String(data.label).trim().toLowerCase();
        const target = String(soalAktif).trim().toLowerCase();
        // Gestur sebelumnya yang masih ditahan tidak dihitung lagi (kecuali memang cocok dgn soal baru)
        if (lastAnswerLabel && low === lastAnswerLabel && low !== target) return;
        lastAnswerLabel = low;
        jawab(low === target, false);
      })
      .catch(() => {})
      .finally(() => { awaiting = false; });
  }

  // ---------------- Kamera ----------------
  function pindahkanKamera(masuk) {
    const leftCol = $('left-col');
    if (!leftCol) return;
    if (masuk) {
      window.__astaLeftColParent = window.__astaLeftColParent || leftCol.parentElement;
      window.__astaLeftColNext = window.__astaLeftColNext || leftCol.nextElementSibling;
      camSlot.appendChild(leftCol);
      leftCol.classList.remove('hidden');
      leftCol.style.display = '';
    } else if (window.__astaLeftColParent) {
      window.__astaLeftColParent.insertBefore(leftCol, window.__astaLeftColNext || null);
      leftCol.classList.add('hidden');
    }
  }

  // ---------------- Mulai / berhenti ----------------
  function bersih() {
    session += 1;
    timers.forEach(clearTimeout); timers = [];
    clearInterval(pollTimer); pollTimer = null;
    clearInterval(diceTimer); diceTimer = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null; running = false; anim = null; awaiting = false; paused = false; lastT = 0;
    if (cubeAnim) cubeAnim.cancel();
    if (shadowAnim) shadowAnim.cancel();
    if (dice3dEl) dice3dEl.classList.remove('show');
  }

  function start(cfg) {
    config = cfg;
    pool = kumpulkanSoal(cfg.kategori);
    if (!pool.length) {
      const m = $('modal-game-syarat'), t = $('modal-game-syarat-text');
      const msg = 'Belum ada huruf/kata yang direkam untuk kategori "' + cfg.kategori + '". Rekam dulu di tab Belajar, ya.';
      if (m && t) { t.textContent = msg; m.classList.remove('hidden'); } else { alert(msg); }
      return;
    }
    bersih();
    players = cfg.names.map((n, i) => ({ nama: n, warna: PLAYER_COLORS[i], pos: 0, ai: false, vx: 0, vy: 0, hop: 0, ox: 0, oy: 0, tilt: 0 }));
    if (cfg.mode === 'ai') players.push({ nama: 'AI', warna: PLAYER_COLORS[1], pos: 0, ai: true, vx: 0, vy: 0, hop: 0, ox: 0, oy: 0, tilt: 0 });
    cur = 0; turnCount = 0; soalAktif = ''; lastAnswerLabel = null; phase = 'idle';

    resultEl.classList.add('hidden');
    playEl.classList.remove('hidden');
    pindahBrand(true);
    pindahkanKamera(true);
    fitCanvas();
    players.forEach((p, i) => { const c0 = squareCenter(0, i); p.vx = c0.x; p.vy = c0.y; });
    showFace(1);
    renderPlayers();

    running = true;
    rafId = requestAnimationFrame(frame);
    pollTimer = setInterval(pollDetect, 33);
    mulaiGiliran();
  }

  function hentikan() {
    bersih();
    pindahkanKamera(false);
    pindahBrand(false);
    if (playEl) { playEl.classList.add('hidden'); resultEl.classList.add('hidden'); }
  }

  // ---------------- Event ----------------
  function bind() {
    $('ladders-detail-back').addEventListener('click', toSelect);
    $('ladders-detail-mulai').addEventListener('click', () => showMy(setupEl));
    $('ladders-setup-back').addEventListener('click', () => showMy(detailEl));
    $('ladders-btn-mulai').addEventListener('click', mulaiDariSetup);

    $('ladders-mode-chips').addEventListener('click', (e) => {
      const b = e.target.closest('.game-chip'); if (!b) return;
      Array.from($('ladders-mode-chips').children).forEach((c) => c.classList.toggle('is-active', c === b));
      setup.mode = b.dataset.mode;
      renderNames();
    });
    $('ladders-kategori-chips').addEventListener('click', (e) => {
      const b = e.target.closest('.game-chip'); if (!b) return;
      Array.from($('ladders-kategori-chips').children).forEach((c) => c.classList.toggle('is-active', c === b));
      setup.kategori = b.dataset.kategori;
    });

    btnLewati.addEventListener('click', () => { if (phase === 'question') jawab(false, true); });
    $('ladders-btn-atur').addEventListener('click', () => { hentikan(); showMy(setupEl); });
    $('ladders-btn-keluar').addEventListener('click', () => konfirmasiKeluar(() => { hentikan(); toSelect(); }, true));
    $('ladders-btn-lb').addEventListener('click', () => { hentikan(); bukaLb(); });
    $('ladders-btn-lb2').addEventListener('click', () => { hentikan(); bukaLb(); });
    $('ladders-btn-ulangi').addEventListener('click', () => { if (config) start(config); });
    $('ladders-btn-atur2').addEventListener('click', () => { hentikan(); showMy(setupEl); });
    $('ladders-btn-keluar2').addEventListener('click', () => { hentikan(); toSelect(); });

    window.addEventListener('resize', () => {
      if (!playEl || playEl.classList.contains('hidden')) return;
      fitCanvas();
      if (!anim) players.forEach((p, i) => { const c = squareCenter(p.pos, i); p.vx = c.x; p.vy = c.y; });
    });

    // Jika layar pilihan game ditampilkan lagi oleh kode lain, sembunyikan layar milik game ini
    new MutationObserver(() => {
      const hidden = selectScreen.classList.contains('hidden') || getComputedStyle(selectScreen).display === 'none';
      if (!hidden) [detailEl, setupEl].forEach((s) => s.classList.add('hidden'));
    }).observe(selectScreen, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // ---------------- Init ----------------
  function init() {
    if ($('game-card-ladders')) return true;
    const cardsEl = document.querySelector('.game-cards');
    if (!cardsEl) return false;
    selectScreen = cardsEl.closest('.game-screen') || cardsEl.parentElement;
    host = selectScreen.parentElement;
    build();
    return true;
  }
  if (!init()) {
    const mo = new MutationObserver(() => { if (init()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  window.AstaKandaGames = window.AstaKandaGames || {};
  window.AstaKandaGames.ladders = { start, stop: hentikan };
})();