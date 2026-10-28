/* ASTA KANDA — app.js
 * Butuh script CDN (sudah ditaruh di index.blade.php):
 *   @mediapipe/hands, @mediapipe/camera_utils, @mediapipe/drawing_utils
 */
(function () {
  const videoEl   = document.getElementById('input-video');
  const canvasEl  = document.getElementById('output-canvas');
  videoEl.style.display = 'none'; // video asli disembunyikan; yang tampil ke layar adalah gambar dari canvas (lihat onResults) supaya overlay selalu pas menempel, tidak pernah terasa ketinggalan
  const canvasCtx = canvasEl.getContext('2d', { alpha: false });
  const statusEl  = document.getElementById('camera-status');
  const resultEl  = document.getElementById('info-result');
  const barFillEl = document.getElementById('info-bar-fill');

  let latestLandmarks = null; // array of hands, tiap hand = 21 {x,y,z}
  let handsDetected = false;

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // ---------------- Smoothing overlay tangan ----------------
  // MediaPipe Hands mendeteksi ulang tiap frame tanpa smoothing bawaan, jadi
  // titik/garis overlay bisa sedikit "meleset" dari tangan asli saat tangan
  // bergerak cepat. Exponential moving average berikut membuat overlay
  // menempel lebih konsisten & halus di tangan yang sama antar frame.
  let smoothedHands = []; // array of hands, tiap hand = 21 {x,y,z}
  const SMOOTHING_ALPHA = 1; // 0..1 — 1 = ikuti titik mentah tiap frame apa adanya (tanpa redaman) supaya latensi serendah mungkin & selalu presisi menempel di tangan

  function smoothHands(rawHands) {
    const out = rawHands.map((hand, i) => {
      const prev = smoothedHands[i];
      if (!prev || prev.length !== hand.length) {
        return hand.map((p) => ({ x: p.x, y: p.y, z: p.z }));
      }
      return hand.map((p, j) => ({
        x: prev[j].x + (p.x - prev[j].x) * SMOOTHING_ALPHA,
        y: prev[j].y + (p.y - prev[j].y) * SMOOTHING_ALPHA,
        z: prev[j].z + (p.z - prev[j].z) * SMOOTHING_ALPHA,
      }));
    });
    smoothedHands = out;
    return out;
  }

  // ---------------- Pengenal gestur lokal (tanpa Python) ----------------
  // Pencocokan berjalan di browser, tiap frame kamera, tanpa request ke server.
  // Landmark dinormalisasi (pusat = pergelangan, skala = ukuran telapak) sehingga
  // jarak tangan ke kamera tidak lagi memengaruhi hasil.
  const MATCH_THRESHOLD = 0.30; // makin kecil = makin ketat, makin besar = makin longgar
  const K_NEAREST       = 3;    // rata-rata K rekaman terdekat per label
  const STABLE_FRAMES   = 3;    // label harus sama N frame berturut (~60ms). Isi 1 = benar-benar instan
  const ASPECT          = 4 / 3; // rasio kamera 640x480
  const Z_WEIGHT        = 0.5;

  const origFetch = window.fetch.bind(window);
  let sampleDB = [];          // { wordId, label, vec }
  let sampleDBReady = false;
  let stableMatch = null;
  let candLabel = null, candCount = 0;

  function handToPoints(hand) {
    const w = hand[0];
    const d = (a, b) => Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);
    const scale = (d(hand[0], hand[5]) + d(hand[0], hand[9]) + d(hand[0], hand[17]) + d(hand[5], hand[17])) / 4 || 1e-6;
    const pts = [];
    for (let i = 1; i < 21; i++) {
      pts.push(
        ((hand[i].x - w.x) * ASPECT) / scale,
        (hand[i].y - w.y) / scale,
        (((hand[i].z || 0) - (w.z || 0)) / scale) * Z_WEIGHT
      );
    }
    return { pts, scale };
  }

  function buildVector(hands) {
    if (!hands || !hands.length) return null;
    const valid = hands.filter((h) => h && h.length === 21);
    if (!valid.length || valid.length > 2) return null;
    valid.sort((a, b) => a[0].x - b[0].x); // urutan tangan kiri->kanan di layar
    const parts = valid.map(handToPoints);
    const vec = [];
    parts.forEach((p) => p.pts.forEach((v) => vec.push(v)));
    if (parts.length === 2) { // posisi relatif kedua tangan
      const s = (parts[0].scale + parts[1].scale) / 2;
      vec.push(((valid[1][0].x - valid[0][0].x) * ASPECT) / s, (valid[1][0].y - valid[0][0].y) / s, 0);
    }
    return Float32Array.from(vec);
  }

  // Bobot per titik (landmark 1..20). Ujung jari paling berat karena di situlah
  // huruf mirip (C vs D) berbeda; pangkal jari/telapak ringan.
  const POINT_W = [
    0.5, 1, 1.5, 2.5,   // jempol
    0.5, 1, 1.5, 2.5,   // telunjuk
    0.5, 1, 1.5, 2.5,   // jari tengah
    0.5, 1, 1.5, 2.5,   // jari manis
    0.5, 1, 1.5, 2.5,   // kelingking
  ];

  function vecDistance(a, b) {
    let sum = 0, wsum = 0;
    for (let i = 0; i < a.length; i += 3) {
      const p = i / 3;
      const w = p < 40 ? POINT_W[p % 20] : 1; // titik >= 40 = posisi relatif dua tangan
      const dx = a[i] - b[i], dy = a[i + 1] - b[i + 1], dz = a[i + 2] - b[i + 2];
      sum += w * Math.sqrt(dx * dx + dy * dy + dz * dz);
      wsum += w;
    }
    return sum / wsum;
  }

  // Toleransi miring tangan: query diputar ±15° dan ±30° di bidang gambar (titik putar =
  // pergelangan), lalu diambil jarak terkecil. Putaran besar kena penalti kecil supaya
  // huruf yang beda arah (mis. G vs Q, K vs P) tidak tertukar.
  // shortcut: putar hanya ±30° dan biaya pencocokan x5 per frame, tambah sudut atau kurangi sampel bila rekaman >10 ribu
  const ROT_PENALTY = 0.03; // tambahan jarak pada putaran 30°
  const ROT_STEPS = [0, -15, 15, -30, 30].map((deg) => ({
    cos: Math.cos((deg * Math.PI) / 180),
    sin: Math.sin((deg * Math.PI) / 180),
    pen: (Math.abs(deg) / 30) * ROT_PENALTY,
  }));

  function rotateVec(v, c, s) {
    const o = new Float32Array(v.length);
    for (let i = 0; i < v.length; i += 3) {
      if (i / 3 >= 40) { o[i] = v[i]; o[i + 1] = v[i + 1]; } // posisi relatif dua tangan tidak diputar
      else { o[i] = v[i] * c - v[i + 1] * s; o[i + 1] = v[i] * s + v[i + 1] * c; }
      o[i + 2] = v[i + 2];
    }
    return o;
  }
  console.assert(rotateVec(Float32Array.from([1, 0, 0]), 0, 1)[1] === 1, 'rotateVec salah');

  // Bentuk jari: 1 = lurus, makin kecil = makin menekuk (jarak pangkal->ujung dibanding total panjang ruas).
  // Nilainya tidak berubah saat tangan diputar. Dipakai supaya jari lurus (D) tidak dianggap jari melengkung (C).
  // Kalau masih tertukar, naikkan EXT_W. Kalau gestur yang benar jadi "Belum dikenali", turunkan EXT_W / naikkan EXT_TOL.
  const EXT_W   = 1.0;  // bobot penalti beda bentuk jari
  const EXT_TOL = 0.08; // selisih sekecil ini dianggap sama
  const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];

  function fingerExt(v) {
    const out = [];
    for (let base = 0; base + 60 <= v.length; base += 60) { // 60 angka = 1 tangan
      const P = (L) => [v[base + (L - 1) * 3], v[base + (L - 1) * 3 + 1], v[base + (L - 1) * 3 + 2]];
      const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      for (const f of FINGERS) {
        const p = f.map(P);
        const path = d(p[0], p[1]) + d(p[1], p[2]) + d(p[2], p[3]);
        out.push(path ? d(p[0], p[3]) / path : 1);
      }
    }
    return out;
  }

  function extPenalty(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += Math.max(0, Math.abs(a[i] - b[i]) - EXT_TOL);
    return s * EXT_W;
  }
  // self-check: jari yang semua titiknya sejajar = lurus (nilai 1)
  console.assert(fingerExt(Float32Array.from({ length: 60 }, (_, i) => (i % 3 === 0 ? i / 3 + 1 : 0))).every((x) => Math.abs(x - 1) < 1e-6), 'fingerExt salah');

  function matchVector(vec) {
    const queries = ROT_STEPS.map((r) => ({ vec: rotateVec(vec, r.cos, r.sin), pen: r.pen }));
    const qe = fingerExt(vec); // bentuk jari gestur live (sekali per frame)
    const best = new Map(); // "label\u0001variasi" -> K jarak terkecil
    for (const s of sampleDB) {
      if (s.vec.length !== vec.length) continue; // jumlah tangan harus sama
      let d = Infinity; // jarak terdekat dari semua sudut putar
      for (const q of queries) {
        const x = vecDistance(q.vec, s.vec) + q.pen;
        if (x < d) d = x;
      }
      d += extPenalty(qe, s.ext || (s.ext = fingerExt(s.vec))); // jari lurus vs melengkung = makin jauh
      const k = s.label + '\u0001' + s.variant;
      let arr = best.get(k);
      if (!arr) { arr = []; best.set(k, arr); }
      if (arr.length < K_NEAREST) { arr.push(d); arr.sort((a, b) => a - b); }
      else if (d < arr[K_NEAREST - 1]) { arr[K_NEAREST - 1] = d; arr.sort((a, b) => a - b); }
    }
    let bk = null, bs = Infinity;
    best.forEach((arr, k) => {
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      if (m < bs) { bs = m; bk = k; }
    });
    if (bk === null || bs > MATCH_THRESHOLD) return null;
    const parts = bk.split('\u0001');
    return {
      label: parts[0],
      variant: parts[1],
      distance: bs,
      confidence: Math.max(0, Math.min(1, 1 - (bs / MATCH_THRESHOLD) * 0.5)),
    };
  }

  function runRecognition(hands) {
    if (!sampleDBReady || !sampleDB.length) { stableMatch = null; return; }
    const vec = buildVector(hands);
    const m = vec ? matchVector(vec) : null;
    const key = m ? m.label : null;
    if (key === candLabel) candCount++; else { candLabel = key; candCount = 1; }
    if (candCount >= STABLE_FRAMES) stableMatch = m;
  }

  function resetStability() { stableMatch = null; candLabel = null; candCount = 0; }

  function addLocalSample(wordId, label, hands, variant) {
    const vec = buildVector(hands);
    if (vec) sampleDB.push({ wordId: String(wordId), label, variant: variant || 'Umum', vec });
  }
  function removeLocalSamplesByWord(wordId) {
    sampleDB = sampleDB.filter((s) => s.wordId !== String(wordId));
  }
  function removeLocalSamplesByGrid(grid) {
    const ids = new Set(Array.from(grid.querySelectorAll('.word-card')).map((c) => String(c.dataset.wordId)));
    sampleDB = sampleDB.filter((s) => !ids.has(s.wordId));
  }

  function loadSamples() {
    origFetch('/gesture/samples', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((list) => {
        const db = [];
        (list || []).forEach((s) => {
          (s.landmarks || []).forEach((frame) => {
            const vec = buildVector(frame);
            if (vec) db.push({ wordId: String(s.word_id), label: s.label, variant: s.variant || 'Umum', vec });
          });
        });
        sampleDB = db;
        sampleDBReady = true;
        applyVariantCounts();
      })
      .catch((err) => { console.error('Gagal memuat rekaman gestur', err); sampleDBReady = true; });
  }

  // Hasil terkini dalam format yang sama dengan response /gesture/recognize lama
  function currentMatchResponse() {
    if (!latestLandmarks) return { ok: false, message: 'Tangan tidak terdeteksi' };
    if (!sampleDBReady) return { ok: false, message: 'Memuat data gestur...' };
    if (!sampleDB.length) return { ok: false, message: 'Belum ada rekaman gestur.' };
    if (stableMatch) return { ok: true, label: stableMatch.label, variant: stableMatch.variant, confidence: stableMatch.confidence };
    return { ok: false, message: 'Belum dikenali' };
  }

  // Semua kode lama yang memanggil fetch('/gesture/recognize') (Ujian, Apple Snake,
  // Dino Attack) kini dijawab langsung dari pengenal lokal — tanpa jaringan.
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('/gesture/recognize') !== -1) {
      return Promise.resolve(new Response(JSON.stringify(currentMatchResponse()), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }
    return origFetch(input, init);
  };

    // ---------------- Jenis bahasa isyarat (pop up + database) ----------------
  const BH_PAGE_SIZE = 6;
  const BH_ICON_PLUS  = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>';
  const BH_ICON_EDIT  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  const BH_ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  const BH_ICON_PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

  const bhEl = (id) => document.getElementById(id);
  let currentVariant = 'BISINDO'; // jenis bahasa isyarat yang aktif (dipakai saat merekam)
  try { currentVariant = localStorage.getItem('astaVariantActive') || 'BISINDO'; } catch (e) {}

  function labelHasManyVariants(label) {
    const seen = new Set();
    for (const s of sampleDB) {
      if (s.label === label) { seen.add(s.variant); if (seen.size > 1) return true; }
    }
    return false;
  }

    // Jumlah rekaman per bahasa isyarat per label: { BISINDO: { A: 12, Halo: 4 }, SIBI: {...} }
  function variantStats() {
    const out = {};
    sampleDB.forEach((s) => {
      const v = out[s.variant] || (out[s.variant] = {});
      v[s.label] = (v[s.label] || 0) + 1;
    });
    return out;
  }

  // Angka di kartu Belajar = jumlah rekaman pada bahasa isyarat yang sedang dipilih
  function applyVariantCounts() {
    if (!sampleDBReady) return; // data belum siap: biarkan angka dari server
    const cnt = variantStats()[currentVariant] || {};
    document.querySelectorAll('#grid-alfabet .word-card, #grid-kata .word-card').forEach((card) => {
      const c = card.querySelector('.count');
      const n = cnt[card.querySelector('.label').textContent.trim()] || 0;
      c.textContent = n;
      warnaHitungan(c, n);
    });
  }

  (function bhInit() {
    const btn      = bhEl('variant-btn');
    const btnLabel = bhEl('variant-btn-label');
    const modal    = bhEl('modal-bahasa');
    if (!btn || !modal) return;

    const search  = bhEl('bahasa-search');
    const grid    = bhEl('bahasa-grid');
    const prev    = bhEl('bahasa-prev');
    const next    = bhEl('bahasa-next');
    const dots    = bhEl('bahasa-dots');

    const formModal  = bhEl('modal-bahasa-form');
    const formIcon   = bhEl('bahasa-form-icon');
    const formTitle  = bhEl('bahasa-form-title');
    const formInput  = bhEl('bahasa-form-input');
    const formError  = bhEl('bahasa-form-error');
    const formSimpan = bhEl('bahasa-form-simpan');

    const delModal  = bhEl('modal-bahasa-hapus');
    const delText   = bhEl('bahasa-hapus-text');
    const delError  = bhEl('bahasa-hapus-error');
    const delKonfirm = bhEl('bahasa-hapus-konfirmasi');

    let list = [];      // semua jenis bahasa isyarat dari database
    let page = 1;
    let editing = null;
    let deleting = null;

    const headers = () => {
      const m = document.querySelector('meta[name="csrf-token"]');
      return { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': m ? m.content : '' };
    };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function setVariant(nama) {
      currentVariant = nama;
      btnLabel.textContent = nama;
      try { localStorage.setItem('astaVariantActive', nama); } catch (e) {}
      applyVariantCounts();
    }

    function defaultName() {
      const d = list.find((l) => l.is_default);
      return d ? d.nama : 'BISINDO';
    }
    function filtered() {
      const q = search.value.trim().toLowerCase();
      return q ? list.filter((l) => l.nama.toLowerCase().includes(q)) : list;
    }

    function render() {
      const items = filtered();
      const pages = Math.max(1, Math.ceil(items.length / BH_PAGE_SIZE));
      if (page > pages) page = pages;
      if (page < 1) page = 1;
      const slice = items.slice((page - 1) * BH_PAGE_SIZE, page * BH_PAGE_SIZE);

      grid.innerHTML = '';
      if (!slice.length) {
        grid.innerHTML = '<div class="bh-empty">Jenis bahasa isyarat tidak ditemukan.</div>';
      }
      slice.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'bh-card' + (item.nama === currentVariant ? ' is-active' : '');
        card.dataset.id = item.id;
        card.setAttribute('role', 'button');
        card.innerHTML =
          '<div class="bh-card-info">' +
            '<span class="bh-card-name">' + esc(item.nama) + '</span>' +
            '<span class="bh-card-sub">' + (item.is_default ? 'Bawaan · ' : '') + item.samples_count + ' rekaman</span>' +
          '</div>' +
          '<div class="bh-card-actions">' +
            '<button type="button" class="bh-icon-btn" data-act="edit" title="Edit" aria-label="Edit">' + BH_ICON_EDIT + '</button>' +
            '<button type="button" class="bh-icon-btn' + (item.is_default ? ' is-disabled' : '') + '" data-act="delete" ' +
              'title="' + (item.is_default ? 'Bawaan, tidak bisa dihapus' : 'Hapus') + '" aria-label="Hapus">' + BH_ICON_TRASH + '</button>' +
          '</div>';
        grid.appendChild(card);
      });

      dots.innerHTML = '';
      for (let i = 1; i <= pages; i++) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'bh-dot' + (i === page ? ' is-active' : '');
        d.dataset.page = i;
        d.setAttribute('aria-label', 'Halaman ' + i);
        dots.appendChild(d);
      }
      prev.disabled = page <= 1;
      next.disabled = page >= pages;
    }

    function load() {
      return origFetch('/bahasa-isyarat', { headers: { Accept: 'application/json' } })
        .then((r) => r.json())
        .then((data) => {
          list = Array.isArray(data) ? data : [];
          if (list.length && !list.some((l) => l.nama === currentVariant)) setVariant(defaultName());
          render();
        })
        .catch(() => render());
    }

    function jumpTo(nama) {
      search.value = '';
      const idx = list.findIndex((l) => l.nama === nama);
      page = idx >= 0 ? Math.floor(idx / BH_PAGE_SIZE) + 1 : 1;
      render();
    }

    function openList() {
      search.value = '';
      const idx = list.findIndex((l) => l.nama === currentVariant);
      page = idx >= 0 ? Math.floor(idx / BH_PAGE_SIZE) + 1 : 1;
      render();
      modal.classList.remove('hidden');
      load();
    }
    function closeList() { modal.classList.add('hidden'); }

    // ---- tambah / edit ----
    function showFormError(msg) { formError.textContent = msg; formError.classList.remove('hidden'); }
    function openForm(item) {
      editing = item || null;
      formTitle.textContent = item ? 'Edit Jenis Bahasa Isyarat' : 'Tambah Jenis Bahasa Isyarat';
      formIcon.innerHTML = item ? BH_ICON_PENCIL : BH_ICON_PLUS;
      formInput.value = item ? item.nama : '';
      formError.classList.add('hidden');
      formModal.classList.remove('hidden');
      setTimeout(() => formInput.focus(), 30);
    }
    function closeForm() { formModal.classList.add('hidden'); editing = null; }

    function submitForm() {
      const nama = formInput.value.trim();
      if (!nama) { showFormError('Nama wajib diisi.'); return; }
      const current = editing;
      formSimpan.disabled = true;
      origFetch(current ? '/bahasa-isyarat/' + current.id : '/bahasa-isyarat', {
        method: current ? 'PUT' : 'POST',
        headers: headers(),
        body: JSON.stringify({ nama }),
      })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) {
            showFormError((data.errors && data.errors.nama && data.errors.nama[0]) || data.message || 'Gagal menyimpan.');
            return null;
          }
          if (current) { // rename ikut ke rekaman lokal
            sampleDB.forEach((s) => { if (s.variant === current.nama) s.variant = nama; });
            if (currentVariant === current.nama) setVariant(nama);
          }
          closeForm();
          return load().then(() => jumpTo(nama));
        })
        .catch(() => showFormError('Gagal menyimpan. Coba lagi.'))
        .finally(() => { formSimpan.disabled = false; });
    }

    // ---- hapus ----
    function openDelete(item) {
      deleting = item;
      delText.innerHTML = 'Jenis "<b>' + esc(item.nama) + '</b>" beserta <b>' + item.samples_count + ' rekaman</b> gestur di dalamnya akan dihapus permanen.';
      delError.classList.add('hidden');
      delModal.classList.remove('hidden');
    }
    function closeDelete() { delModal.classList.add('hidden'); deleting = null; }

    function confirmDelete() {
      const item = deleting;
      if (!item) return;
      delKonfirm.disabled = true;
      origFetch('/bahasa-isyarat/' + item.id, { method: 'DELETE', headers: headers() })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
          if (!ok) { delError.textContent = data.message || 'Gagal menghapus.'; delError.classList.remove('hidden'); return null; }
          sampleDB = sampleDB.filter((s) => s.variant !== item.nama);
          if (currentVariant === item.nama) setVariant(defaultName());
          applyVariantCounts();
          closeDelete();
          return load();
        })
        .catch(() => { delError.textContent = 'Gagal menghapus. Coba lagi.'; delError.classList.remove('hidden'); })
        .finally(() => { delKonfirm.disabled = false; });
    }

    // ---- event ----
    btn.addEventListener('click', openList);
    bhEl('bahasa-close').addEventListener('click', closeList);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeList(); });
    search.addEventListener('input', () => { page = 1; render(); });
    bhEl('bahasa-btn-tambah').addEventListener('click', () => openForm(null));
    prev.addEventListener('click', () => { page -= 1; render(); });
    next.addEventListener('click', () => { page += 1; render(); });
    dots.addEventListener('click', (e) => {
      const d = e.target.closest('.bh-dot');
      if (d) { page = parseInt(d.dataset.page, 10) || 1; render(); }
    });
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.bh-card');
      if (!card) return;
      const item = list.find((l) => String(l.id) === card.dataset.id);
      if (!item) return;
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.classList.contains('is-disabled')) return;
        if (act.dataset.act === 'edit') openForm(item); else openDelete(item);
        return;
      }
      setVariant(item.nama);
      closeList();
    });

    bhEl('bahasa-form-batal').addEventListener('click', closeForm);
    formModal.addEventListener('click', (e) => { if (e.target === formModal) closeForm(); });
    formSimpan.addEventListener('click', submitForm);
    formInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitForm(); } });

    bhEl('bahasa-hapus-batal').addEventListener('click', closeDelete);
    delModal.addEventListener('click', (e) => { if (e.target === delModal) closeDelete(); });
    delKonfirm.addEventListener('click', confirmDelete);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (!delModal.classList.contains('hidden')) closeDelete();
      else if (!formModal.classList.contains('hidden')) closeForm();
      else if (!modal.classList.contains('hidden')) closeList();
    });

    btnLabel.textContent = currentVariant;
    load();
  })();

  // ---------------- Tagline animasi (huruf bergelombang) ----------------
  const tagline = document.getElementById('tagline');
  if (tagline) {
    const text = tagline.textContent.trim().toUpperCase();
    tagline.textContent = '';
    let idx = 0;
    text.split(/\s+/).forEach((word) => {
      const w = document.createElement('span');
      w.className = 'tw-word';
      w.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'tw-letter';
        s.style.setProperty('--i', idx++);
        s.textContent = ch;
        w.appendChild(s);
      });
      tagline.appendChild(w);
    });
  }

  // ---------------- Detektor tangan + render kamera ----------------
  // Prinsip: gambar kamera & landmark SELALU berasal dari frame yang sama persis
  // (frame disalin sekali, dideteksi, lalu landmark digambar di salinan itu juga).
  // Jadi landmark tidak pernah meleset / tertinggal dari tangan di layar.
  //  - Detektor utama: MediaPipe Tasks Vision (GPU). Kalau gagal dimuat, otomatis pakai MediaPipe Hands lama.
  //  - Deteksi dijalankan di sela-sela frame (setelah rAF selesai) dan hanya untuk frame kamera baru.
  //  - Filter anti-hantu: tangan palsu disaring lewat skor, bentuk, dan harus muncul beberapa kali berturut-turut.
  const TASKS_URL      = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

  const MIN_HAND_SCORE    = 0.75; // skor "ini benar-benar tangan" minimal (0..1). Naikkan kalau masih ada tangan hantu
  const SHOW_AFTER_FRAMES = 2;    // tangan harus terdeteksi N hasil berturut-turut dulu sebelum overlay muncul
  const STALE_MS          = 250;  // kalau tidak ada hasil deteksi baru selama ini, overlay dihapus (anti landmark nyangkut)
  const DET_WIDTH         = 320;  // lebar gambar yang dikirim ke detektor. Makin kecil makin cepat (mis. 256), makin besar makin teliti

  const HAND_LINKS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
                      [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

  const mkCanvas = () => document.createElement('canvas');
  const frameCanvas = mkCanvas(), frameCtx = frameCanvas.getContext('2d');           // salinan frame kamera (ukuran penuh)
  const detCanvas   = mkCanvas(), detCtx   = detCanvas.getContext('2d');             // salinan kecil -> masuk ke detektor
  const shownCanvas = mkCanvas(), shownCtx = shownCanvas.getContext('2d', { alpha: false }); // frame + landmark yang SEBANGUN
  let vidW = 0, vidH = 0;

  let detector = null;             // { detect(image) -> Promise<{ hands, scores }> }
  let inferBusy = false;
  let seenFrames = 0;
  let lastResultTs = 0;
  let lastShownTs = 0;
  let lastStatusText = '';
  let newVideoFrame = false, lastVideoFrameTs = 0;

  function setStatusText(t) {
    if (t === lastStatusText) return;
    lastStatusText = t;
    statusEl.querySelector('span').textContent = t;
  }

  function ensureSizes(w, h) { // ukuran hanya diubah kalau memang berubah (mengubahnya = reset canvas)
    if (w === vidW && h === vidH) return;
    vidW = w; vidH = h;
    [frameCanvas, shownCanvas, canvasEl].forEach((c) => { c.width = w; c.height = h; });
    detCanvas.width = Math.min(DET_WIDTH, w);
    detCanvas.height = Math.round((detCanvas.width * h) / w);
  }

  // ---- Detektor 1: MediaPipe Tasks Vision (utama) ----
  async function createTasksDetector() {
    const mod = await import(TASKS_URL + '/vision_bundle.mjs');
    const fileset = await mod.FilesetResolver.forVisionTasks(TASKS_URL + '/wasm');
    const landmarker = await mod.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.7,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    let lastTs = 0;
    return {
      detect(image) {
        let ts = performance.now();
        if (ts <= lastTs) ts = lastTs + 1; // timestamp wajib naik terus
        lastTs = ts;
        const r = landmarker.detectForVideo(image, ts);
        const hd = r.handedness || r.handednesses || [];
        return Promise.resolve({
          hands: r.landmarks || [],
          scores: hd.map((a) => (a && a[0] ? a[0].score : 1)),
        });
      },
    };
  }

  // ---- Detektor 2: MediaPipe Hands lama (cadangan) ----
  function createLegacyDetector() {
    const h = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    h.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
    let pending = null;
    h.onResults((r) => {
      if (!pending) return;
      const done = pending; pending = null;
      done({
        hands: r.multiHandLandmarks || [],
        scores: (r.multiHandedness || []).map((m) => m.score),
      });
    });
    return {
      detect: (image) => new Promise((resolve, reject) => {
        pending = resolve;
        h.send({ image }).catch((e) => { pending = null; reject(e); });
      }),
    };
  }

  async function initDetector() {
    try { return await createTasksDetector(); }
    catch (e) { console.warn('Tasks Vision gagal, pakai MediaPipe Hands lama:', e); }
    return createLegacyDetector();
  }

  // ---- Filter anti tangan palsu ----
  function isPlausibleHand(hand, score) {
    if (!hand || hand.length !== 21 || score < MIN_HAND_SCORE) return false;
    const d = (a, b) => Math.hypot((a.x - b.x) * ASPECT, a.y - b.y);
    const palm = d(hand[0], hand[9]);                       // pergelangan -> pangkal jari tengah
    if (palm < 0.03 || palm > 0.9) return false;            // terlalu kecil / besar untuk tangan
    if (d(hand[0], hand[12]) > palm * 3.2) return false;    // jari tidak masuk akal panjangnya
    const wid = d(hand[5], hand[17]);                       // lebar telapak
    if (wid < palm * 0.12 || wid > palm * 2.2) return false;
    let outside = 0;
    for (const p of hand) if (p.x < -0.15 || p.x > 1.15 || p.y < -0.15 || p.y > 1.15) outside++;
    return outside <= 4;
  }

  // ---- Gambar landmark (semua garis 1x stroke, semua titik 1x fill = ringan) ----
  function drawHand(ctx, lm, w, h) {
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (const [a, b] of HAND_LINKS) {
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
    }
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    for (const p of lm) {
      const x = p.x * w, y = p.y * h;
      ctx.moveTo(x + 8, y);
      ctx.arc(x, y, 8, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // Frame yang sudah disalin + landmark HASIL DETEKSI frame itu -> satu gambar yang pasti sinkron
  function present(list) {
    shownCtx.drawImage(frameCanvas, 0, 0);
    for (const lm of list) drawHand(shownCtx, lm, vidW, vidH);
    lastShownTs = performance.now();
  }

  function clearHands() {
    if (latestLandmarks) {
      smoothedHands = [];
      latestLandmarks = null;
      resetStability();
    }
    handsDetected = false;
    setStatusText(detector ? 'Mencari Tangan...' : 'Memuat model...');
    updateInfoPanel();
  }

  function handleDetection(res) {
    lastResultTs = performance.now();
    const valid = [];
    for (let i = 0; i < res.hands.length; i++) {
      const hand = res.hands[i].map((p) => ({ x: p.x, y: p.y, z: p.z }));
      const score = res.scores[i] !== undefined ? res.scores[i] : 1;
      if (isPlausibleHand(hand, score)) valid.push(hand);
    }
    seenFrames = valid.length ? seenFrames + 1 : 0;

    if (!valid.length || seenFrames < SHOW_AFTER_FRAMES) { clearHands(); present([]); return; }

    handsDetected = true;
    setStatusText('Tangan Terdeteksi');
    const smoothed = smoothHands(valid);
    latestLandmarks = smoothed; // dipakai untuk rekam & pengenalan gestur (tidak berubah)
    runRecognition(smoothed);   // pencocokan lokal, langsung di frame ini
    updateInfoPanel();
    present(smoothed);          // gambar frame + landmark yang sama persis
  }

  // ---- Deteksi dijalankan di sela-sela frame, hanya untuk frame kamera baru ----
  function watchVideoFrames() {
    if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return;
    const cb = () => { newVideoFrame = true; lastVideoFrameTs = performance.now(); videoEl.requestVideoFrameCallback(cb); };
    videoEl.requestVideoFrameCallback(cb);
  }
  function hasNewVideoFrame() {
    if (newVideoFrame) { newVideoFrame = false; return true; }
    return performance.now() - lastVideoFrameTs > 120; // callback tidak aktif/tidak didukung -> anggap selalu baru
  }
  function runDetect() {
    if (inferBusy || videoEl.readyState < 2 || !videoEl.videoWidth || !hasNewVideoFrame()) return;
    ensureSizes(videoEl.videoWidth, videoEl.videoHeight);
    // Dua salinan dari frame yang SAMA (satu tugas JS = video tidak berganti frame di tengah-tengah)
    frameCtx.drawImage(videoEl, 0, 0, vidW, vidH);
    detCtx.drawImage(videoEl, 0, 0, detCanvas.width, detCanvas.height);
    if (!detector) { present([]); return; } // model belum siap: tetap tampilkan kamera
    inferBusy = true;
    detector.detect(detCanvas)
      .then(handleDetection)
      .catch((e) => { console.error(e); present([]); })
      .finally(() => { inferBusy = false; });
  }
  const detectChannel = new MessageChannel();
  detectChannel.port1.onmessage = runDetect;

  // ---- Render: hanya menampilkan gambar yang sudah sinkron, tanpa menunggu apa pun ----
  function renderFrame() {
    requestAnimationFrame(renderFrame);
    if (videoEl.readyState < 2 || !videoEl.videoWidth) return;
    const now = performance.now();

    if (latestLandmarks && now - lastResultTs > STALE_MS) clearHands();

    if (vidW && now - lastShownTs < STALE_MS) {
      canvasCtx.drawImage(shownCanvas, 0, 0);
    } else { // cadangan: kalau deteksi macet jangan sampai gambar beku
      ensureSizes(videoEl.videoWidth, videoEl.videoHeight);
      canvasCtx.drawImage(videoEl, 0, 0, vidW, vidH);
    }
    detectChannel.port2.postMessage(0); // deteksi jalan SETELAH frame ini selesai, bukan menahannya
  }

  async function startCamera() {
    setStatusText('Memuat model...');
    initDetector().then((d) => { detector = d; setStatusText('Mencari Tangan...'); });

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 60 } },
      });
    } catch (e) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true }); // kamera yang tidak mendukung syarat di atas
    }
    videoEl.srcObject = stream;
    await videoEl.play();
    watchVideoFrames();
    requestAnimationFrame(renderFrame);
  }
  startCamera().catch((err) => {
    setStatusText('Kamera tidak tersedia');
    console.error(err);
  });

  // ---------------- Elemen utama ----------------
  const gridAlfabet = document.getElementById('grid-alfabet');
  const gridKata    = document.getElementById('grid-kata');
  const searchInput = document.getElementById('search-input');
  const searchClear  = document.getElementById('search-clear');
  const btnTambah   = document.getElementById('btn-tambah');
  const btnReset    = document.getElementById('btn-reset');

  // ---------------- Warna indikator jumlah rekaman ----------------
  // 0     -> netral (belum direkam)
  // 1-4   -> tab-riwayat (masih sedikit)
  // 5-9   -> tab-ujian (lumayan)
  // >=10  -> tab-belajar (sudah banyak/mantap)
  function warnaHitungan(el, n) {
    n = parseInt(n, 10) || 0;
    if (n <= 0) {
      el.style.background = '';
      el.style.color = '';
    } else if (n < 5) {
      el.style.background = 'var(--tab-riwayat)';
      el.style.color = '#fff';
    } else if (n < 10) {
      el.style.background = 'var(--tab-ujian)';
      el.style.color = '#fff';
    } else {
      el.style.background = 'var(--tab-belajar)';
      el.style.color = '#fff';
    }
  }
  document.querySelectorAll('.word-card .count').forEach((el) => warnaHitungan(el, el.textContent));

  // ---------------- Tombol reset per kartu (ikon saja, di kiri ✕) ----------------
  const ICON_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
  function addResetBtn(card) {
    if (card.querySelector('.reset-x')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'reset-x';
    b.title = 'Reset rekaman kartu';
    b.setAttribute('aria-label', 'Reset rekaman kartu');
    b.innerHTML = ICON_RESET;
    card.insertBefore(b, card.querySelector('.del-x'));
  }
  document.querySelectorAll('.word-card').forEach(addResetBtn);

  let activeSubtab = 'alfabet';

  const activeGrid = () => (activeSubtab === 'alfabet' ? gridAlfabet : gridKata);
  const activeType = () => (activeSubtab === 'alfabet' ? 'alphabet' : 'word');

  function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  }
  function jsonHeaders() {
    return { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() };
  }

  // Dipakai oleh ujian.js (kamera & deteksi gestur dibagi bersama, satu stream saja)
  window.astaKanda = {
    getLatestLandmarks: () => latestLandmarks,
    jsonHeaders,
    getVariantStats: variantStats,          // dipakai Atur Soal di ujian.js
    getActiveVariant: () => currentVariant, // bahasa aktif di tab Belajar
  };

  // ---------------- Tab bar ----------------
  const leftCol = document.getElementById('left-col');
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      btn.classList.add('is-active');
      document.getElementById('panel-' + btn.dataset.tab).classList.remove('hidden');
      // Kamera & Info Deteksi dipakai bersama tab Belajar dan Ujian saja
      const showCamera = btn.dataset.tab === 'belajar' || btn.dataset.tab === 'ujian';
      leftCol.classList.toggle('hidden', !showCamera);
    });
  });

  // ---------------- Sub-tab Alfabet / Kata ----------------
  document.querySelectorAll('.subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.remove('is-active'));
      gridAlfabet.classList.add('hidden');
      gridKata.classList.add('hidden');
      btn.classList.add('is-active');
      activeSubtab = btn.dataset.subtab;
      document.getElementById('grid-' + activeSubtab).classList.remove('hidden');
      searchInput.value = '';
      searchClear.classList.remove('is-visible');
      refreshUI();
    });
  });

  // ---------------- Status UI: tombol Tambah, pencarian, pesan kosong ----------------
  function missingLetters() {
    const present = new Set(
      Array.from(gridAlfabet.querySelectorAll('.word-card .label'))
        .map((l) => l.textContent.trim().toUpperCase())
    );
    return ALPHABET.filter((l) => !present.has(l));
  }

  function applySearch() {
    const q = searchInput.value.trim().toLowerCase();
    activeGrid().querySelectorAll('.word-card').forEach((card) => {
      const label = card.querySelector('.label').textContent.toLowerCase();
      card.classList.toggle('hidden', q !== '' && !label.includes(q));
    });
  }

  function updateEmpty() {
    const grid = activeGrid();
    let note = grid.querySelector('.empty-note');
    const total = grid.querySelectorAll('.word-card').length;
    const visible = grid.querySelectorAll('.word-card:not(.hidden)').length;
    const IMG = (window.ASTA_IMAGES || {});
    let html = '';
    if (!visible) {
      if (total) {
        html =
          '<img class="empty-img" src="' + IMG.notfound + '" alt="">' +
          '<div class="empty-title">Tidak Ditemukan</div>' +
          '<div class="empty-sub">Coba kata kunci lain atau periksa ejaannya.</div>';
      } else if (activeSubtab === 'kata') {
        html =
          '<img class="empty-img" src="' + IMG.add + '" alt="">' +
          '<div class="empty-title">Belum Ada Kata</div>' +
          '<div class="empty-sub">Klik <span class="empty-chip">+ Tambah</span> untuk menambahkan kata pertamamu.</div>';
      } else {
        html =
          '<img class="empty-img" src="' + IMG.add + '" alt="">' +
          '<div class="empty-title">Semua Alfabet Terhapus</div>' +
          '<div class="empty-sub">Klik <span class="empty-chip">+ Tambah</span> untuk mengembalikan huruf.</div>';
      }
    }
    if (html) {
      if (!note) {
        note = document.createElement('div');
        note.className = 'empty-note';
        grid.appendChild(note);
      }
      note.innerHTML = html;
    } else if (note) {
      note.remove();
    }
  }

  function refreshUI() {
    const isAlfabet = activeSubtab === 'alfabet';
    // Alfabet: Tambah hanya muncul jika ada huruf yang sudah dihapus. Kata: selalu ada.
    btnTambah.classList.toggle('hidden', isAlfabet && missingLetters().length === 0);
    searchInput.placeholder = isAlfabet ? 'Cari alfabet...' : 'Cari kata...';
    applySearch();
    updateEmpty();
  }

  searchInput.addEventListener('input', () => {
    searchClear.classList.toggle('is-visible', searchInput.value.trim() !== '');
    applySearch();
    updateEmpty();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('is-visible');
    applySearch();
    updateEmpty();
    searchInput.focus();
  });

  // ---------------- Rekam gestur (tahan kartu, otomatis rekam banyak sampel) ----------------
  // Selama kartu ditahan, tiap ~100ms langsung dikirim sebagai satu sampel baru
  // (bukan menumpuk frame lalu kirim sekali di akhir) — supaya variasi gestur dari
  // sudut/posisi tangan yang sedikit berbeda selama ditahan ikut tersimpan otomatis.
  let recordTimer = null;
  let recordingCard = null;

  function setCount(card, n) {
    card.querySelector('.count').textContent = n;
  }

  function kirimSampel(card) {
    if (!latestLandmarks) return; // tangan tidak terdeteksi saat ini, lewati tick ini
    const countEl = card.querySelector('.count');
    countEl.textContent = (parseInt(countEl.textContent, 10) || 0) + 1; // naik langsung, real-time, tidak menunggu server
    addLocalSample(card.dataset.wordId, card.querySelector('.label').textContent.trim(), latestLandmarks, currentVariant); // langsung dikenali tanpa reload
    warnaHitungan(countEl, countEl.textContent);

    fetch('/gesture/record', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ gesture_word_id: card.dataset.wordId, landmarks: [latestLandmarks], variant: currentVariant }),
    })
      .then((r) => { if (!r.ok) throw new Error('Gagal menyimpan sampel'); })
      .catch(() => {
        // Gagal tersimpan di server -> koreksi kembali angkanya
        countEl.textContent = Math.max(0, (parseInt(countEl.textContent, 10) || 1) - 1);
        warnaHitungan(countEl, countEl.textContent);
      });
  }

  function startRecording(card) {
    if (recordingCard) return;
    recordingCard = card;
    card.classList.add('is-recording');
    kirimSampel(card); // rekam langsung begitu kartu ditekan
    recordTimer = setInterval(() => kirimSampel(card), 100);
  }

  function stopRecording() {
    if (!recordingCard) return;
    const card = recordingCard;
    clearInterval(recordTimer);
    recordTimer = null;
    recordingCard = null;
    card.classList.remove('is-recording');
  }

  [gridAlfabet, gridKata].forEach((grid) => {
    grid.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('.del-x, .reset-x')) return;
      const card = e.target.closest('.word-card');
      if (card) startRecording(card);
    });
    grid.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  window.addEventListener('pointerup', stopRecording);
  window.addEventListener('pointercancel', stopRecording);
  window.addEventListener('blur', stopRecording);

  // ---------------- Popup proses (reset/hapus, progress bar otomatis hilang) ----------------
  const modalProses      = document.getElementById('modal-proses');
  const modalProsesTitle = document.getElementById('modal-proses-title');
  const modalProsesBar   = document.getElementById('modal-proses-bar');
  let prosesTimer = null;

  function tampilkanProses(judul, durasiMs) {
    if (!modalProses) return;
    modalProsesTitle.textContent = judul;
    modalProsesBar.style.transition = 'none';
    modalProsesBar.style.width = '0%';
    modalProses.classList.remove('hidden');
    void modalProsesBar.offsetWidth; // paksa reflow supaya transisi width jalan mulus dari 0%
    modalProsesBar.style.transition = 'width ' + durasiMs + 'ms linear';
    modalProsesBar.style.width = '100%';
    clearTimeout(prosesTimer);
    prosesTimer = setTimeout(() => modalProses.classList.add('hidden'), durasiMs + 50);
  }

  // ---------------- Modal konfirmasi hapus ----------------
  const modalHapus         = document.getElementById('modal-hapus');
  const modalHapusTitle    = document.getElementById('modal-hapus-title');
  const modalHapusText     = document.getElementById('modal-hapus-text');
  const modalHapusBatal    = document.getElementById('modal-hapus-batal');
  const modalHapusKonfirm  = document.getElementById('modal-hapus-konfirmasi');
  let cardPendingDelete    = null;
  let deletePendingSubtab  = 'kata';

  [gridAlfabet, gridKata].forEach((grid, gi) => {
    const subtab = gi === 0 ? 'alfabet' : 'kata';
    grid.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.del-x');
      if (!delBtn) return;
      e.stopPropagation();
      cardPendingDelete = delBtn.closest('.word-card');
      deletePendingSubtab = subtab;
      const label = cardPendingDelete.querySelector('.label').textContent;
      const isAlfabet = subtab === 'alfabet';
      modalHapusTitle.textContent = isAlfabet ? 'Hapus Huruf?' : 'Hapus Kata?';
      modalHapusText.textContent = (isAlfabet ? 'Huruf "' : 'Kata "') + label + '" akan dihapus permanen.';
      modalHapus.classList.remove('hidden');
    });
  });

  modalHapusBatal.addEventListener('click', () => {
    cardPendingDelete = null;
    modalHapus.classList.add('hidden');
  });
  modalHapus.addEventListener('click', (e) => {
    if (e.target === modalHapus) modalHapusBatal.click();
  });

  modalHapusKonfirm.addEventListener('click', () => {
    if (!cardPendingDelete) return;
    const card = cardPendingDelete;
    const wordId = card.dataset.wordId;
    cardPendingDelete = null;
    modalHapus.classList.add('hidden');

    removeLocalSamplesByWord(wordId);
    card.remove(); // langsung hilang dari tampilan, tanpa menunggu respons server
    deletePendingSubtab = null;
    refreshUI();
    tampilkanProses('Menghapus...', 500);

    fetch('/gesture/words/' + wordId, {
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': csrfToken() },
    }).catch(console.error);
  });

  // ---------------- Modal Tambah ----------------
  // Kata    : cukup ketik kata lalu simpan (kartu baru muncul dengan jumlah 0).
  // Alfabet : pilih huruf yang sebelumnya dihapus untuk dikembalikan.
  const modal          = document.getElementById('modal-tambah');
  const modalTitle     = document.getElementById('modal-tambah-title');
  const modalKataWrap  = document.getElementById('modal-kata-wrap');
  const modalAlfWrap   = document.getElementById('modal-alfabet-wrap');
  const letterPicker   = document.getElementById('letter-picker');
  const modalError     = document.getElementById('modal-error');
  const btnBatal       = document.getElementById('modal-batal');
  const btnSimpan      = document.getElementById('modal-simpan');
  const inputLabel     = document.getElementById('modal-input-label');
  let selectedLetters  = new Set();

  function showError(msg) {
    modalError.textContent = msg;
    modalError.classList.remove('hidden');
  }

  btnTambah.addEventListener('click', () => {
    modalError.classList.add('hidden');
    btnSimpan.disabled = false;
    if (activeSubtab === 'kata') {
      modalTitle.textContent = 'Tambah Kata Baru';
      modalKataWrap.classList.remove('hidden');
      modalAlfWrap.classList.add('hidden');
      inputLabel.value = '';
      modal.classList.remove('hidden');
      inputLabel.focus();
    } else {
      modalTitle.textContent = 'Kembalikan Alfabet';
      modalKataWrap.classList.add('hidden');
      modalAlfWrap.classList.remove('hidden');
      selectedLetters = new Set();
      letterPicker.innerHTML = '';
      missingLetters().forEach((letter) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'neu-btn letter-chip';
        chip.textContent = letter;
        chip.addEventListener('click', () => {
          if (selectedLetters.has(letter)) selectedLetters.delete(letter);
          else selectedLetters.add(letter);
          chip.classList.toggle('is-active', selectedLetters.has(letter));
        });
        letterPicker.appendChild(chip);
      });
      modal.classList.remove('hidden');
    }
  });

  btnBatal.addEventListener('click', () => modal.classList.add('hidden'));
  inputLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSimpan.click(); });

  function postWord(label, type) {
    return fetch('/gesture/words', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ label, type }),
    }).then((r) => {
      if (r.ok) return r.json();
      return r.json().catch(() => ({})).then((d) => {
        const err = new Error('HTTP ' + r.status);
        if (r.status === 422) {
          err.userMessage = (d.errors && d.errors.label && d.errors.label[0]) ||
            'Nama "' + label + '" sudah dipakai.';
        }
        throw err;
      });
    });
  }

  btnSimpan.addEventListener('click', () => {
    modalError.classList.add('hidden');

    if (activeSubtab === 'kata') {
      const label = inputLabel.value.trim();
      if (!label) return showError('Isi kata dulu.');
      const exists = Array.from(gridKata.querySelectorAll('.word-card .label'))
        .some((l) => l.textContent.trim().toLowerCase() === label.toLowerCase());
      if (exists) return showError('Kata "' + label + '" sudah ada.');

      btnSimpan.disabled = true;
      postWord(label, 'word')
        .then((word) => { addWordCard(word, 'word'); modal.classList.add('hidden'); })
        .catch((err) => { console.error(err); showError(err.userMessage || 'Gagal menyimpan kata. Coba lagi.'); })
        .finally(() => { btnSimpan.disabled = false; });
    } else {
      const letters = Array.from(selectedLetters);
      if (!letters.length) return showError('Pilih minimal satu huruf.');

      btnSimpan.disabled = true;
      Promise.all(letters.map((l) => postWord(l, 'alphabet')))
        .then((words) => { words.forEach((w) => addWordCard(w, 'alphabet')); modal.classList.add('hidden'); })
        .catch((err) => { console.error(err); showError(err.userMessage || 'Gagal mengembalikan huruf. Coba lagi.'); })
        .finally(() => { btnSimpan.disabled = false; });
    }
  });

  function addWordCard(word, type) {
    const grid = type === 'alphabet' ? gridAlfabet : gridKata;
    const card = document.createElement('div');
    card.className = 'word-card neu-btn';
    card.dataset.wordId = word.id;

    const del = document.createElement('button');
    del.className = 'del-x';
    del.title = 'Hapus';
    del.textContent = '✕';

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = word.label;

    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = word.samples_count || 0;

    card.append(del, label, count);
    addResetBtn(card);

    if (type === 'alphabet') {
      // sisipkan sesuai urutan A–Z
      const next = Array.from(grid.querySelectorAll('.word-card')).find(
        (c) => c.querySelector('.label').textContent.trim().toUpperCase() > String(word.label).toUpperCase()
      );
      grid.insertBefore(card, next || null);
    } else {
      grid.appendChild(card);
    }
    refreshUI();
  }

  // ---------------- Modal Reset (per tab: Alfabet / Kata, atau satu kartu) ----------------
  const modalReset        = document.getElementById('modal-reset');
  const modalResetTitle   = document.getElementById('modal-reset-title');
  const modalResetText    = document.getElementById('modal-reset-text');
  const modalResetBatal   = document.getElementById('modal-reset-batal');
  const modalResetKonfirm = document.getElementById('modal-reset-konfirmasi');
  let resetTarget = null; // { subtab, type } untuk satu tab, atau { card } untuk satu kartu

  btnReset.addEventListener('click', () => {
    resetTarget = { subtab: activeSubtab, type: activeType() };
    const isAlfabet = activeSubtab === 'alfabet';
    const nama = isAlfabet ? 'Alfabet' : 'Kata';
    modalResetTitle.textContent = 'Reset Rekaman ' + nama + '?';
    modalResetText.textContent = isAlfabet
      ? 'Semua rekaman huruf A–Z dihapus. Kartu tetap ada, jumlah 0.'
      : 'Semua rekaman kata dihapus. Kartu tetap ada, jumlah 0.';
    modalResetKonfirm.disabled = false;
    modalReset.classList.remove('hidden');
  });

  // Reset satu kartu: klik ikon ↺ di kartu -> pop up konfirmasi yang sama
  [gridAlfabet, gridKata].forEach((grid) => {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.reset-x');
      if (!btn) return;
      e.stopPropagation();
      const card = btn.closest('.word-card');
      const label = card.querySelector('.label').textContent.trim();
      resetTarget = { card };
      modalResetTitle.textContent = 'Reset Rekaman "' + label + '"?';
      modalResetText.textContent = 'Rekaman "' + label + '" pada bahasa isyarat ' + currentVariant + ' dihapus. Kartu tetap ada, jumlah 0.';
      modalResetKonfirm.disabled = false;
      modalReset.classList.remove('hidden');
    });
  });

  // Angka di kartu = rekaman bahasa isyarat aktif, jadi hanya itu yang direset
  function resetOneCard(card) {
    const wordId = String(card.dataset.wordId);
    sampleDB = sampleDB.filter((s) => !(s.wordId === wordId && s.variant === currentVariant));
    const c = card.querySelector('.count');
    c.textContent = 0;
    warnaHitungan(c, 0);
    resetStability();
    tampilkanProses('Mereset...', 500);

    fetch('/gesture/reset', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        type: card.closest('#grid-alfabet') ? 'alphabet' : 'word',
        word_id: wordId,
        variant: currentVariant,
      }),
    })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); })
      .catch((err) => {
        console.error(err);
        alert('Gagal mereset rekaman di server. Coba lagi.');
        loadSamples(); // kembalikan angka & data sesuai kondisi server
      });
  }

  modalResetBatal.addEventListener('click', () => {
    resetTarget = null;
    modalReset.classList.add('hidden');
  });
  modalReset.addEventListener('click', (e) => {
    if (e.target === modalReset) modalResetBatal.click();
  });

  modalResetKonfirm.addEventListener('click', () => {
    if (!resetTarget) return;
    const target = resetTarget;
    resetTarget = null;
    modalReset.classList.add('hidden');

    if (target.card) return resetOneCard(target.card);

    const grid = target.subtab === 'alfabet' ? gridAlfabet : gridKata;
    removeLocalSamplesByGrid(grid);
    grid.querySelectorAll('.word-card .count').forEach((c) => { c.textContent = 0; warnaHitungan(c, 0); });
    tampilkanProses('Mereset...', 500);

    fetch('/gesture/reset', {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ type: target.type }),
    })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); })
      .catch((err) => {
        console.error(err);
        alert('Gagal mereset rekaman di server. Coba lagi.');
      });
  });

  // ---------------- Deteksi live -> tampil di bawah kamera ----------------
  // Dipanggil tiap hasil deteksi kamera dari onResults (bukan polling ke server lagi).
  let shownKey = null;
  let shownLabel = null;

  const infoPanelEl   = document.getElementById('info-panel');
  const infoStateEl   = document.getElementById('info-state');
  const infoVariantEl = document.getElementById('info-variant');
  const infoPctEl     = document.getElementById('info-pct');

  function highlightCard(label) {
    document.querySelectorAll('.word-card.is-match').forEach((c) => c.classList.remove('is-match'));
    if (!label) return;
    const target = String(label).trim().toLowerCase();
    const card = Array.from(activeGrid().querySelectorAll('.word-card')).find(
      (c) => c.querySelector('.label').textContent.trim().toLowerCase() === target
    );
    if (card) card.classList.add('is-match');
  }

  function updateInfoPanel() {
    let state = 'idle', stateText = 'Menunggu', text = 'Siap Belajar';
    let variant = '', pct = 0, hl = null;

    if (latestLandmarks) {
      const r = currentMatchResponse();
      if (r.ok) {
        state = 'match'; stateText = 'Terdeteksi';
        text = r.label;
        variant = r.variant || '';
        pct = Math.round((r.confidence || 0) * 100);
        hl = r.label; // kartu yang disorot tetap berdasarkan label
      } else {
        state = 'scan'; stateText = 'Menganalisis';
        text = r.message || 'Belum dikenali';
      }
    }

    const key = state + '|' + text + '|' + variant + '|' + pct;
    if (key === shownKey) return; // tidak menyentuh DOM kalau tidak ada perubahan
    shownKey = key;

    infoPanelEl.dataset.state = state;
    infoStateEl.textContent = stateText;

    resultEl.textContent = text;
    const len = String(text).length;
    resultEl.className = 'info-result ' + (state !== 'match' ? 'is-md' : len <= 2 ? 'is-xl' : len <= 8 ? 'is-lg' : 'is-md');
    if (state === 'match' && text !== shownLabel) { // animasi muncul hanya saat huruf/kata berganti
      resultEl.classList.add('pop');
    }
    shownLabel = state === 'match' ? text : null;

    infoVariantEl.textContent = variant;
    infoVariantEl.classList.toggle('hidden', !variant);

    infoPctEl.textContent = pct + '%';
    barFillEl.style.width = pct + '%';
    highlightCard(hl);
  }

  loadSamples(); // muat semua rekaman sekali saat halaman dibuka

  // ---------------- Init ----------------
  refreshUI();
})();

// ── Tema terang/gelap ──
(() => {
  const root = document.documentElement;
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  const paint = () => btn.setAttribute('aria-checked', String(root.dataset.theme === 'dark'));
  paint();
  btn.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('astakanda.theme', next); } catch (e) { /* abaikan */ }
    paint();
  });
})();