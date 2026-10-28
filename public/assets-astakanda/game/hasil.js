/* ASTA KANDA — Popup hasil (Game Over / Rekor Baru + statistik + tombol Sertifikat).
 * Dipakai Dino Attack & Apple Snake. Tidak mengubah markup: hanya menyesuaikan elemen
 * popup yang sudah ada & menyisipkan statistik + tombol Sertifikat lewat JS.
 */
(function () {
  'use strict';
  const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 5H5a2 2 0 0 0 0 4h1.5M16 5h3a2 2 0 0 1 0 4h-1.5"/><path d="M12 12v3"/><path d="M9 20h6"/><path d="M10 17h4l.6 3H9.4l.6-3Z"/></svg>';

  function pasangStats(o) {
    let row = o.popup.querySelector('.asta-hasil-stats');
    if (!o.stats || !o.stats.length) { if (row) row.remove(); return; }
    if (!row) {
      row = document.createElement('div');
      row.className = 'ujian-stats-row asta-hasil-stats';
      const anchor = o.skor.closest('.game-result-score') || o.skor;
      anchor.insertAdjacentElement('afterend', row);
    }
    row.innerHTML = o.stats.map((s) =>
      '<div class="stat-card' + (s.kelas ? ' ' + s.kelas : '') + '"><span class="stat-label">' + s.label +
      '</span><span class="stat-value">' + s.nilai + '</span></div>'
    ).join('');
  }

  function pasangSertifikat(o) {
    o.popup._sertifikat = o.sertifikat;
    if (!o.tombolAnchor || !o.tombolAnchor.parentElement) return;
    let btn = o.popup.querySelector('.asta-btn-sertifikat');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'neu-btn asta-btn-sertifikat';
      btn.innerHTML = ICON_TROPHY + '<span>Sertifikat</span>';
      btn.addEventListener('click', () => {
        if (window.AstaSertifikat && o.popup._sertifikat) window.AstaSertifikat.buka(o.popup._sertifikat);
      });
      o.tombolAnchor.insertAdjacentElement('afterend', btn);
      o.tombolAnchor.parentElement.classList.add('asta-actions-wrap'); // 4 tombol: boleh turun baris, tanpa scroll horizontal
    }
  }

  /** o: { popup, judul, skor, tombolAnchor, rekor, judulNormal, stats[], sertifikat } */
  function terapkan(o) {
    const emoji = o.popup.querySelector('.game-result-emoji');
    if (emoji && emoji.dataset.asli === undefined) emoji.dataset.asli = emoji.textContent;
    o.judul.textContent = o.rekor ? 'Rekor Baru!' : o.judulNormal;
    o.judul.style.color = o.rekor ? '#16a34a' : '';
    o.skor.style.color = o.rekor ? '#16a34a' : '';
    if (emoji) emoji.textContent = o.rekor ? '🏆' : emoji.dataset.asli;
    o.popup.classList.toggle('asta-hasil-rekor', !!o.rekor);
    const kartu = o.popup.querySelector('.game-over-inner') || o.popup.querySelector('.modal-box') || o.popup.firstElementChild;
    if (kartu && kartu !== o.popup) kartu.classList.add('asta-hasil-card'); // kartu popup dilebarkan
    pasangStats(o);
    pasangSertifikat(o);
  }

  window.AstaHasil = { terapkan };
})();