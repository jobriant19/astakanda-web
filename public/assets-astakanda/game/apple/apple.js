/* ASTA KANDA — Apple Snake
 * Ular bergerak otomatis di grid. Soal huruf/kata (bank sama dengan tab
 * Ujian) diperagakan lewat kamera & dicek via /gesture/recognize (Python),
 * persis seperti ujian.js. Jawaban BENAR -> apel jadi emas & ular mencari
 * jalan (BFS) menghindari rintangan menuju apel. Jawaban SALAH -> ular
 * tetap jalan lurus, apel tetap merah. Menabrak batas/rintangan/badan
 * sendiri = game over. Gaya gambar (obstacle batu/kayu/pohon, apel
 * bergradasi+kilau, ular badan-menerus) di-porting dari game.js referensi.
 */
(function () {
  let COLS = 24, ROWS = 16, CELL = 30;
  const canvas = document.getElementById('apple-canvas');
  const canvasWrap = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  let groundPattern = null;

  /** Hitung ukuran grid & CELL supaya arena mengisi penuh .game-play-canvas-wrap
   *  tanpa celah kosong (dipanggil ulang tiap kali permainan dimulai). */
  function hitungGrid() {
    const w = canvasWrap.clientWidth || 700;
    const h = canvasWrap.clientHeight || 460;
    const targetCell = 42;
    COLS = Math.max(14, Math.round(w / targetCell));
    ROWS = Math.max(10, Math.round(h / targetCell));
    CELL = Math.max(w / COLS, h / ROWS);
    canvas.width = Math.round(COLS * CELL);
    canvas.height = Math.round(ROWS * CELL);
  }

  function buatPolaTanah() {
    const tile = document.createElement('canvas');
    tile.width = Math.round(CELL * 2); tile.height = Math.round(CELL * 2);
    const tctx = tile.getContext('2d');
    // Warna diambil persis dari referensi: kotak gelap #99d165, kotak terang #a8df76
    const c1 = '#99d165', c2 = '#a8df76';
    tctx.fillStyle = c1; tctx.fillRect(0, 0, CELL, CELL); tctx.fillRect(CELL, CELL, CELL, CELL);
    tctx.fillStyle = c2; tctx.fillRect(CELL, 0, CELL, CELL); tctx.fillRect(0, CELL, CELL, CELL);
    // Helai rumput halus (deterministik) seperti referensi
    tctx.strokeStyle = 'rgba(96,150,60,0.35)';
    tctx.lineWidth = Math.max(1, CELL * 0.035);
    tctx.lineCap = 'round';
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let cy = 0; cy < 2; cy++) for (let cx = 0; cx < 2; cx++) {
      for (let k = 0; k < 3; k++) {
        const bx = cx * CELL + CELL * (0.15 + rnd() * 0.7);
        const by = cy * CELL + CELL * (0.3 + rnd() * 0.6);
        tctx.beginPath(); tctx.moveTo(bx, by); tctx.lineTo(bx + CELL * 0.06, by - CELL * 0.16); tctx.stroke();
      }
    }
    return ctx.createPattern(tile, 'repeat');
  }

  const camSlot   = document.getElementById('game-play-camera-slot');
  const elWaktu   = document.getElementById('apple-waktu');
  const elSkor    = document.getElementById('apple-skor');
  const elRekor   = document.getElementById('apple-rekor');
  const elSoal    = document.getElementById('apple-soal-progress');
  const elTarget  = document.getElementById('apple-question-target');
  const elFeedback = document.getElementById('apple-question-feedback');

  const screenPlay   = document.getElementById('game-play');
  const screenResult = document.getElementById('game-result');
  const resultTitle  = document.getElementById('apple-result-title');
  const resultSkor   = document.getElementById('apple-result-skor');
  const resultUnlock = document.getElementById('apple-result-unlock');
  const btnUlangi    = document.getElementById('apple-btn-ulangi');
  const btnLeaderboard2  = document.getElementById('apple-btn-leaderboard-2');
  const btnGantiPemain   = document.getElementById('apple-btn-ganti-pemain');
  const btnSettings  = document.getElementById('apple-btn-settings');
  const btnLeaderboard  = document.getElementById('apple-btn-leaderboard');
  const btnKeluar    = document.getElementById('apple-btn-keluar');

  const badgeNama = document.getElementById('apple-player-badge');
  const ICON_PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function namaPemain() { return localStorage.getItem('astakanda_player_nama') || 'Pemain'; }

  const modalSyarat     = document.getElementById('modal-game-syarat');
  const modalSyaratText = document.getElementById('modal-game-syarat-text');
  const modalSyaratTutup = document.getElementById('modal-game-syarat-tutup');
  if (modalSyaratTutup) modalSyaratTutup.addEventListener('click', () => modalSyarat.classList.add('hidden'));

  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';

  const PRESET = {
    mudah:  { menit: 3, soal: 5,  tick: 320 },
    sedang: { menit: 5, soal: 10, tick: 240 },
    sulit:  { menit: 7, soal: 15, tick: 170 },
  };

  let cfg = null;
  let snake, dir, obstacles, apple, appleGold, score, qIndex, questions, sisaDetik;
  let renderPositions = [];
  let prevSnake = [], nextSnake = [], lastTickTime = 0, tickDuration = 300;
  let tickTimer = null, timerInterval = null, detectInterval = null, rafId = null;
  let mode = 'idle'; // 'idle' | 'pursuing' | 'straight'
  let awaitingDetect = false;
  let questionLocked = false;
  let skinSnake = { warna_utama: '#3E74D6', warna_kedua: '#2E63C7' };
  let benarCnt = 0, salahCnt = 0, rekorSebelum = 0, totalDetik = 0, lastAnswerLabel = null, feedbackTimer = null, poolSoal = [];
  let paused = false; // true saat pop up konfirmasi keluar terbuka
  let detectObserver = null; // memicu penilaian seketika saat hasil deteksi (app.js) berubah

  // ---------------- Ikon SVG (pengganti emoji) ----------------
  const svgIkon = (isi) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + isi + '</svg>';
  const ICON_PODIUM = svgIkon('<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>');
  const ICON_KELUAR = svgIkon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>');
  const ICON_APEL   = svgIkon('<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>');
  const ICON_GIFT   = svgIkon('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>');
  const RE_EMOJI = /\p{Extended_Pictographic}\uFE0F?/gu;
  const ICON_JAM = svgIkon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');

  // Kilat hijau/merah di kamera + kartu soal, muncul seketika saat jawaban dinilai
  function kilat(kelas) {
    [camSlot, elTarget.closest('.game-play-question')].forEach((el) => {
      if (!el) return;
      el.classList.remove('is-flash-ok', 'is-flash-bad');
      void el.offsetWidth; // restart animasi
      el.classList.add(kelas);
      setTimeout(() => el.classList.remove(kelas), 650);
    });
  }

  // Baris kartu statistik bawaan AstaHasil dicari lewat label "Waktu" (markup hasil.js tidak terlihat)
  function cariBarisStat() {
    const lbl = Array.from(screenResult.querySelectorAll('*'))
      .find((el) => !el.children.length && /^\s*waktu\s*$/i.test(el.textContent));
    return lbl && lbl.parentElement && lbl.parentElement.parentElement;
  }

  // Pop up Game Over: tanpa emoji + 4 kartu statistik seragam (idempoten, aman dipanggil tiap game over)
  function rapikanPopupHasil(skor, waktu, benar, salah) {
    btnLeaderboard2.innerHTML = ICON_PODIUM + '<span>Leaderboard</span>';
    btnGantiPemain.innerHTML = ICON_KELUAR + '<span>Keluar</span>';
    resultTitle.textContent = resultTitle.textContent.replace(RE_EMOJI, '').trim();

    const baris = cariBarisStat();
    if (!baris) return; // shortcut: markup hasil.js berubah -> kartu bawaan dibiarkan; upgrade dengan menyesuaikan cariBarisStat
    const kartu = (kelas, ikon, nilai, label) =>
      '<div class="apple-stat apple-stat--' + kelas + '"><span class="apple-stat-ico">' + ikon + '</span>' +
      '<span class="apple-stat-val">' + nilai + '</span><span class="apple-stat-lbl">' + label + '</span></div>';
    baris.classList.add('apple-stats');
    baris.innerHTML = kartu('skor', ICON_APEL, skor, 'Skor') + kartu('waktu', ICON_JAM, waktu, 'Waktu')
      + kartu('benar', ICON_CHECK, benar, 'Benar') + kartu('salah', ICON_CROSS, salah, 'Salah');

    // Sembunyikan baris "Skor: n" lama (sudah jadi kartu pertama)
    const lama = resultSkor.parentElement;
    if (lama && lama !== baris) {
      if (lama.contains(baris)) {
        lama.childNodes.forEach((n) => { if (n.nodeType === 3) n.nodeValue = ''; });
        Array.from(lama.children).forEach((el) => { if (el !== baris && !el.contains(baris)) el.style.display = 'none'; });
      } else {
        lama.style.display = 'none';
      }
    }
  }

  // ---------------- Pop up konfirmasi Keluar ----------------
  let modalKeluar = null;
  function buatKonfirmasi() {
    modalKeluar = document.createElement('div');
    modalKeluar.className = 'apple-confirm hidden';
    modalKeluar.setAttribute('role', 'dialog');
    modalKeluar.setAttribute('aria-modal', 'true');
    modalKeluar.innerHTML =
      '<div class="apple-confirm-card">' +
        '<div class="apple-confirm-ico">' + ICON_KELUAR + '</div>' +
        '<div class="apple-confirm-title">Keluar dari permainan?</div>' +
        '<p class="apple-confirm-text">Permainan yang sedang berjalan akan dihentikan dan skor tidak disimpan.</p>' +
        '<div class="apple-confirm-actions">' +
          '<button type="button" class="apple-confirm-btn apple-confirm-btn--ghost" data-aksi="batal">Batal</button>' +
          '<button type="button" class="apple-confirm-btn apple-confirm-btn--danger" data-aksi="keluar">Keluar</button>' +
        '</div>' +
      '</div>';
    modalKeluar.addEventListener('click', (e) => {
      const aksi = e.target.closest('[data-aksi]');
      if (aksi && aksi.dataset.aksi === 'keluar') keluarKeSelect();
      else if (aksi || e.target === modalKeluar) tutupKonfirmasi();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalKeluar && !modalKeluar.classList.contains('hidden')) tutupKonfirmasi();
    });
    document.body.appendChild(modalKeluar);
  }
  function bukaKonfirmasiKeluar() {
    if (!modalKeluar) buatKonfirmasi();
    paused = true;
    modalKeluar.classList.remove('hidden');
    const batal = modalKeluar.querySelector('[data-aksi="batal"]');
    if (batal) batal.focus();
  }
  function tutupKonfirmasi() {
    paused = false;
    if (modalKeluar) modalKeluar.classList.add('hidden');
  }
  function keluarKeSelect() {
    tutupKonfirmasi();
    hentikanLoop();
    window.AstaKandaGameUI.showSelect();
  }

  function guestToken() {
    let t = localStorage.getItem('astakanda_guest_token');
    if (!t) { t = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('astakanda_guest_token', t); }
    return t;
  }

  function kumpulkanSoal(kategori) {
    const sel = kategori === 'alfabet' ? '#grid-alfabet .word-card'
      : kategori === 'kata' ? '#grid-kata .word-card'
      : '#grid-alfabet .word-card, #grid-kata .word-card';
    return Array.from(document.querySelectorAll(sel))
      .filter((c) => (parseInt(c.querySelector('.count').textContent, 10) || 0) > 0)
      .map((c) => c.querySelector('.label').textContent.trim())
      .filter(Boolean);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Perpindahan logo + tagline kini dikelola game.js (showScreen -> pindahBrand),
  // sehingga header selalu benar di setiap layar. Dibiarkan kosong agar aman dipanggil.
  function pindahkanHeader() {}

  function pindahkanKamera(masuk) {
    const leftCol = document.getElementById('left-col');
    if (!leftCol) return;
    if (masuk) {
      window.__astaLeftColParent = window.__astaLeftColParent || leftCol.parentElement;
      window.__astaLeftColNext = window.__astaLeftColNext || leftCol.nextElementSibling;
      camSlot.appendChild(leftCol);
      leftCol.classList.remove('hidden');
      leftCol.style.display = '';
    } else {
      const parent = window.__astaLeftColParent;
      const next = window.__astaLeftColNext;
      if (parent) {
        if (next && next.parentElement === parent) parent.insertBefore(leftCol, next);
        else parent.appendChild(leftCol);
      }
      leftCol.classList.add('hidden');
    }
  }

  // ---------------- Grid, obstacle & apel ----------------
  function cellKey(c) { return c.x + ',' + c.y; }
  const OBSTACLE_TYPES = ['rock', 'log', 'tree'];

    const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  let laneRow = 0; // baris jalur lurus awal ular — dilarang untuk obstacle (seperti referensi)

  // Kepadatan obstacle sama seperti referensi (10 di grid 20x15), mengikuti luas arena saat ini
  function jumlahObstacle() { return Math.max(6, Math.round(COLS * ROWS * 0.033)); }

  function generateObstacles(count) {
    const forbidden = new Set(snake.map(cellKey));
    for (let x = 0; x < COLS; x++) forbidden.add(x + ',' + laneRow); // ular tak menabrak saat masih lurus
    if (apple) forbidden.add(cellKey(apple));
    const list = [];
    let guard = 0;
    while (list.length < count && guard < 2000) {
      guard++;
      const x = Math.floor(Math.random() * COLS);
      const y = Math.floor(Math.random() * ROWS);
      const key = x + ',' + y;
      if (forbidden.has(key)) continue;
      forbidden.add(key);
      list.push({ x, y, type: OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)] });
    }
    return list;
  }

  function selReachable(target) { return bfsPath(snake[0], target) !== null; }

  /** Sel kosong untuk apel: jauh dari pinggir & obstacle (jarak diskalakan ke ukuran arena,
   *  referensi 20x15 = 5 & 4 petak). Kalau arena terlalu penuh, syarat dilonggarkan bertahap. */
  function pickFreeCell() {
    const occupied = new Set([...snake.map(cellKey), ...obstacles.map(cellKey)]);
    const m = Math.min(COLS, ROWS);
    const EDGE = Math.max(1, Math.round(m / 3));
    const OBST = Math.max(2, Math.round(m * 0.27));
    const nearEdge = (x, y) => x < EDGE || x > COLS - 1 - EDGE || y < EDGE || y > ROWS - 1 - EDGE;
    const nearObst = (x, y) => obstacles.some((o) => Math.abs(o.x - x) < OBST && Math.abs(o.y - y) < OBST);
    const collect = (pred) => {
      const list = [];
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (occupied.has(x + ',' + y) || !pred(x, y)) continue;
        list.push({ x, y });
      }
      return list;
    };
    let c = collect((x, y) => !nearEdge(x, y) && !nearObst(x, y));
    if (!c.length) c = collect((x, y) => !nearEdge(x, y));
    if (!c.length) c = collect((x, y) => !nearObst(x, y));
    if (!c.length) c = collect(() => true);
    return c.length ? c[Math.floor(Math.random() * c.length)] : { x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) };
  }

  /** Sel yang PASTI bisa dijangkau dari kepala ular sekarang. */
  function pickReachableCell() {
    for (let i = 0; i < 40; i++) {
      const c = pickFreeCell();
      if (selReachable(c)) return c;
    }
    const blocked = new Set(obstacles.map(cellKey));
    snake.slice(0, -1).forEach((s) => blocked.add(cellKey(s)));
    const head = snake[0];
    const seen = new Set([cellKey(head)]);
    const queue = [head];
    let fallback = null;
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x !== head.x || cur.y !== head.y) fallback = cur;
      for (const d of DIRS) {
        const n = { x: cur.x + d.x, y: cur.y + d.y };
        const k = cellKey(n);
        if (n.x < 0 || n.y < 0 || n.x >= COLS || n.y >= ROWS || seen.has(k) || blocked.has(k)) continue;
        seen.add(k);
        queue.push(n);
      }
    }
    return fallback || pickFreeCell();
  }

  function spawnApple(gold) {
    const cell = gold ? pickReachableCell() : pickFreeCell();
    apple = { ...cell, color: gold ? 'gold' : 'red' };
    appleGold = !!gold;
  }

  /** Jawaban BENAR: apel merah jadi emas. Kalau posisinya terkurung, dipindah ke sel yang terjangkau. */
  function aktifkanApelEmas() {
    let cell = apple ? { x: apple.x, y: apple.y } : null;
    if (!cell || !selReachable(cell)) cell = pickReachableCell();
    apple = { ...cell, color: 'gold' };
    appleGold = true;
  }

  /** Jawaban SALAH: ular memendek satu ruas (minimal 3). */
  function perpendekUlar() {
    if (snake.length <= 3) return;
    snake.pop();
    nextSnake = snake.map((p) => ({ ...p }));
    prevSnake = prevSnake.slice(0, snake.length);
  }

  /** Arah paling lega kalau jalur ke apel emas tertutup di tengah jalan (flood fill). */
  function arahTerAman() {
    const blocked = new Set(obstacles.map(cellKey));
    snake.slice(0, -1).forEach((s) => blocked.add(cellKey(s)));
    const head = snake[0];
    const bebas = (c) => c.x >= 0 && c.y >= 0 && c.x < COLS && c.y < ROWS && !blocked.has(cellKey(c));
    const luas = (start) => {
      const seen = new Set([cellKey(start)]);
      const queue = [start];
      let n = 0;
      while (queue.length && n < 60) {
        const cur = queue.shift();
        n++;
        for (const d of DIRS) {
          const c = { x: cur.x + d.x, y: cur.y + d.y };
          const k = cellKey(c);
          if (seen.has(k) || !bebas(c)) continue;
          seen.add(k);
          queue.push(c);
        }
      }
      return n;
    };
    let best = null, bestN = -1;
    for (const d of DIRS) {
      const c = { x: head.x + d.x, y: head.y + d.y };
      if (!bebas(c)) continue;
      const n = luas(c);
      if (n > bestN) { bestN = n; best = d; }
    }
    return best;
  }

  function bfsPath(start, target) {
    const blocked = new Set(obstacles.map(cellKey));
    snake.slice(0, -1).forEach((s) => blocked.add(cellKey(s)));
    const key = (c) => c.x + ',' + c.y;
    const queue = [start];
    const cameFrom = new Map([[key(start), null]]);
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === target.x && cur.y === target.y) {
        const path = [];
        let k = key(cur);
        while (cameFrom.get(k) !== null) {
          const [px, py] = k.split(',').map(Number);
          const prevKey = cameFrom.get(k);
          const [pxp, pyp] = prevKey.split(',').map(Number);
          path.unshift({ x: px - pxp, y: py - pyp });
          k = prevKey;
        }
        return path;
      }
      for (const d of dirs) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const nk = nx + ',' + ny;
        if (blocked.has(nk) || cameFrom.has(nk)) continue;
        cameFrom.set(nk, key(cur));
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  // ---------------- Loop logika (gerak per tick) ----------------
  function langkahUlar() {
    if (paused) return;
    prevSnake = snake.map((p) => ({ ...p }));
    if (mode === 'pursuing') {
      const path = bfsPath(snake[0], apple);
      if (path && path.length) dir = path[0];
      else { const aman = arahTerAman(); if (aman) dir = aman; } // jalur tertutup: pilih arah paling lega
    }
    const next = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS) return gameOver();
    if (obstacles.some((o) => o.x === next.x && o.y === next.y)) return gameOver();
    if (snake.some((s) => s.x === next.x && s.y === next.y)) return gameOver();

    const makan = appleGold && next.x === apple.x && next.y === apple.y;
    snake.unshift(next);
    if (makan) {
      score += 1;
      elSkor.textContent = score;
      obstacles = generateObstacles(obstacles.length);
      spawnApple(false);
      mode = 'idle';
      nextQuestion();
    } else {
      snake.pop();
    }
    nextSnake = snake.map((p) => ({ ...p }));
    lastTickTime = performance.now();
  }

  // ---------------- Loop render (halus, terpisah dari logika) ----------------
  function interpolasiPosisi() {
    const progress = tickDuration ? Math.min(1, (performance.now() - lastTickTime) / tickDuration) : 1;
    const n = nextSnake.length;
    renderPositions.length = n;
    for (let i = 0; i < n; i++) {
      const from = prevSnake[i] || nextSnake[i];
      const to = nextSnake[i];
      renderPositions[i] = { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
    }
  }

  function drawObstacles() {
    ctx.save();
    for (const o of obstacles) {
      const cx = o.x * CELL + CELL / 2, cy = o.y * CELL + CELL / 2, r = CELL * 0.42;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.ellipse(cx, cy + r * 0.85, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      if (o.type === 'rock') drawRock(cx, cy, r);
      else if (o.type === 'log') drawLog(cx, cy, r);
      else drawTree(cx, cy, r);
    }
    ctx.restore();
  }

  function drawRock(cx, cy, r) {
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, '#9AA2AE'); grad.addColorStop(1, '#5B6472');
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.9, cy + r * 0.6); ctx.lineTo(cx - r * 0.7, cy - r * 0.5);
    ctx.lineTo(cx - r * 0.1, cy - r * 0.95); ctx.lineTo(cx + r * 0.6, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.9, cy + r * 0.5); ctx.lineTo(cx + r * 0.3, cy + r * 0.85);
    ctx.lineTo(cx - r * 0.4, cy + r * 0.85); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#3F4753'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.35, cy - r * 0.55); ctx.lineTo(cx + r * 0.05, cy - r * 0.75);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke();
  }

  function roundedSquare(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }

  function drawLog(cx, cy, r) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.18);
    const w = r * 1.7, h = r * 0.95;
    roundedSquare(-w / 2, -h / 2, w, h, h * 0.45);
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#B27A45'); grad.addColorStop(1, '#7C4F27');
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#5C3A1C'; ctx.lineWidth = Math.max(1, h * 0.08); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(w / 2 - h * 0.22, 0, h * 0.34, h * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#D8A867'; ctx.fill();
    ctx.strokeStyle = '#5C3A1C'; ctx.lineWidth = Math.max(1, h * 0.05); ctx.stroke();
    ctx.restore();
  }

  function drawTree(cx, cy, r) {
    ctx.fillStyle = '#6B4226';
    ctx.fillRect(cx - r * 0.14, cy + r * 0.1, r * 0.28, r * 0.75);
    [{ dy: r * 0.15, rad: r * 0.72, color: '#3E9142' }, { dy: -r * 0.15, rad: r * 0.62, color: '#4CAE4F' }, { dy: -r * 0.5, rad: r * 0.48, color: '#5FBD5F' }]
      .forEach((l) => { ctx.beginPath(); ctx.arc(cx, cy + l.dy, l.rad, 0, Math.PI * 2); ctx.fillStyle = l.color; ctx.fill(); });
    ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.55, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
  }

  function drawSparkle(cx, cy, size, alpha) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); ctx.fillStyle = '#FFF7D6';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.15, cy - size * 0.15, cx + size, cy);
    ctx.quadraticCurveTo(cx + size * 0.15, cy + size * 0.15, cx, cy + size);
    ctx.quadraticCurveTo(cx - size * 0.15, cy + size * 0.15, cx - size, cy);
    ctx.quadraticCurveTo(cx - size * 0.15, cy - size * 0.15, cx, cy - size);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function drawApple() {
    if (!apple) return;
    ctx.save();
    const cx = apple.x * CELL + CELL / 2, cy = apple.y * CELL + CELL / 2;
    const t = performance.now();
    const r = CELL * 0.42 * (1 + Math.sin(t / 180) * 0.06);
    const isRed = !appleGold;
    const glowColor = isRed ? 'rgba(255,90,90,0.45)' : 'rgba(255,205,80,0.55)';
    const bodyStops = isRed ? ['#FF8C82', '#F0323C', '#A3121F'] : ['#FFEFA8', '#FFC22E', '#D68A12'];
    const outlineColor = isRed ? '#7A0F1B' : '#8A5C14';

    ctx.beginPath(); ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.ellipse(cx, cy + r * 0.92, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();

    const glowR = r * (1.85 + Math.sin(t / 260) * 0.1);
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, glowR);
    glow.addColorStop(0, glowColor); glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.fillStyle = glow; ctx.arc(cx, cy, glowR, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.16, cy - r * 0.92);
    ctx.bezierCurveTo(cx - r * 0.85, cy - r * 1.05, cx - r * 1.12, cy - r * 0.25, cx - r * 1.05, cy + r * 0.3);
    ctx.bezierCurveTo(cx - r * 0.98, cy + r * 0.95, cx - r * 0.5, cy + r * 1.22, cx, cy + r * 1.15);
    ctx.bezierCurveTo(cx + r * 0.5, cy + r * 1.22, cx + r * 0.98, cy + r * 0.95, cx + r * 1.05, cy + r * 0.3);
    ctx.bezierCurveTo(cx + r * 1.12, cy - r * 0.25, cx + r * 0.85, cy - r * 1.05, cx + r * 0.16, cy - r * 0.92);
    ctx.quadraticCurveTo(cx, cy - r * 0.62, cx - r * 0.16, cy - r * 0.92);
    ctx.closePath();
    const bodyGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.3, r * 0.08, cx, cy + r * 0.1, r * 1.3);
    bodyGrad.addColorStop(0, bodyStops[0]); bodyGrad.addColorStop(0.55, bodyStops[1]); bodyGrad.addColorStop(1, bodyStops[2]);
    ctx.fillStyle = bodyGrad; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.strokeStyle = outlineColor; ctx.stroke();

    ctx.beginPath(); ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.ellipse(cx - r * 0.4, cy - r * 0.28, r * 0.32, r * 0.2, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.ellipse(cx - r * 0.08, cy + r * 0.08, r * 0.11, r * 0.07, -0.3, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath(); ctx.strokeStyle = '#6B4226'; ctx.lineWidth = Math.max(2, r * 0.16); ctx.lineCap = 'round';
    ctx.moveTo(cx - r * 0.02, cy - r * 0.68);
    ctx.quadraticCurveTo(cx + r * 0.25, cy - r * 1.05, cx + r * 0.12, cy - r * 1.28); ctx.stroke();

    ctx.save(); ctx.translate(cx + r * 0.22, cy - r * 1.05); ctx.rotate(-0.55);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.62, -r * 0.18, r * 0.85, r * 0.06);
    ctx.quadraticCurveTo(r * 0.55, r * 0.4, 0, 0); ctx.closePath();
    const leafGrad = ctx.createLinearGradient(0, 0, r * 0.85, 0);
    leafGrad.addColorStop(0, '#2C7A38'); leafGrad.addColorStop(1, '#4CBF5C');
    ctx.fillStyle = leafGrad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(0.6, r * 0.035);
    ctx.moveTo(r * 0.06, 0.01); ctx.lineTo(r * 0.68, r * 0.02); ctx.stroke();
    ctx.restore();

    if (!isRed) {
      const sparkleAlpha = 0.5 + Math.sin(t / 140) * 0.5;
      drawSparkle(cx + r * 1.05, cy - r * 0.75, r * 0.24, sparkleAlpha);
      drawSparkle(cx - r * 1.12, cy + r * 0.6, r * 0.15, 1 - sparkleAlpha);
    } else {
      ctx.beginPath(); ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.arc(cx + r * 0.55, cy + r * 0.3, r * 0.065, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSnake() {
    if (!renderPositions.length) return;
    const size = CELL * 0.8;
    const pts = renderPositions.map((p) => ({ x: p.x * CELL + CELL / 2, y: p.y * CELL + CELL / 2 }));

    const strokeBodyPath = (offsetY, lineWidth, style) => {
      ctx.beginPath();
      pts.forEach((p, i) => { const y = p.y + offsetY; if (i === 0) ctx.moveTo(p.x, y); else ctx.lineTo(p.x, y); });
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lineWidth; ctx.strokeStyle = style; ctx.stroke();
    };

    ctx.save();
    strokeBodyPath(size * 0.16, size * 0.96, 'rgba(0,0,0,0.16)');
    strokeBodyPath(0, size, skinSnake.warna_utama);
    strokeBodyPath(size * 0.14, size * 0.86, 'rgba(15,45,110,0.35)');
    strokeBodyPath(-size * 0.22, size * 0.3, 'rgba(255,255,255,0.32)');
    ctx.restore();

    const head = pts[0], headR = size * 0.56;
    ctx.save();
    const grad = ctx.createRadialGradient(head.x - headR * 0.3, head.y - headR * 0.3, headR * 0.15, head.x, head.y, headR);
    grad.addColorStop(0, skinSnake.warna_kedua || skinSnake.warna_utama);
    grad.addColorStop(1, skinSnake.warna_utama);
    ctx.beginPath(); ctx.fillStyle = grad; ctx.arc(head.x, head.y, headR, 0, Math.PI * 2); ctx.fill();

    const dx = pts[1] ? head.x - pts[1].x : dir.x;
    const dy = pts[1] ? head.y - pts[1].y : dir.y;
    const angle = Math.atan2(dy, dx);
    const eyeOffset = CELL * 0.2;
    for (const sign of [-1, 1]) {
      const ex = head.x + Math.cos(angle + (sign * Math.PI) / 2.6) * eyeOffset;
      const ey = head.y + Math.sin(angle + (sign * Math.PI) / 2.6) * eyeOffset;
      ctx.beginPath(); ctx.fillStyle = '#FFFFFF'; ctx.arc(ex, ey, CELL * 0.13, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#12233F';
      ctx.arc(ex + Math.cos(angle) * CELL * 0.04, ey + Math.sin(angle) * CELL * 0.04, CELL * 0.06, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function renderLoop() {
    interpolasiPosisi();
    ctx.fillStyle = groundPattern || '#2f5233';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawObstacles();
    drawApple();
    drawSnake();
    rafId = requestAnimationFrame(renderLoop);
  }

  // ---------------- Soal & deteksi kamera (sama seperti ujian.js) ----------------
  function nextQuestion() {
    if (qIndex >= questions.length) questions = questions.concat(shuffle(poolSoal)); // soal tak pernah habis
    questionLocked = false;
    elFeedback.innerHTML = '';
    elFeedback.className = 'game-play-question-feedback';
    elTarget.textContent = questions[qIndex];
    elSoal.textContent = 'Soal ' + (qIndex + 1);
  }

    function pollDetect() {
    if (paused || questionLocked || awaitingDetect || mode !== 'idle') return;
    const api = window.astaKanda;
    if (!api) return;
    const landmarks = api.getLatestLandmarks();
    if (!landmarks) { lastAnswerLabel = null; return; } // tangan hilang -> boleh menjawab lagi
    awaitingDetect = true;
    fetch('/gesture/recognize', { method: 'POST', headers: api.jsonHeaders(), body: JSON.stringify({ landmarks }) })
      .then((r) => r.json())
      .then((data) => {
        if (questionLocked) return;
        if (!data.ok || !data.label) { lastAnswerLabel = null; return; }
        const low = String(data.label).trim().toLowerCase();
        const target = String(questions[qIndex] || '').trim().toLowerCase();
        // Gestur jawaban sebelumnya yang masih ditahan tidak dihitung lagi (kecuali memang cocok dgn soal baru)
        if (lastAnswerLabel && low === lastAnswerLabel && low !== target) return;
        const benar = low === target;
        lastAnswerLabel = low;
        questionLocked = true;
        qIndex += 1;
        if (benar) {
          // Soal BARU baru muncul setelah ular memakan apel emas (lihat langkahUlar)
          benarCnt += 1;
          elFeedback.innerHTML = ICON_CHECK + ' Benar!';
          kilat('is-flash-ok');
          elFeedback.className = 'game-play-question-feedback is-correct';
          aktifkanApelEmas();
          mode = 'pursuing';
        } else {
          // SALAH: soal langsung berganti & apel merah pindah ke posisi baru
          salahCnt += 1;
          perpendekUlar();
          spawnApple(false);
          nextQuestion();
          elFeedback.innerHTML = ICON_CROSS + ' Salah';
          kilat('is-flash-bad');
          elFeedback.className = 'game-play-question-feedback is-wrong';
          clearTimeout(feedbackTimer);
          feedbackTimer = setTimeout(() => {
            if (elFeedback.classList.contains('is-wrong')) { elFeedback.innerHTML = ''; elFeedback.className = 'game-play-question-feedback'; }
          }, 900);
        }
      })
      .catch(() => {})
      .finally(() => { awaitingDetect = false; });
  }

  function formatWaktu(detik) {
    const m = Math.floor(detik / 60).toString().padStart(2, '0');
    const s = Math.floor(detik % 60).toString().padStart(2, '0');
    return m + ':' + s;
  }

  // ---------------- Mulai / selesai ----------------
  function start(config) {
    cfg = config || { kesulitan: 'mudah', kategori: 'alfabet' };
    const preset = PRESET[cfg.kesulitan] || PRESET.mudah;
    questions = shuffle(kumpulkanSoal(cfg.kategori));
    if (!questions.length) {
      if (modalSyarat) {
        modalSyaratText.textContent = 'Belum ada huruf/kata yang direkam untuk kategori "' + cfg.kategori + '". Rekam dulu di tab Belajar, ya.';
        modalSyarat.classList.remove('hidden');
      }
      return;
    }

    window.AstaKandaGameUI.showScreen(screenPlay);
    pindahkanKamera(true);
    pindahkanHeader(true);
    if (badgeNama) badgeNama.innerHTML = ICON_PERSON + ' ' + namaPemain();

    hitungGrid();
    groundPattern = buatPolaTanah();

    snake = [{ x: 4, y: Math.floor(ROWS / 2) }, { x: 3, y: Math.floor(ROWS / 2) }, { x: 2, y: Math.floor(ROWS / 2) }];
    prevSnake = snake.map((p) => ({ ...p }));
    nextSnake = snake.map((p) => ({ ...p }));
    renderPositions = snake.map((p) => ({ ...p }));
    lastTickTime = performance.now();
    tickDuration = preset.tick;
    dir = { x: 1, y: 0 };
    apple = null;
    laneRow = Math.floor(ROWS / 2); // baris jalur lurus awal ular (sama dengan posisi snake di atas)
    obstacles = generateObstacles(jumlahObstacle());
    score = 0; qIndex = 0; mode = 'idle';
    benarCnt = 0; salahCnt = 0; rekorSebelum = 0; lastAnswerLabel = null; clearTimeout(feedbackTimer);
    sisaDetik = 0; totalDetik = 0; // waktu menghitung NAIK, tidak ada batas waktu
    poolSoal = kumpulkanSoal(cfg.kategori);
    spawnApple(false);
    muatSkinDipilih();

    elSkor.textContent = 0;
    if (window.AstaSound) { AstaSound.prepare(['backsound']); AstaSound.mount(btnSettings); AstaSound.startMusic(); }
    elRekor.textContent = '...';
    fetch('/game/skins?guest_token=' + encodeURIComponent(guestToken()))
      .then((r) => r.json())
      .then((data) => { rekorSebelum = (data.progress && data.progress.skor_tertinggi) || 0; elRekor.textContent = rekorSebelum; })
      .catch(() => { elRekor.textContent = 0; });
    elWaktu.textContent = formatWaktu(sisaDetik);
    nextQuestion();

    cancelAnimationFrame(rafId);
    renderLoop();
    clearInterval(tickTimer); tickTimer = setInterval(langkahUlar, preset.tick);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (paused) return;
      sisaDetik += 1;
      elWaktu.textContent = formatWaktu(sisaDetik);
    }, 1000);
    // Interval dipercepat (dulu 500ms) supaya jawaban benar langsung
    // terdeteksi nyaris instan.
    clearInterval(detectInterval); detectInterval = setInterval(pollDetect, 16); // cadangan
    if (detectObserver) detectObserver.disconnect();
    const panelDeteksi = document.getElementById('info-panel'); // tetap diperbarui app.js walau disembunyikan
    if (panelDeteksi) {
      detectObserver = new MutationObserver(() => pollDetect());
      detectObserver.observe(panelDeteksi, { attributes: true, attributeFilter: ['data-state'], childList: true, characterData: true, subtree: true });
    }
  }

  function hentikanLoop() {
    clearInterval(tickTimer); clearInterval(timerInterval); clearInterval(detectInterval);
    if (detectObserver) { detectObserver.disconnect(); detectObserver = null; }
    cancelAnimationFrame(rafId);
    tickTimer = timerInterval = detectInterval = rafId = null;
    if (window.AstaSound) AstaSound.stopMusic();
    tutupKonfirmasi();
    pindahkanKamera(false);
    pindahkanHeader(false);
  }

  function gameOver() { selesai(false); }

  function selesai(menang) {
    hentikanLoop();
    resultTitle.textContent = menang ? 'Selesai!' : 'Game Over';
    resultSkor.textContent = score;
    if (window.AstaHasil) {
      const dijawab = benarCnt + salahCnt;
      const detikMain = Math.max(0, sisaDetik);
      AstaHasil.terapkan({
        popup: screenResult, judul: resultTitle, skor: resultSkor, tombolAnchor: btnUlangi,
        rekor: score > 0 && score > rekorSebelum,
        judulNormal: menang ? 'Selesai!' : 'Game Over',
        stats: [
          { label: 'Waktu', nilai: formatWaktu(detikMain) },
          { label: 'Benar', nilai: benarCnt, kelas: 'stat-good' },
          { label: 'Salah', nilai: salahCnt, kelas: 'stat-bad' },
        ],
        sertifikat: {
          nama: namaPemain(), game: 'Apple Snake', kesulitan: cfg.kesulitan, skor: score,
          waktu: detikMain, akurasi: dijawab ? Math.round((benarCnt / dijawab) * 100) : 0,
          tanggal: new Date().toISOString(),
        },
      });
    }
    resultUnlock.classList.add('hidden');
    rapikanPopupHasil(score, formatWaktu(Math.max(0, sisaDetik)), benarCnt, salahCnt);

    fetch('/game/skins/finish', {
      method: 'POST',
      headers: (window.astaKanda ? window.astaKanda.jsonHeaders() : { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ guest_token: guestToken(), nama: namaPemain(), skor: score, menang }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.skin_baru && data.skin_baru.length) {
          resultUnlock.textContent = '';
          resultUnlock.insertAdjacentHTML('afterbegin', ICON_GIFT);
          resultUnlock.append(' Skin baru terbuka: ' + data.skin_baru.map((s) => s.nama).join(', '));
          resultUnlock.classList.remove('hidden');
        }
      })
      .catch(() => {});

    // Popup di tengah, bukan pindah layar — arena Bermain tetap terlihat di belakang
    screenResult.classList.remove('hidden');
  }

  function muatSkinDipilih() {
    try {
      const s = JSON.parse(localStorage.getItem('astakanda_skin_snake') || 'null');
      if (s) skinSnake = s;
    } catch (e) { /* abaikan */ }
  }

  btnUlangi.addEventListener('click', () => { screenResult.classList.add('hidden'); start(cfg); });

  btnSettings.addEventListener('click', () => { hentikanLoop(); window.AstaKandaGameUI.showSetup(); });
  btnKeluar.addEventListener('click', bukaKonfirmasiKeluar);
  btnLeaderboard.addEventListener('click', () => { hentikanLoop(); window.AstaKandaGameUI.showLeaderboard(); });
  btnLeaderboard2.addEventListener('click', () => { screenResult.classList.add('hidden'); window.AstaKandaGameUI.showLeaderboard(); });
  btnGantiPemain.addEventListener('click', () => { screenResult.classList.add('hidden'); hentikanLoop(); window.AstaKandaGameUI.showSelect(); });

  window.AstaKandaGames = window.AstaKandaGames || {};
  window.AstaKandaGames.apple = { start };
})();