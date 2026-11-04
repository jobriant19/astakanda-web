/* ASTA KANDA — Dino Attack: panel sisi kanan layar bermain
 * Hanya mengurus tampilan kolom kanan (#game-dino-play .game-play-side):
 *  - memindahkan kamera (#left-col) masuk/keluar dari slot kamera,
 *  - badge nama pemain di atas kamera,
 *  - Info Deteksi: huruf terdeteksi, status, target "Peragakan", feedback benar/salah.
 * Tidak ada logika permainan di sini (itu tugas dino.js).
 * WAJIB dimuat SEBELUM dino.js di index.blade.php.
 */
(function () {
  'use strict';
  if (!document.getElementById('game-dino-play')) return;

  const el = (id) => document.getElementById(id);
  const svgIkon = (isi, lebar) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + lebar + '" stroke-linecap="round" stroke-linejoin="round">' + isi + '</svg>';

  const ICON_CHECK = svgIkon('<path d="M20 6 9 17l-5-5"/>', 3);
  const ICON_CROSS = svgIkon('<path d="M18 6 6 18"/><path d="M6 6l12 12"/>', 3);
  const ICON_PERSON = svgIkon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', 2);

  // ---------------- Kamera ----------------
  // Kamera aslinya ada di kolom kiri halaman (#left-col); saat bermain
  // dipindah ke slot kamera, dan dikembalikan persis ke tempat semula saat selesai.
  function pindahkanKamera(masuk) {
    const leftCol = el('left-col');
    const slot = el('game-dino-camera-slot');
    if (!leftCol || !slot) return;
    if (masuk) {
      window.__astaLeftColParent = window.__astaLeftColParent || leftCol.parentElement;
      window.__astaLeftColNext = window.__astaLeftColNext || leftCol.nextElementSibling;
      slot.appendChild(leftCol);
      leftCol.classList.remove('hidden');
      leftCol.style.display = '';
    } else {
      const parent = window.__astaLeftColParent, next = window.__astaLeftColNext;
      if (parent) {
        if (next && next.parentElement === parent) parent.insertBefore(leftCol, next);
        else parent.appendChild(leftCol);
      }
      leftCol.classList.add('hidden');
    }
  }

  // Nama pemain dipasang lewat textContent (bukan innerHTML) supaya nama berisi tag HTML tidak dieksekusi.
  function setPlayer(nama) {
    const badge = el('dino-player-badge');
    if (!badge) return;
    badge.innerHTML = ICON_PERSON;
    badge.append(' ' + nama);
  }

  // ---------------- Info Deteksi ----------------
  function setDetect(label, status) {
    const a = el('dino-detect-label'), b = el('dino-detect-state');
    const la = label || '—', st = status || '';
    if (a && a.textContent !== la) a.textContent = la; // hanya tulis DOM bila berubah (hemat reflow tiap polling)
    if (b && b.textContent !== st) b.textContent = st;
  }

  // Kembalikan huruf deteksi ke "—" hanya jika sedang menampilkan huruf.
  function clearDetect() {
    const a = el('dino-detect-label');
    if (!a || !/^[-—–\s]*$/.test(a.textContent)) setDetect(null, '');
  }

  function setTarget(word) {
    const t = el('dino-target');
    if (t) t.textContent = word || '—';
    if (word) setFeedback(null);
  }

  // ok: true = benar, false = salah, null = kosongkan. Teks lewat textContent (bisa berisi label buatan pengguna).
  function setFeedback(ok, text) {
    const f = el('dino-feedback');
    if (!f) return;
    if (ok === null) { f.innerHTML = ''; f.className = 'game-play-question-feedback'; return; }
    f.innerHTML = ok ? ICON_CHECK : ICON_CROSS;
    f.append(' ' + text);
    f.className = 'game-play-question-feedback ' + (ok ? 'is-correct' : 'is-wrong');
  }

  // Dipanggil sekali saat permainan baru dimulai.
  function resetPanel(nama) {
    setPlayer(nama);
    setDetect(null, 'Peragakan gestur untuk menjawab');
    setTarget(null);
  }

  window.AstaKandaGames = window.AstaKandaGames || {};
  window.AstaKandaGames.dinoSide = {
    ICON_CHECK, ICON_CROSS,
    pindahkanKamera, resetPanel, setDetect, clearDetect, setTarget, setFeedback,
  };
})();