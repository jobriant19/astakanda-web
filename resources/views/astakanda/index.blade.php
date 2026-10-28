<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <script>try{document.documentElement.dataset.theme=localStorage.getItem('astakanda.theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}</script>
  <title>ASTAKANDA</title>
  <link rel="icon" href="{{ asset('assets/images/icon.png') }}">
  <link rel="preload" as="image" href="{{ asset('assets/images/apple.png') }}">
  <link rel="preload" as="image" href="{{ asset('assets/images/dino.png') }}">
  <link rel="preload" as="image" href="{{ asset('assets/images/ladders.png') }}">
  <link rel="preload" as="image" href="{{ asset('assets/images/hornet.png') }}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/css/style.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/ujian/ujian.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/game.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/apple/apple.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/dino/dino.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/hasil.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/ladders/ladders.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/history/riwayat.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/css/responsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/ujian/ujianresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/gameresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/apple/appleresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/dino/dinoresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/ladders/laddersresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/history/historyresponsive.css') }}">
  <link rel="stylesheet" href="{{ asset('assets-astakanda/game/hunter/hunter.css') }}">
</head>
<body>
  <div class="app-shell">
    <!-- ================= HEADER ================= -->
    <header class="app-header">
      <div class="logo-row">
        <img class="logo" src="{{ asset('assets/images/logo.png') }}" alt="ASTA KANDA">
      </div>
      <p id="tagline" class="subtitle tagline neu-raised" aria-label="Belajar Bahasa Isyarat dan Bermain">BELAJAR BAHASA ISYARAT & BERMAIN</p>
    </header>

    <!-- ================= TAB BAR ================= -->
        <nav class="tab-bar neu-raised">
      <button class="tab-btn is-active" data-tab="belajar" style="--tab-color: var(--tab-belajar);">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>
        Belajar
      </button>
      <button class="tab-btn" data-tab="ujian" style="--tab-color: var(--tab-ujian);">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        Ujian
      </button>
      <button class="tab-btn" data-tab="game" style="--tab-color: var(--tab-game);">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="10" rx="4"/><path d="M6 12h4M8 10v4M15 12h.01M18 10h.01"/></svg>
        Game
      </button>
      <button class="tab-btn" data-tab="riwayat" style="--tab-color: var(--tab-riwayat);">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 3"/></svg>
        Hasil
      </button>

      {{-- Toggle tema: mercusuar (malam) / matahari (siang) --}}
      <button id="theme-btn" class="theme-toggle" type="button" role="switch" aria-checked="false" aria-label="Ganti tema terang / gelap">
        <span class="tt-night"></span>
        <span class="tt-sun"></span>
        <span class="tt-moon">
          <i class="cr" style="top:10px;left:8px;width:6px;height:6px"></i>
          <i class="cr" style="bottom:12px;left:14px;width:8px;height:8px"></i>
          <i class="cr" style="top:20px;left:24px;width:4px;height:4px"></i>
        </span>
        <span class="tt-stars">
          <i style="top:8px;left:40px;width:2px;height:2px" class="twinkle"></i>
          <i style="top:16px;left:65px;width:1.5px;height:1.5px"></i>
          <i style="top:6px;left:75px;width:1px;height:1px"></i>
          <i style="top:26px;left:50px;width:1px;height:1px"></i>
          <i style="top:32px;left:85px;width:2px;height:2px"></i>
        </span>
        <span class="tt-clouds">
          <span class="cl c1" style="top:16px;left:10px;width:22px;height:8px"><i style="bottom:2px;left:2px;width:10px;height:10px"></i><i style="bottom:2px;left:8px;width:12px;height:12px"></i></span>
          <span class="cl c2" style="top:28px;left:35px;width:26px;height:10px"><i style="bottom:4px;left:4px;width:12px;height:12px"></i><i style="bottom:4px;left:11px;width:14px;height:14px"></i></span>
          <span class="cl c3" style="top:12px;left:50px;width:18px;height:7px"><i style="bottom:2px;left:2px;width:8px;height:8px"></i><i style="bottom:2px;left:7px;width:10px;height:10px"></i></span>
        </span>
        <span class="tt-knob">
          <span class="tt-beam"></span>
          <svg viewBox="0 0 30 40" class="tt-lh" aria-hidden="true">
            <path d="M5,40 L9,12 L21,12 L25,40 Z" fill="#ef4444"/>
            <path d="M6,32 L24,32 L22,21 L8,21 Z" fill="#f8fafc"/>
            <rect x="7" y="10" width="16" height="2" fill="#334155"/>
            <rect x="9" y="12" width="12" height="2" fill="#475569"/>
            <rect class="lh-room" x="10" y="4" width="10" height="6"/>
            <circle class="lh-glow" cx="15" cy="7" r="2.5" fill="#fef08a"/>
            <path d="M12,4 L12,10 M15,4 L15,10 M18,4 L18,10" stroke="#475569" stroke-width=".75"/>
            <path d="M8,4 L15,0 L22,4 Z" fill="#ef4444"/>
            <circle cx="15" cy="0" r="1.5" fill="#334155"/>
          </svg>
        </span>
      </button>
    </nav>

    <!-- ================= KOLOM KIRI: KAMERA + INFO DETEKSI ================= -->
    <!-- Dipakai bersama oleh tab Belajar & Ujian (disembunyikan/ditampilkan via app.js) -->
    <div id="left-col" class="left-col">
      <div class="camera-panel neu-raised">
        <video id="input-video" autoplay playsinline muted></video>
        <canvas id="output-canvas"></canvas>
        <div id="camera-status" class="camera-status"><span>Mencari Tangan...</span></div>
      </div>
      <div id="info-panel" class="info-panel neu-raised" data-state="idle">
        <div class="info-head">
          <span class="info-label">INFO DETEKSI</span>
          <span class="info-chip neu-inset"><i class="info-dot"></i><span id="info-state">Menunggu</span></span>
        </div>
        <div class="info-body neu-inset">
          <div id="info-result" class="info-result is-md">Siap Belajar</div>
          <span id="info-variant" class="info-variant hidden"></span>
        </div>
        <div class="info-meter">
          <div class="info-meter-top"><span>Tingkat Kecocokan</span><b id="info-pct">0%</b></div>
          <div class="info-bar-track neu-inset"><div id="info-bar-fill" class="info-bar-fill"></div></div>
        </div>
      </div>
    </div>

    <!-- ================= MAIN GRID ================= -->
    <div class="main-grid">

      <!-- ---- Panel Belajar ---- -->
      <div id="panel-belajar" class="tab-panel main-grid" style="display:contents;">
        <div class="right-col neu-raised">
          <div class="right-col-header">
            <div class="header-left">
              <span class="title"><span class="emoji" aria-hidden="true">📚🤟</span>KAMUS ISYARAT</span>
              <div class="subtab-bar neu-inset">
                <button class="subtab-btn is-active" data-subtab="alfabet">Alfabet</button>
                <button class="subtab-btn" data-subtab="kata">Kata</button>
              </div>
            </div>
            <div class="header-right">
              <button type="button" id="variant-btn" class="variant-btn" aria-haspopup="dialog" title="Jenis bahasa isyarat">
                <span id="variant-btn-label">BISINDO</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="search-wrap">
                <span class="search-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>
                <input type="text" id="search-input" class="neu-inset" placeholder="Cari alfabet..." autocomplete="off">
                <button type="button" id="search-clear" class="search-clear" title="Hapus pencarian" aria-label="Hapus pencarian">
                  <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
                </button>
              </div>
              <button id="btn-tambah" class="neu-btn btn-add">+ Tambah</button>
              <button id="btn-reset" class="neu-btn btn-add btn-reset">↺ Reset</button>
            </div>
          </div>

          <div class="tips-box neu-inset">
            <div class="tip-row">
              <span class="tip-ico tip-ico-cara" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v4.5"/><path d="M12 10.5V5a1.5 1.5 0 0 1 3 0v5.5"/><path d="M15 10.5V6.5a1.5 1.5 0 0 1 3 0V13c0 4.4-3 7-6.5 7-2.2 0-3.6-.8-4.8-2.3l-3-4a1.4 1.4 0 0 1 2.1-1.8L8 14"/></svg></span>
              <span class="tip-text"><b>Cara:</b> <span class="tip-key tip-key-cara">Tahan kartu</span> huruf/kata sambil melakukan gestur, lalu klik <span class="tip-key tip-key-danger">X</span> untuk hapus.</span>
            </div>
            <div class="tip-row">
              <span class="tip-ico tip-ico-tips" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10.5c.6.5 1 1.3 1 2.1V15h6v-.4c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 2Z"/></svg></span>
              <span class="tip-text"><b>Tips:</b> Latih <span class="tip-key tip-key-tips">minimal 1 gerakan</span> per kartu supaya deteksi lebih akurat.</span>
            </div>
          </div>

          <div id="grid-alfabet" class="word-grid alfabet-grid">
            @foreach ($words->where('type', 'alphabet') as $word)
              <div class="word-card neu-btn" data-word-id="{{ $word->id }}">
                <button class="del-x" title="Hapus">✕</button>
                <span class="label">{{ $word->label }}</span>
                <span class="count">{{ $word->samples_count }}</span>
              </div>
            @endforeach
          </div>

          <div id="grid-kata" class="word-grid hidden">
            @foreach ($words->where('type', 'word') as $word)
              <div class="word-card neu-btn" data-word-id="{{ $word->id }}">
                <button class="del-x" title="Hapus">✕</button>
                <span class="label">{{ $word->label }}</span>
                <span class="count">{{ $word->samples_count }}</span>
              </div>
            @endforeach
          </div>
        </div>
      </div>

      <!-- ---- Panel Ujian (markup lengkap ada di resources/views/astakanda/ujian/panel.blade.php) ---- -->
      @include('astakanda.ujian.panel')

      <!-- ---- Panel Game (markup lengkap ada di resources/views/astakanda/game/panel.blade.php) ---- -->
      @include('astakanda.game.panel')

      <!-- ---- Panel Riwayat (markup lengkap ada di resources/views/astakanda/history/panel.blade.php) ---- -->
      @include('astakanda.history.panel')

    </div>
  </div>

  <!-- ================= MODAL TAMBAH (Kata: ketik kata / Alfabet: pilih huruf yang dihapus) ================= -->
  <div id="modal-tambah" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon modal-icon-tambah" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
      </div>
      <h3 id="modal-tambah-title">Tambah Kata Baru</h3>
      <div id="modal-kata-wrap">
        <input type="text" id="modal-input-label" class="neu-inset" maxlength="30" placeholder="Ketik kata, contoh: Halo" autocomplete="off">
      </div>
      <div id="modal-alfabet-wrap" class="hidden">
        <p>Pilih huruf yang ingin dikembalikan:</p>
        <div id="letter-picker" class="letter-picker"></div>
      </div>
      <p id="modal-error" class="modal-error hidden"></p>
      <div class="modal-actions">
        <button id="modal-batal" class="neu-btn">Batal</button>
        <button id="modal-simpan" class="neu-btn btn-add">Simpan</button>
      </div>
    </div>
  </div>

  <!-- ================= MODAL KONFIRMASI HAPUS ================= -->
  <div id="modal-hapus" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
      <h3 id="modal-hapus-title">Hapus Kata?</h3>
      <p id="modal-hapus-text">Kata "<span id="modal-hapus-label"></span>" akan dihapus permanen.</p>
      <div class="modal-actions">
        <button id="modal-hapus-batal" class="neu-btn">Batal</button>
        <button id="modal-hapus-konfirmasi" class="neu-btn btn-danger">Hapus</button>
      </div>
    </div>
  </div>

  <!-- ================= MODAL KONFIRMASI RESET ================= -->
  <div id="modal-reset" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg></div>
      <h3 id="modal-reset-title">Reset Rekaman Alfabet?</h3>
      <p id="modal-reset-text"></p>
      <div class="modal-actions">
        <button id="modal-reset-batal" class="neu-btn">Batal</button>
        <button id="modal-reset-konfirmasi" class="neu-btn btn-danger">Reset</button>
      </div>
    </div>
  </div>

  <!-- ================= POPUP PROSES (reset/hapus — progress bar otomatis hilang) ================= -->
  <div id="modal-proses" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      </div>
      <h3 id="modal-proses-title">Memproses...</h3>
      <div class="info-bar-track neu-inset">
        <div id="modal-proses-bar" class="info-bar-fill" style="width:0%;"></div>
      </div>
    </div>
  </div>

    <!-- ================= POP UP JENIS BAHASA ISYARAT ================= -->
  <div id="modal-bahasa" class="modal-overlay hidden">
    <div class="modal-box bh-box neu-raised">
      <div class="bh-head">
        <div>
          <div class="bh-title">Jenis Bahasa Isyarat</div>
          <div class="bh-sub">Pilih jenis yang direkam &amp; dikenali.</div>
        </div>
        <button type="button" id="bahasa-close" class="bh-close" aria-label="Tutup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="bh-toolbar">
        <div class="bh-search">
          <span class="bh-search-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input type="text" id="bahasa-search" placeholder="Cari bahasa isyarat..." autocomplete="off">
        </div>
        <button type="button" id="bahasa-btn-tambah" class="neu-btn btn-add bh-add">+ Tambah</button>
      </div>

      <div id="bahasa-grid" class="bh-grid"></div>

      <div class="bh-pager">
        <button type="button" id="bahasa-prev" class="bh-nav" aria-label="Halaman sebelumnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div id="bahasa-dots" class="bh-dots"></div>
        <button type="button" id="bahasa-next" class="bh-nav" aria-label="Halaman berikutnya">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- ================= POP UP TAMBAH / EDIT JENIS BAHASA ISYARAT ================= -->
  <div id="modal-bahasa-form" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div id="bahasa-form-icon" class="modal-icon modal-icon-tambah" aria-hidden="true"></div>
      <h3 id="bahasa-form-title">Tambah Jenis Bahasa Isyarat</h3>
      <input type="text" id="bahasa-form-input" class="bh-form-input" maxlength="30" placeholder="Contoh: SIBI" autocomplete="off">
      <p id="bahasa-form-error" class="modal-error hidden"></p>
      <div class="modal-actions">
        <button id="bahasa-form-batal" class="neu-btn">Batal</button>
        <button id="bahasa-form-simpan" class="neu-btn btn-add">Simpan</button>
      </div>
    </div>
  </div>

  <!-- ================= POP UP KONFIRMASI HAPUS JENIS BAHASA ISYARAT ================= -->
  <div id="modal-bahasa-hapus" class="modal-overlay hidden">
    <div class="modal-box modal-confirm neu-raised">
      <div class="modal-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
      <h3>Hapus Jenis Bahasa Isyarat?</h3>
      <p id="bahasa-hapus-text"></p>
      <p id="bahasa-hapus-error" class="modal-error hidden"></p>
      <div class="modal-actions">
        <button id="bahasa-hapus-batal" class="neu-btn">Batal</button>
        <button id="bahasa-hapus-konfirmasi" class="neu-btn btn-danger">Hapus</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
  <script>
    // Path gambar untuk tampilan "kosong"/"tidak ditemukan" (dipakai app.js & ujian.js),
    // serta logo game (dipakai game.js)
    window.ASTA_IMAGES = {
      notfound: "{{ asset('assets/images/notfound.png') }}",
      add: "{{ asset('assets/images/add.png') }}",
      apple: "{{ asset('assets/images/apple.png') }}",
      dino: "{{ asset('assets/images/dino.png') }}",
      ladders: "{{ asset('assets/images/ladders.png') }}",
      hornet: "{{ asset('assets/images/hornet.png') }}"
    };
  </script>
  <script src="{{ asset('assets-astakanda/js/app.js') }}"></script>
  <script src="{{ asset('assets-astakanda/ujian/ujian.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/sound.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/sertifikat.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/hasil.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/apple/apple.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/dino/dino.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/game.js') }}"></script>
  <script src="{{ asset('assets-astakanda/game/ladders/ladders.js') }}"></script>
  <script src="{{ asset('assets-astakanda/history/riwayat.js') }}"></script>
  <script type="importmap">
  { "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  } }
  </script>
  <script src="{{ asset('assets-astakanda/game/hunter/hunter-ui.js') }}"></script>
</body>
</html>