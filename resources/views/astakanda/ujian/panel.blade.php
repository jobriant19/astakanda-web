{{--
  Panel "Ujian" — file terpisah, di-include dari resources/views/astakanda/index.blade.php
  via @include('astakanda.ujian.panel').
  CSS: public/assets-astakanda/ujian/ujian.css
  JS : public/assets-astakanda/ujian/ujian.js
  Menempati kolom kanan yang sama seperti "Kamus Isyarat" (grid-column:2; grid-row:4),
  kamera & Info Deteksi di kolom kiri dipakai bersama lewat #left-col (lihat index.blade.php).
--}}
<div id="panel-ujian" class="tab-panel ujian-col neu-raised hidden" style="grid-column: 2; grid-row: 4;">

  <!-- ============ LAYAR 1: MULAI UJIAN ============ -->
  <div id="ujian-start" class="ujian-screen">
    <div class="ujian-start-head">
      <span class="ujian-start-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </span>
      <div>
        <div class="ujian-start-title">Ujian Bahasa Isyarat</div>
        <div class="ujian-start-sub">Uji kemampuanmu memperagakan huruf &amp; kata lewat kamera.</div>
      </div>
    </div>

    <div class="ujian-howto">
      <div class="ujian-howto-title">Cara Mengerjakan</div>
      <ol class="ujian-howto-list">
        <li><span class="ujian-step-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor" opacity=".35"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg></span> Pilih tingkat kesulitan, atau atur sendiri lewat mode<b>Custom<svg class="inline-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg></b></li>
        <li><span class="ujian-step-ico" aria-hidden="true"><img src="{{ asset('assets/images/icon.png') }}" alt=""></span> Peragakan gestur sesuai huruf/kata yang tampil di layar</li>
        <li><span class="ujian-step-ico" aria-hidden="true"><img src="{{ asset('assets/images/camera.png') }}" alt=""></span><span class="ujian-step-text">Jawaban benar terdeteksi otomatis lewat kamera</span></li>
      </ol>
    </div>

    <div class="ujian-diff">
      <div class="ujian-diff-label">Tingkat Kesulitan</div>
      <div class="ujian-diff-bar">
        <button type="button" class="diff-chip is-active" data-diff="mudah">
          <svg class="diff-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor" opacity=".35"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
          <span>Mudah</span>
        </button>
        <button type="button" class="diff-chip" data-diff="sedang">
          <svg class="diff-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor" opacity=".35"/></svg>
          <span>Sedang</span>
        </button>
        <button type="button" class="diff-chip" data-diff="sulit">
          <svg class="diff-ico" viewBox="0 0 24 24" fill="none"><rect x="3" y="15" width="4" height="6" rx="1" fill="currentColor"/><rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor"/><rect x="17" y="6" width="4" height="15" rx="1" fill="currentColor"/></svg>
          <span>Sulit</span>
        </button>
        <button type="button" class="diff-chip" data-diff="custom">
          <svg class="diff-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/></svg>
          <span>Custom</span>
        </button>
      </div>
    </div>

    <!-- Field Waktu, Jumlah Soal, dan Preview sengaja disatukan dalam satu baris
         (.ujian-config-row = 3 kolom) supaya saat "Custom" dipilih tidak menambah
         baris/tinggi baru — layar Mulai Ujian tetap tampil 100% tanpa terpotong. -->
    <div class="ujian-config-row">
      <div id="ujian-custom-fields" class="ujian-custom-fields hidden">
        <label class="ujian-field">
          <span><svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> Waktu (menit)</span>
          <input type="number" id="ujian-custom-waktu" class="neu-inset" min="1" max="60" value="5">
        </label>
        <label class="ujian-field">
          <span><svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg> Jumlah Soal</span>
          <input type="number" id="ujian-custom-soal" class="neu-inset" min="1" max="50" value="10">
        </label>
      </div>

      <div id="ujian-preview" class="ujian-preview neu-inset">
        <svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        <b id="ujian-preview-waktu">3</b> menit &nbsp;·&nbsp;
        <svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        <b id="ujian-preview-soal">5</b> soal
      </div>

      <button type="button" id="ujian-btn-atur" class="ujian-set-btn hidden">
        <span class="ujian-set-btn-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/></svg></span>
        <span class="ujian-set-btn-text"><b>Atur Soal</b><small id="ujian-atur-sub">Campuran · Semua</small></span>
      </button>
    </div>

    <button id="ujian-btn-mulai" type="button" class="neu-btn btn-add ujian-btn-mulai">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      Mulai Ujian
    </button>
  </div>

  <!-- ============ MODAL: syarat minimal rekaman sebelum ujian ============ -->
  <div id="modal-ujian-syarat" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon modal-icon-notice" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 16.5v.01"/><path d="M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/></svg>
      </div>
      <h3>Belum Bisa Mulai</h3>
      <p id="modal-ujian-syarat-text">Rekam minimal 5 huruf/kata berbeda di tab Belajar dulu.</p>
      <div class="modal-actions">
        <button id="modal-ujian-syarat-tutup" class="neu-btn">Tutup</button>
        <button id="modal-ujian-syarat-belajar" class="neu-btn btn-add">Ke Tab Belajar</button>
      </div>
    </div>
  </div>

  <div id="modal-ujian-atur" class="ujian-set-modal hidden">
    <div class="ujian-set-card" role="dialog" aria-modal="true" aria-labelledby="ujian-atur-title">
      <div class="ujian-set-head">
        <span class="ujian-set-head-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/></svg></span>
        <div>
          <div class="ujian-set-title" id="ujian-atur-title">Atur Soal</div>
          <div class="ujian-set-sub">Pilih soal yang akan muncul di ujian.</div>
        </div>
      </div>

      <div class="ujian-set-sec">
        <div class="ujian-set-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>
          Bahasa Isyarat
        </div>
        <button type="button" id="ujian-atur-bahasa-btn" class="uj-field-btn">
          <span class="uj-fb-text"><b id="ujian-atur-bahasa-nama">-</b><small id="ujian-atur-bahasa-sub"></small></span>
          <svg class="uj-fb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      </div>

      <div class="ujian-set-sec">
        <div class="ujian-set-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
          Mode Soal
        </div>
        <div id="ujian-atur-mode" class="ujian-set-seg">
          <button type="button" class="uj-seg" data-mode="acak">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg><span>Acak</span>
          </button>
          <button type="button" class="uj-seg" data-mode="atur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/></svg><span>Atur Sendiri</span>
          </button>
        </div>
      </div>

      <div class="ujian-set-sec">
        <div class="ujian-set-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
          Jenis Soal
        </div>
        <div id="ujian-atur-jenis" class="ujian-set-seg">
          <button type="button" class="uj-seg" data-jenis="alfabet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 10 4l6 16M6.5 14h7"/></svg><span>Alfabet</span>
          </button>
          <button type="button" class="uj-seg" data-jenis="kata">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h14"/></svg><span>Kata</span>
          </button>
          <button type="button" class="uj-seg" data-jenis="campuran">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg><span>Campuran</span>
          </button>
        </div>
      </div>

      <div id="ujian-atur-soal-wrap" class="ujian-set-sec hidden">
        <div class="ujian-set-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/></svg>
          Soal yang Muncul
        </div>
        <button type="button" id="ujian-atur-soal-btn" class="uj-field-btn">
          <span class="uj-fb-text"><b>Pilih Soal</b><small id="ujian-atur-soal-sub"></small></span>
          <svg class="uj-fb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      </div>

      <div id="ujian-atur-info" class="ujian-set-info"></div>

      <div class="ujian-set-foot">
        <button type="button" id="ujian-atur-batal" class="ujian-set-cancel">Batal</button>
        <button type="button" id="ujian-atur-terapkan" class="ujian-set-ok">Terapkan</button>
      </div>
    </div>
  </div>

  <!-- Pop up pilih (dipakai untuk: daftar bahasa isyarat & pilih soal) — letakkan SETELAH modal di atas -->
  <div id="modal-ujian-pilih" class="ujian-set-modal hidden">
    <div class="ujian-set-card ujian-pilih-card" role="dialog" aria-modal="true" aria-labelledby="ujian-pilih-title">
      <div class="bh-head">
        <div>
          <div class="bh-title" id="ujian-pilih-title">Jenis Bahasa Isyarat</div>
          <div class="bh-sub" id="ujian-pilih-sub"></div>
        </div>
        <button type="button" class="bh-close" id="ujian-pilih-close" aria-label="Tutup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="bh-search">
        <span class="bh-search-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span>
        <input id="ujian-pilih-search" type="text" placeholder="Cari..." autocomplete="off">
      </div>
      <div id="ujian-pilih-grid" class="bh-grid"></div>
      <div class="bh-pager">
        <button type="button" class="bh-nav" id="ujian-pilih-prev" aria-label="Sebelumnya"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>
        <div class="bh-dots" id="ujian-pilih-dots"></div>
        <button type="button" class="bh-nav" id="ujian-pilih-next" aria-label="Berikutnya"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button>
      </div>
      <div id="ujian-pilih-foot" class="ujian-set-foot hidden">
        <button type="button" id="ujian-pilih-selesai" class="ujian-set-ok">Selesai</button>
      </div>
    </div>
  </div>

  <!-- ============ LAYAR 2: UJIAN BERLANGSUNG ============ -->
  <div id="ujian-live" class="ujian-screen hidden">
    <div class="ujian-stats-row">
      <div class="stat-card"><span class="stat-label">Waktu</span><span id="ujian-stat-waktu" class="stat-value">00:00</span></div>
      <div class="stat-card"><span class="stat-label">Soal</span><span id="ujian-stat-soal" class="stat-value">0/0</span></div>
      <div class="stat-card stat-good"><span class="stat-label">Benar</span><span id="ujian-stat-benar" class="stat-value">0</span></div>
      <div class="stat-card stat-bad"><span class="stat-label">Salah</span><span id="ujian-stat-salah" class="stat-value">0</span></div>
      <div class="stat-card"><span class="stat-label">Nilai</span><span id="ujian-stat-nilai" class="stat-value">0</span></div>
    </div>

    <div class="info-bar-track neu-inset ujian-progress-track">
      <div id="ujian-progress-fill" class="info-bar-fill ujian-progress-fill"></div>
    </div>

    <div class="ujian-question neu-inset">
      <span class="ujian-question-label">Peragakan gestur untuk:</span>
      <span id="ujian-question-target" class="ujian-question-target">A</span>
      <span id="ujian-question-feedback" class="ujian-question-feedback"></span>
    </div>

    <div class="ujian-actions">
      <button id="ujian-btn-lewati" type="button" class="neu-btn">Lewati Soal</button>
      <button id="ujian-btn-selesai" type="button" class="neu-btn btn-danger">Akhiri Ujian</button>
    </div>
  </div>

  <!-- ============ LAYAR 3: HASIL UJIAN ============ -->
  <div id="ujian-result" class="ujian-screen hidden">
    <div class="ujian-result-head">
      <span id="ujian-result-emoji" class="ujian-result-emoji">🎉</span>
      <div class="ujian-result-title">Hasil Ujian</div>
      <div id="ujian-result-sub" class="ujian-result-sub">Kerja bagus!</div>
    </div>

    <div class="ujian-result-score neu-inset">
      <span id="ujian-result-nilai">0</span><span class="ujian-result-score-unit">/100</span>
    </div>

    <div class="ujian-stats-row">
      <div class="stat-card"><span class="stat-label">Total Soal</span><span id="ujian-result-total" class="stat-value">0</span></div>
      <div class="stat-card stat-good"><span class="stat-label">Benar</span><span id="ujian-result-benar" class="stat-value">0</span></div>
      <div class="stat-card stat-bad"><span class="stat-label">Salah</span><span id="ujian-result-salah" class="stat-value">0</span></div>
    </div>

    <div class="ujian-actions">
      <button id="ujian-btn-ulangi" type="button" class="neu-btn btn-add">🔁 Ulangi</button>
      <button id="ujian-btn-kembali" type="button" class="neu-btn">Kembali ke Awal</button>
    </div>
  </div>

</div>