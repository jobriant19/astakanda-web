# ASTA KANDA — Belajar Bahasa Isyarat & Bermain

Web Laravel 13 untuk belajar bahasa isyarat: kamera mendeteksi gestur tangan
(via MediaPipe Hands di browser), gestur direkam & disimpan ke MySQL, lalu
dicocokkan secara live oleh service Python kecil (Flask) yang berjalan
terpisah.

Paket ini **bukan** project Laravel yang sudah jadi utuh (karena instalasi
composer/packagist tidak bisa dijalankan di sandbox saya) — ini adalah
**file-file custom** yang tinggal Anda salin ke project Laravel 13 baru.
Ikuti langkah di bawah dari awal, semua lewat terminal Laragon.

---

## 0. Struktur paket ini

```
astakanda/
├── app/Http/Controllers/
│   ├── GestureController.php        ← halaman utama, kata, rekam & pengenalan gestur
│   ├── SignLanguageController.php   ← jenis bahasa isyarat (BISINDO, SIBI, dst.)
│   ├── RiwayatController.php        ← riwayat hasil ujian/belajar
│   ├── GameSkinController.php       ← skin & leaderboard game
│   └── DinoScoreController.php      ← skor & leaderboard Dino Attack
├── app/Models/
│   ├── GestureWord.php
│   ├── GestureSample.php
│   └── ...                          ← model untuk jenis bahasa isyarat, riwayat, skin & skor game (sesuai project Anda)
├── database/migrations/
│   ├── 2026_09_23_000001_create_gesture_words_table.php
│   ├── 2026_09_23_000002_create_gesture_samples_table.php
│   └── ...                          ← migration tabel jenis bahasa isyarat, riwayat, skin & skor game
├── database/seeders/GestureWordSeeder.php
├── routes/web.php                   ← route gesture, bahasa-isyarat, riwayat, game/skins, game/dino
├── resources/views/astakanda/
│   ├── index.blade.php              ← halaman utama (kamera, info deteksi, tab Belajar)
│   ├── ujian/panel.blade.php        ← markup tab "Ujian"
│   ├── game/panel.blade.php         ← markup tab "Game"
│   └── history/panel.blade.php      ← markup tab "Riwayat"
├── public/assets-astakanda/
│   ├── css/
│   │   ├── style.css                ← style utama (layout, kamera, Info Deteksi, Kamus Isyarat)
│   │   └── responsive.css           ← tampilan responsive (tablet & HP), dimuat PALING AKHIR
│   ├── js/app.js                    ← kamera, deteksi tangan (MediaPipe), pengenal gestur lokal, Kamus Isyarat
│   ├── ujian/
│   │   ├── ujian.css                ← style tab "Ujian"
│   │   └── ujian.js                 ← logika Ujian (timer, soal, deteksi gestur)
│   ├── game/
│   │   ├── game.css                 ← style pilihan game + layar detail
│   │   ├── game.js                  ← logika pilih game & tombol Mulai
│   │   ├── hasil.css / hasil.js     ← layar hasil game
│   │   ├── sound.js                 ← efek suara game
│   │   ├── sertifikat.js            ← pembuatan sertifikat
│   │   ├── apple/                   ← game "Apple Snake"
│   │   │   ├── apple.css
│   │   │   └── apple.js
│   │   ├── dino/                    ← game "Dino Attack"
│   │   │   ├── dino.css
│   │   │   └── dino.js
│   │   └── ladders/                 ← game "Ladders"
│   │       ├── ladders.css
│   │       └── ladders.js
│   └── history/
│       ├── riwayat.css              ← style tab "Riwayat"
│       └── riwayat.js               ← logika tab "Riwayat"
├── public/assets/images/            ← taruh: logo.png, notfound.png, add.png, icon.png, camera.png,
│                                      apple.png, dino.png, ladders.png
└── python-service/                  ← OPSIONAL: app.py, requirements.txt
                                       (pengenalan gestur sekarang berjalan lokal di browser,
                                        service ini tidak lagi dibutuhkan untuk deteksi live)
```

> **Kenapa folder asset bernama `assets-astakanda` bukan `belajar` dll?**
> Server bawaan `php artisan serve` bisa salah mengira folder statis di
> `public/<nama>/` sebagai route `/<nama>` dan menabrak route Laravel.
> Aman kalau nama foldernya tidak sama dengan nama route manapun.

---

## 1. Buat project Laravel 13 baru di drive D

Buka **Terminal** dari Laragon (klik kanan tray Laragon → Terminal), lalu:

```bash
cd /d D:\
composer create-project laravel/laravel astakanda
cd astakanda
```

Ini membuat project bersih di `D:\astakanda` (di luar folder `www`, sesuai
permintaan Anda — nanti tinggal di-arahkan lewat Laragon *Sites* atau
dijalankan dengan `php artisan serve`, keduanya dijelaskan di langkah 6).

## 2. Buat database MySQL

Buka **HeidiSQL** dari Laragon (atau `laragon → Database → phpMyAdmin`),
buat database baru bernama `astakanda` (utf8mb4_general_ci).

Edit `D:\astakanda\.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=astakanda
DB_USERNAME=root
DB_PASSWORD=

GESTURE_SERVICE_URL=http://127.0.0.1:5001
```

## 3. Salin file dari paket ini ke project

Salin (copy-paste manual atau lewat File Explorer) setiap file dari paket
ini ke lokasi yang **sama persis** di `D:\astakanda\`:

| Dari paket ini | Ke |
|---|---|
| `app/Http/Controllers/GestureController.php` | `D:\astakanda\app\Http\Controllers\` |
| `app/Models/GestureWord.php`, `GestureSample.php` | `D:\astakanda\app\Models\` |
| `database/migrations/*.php` | `D:\astakanda\database\migrations\` |
| `database/seeders/GestureWordSeeder.php` | `D:\astakanda\database\seeders\` |
| `resources/views/astakanda/index.blade.php` | `D:\astakanda\resources\views\astakanda\` |
| `resources/views/astakanda/ujian/panel.blade.php` | `D:\astakanda\resources\views\astakanda\ujian\` |
| `resources/views/astakanda/game/panel.blade.php` | `D:\astakanda\resources\views\astakanda\game\` |
| `public/assets-astakanda/` (seluruh folder, termasuk sub-folder `ujian/`, `game/`, `game/apple/`, `game/dino/`) | `D:\astakanda\public\assets-astakanda\` |
| `python-service/` (seluruh folder) | `D:\astakanda\python-service\` |

> Pastikan sub-folder `ujian/` dan `game/` (beserta `game/apple/`, `game/dino/`)
> ikut tersalin utuh di kedua sisi (view & asset). `index.blade.php` sudah
> memuat `@include('astakanda.ujian.panel')`, `@include('astakanda.game.panel')`,
> serta link ke semua CSS/JS terkait, jadi tidak perlu mengubah apa pun lagi
> di `index.blade.php`.

Lalu buka `routes/web.php` bawaan Laravel, **hapus route `/` default**, dan
tempel isi dari `routes/web-snippet.php` (paket ini) ke dalamnya.

Terakhir, daftarkan seeder di `database/seeders/DatabaseSeeder.php`:

```php
public function run(): void
{
    $this->call([
        GestureWordSeeder::class,
    ]);
}
```

## 4. Migrate & seed

```bash
cd /d D:\astakanda
php artisan migrate --seed
```

Ini akan membuat tabel `gesture_words`, `gesture_samples`, dan mengisi
huruf A–Z otomatis sebagai kartu alfabet awal di "Buku Mantra".

## 5. Taruh gambar-gambar yang dibutuhkan

Buat folder `D:\astakanda\public\assets\images\` lalu taruh file-file berikut
di situ (semua path sudah dirujuk langsung di kode, tidak perlu ubah apa pun):

| File | Dipakai untuk |
|---|---|
| `logo.png` | Logo di header atas |
| `notfound.png` | Ilustrasi saat hasil pencarian "Tidak Ditemukan" |
| `add.png` | Ilustrasi saat "Belum Ada Kata" / semua alfabet terhapus |
| `icon.png` | Ikon langkah ke-2 "Cara Mengerjakan" di tab Ujian |
| `camera.png` | Ikon langkah ke-3 "Cara Mengerjakan" di tab Ujian |
| `apple.png` | Logo kartu game "Apple Snake" |
| `dino.png` | Logo kartu game "Dino Attack" |

## 6. Jalankan Laravel

```bash
cd /d D:\astakanda
php artisan serve
```

Buka `http://127.0.0.1:8000` — halaman "Belajar" (seperti gambar referensi
Anda) akan langsung tampil sebagai halaman utama.

> Alternatif: kalau mau pakai domain `.test` lewat Laragon, tambahkan site
> baru di Laragon dan arahkan document root-nya ke `D:\astakanda\public`.

## 7. Jalankan service Python (pencocokan gestur)

Buka terminal **kedua** (biarkan `php artisan serve` tetap jalan):

```bash
cd /d D:\astakanda\python
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Service ini jalan di `http://127.0.0.1:5001` dan dipanggil otomatis oleh
Laravel (`GestureController@recognize`) setiap ada tangan terdeteksi di
kamera. Kalau service ini belum dijalankan, halaman tetap bisa dipakai
untuk merekam gestur — hanya deteksi live di bawah kamera yang akan
menampilkan "Layanan pengenalan gestur (Python) belum aktif."

---

## Cara pakai aplikasinya

1. Izinkan akses kamera saat browser meminta.
2. Kotak kuning = area kamera. Titik-titik putih & garis merah = hasil
   deteksi MediaPipe pada kedua tangan (maks. 2 tangan).
3. **Merekam gestur huruf**: tahan kartu huruf (A, B, C, …) di "Buku
   Mantra" sambil membentuk gestur tangan — lepas untuk menyimpan.
   Angka kecil di kartu bertambah setiap kali berhasil rekam.
4. **Menambah kata baru**: klik **+ Tambah**, isi nama kata, tahan tombol
   "Tahan untuk merekam gestur" sambil membentuk gestur, klik **Simpan**.
5. Panel "Info Deteksi" di bawah kamera menampilkan label yang paling
   cocok dengan gestur yang sedang dibentuk secara live.
6. Tab **Ujian** sudah berfungsi penuh: pilih tingkat kesulitan (Mudah/
   Sedang/Sulit) atau atur sendiri lewat **Custom** (waktu & jumlah soal),
   klik **Mulai Ujian**, lalu peragakan huruf/kata yang tampil — jawaban
   benar terdeteksi otomatis lewat kamera yang sama dengan tab Belajar
   (memakai service Python di langkah 7). Minimal **5 huruf/kata berbeda**
   harus sudah direkam di tab Belajar sebelum ujian bisa dimulai. Tab
   **Game** menampilkan 2 pilihan (Apple Snake &amp; Dino Attack) — klik
   kartunya untuk melihat cara bermain lalu tombol **Mulai** (logika game-nya
   sendiri belum dibuat, lihat bagian "Yang masih perlu Anda lengkapi").
   Tab **Riwayat** masih disiapkan sebagai kerangka (placeholder) — silakan
   dikembangkan sesuai kebutuhan Anda selanjutnya.

## Catatan teknis

- Semua warna UI sengaja hanya memakai palet biru (neumorphism), sesuai
  gambar referensi.
- Layout dibuat `100vh` + `overflow: hidden` sehingga tidak ada scroll
  vertical sama sekali di halaman utama; hanya grid "Buku Mantra" yang
  scroll secara internal jika kata sangat banyak.
- Deteksi tangan (MediaPipe Hands) berjalan 100% di browser (JS, via CDN
  jsdelivr) — tidak butuh Python untuk *menggambar* titik tangan.
  Python hanya dipakai untuk **membandingkan** landmark hasil rekaman
  dengan landmark live guna menentukan label yang cocok.
- Threshold kecocokan ada di `python-service/app.py` (`MATCH_THRESHOLD`,
  default `0.35`) — turunkan kalau ingin lebih ketat, naikkan kalau
  sistem terlalu sering menolak gestur yang sebenarnya benar.
- Untuk hasil terbaik, rekam beberapa kali per huruf/kata dari sudut yang
  sedikit berbeda supaya pencocokan lebih toleran.

## Yang masih perlu Anda lengkapi sendiri

- Tab **Game**: layar pilih game & cara bermain sudah jadi, tapi logika
  game-nya sendiri **belum dibuat** — isi di
  `public/assets-astakanda/game/apple/apple.js` (Apple Snake) dan
  `public/assets-astakanda/game/dino/dino.js` (Dino Attack). Kedua file
  sudah mendaftarkan diri ke `window.AstaKandaGames.apple` /
  `.dino` dengan method `start()` yang otomatis terpanggil saat tombol
  **Mulai** diklik — tinggal isi logikanya. CSS khusus masing-masing game
  ada di `apple.css` / `dino.css` di folder yang sama.
- Tab **Riwayat** juga placeholder — bisa dikembangkan mencatat progres
  belajar per huruf/kata dari tabel `gesture_samples`, atau mencatat
  riwayat hasil setiap sesi Ujian.
- Validasi tambahan (mis. batas jumlah rekaman per kata, hapus rekaman
  satu per satu bukan sekaligus per kata) belum ada.

## Catatan update terbaru

- **Tab Ujian**: layar "Cara Mengerjakan" — teks tiap langkah kini
  sejajar tepat di tengah emoji di sisinya (sebelumnya menempel ke atas).
  Field **Waktu (menit)**, **Jumlah Soal**, dan ringkasan preview kini
  ditata sebaris (3 kolom, konsisten dengan baris Mudah–Sedang–Sulit–
  Custom) supaya saat mode **Custom** dipilih, layar tidak bertambah
  tinggi dan tombol **Mulai Ujian** tetap 100% terlihat tanpa terpotong
  (tetap tanpa scroll vertical/horizontal).
- **Kamera (tab Belajar & Ujian)**: titik & garis overlay tangan
  (MediaPipe Hands) kini dihaluskan dengan *exponential moving average*
  antar-frame supaya tetap menempel konsisten di tangan yang sama saat
  digerakkan (sebelumnya kadang sedikit meleset saat tangan bergerak
  cepat), sekaligus digambar lebih tebal/kontras (garis merah lebih
  tebal, titik kuning-putih lebih besar dengan bayangan) agar lebih
  jelas terlihat. Pengaturan `minDetectionConfidence`/
  `minTrackingConfidence` MediaPipe juga dinaikkan ke `0.7` supaya
  kuncian ke tangan lebih stabil. Model MediaPipe itu sendiri tidak
  diubah.
- **Tab Ujian — ikon "Cara Mengerjakan"**: langkah 1 kini pakai ikon bar
  yang sama seperti chip kesulitan **Mudah** (bukan emoji), langkah 2
  pakai gambar `icon.png`, dan langkah 3 pakai gambar `camera.png`
  (keduanya dari `public/assets/images/`, perlu Anda siapkan sendiri).
- **Tab Game (baru)**: file terpisah di `resources/views/astakanda/game/`
  dan `public/assets-astakanda/game/`. Layar pertama menampilkan 2 kartu
  pilihan (**Apple Snake** & **Dino Attack**, logonya dari `apple.png` /
  `dino.png` di `public/assets/images/`); mengklik kartu membuka layar
  detail di tengah berisi cara bermain & tombol **Mulai**. Logika tiap
  game sendiri masih kosong (stub) di folder `game/apple/` dan
  `game/dino/` — lihat bagian "Yang masih perlu Anda lengkapi sendiri".