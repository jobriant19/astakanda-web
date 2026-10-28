{{--
  Panel "Riwayat" — file terpisah, di-include dari resources/views/astakanda/index.blade.php
  via @include('astakanda.riwayat.panel').
  CSS : public/assets-astakanda/history/riwayat.css
  JS  : public/assets-astakanda/history/riwayat.js
  Data diambil dari tabel ujian_riwayats lewat RiwayatController (GET/POST /riwayat).
  Menempati kolom kanan yang sama seperti panel lain (grid-column:2; grid-row:4).
--}}
<div id="panel-riwayat" class="tab-panel riwayat-col neu-raised hidden" style="grid-column: 1 / -1; grid-row: 4;">

  <!-- ============ LAYAR 1: DAFTAR RIWAYAT ============ -->
  <div id="riwayat-list-screen" class="riwayat-screen">
    <div class="riwayat-inner">
      <div class="riwayat-head">
        <div class="riwayat-title">Riwayat Ujian</div>
        <div class="riwayat-sub">Semua hasil ujian yang pernah kamu kerjakan.</div>
      </div>

      <div id="riwayat-empty" class="riwayat-empty hidden">
        <img src="{{ asset('assets/images/notfound.png') }}" alt="Belum ada riwayat">
        <div class="riwayat-empty-text">Belum ada riwayat ujian. Kerjakan Ujian dulu, ya!</div>
      </div>

      <div id="riwayat-list" class="riwayat-list"></div>
    </div>
  </div>

  <!-- ============ LAYAR 2: REVIEW SATU RIWAYAT ============ -->
  <div id="riwayat-detail-screen" class="riwayat-screen riwayat-detail hidden">
    <div class="riwayat-inner">
      <button type="button" id="riwayat-btn-back" class="riwayat-back-btn" aria-label="Kembali ke daftar riwayat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      <div class="riwayat-detail-head">
        <span id="riwayat-detail-emoji" class="riwayat-detail-emoji">🎉</span>
        <div id="riwayat-detail-tanggal" class="riwayat-detail-tanggal">-</div>
        <div id="riwayat-detail-nilai" class="riwayat-detail-nilai">0<span>/100</span></div>
        <div id="riwayat-detail-meta" class="riwayat-detail-meta">Mudah · 5 soal · 03:00</div>
      </div>

      <div class="riwayat-stats-row">
        <div class="stat-card"><span class="stat-label">Total Soal</span><span id="riwayat-detail-total" class="stat-value">0</span></div>
        <div class="stat-card stat-good"><span class="stat-label">Benar</span><span id="riwayat-detail-benar" class="stat-value">0</span></div>
        <div class="stat-card stat-bad"><span class="stat-label">Salah</span><span id="riwayat-detail-salah" class="stat-value">0</span></div>
      </div>

      <div class="riwayat-review-title">Rincian per Soal</div>
      <div id="riwayat-review-list" class="riwayat-review-list"></div>
    </div>
  </div>

</div>