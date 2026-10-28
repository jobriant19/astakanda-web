{{--
  Panel "Game" — file terpisah, di-include dari resources/views/astakanda/index.blade.php
  via @include('astakanda.game.panel').
  CSS  : public/assets-astakanda/game/game.css
  JS   : public/assets-astakanda/game/game.js
  Tiap game punya folder sendiri (belum dibangun, tinggal diisi nanti):
    public/assets-astakanda/game/apple/apple.css, apple.js  (Apple Snake)
    public/assets-astakanda/game/dino/dino.css,  dino.js    (Dino Attack)
  Menempati kolom kanan yang sama seperti "Kamus Isyarat" (grid-column:2; grid-row:4).
--}}
<div id="panel-game" class="tab-panel game-col neu-raised hidden" style="grid-column: 1 / -1; grid-row: 4;">

  <!-- ============ LAYAR 1: PILIH GAME ============ -->
  <div id="game-select" class="game-screen">
    <div class="game-select-title">Pilih Game</div>
    <div class="game-select-sub">LATIHAN BAHASA ISYARAT SAMBIL BERMAIN</div>

    <div class="game-cards">
      <button type="button" class="game-card" data-game="apple">
        <span class="game-card-img-wrap"><img src="{{ asset('assets/images/apple.png') }}" alt="Apple Snake"></span>
        <span class="game-card-name">Apple Snake</span>
      </button>
      <button type="button" class="game-card" data-game="dino">
        <span class="game-card-img-wrap"><img src="{{ asset('assets/images/dino.png') }}" alt="Dino Attack"></span>
        <span class="game-card-name">Dino Attack</span>
      </button>
    </div>
  </div>

  <!-- ============ LAYAR 2: DETAIL GAME (cara bermain + mulai) ============ -->
  <div id="game-detail" class="game-screen game-detail hidden">
    <button type="button" id="game-btn-back" class="game-back-btn" aria-label="Kembali ke pilihan game">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>

    <div class="game-detail-body">
      <img id="game-detail-img" class="game-detail-img" src="" alt="">
      <div id="game-detail-name" class="game-detail-name">Apple Snake</div>

      <div class="game-howto">
        <div class="game-howto-title">Cara Bermain</div>

        <ul id="game-howto-apple" class="game-howto-list hidden">
          <li>🖐️ Jawab soal huruf/kata yang tampil dengan memperagakan gestur di depan kamera.</li>
          <li>✅ Jawaban benar — ular otomatis menuju apel emas sambil menghindari rintangan.</li>
          <li>🧱 Jawaban salah — ular tetap jalan lurus &amp; apel tetap merah (skor tidak bertambah).</li>
          <li>💥 Menabrak batas arena membuat permainan berakhir (game over).</li>
        </ul>

        <ul id="game-howto-dino" class="game-howto-list hidden">
          <li>🖐️ Rintangan darat &amp; serangan udara datang membawa huruf/kata di atasnya.</li>
          <li>✅ Peragakan gestur yang sesuai ke kamera — label jadi hijau, dino melompat atau menyerang.</li>
          <li>❌ Gestur salah — label jadi merah, rintangan menabrak dino / serangan udara mengenainya.</li>
          <li>❤️ Ada 3 nyawa. Rintangan yang terlewat juga mengurangi nyawa; nyawa habis = game over.</li>
        </ul>
      </div>

      <button type="button" id="game-btn-mulai" class="neu-btn btn-add game-btn-mulai">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Mulai
      </button>
      <div id="game-btn-note" class="game-btn-note hidden">🚧 Game ini sedang disiapkan, tunggu update berikutnya ya.</div>
    </div>
  </div>

  <!-- ============ LAYAR 3: ISI NAMA PEMAIN (khusus Apple Snake) ============ -->
  <div id="game-nama" class="game-screen game-setup hidden">
    <button type="button" id="game-nama-back" class="game-back-btn" aria-label="Kembali ke cara bermain">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="game-setup-inner">
      <div class="game-setup-head">
        <img id="game-nama-img" class="game-setup-img" src="{{ asset('assets/images/apple.png') }}" alt="Apple Snake">
        <div class="game-setup-title">Siapa Namamu?</div>
      </div>
      <input type="text" id="game-nama-input" class="neu-inset game-nama-input" maxlength="20" placeholder="Ketik nama panggilanmu" autocomplete="off">
      <button type="button" id="game-nama-lanjut" class="neu-btn btn-add game-btn-mulai">Lanjut</button>
    </div>
  </div>

  <!-- ============ LAYAR 4: ATUR PERMAINAN (khusus Apple Snake) ============ -->
  <div id="game-setup" class="game-screen game-setup hidden">
    <button type="button" id="game-setup-back" class="game-back-btn" aria-label="Kembali ke isi nama">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="game-setup-inner">
      <div class="game-setup-head">
        <img class="game-setup-img" src="{{ asset('assets/images/apple.png') }}" alt="Apple Snake">
        <div class="game-setup-title">Atur Permainan</div>
      </div>

      <div class="game-setup-group">
        <div class="game-setup-label">Tingkat Kesulitan</div>
        <div class="game-setup-chips" id="game-diff-chips">
          <button type="button" class="game-chip is-active" data-diff="mudah">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor" opacity=".35"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
            <span>Mudah</span>
          </button>
          <button type="button" class="game-chip" data-diff="sedang">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
            <span>Sedang</span>
          </button>
          <button type="button" class="game-chip" data-diff="sulit">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor"/></svg>
            <span>Sulit</span>
          </button>
        </div>
      </div>

      <div class="game-setup-group">
        <div class="game-setup-label">Kategori Soal</div>
        <div class="game-setup-chips" id="game-kategori-chips">
          <button type="button" class="game-chip is-active" data-kategori="alfabet">Alfabet</button>
          <button type="button" class="game-chip" data-kategori="kata">Kata</button>
          <button type="button" class="game-chip" data-kategori="gabungan">Gabungan</button>
        </div>
      </div>

      <div id="game-setup-preview" class="game-setup-preview neu-inset">
        <b id="game-setup-preview-waktu">3</b> menit &nbsp;·&nbsp; <b id="game-setup-preview-soal">5</b> soal &nbsp;·&nbsp; <b id="game-setup-preview-kategori">Alfabet</b>
      </div>

      <button type="button" id="game-btn-skin" class="neu-btn game-btn-skin">🎨 Ganti Skin</button>

      <button type="button" id="game-btn-mulai-main" class="neu-btn btn-add game-btn-mulai">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Mulai Main
      </button>
      <div id="game-setup-note" class="game-btn-note hidden">🚧 Mesin permainan Apple Snake sedang disiapkan, tunggu update berikutnya ya.</div>
    </div>
  </div>

  <!-- ============ LAYAR 4: GANTI SKIN (khusus Apple Snake) ============ -->
  <div id="game-skin" class="game-screen game-setup hidden">
    <button type="button" id="game-skin-back" class="game-back-btn" aria-label="Kembali ke atur permainan">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="game-setup-inner">
      <div class="game-setup-title">Ganti Skin</div>
      <div class="game-setup-sub">Selesaikan misi bermain untuk membuka skin baru.</div>

      <div class="game-setup-label">Skin Ular</div>
      <div class="game-skin-list" id="game-skin-snake-list"></div>

      <div class="game-setup-label">Skin Apel</div>
      <div class="game-skin-list" id="game-skin-apple-list"></div>
    </div>
  </div>

  <!-- ============ LAYAR: LEADERBOARD (khusus Apple Snake) ============ -->
  <div id="game-leaderboard" class="game-screen game-lb hidden">
    <div class="game-play-topbar">
      <div class="game-play-brand" id="game-leaderboard-brand"></div>
      <div class="game-play-actions">
        <button type="button" id="game-lb-settings" class="game-play-icon-btn" title="Atur Permainan" aria-label="Atur Permainan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        </button>
        <button type="button" id="game-lb-leaderboard" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--active" aria-current="page" title="Leaderboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/></svg>
          <span>Leaderboard</span>
        </button>
        <button type="button" id="game-lb-keluar" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          <span>Keluar</span>
        </button>
      </div>
    </div>
    <div class="game-lb-body">
      <h2 class="leaderboard-screen__title"><span class="leaderboard-screen__trophy">🏆</span> Leaderboard</h2>
      <p class="leaderboard-screen__subtitle">Skor Tertinggi Setiap Pemain</p>
      <div class="leaderboard-podium" id="game-lb-podium"></div>
      <div class="leaderboard-others" id="game-lb-others" hidden>
        <p class="leaderboard-others__label">🎗️ Peringkat Selanjutnya</p>
        <table class="leaderboard-table">
          <colgroup><col class="leaderboard-table__col-rank"><col><col class="leaderboard-table__col-score"></colgroup>
          <thead><tr><th>Peringkat</th><th>Pemain</th><th>🍎 Skor</th></tr></thead>
          <tbody id="game-lb-list"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ============ DINO ATTACK: ATUR PERMAINAN ============ -->
  <div id="game-dino-setup" class="game-screen game-setup hidden">
    <button type="button" id="game-dino-setup-back" class="game-back-btn" aria-label="Kembali ke isi nama">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <div class="game-setup-inner">
      <div class="game-setup-head">
        <img class="game-setup-img" src="{{ asset('assets/images/dino.png') }}" alt="Dino Attack">
        <div class="game-setup-title">Atur Permainan</div>
      </div>

      <div class="game-setup-group">
        <div class="game-setup-label">Tingkat Kesulitan</div>
        <div class="game-setup-chips" id="dino-diff-chips">
          <button type="button" class="game-chip is-active" data-diff="mudah">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor" opacity=".35"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
            <span>Mudah</span>
          </button>
          <button type="button" class="game-chip" data-diff="sedang">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
            <span>Sedang</span>
          </button>
          <button type="button" class="game-chip" data-diff="sulit">
            <svg class="game-chip-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor"/></svg>
            <span>Sulit</span>
          </button>
        </div>
      </div>
      <div class="game-setup-group">
        <div class="game-setup-label">Kategori Soal</div>
        <div class="game-setup-chips" id="dino-kategori-chips">
          <button type="button" class="game-chip is-active" data-kategori="alfabet">Alfabet</button>
          <button type="button" class="game-chip" data-kategori="kata">Kata</button>
          <button type="button" class="game-chip" data-kategori="gabungan">Gabungan</button>
        </div>
      </div>

      <div id="dino-setup-preview" class="game-setup-preview neu-inset">
        <b>3</b> nyawa &nbsp;·&nbsp; kecepatan <b id="dino-preview-speed">Lambat</b> &nbsp;·&nbsp; <b id="dino-preview-kategori">Alfabet</b>
      </div>

      <button type="button" id="dino-btn-mulai-main" class="neu-btn btn-add game-btn-mulai">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Mulai Main
      </button>
      <div id="dino-setup-note" class="game-btn-note hidden">🚧 Mesin permainan Dino Attack belum siap.</div>
    </div>
  </div>

  <!-- ============ DINO ATTACK: BERMAIN ============ -->
  <div id="game-dino-play" class="game-screen game-play hidden">
    <div class="game-play-topbar">
      <div class="game-play-brand" id="game-dino-play-brand"></div>
      <div class="game-play-actions">
        <button type="button" id="dino-btn-settings" class="game-play-icon-btn" title="Atur Permainan" aria-label="Atur Permainan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        </button>
        <button type="button" id="dino-btn-leaderboard" class="game-play-icon-btn game-play-icon-btn--wide" title="Leaderboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/></svg>
          <span>Leaderboard</span>
        </button>
        <button type="button" id="dino-btn-keluar" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          <span>Keluar</span>
        </button>
      </div>
    </div>
    <div class="game-play-grid">
      <section class="game-play-field">
        <div class="game-play-canvas-wrap">
          <canvas id="dino-canvas" width="800" height="360"></canvas>
          {{-- Efek nyawa berkurang: sama persis seperti referensi DinoTyping (ikon hati pecah + getar layar) --}}
          <div id="dino-heart-lost" class="dino-heart-lost">
            <svg class="dino-heart-lost-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20.2s-7.4-4.6-9.8-9.2C.6 7.6 2 4 5.6 3.4c2-.35 3.7.55 4.8 2.1a1 1 0 0 0 1.2 0c1.1-1.55 2.8-2.45 4.8-2.1C19.99 4 21.4 7.6 19.8 11c-.9 1.9-2.6 3.8-4.3 5.35"/>
              <path d="M9.5 9.5 7 13l3 1-1.6 3.6"/>
            </svg>
            <span class="dino-heart-lost-text">-1 NYAWA</span>
          </div>
        </div>
        <div class="game-play-stats">
          <div class="stat-card"><span class="stat-label">🦖 SKOR</span><span class="stat-value" id="dino-skor">0</span></div>
          <div class="stat-card"><span class="stat-label">⭐ REKOR</span><span class="stat-value" id="dino-rekor">0</span></div>
          <div class="stat-card"><span class="stat-label">❤️ NYAWA</span><span class="stat-value" id="dino-nyawa">❤️❤️❤️</span></div>
        </div>
      </section>
      <div class="game-play-side">
        <div id="game-dino-camera-slot" class="game-play-camera-slot">
          <div id="dino-player-badge" class="game-play-player-badge"></div>
        </div>
        <div class="game-play-question neu-inset">
          <div class="game-play-question-headrow">
            <span class="game-play-question-label">Info Deteksi</span>
            <span class="game-play-question-progress" id="dino-detect-state">Mencari tangan…</span>
          </div>
          <div class="game-play-question-body">
            <div id="dino-detect-label" class="game-play-question-target">—</div>
            <div class="dino-target-line">Peragakan: <b id="dino-target">—</b></div>
            <div id="dino-feedback" class="game-play-question-feedback"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ DINO ATTACK: LEADERBOARD (terpisah dari Apple Snake) ============ -->
  <div id="game-dino-leaderboard" class="game-screen game-lb hidden">
    <div class="game-play-topbar">
      <div class="game-play-brand" id="game-dino-leaderboard-brand"></div>
      <div class="game-play-actions">
        <button type="button" id="dino-lb-settings" class="game-play-icon-btn" title="Atur Permainan" aria-label="Atur Permainan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        </button>
        <button type="button" id="dino-lb-leaderboard" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--active" aria-current="page" title="Leaderboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/></svg>
          <span>Leaderboard</span>
        </button>
        <button type="button" id="dino-lb-keluar" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          <span>Keluar</span>
        </button>
      </div>
    </div>
    <div class="game-lb-body">
      <h2 class="leaderboard-screen__title"><span class="leaderboard-screen__trophy">🏆</span> Leaderboard</h2>
      <p class="leaderboard-screen__subtitle">Dino Attack · Skor Tertinggi Setiap Pemain</p>
      <div class="leaderboard-podium" id="dino-lb-podium"></div>
      <div class="leaderboard-others" id="dino-lb-others" hidden>
        <p class="leaderboard-others__label">🎗️ Peringkat Selanjutnya</p>
        <table class="leaderboard-table">
          <colgroup><col class="leaderboard-table__col-rank"><col><col class="leaderboard-table__col-score"></colgroup>
          <thead><tr><th>Peringkat</th><th>Pemain</th><th>🦖 Skor</th></tr></thead>
          <tbody id="dino-lb-list"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ============ LAYAR 5: BERMAIN (Apple Snake) ============ -->
  <div id="game-play" class="game-screen game-play hidden">
    <div class="game-play-topbar">
      <div class="game-play-brand" id="game-play-brand"></div>
      <div class="game-play-actions">
        <button type="button" id="apple-btn-settings" class="game-play-icon-btn" title="Atur Permainan" aria-label="Atur Permainan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
        </button>
        <button type="button" id="apple-btn-leaderboard" class="game-play-icon-btn game-play-icon-btn--wide" title="Leaderboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h2a2 2 0 0 1 2 2 4 4 0 0 1-4 4"/><path d="M7 5H5a2 2 0 0 0-2 2 4 4 0 0 0 4 4"/></svg>
          <span>Leaderboard</span>
        </button>
        <button type="button" id="apple-btn-keluar" class="game-play-icon-btn game-play-icon-btn--wide game-play-icon-btn--danger" title="Keluar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
          <span>Keluar</span>
        </button>
      </div>
    </div>
    <div class="game-play-grid">
      <section class="game-play-field">
        <div class="game-play-canvas-wrap">
          <canvas id="apple-canvas"></canvas>
        </div>
        <div class="game-play-stats">
          <div class="stat-card"><span class="stat-label">🍎 SKOR</span><span class="stat-value" id="apple-skor">0</span></div>
          <div class="stat-card"><span class="stat-label">⭐ REKOR</span><span class="stat-value" id="apple-rekor">0</span></div>
          <div class="stat-card"><span class="stat-label">⏱️ WAKTU</span><span class="stat-value" id="apple-waktu">03:00</span></div>
        </div>
      </section>
      <div class="game-play-side">
        <div id="game-play-camera-slot" class="game-play-camera-slot">
          <div id="apple-player-badge" class="game-play-player-badge"></div>
        </div>
        <div class="game-play-question neu-inset">
          <div class="game-play-question-headrow">
            <span class="game-play-question-label">Peragakan gestur untuk:</span>
            <span class="game-play-question-progress" id="apple-soal-progress">0/5</span>
          </div>
          <div class="game-play-question-body">
            <div id="apple-question-target" class="game-play-question-target">A</div>
            <div id="apple-question-feedback" class="game-play-question-feedback"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ============ POPUP HASIL (Apple Snake) — di tengah layar, tetap di atas layar Bermain ============ -->
  <div id="game-result" class="modal-overlay hidden">
    <div class="modal-box game-over-inner">
      <div class="game-over-title" id="apple-result-title">Game Over</div>
      <div class="game-over-score">🍎 Skor: <span id="apple-result-skor">0</span></div>
      <div id="apple-result-unlock" class="game-result-unlock hidden"></div>
      <button type="button" id="apple-btn-ulangi" class="game-over-btn game-over-btn--main">Main Lagi</button>
      <div class="game-over-row">
        <button type="button" id="apple-btn-leaderboard-2" class="game-over-btn game-over-btn--sub">🏆 Leaderboard</button>
        <button type="button" id="apple-btn-ganti-pemain" class="game-over-btn game-over-btn--sub">👤 Ganti Pemain</button>
      </div>
    </div>
  </div>

  <!-- ============ POPUP HASIL (Dino Attack) ============ -->
  <div id="game-dino-result" class="modal-overlay hidden">
    <div class="modal-box game-over-inner">
      <div class="game-over-title" id="dino-result-title">Game Over</div>
      <div class="game-over-score">🦖 Skor: <span id="dino-result-skor">0</span></div>
      <div id="dino-result-rekor" class="game-result-unlock hidden"></div>
      <button type="button" id="dino-btn-ulangi" class="game-over-btn game-over-btn--main">Main Lagi</button>
      <div class="game-over-row">
        <button type="button" id="dino-btn-leaderboard-2" class="game-over-btn game-over-btn--sub">🏆 Leaderboard</button>
        <button type="button" id="dino-btn-ganti-pemain" class="game-over-btn game-over-btn--sub">👤 Ganti Pemain</button>
      </div>
    </div>
  </div>

  <!-- ============ POPUP LOADING (Dino Attack) — muncul saat "Mulai Main" di
       Atur Permainan, sebelum layar Bermain dibuka, supaya sprite/kamera/rekor
       sudah siap semua sekali tampil (tidak ada yang menyusul belakangan). ============ -->
  <div id="dino-loading" class="modal-overlay hidden">
    <div class="modal-box dino-loading-box">
      <img class="dino-loading-icon" src="{{ asset('assets/images/dino.png') }}" alt="Dino Attack">
      <div class="dino-loading-title">Menyiapkan Dino Attack…</div>
      <div class="dino-loading-bar"><div id="dino-loading-fill" class="dino-loading-bar-fill"></div></div>
      <div class="dino-loading-meta">
        <span id="dino-loading-tip">Menyiapkan dino…</span>
        <span id="dino-loading-percent" class="dino-loading-percent">0%</span>
      </div>
    </div>
  </div>

</div>

<!-- ================= POPUP: belum ada rekaman untuk kategori dipilih ================= -->
<div id="modal-game-syarat" class="modal-overlay hidden">
  <div class="modal-box modal-confirm neu-raised">
    <div class="modal-icon modal-icon-notice" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 16.5v.01"/><path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/></svg>
    </div>
    <h3>Belum Bisa Main</h3>
    <p id="modal-game-syarat-text">Belum ada huruf/kata yang direkam untuk kategori ini.</p>
    <div class="modal-actions">
      <button id="modal-game-syarat-tutup" class="neu-btn btn-add">Oke</button>
    </div>
  </div>
</div>