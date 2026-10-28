<?php

namespace App\Http\Controllers;

use App\Models\GestureSample;
use App\Models\GestureWord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GestureController extends Controller
{
    // ---------------------------------------------------------------------
    // PERBAIKAN LAG/INKONSISTENSI DETEKSI
    // ---------------------------------------------------------------------
    // Sebelumnya recognize() menjalankan GestureSample::with('word')->get()
    // (query + eager-load relasi + decode kolom landmarks JSON untuk SETIAP
    // baris) pada SETIAP SATU request /gesture/recognize — dan endpoint ini
    // dipanggil berulang kali per detik (polling) dari tab Belajar, Ujian,
    // Apple Snake, maupun Dino Attack. Makin banyak huruf/kata yang sudah
    // direkam, makin berat & makin lama setiap panggilan ini, sehingga:
    //  - respons jadi telat sampai ke browser (terasa "lag"/tidak lancar),
    //  - saat respons akhirnya sampai, posisi tangan di kamera sudah
    //    berubah/bergeser dari saat landmark itu dikirim -> hasil terasa
    //    "menyasar" ke label lain yang tidak sesuai gestur SAAT INI,
    //  - dan karena setiap poller menunggu request sebelumnya selesai
    //    sebelum mengirim yang baru, satu request yang lambat membuat
    //    gestur yang sudah benar "tertahan" sampai baru benar-benar
    //    terbaca di siklus berikutnya — persis gejala yang dilaporkan
    //    (harus tangan dihilangkan dulu lalu ditunjukkan lagi baru terbaca).
    //
    // Datanya sendiri (daftar rekaman gestur) HANYA berubah saat ada yang
    // merekam/menghapus/reset — bukan setiap kali tangan dibaca. Jadi query
    // + decode berat itu cukup dijalankan SEKALI, lalu disimpan di cache
    // Laravel dan dipakai ulang untuk semua request recognize() berikutnya,
    // sampai ada perubahan data (cache langsung dikosongkan saat itu
    // terjadi — lihat invalidateSamplesCache(), dipanggil di recordSample(),
    // resetSamples(), destroyWord()). Tidak ada perubahan kontrak/response
    // ke Python maupun ke JS; hasil yang dikembalikan persis sama seperti
    // sebelumnya, hanya jauh lebih cepat didapat.
    // ---------------------------------------------------------------------
    private const SAMPLES_CACHE_KEY = 'astakanda_gesture_samples_payload';

    private function getSamplesPayload(): array
    {
        return Cache::rememberForever(self::SAMPLES_CACHE_KEY, function () {
            return GestureSample::with('word')->get()->map(fn ($s) => [
                'word_id'   => $s->gesture_word_id,
                'label'     => $s->word->label,
                'variant'   => $s->variant ?? 'BISINDO',
                'landmarks' => $s->landmarks,
            ])->values()->all();
        });
    }

    private function invalidateSamplesCache(): void
    {
        Cache::forget(self::SAMPLES_CACHE_KEY);
    }

    /**
     * Halaman utama ASTA KANDA (tab Belajar dkk).
     */
    public function index()
    {
        $words = GestureWord::withCount('samples')
            ->orderByRaw("FIELD(type,'alphabet','word') , label")
            ->get();

        return view('astakanda.index', compact('words'));
    }

    /**
     * Ambil daftar kata (dipakai JS untuk refresh grid tanpa reload).
     */
    public function words()
    {
        return response()->json(
            GestureWord::withCount('samples')->orderBy('label')->get()
        );
    }

    /**
     * Tambah kata baru (tab Kata) atau kembalikan huruf alfabet yang sudah
     * dihapus (tab Alfabet). Parameter `type` opsional: 'word' (default) / 'alphabet'.
     */
    public function storeWord(Request $request)
    {
        $data = $request->validate([
            'label' => 'required|string|max:50|unique:gesture_words,label',
            'type'  => 'nullable|in:alphabet,word',
        ]);

        $type  = $data['type'] ?? 'word';
        $label = $type === 'alphabet' ? strtoupper($data['label']) : $data['label'];

        $word = GestureWord::create([
            'label' => $label,
            'type'  => $type,
        ]);

        return response()->json($word, 201);
    }

    /**
     * Simpan satu rekaman gestur (dipanggil saat tombol huruf/kata ditahan).
     */
    public function recordSample(Request $request)
    {
        $data = $request->validate([
            'gesture_word_id' => 'required|exists:gesture_words,id',
            'landmarks'       => 'required|array|min:1',
            'variant'         => 'nullable|string|max:30',
        ]);

        // variant diisi lewat properti (bukan create($data)) supaya tidak bergantung
        // pada $fillable di model GestureSample.
        $sample = new GestureSample([
            'gesture_word_id' => $data['gesture_word_id'],
            'landmarks'       => $data['landmarks'],
        ]);
        $sample->variant = trim($data['variant'] ?? '') ?: 'BISINDO';
        $sample->save();
        $this->invalidateSamplesCache(); // ada rekaman baru -> cache lama tidak valid lagi

        return response()->json([
            'ok'         => true,
            'sample_id'  => $sample->id,
            'total'      => GestureSample::where('gesture_word_id', $data['gesture_word_id'])->count(),
        ], 201);
    }

    /**
     * Reset rekaman gestur. Kartu (GestureWord) tetap ada, jumlahnya kembali 0.
     *  - Tanpa word_id : hapus SEMUA rekaman pada satu tipe (alphabet / word).
     *  - Dengan word_id: hapus rekaman satu kartu saja, pada bahasa isyarat
     *                    (variant) yang dikirim. Tanpa variant = semua bahasa.
     */
    public function resetSamples(Request $request)
    {
        if ($request->filled('word_id')) {
            $data = $request->validate([
                'word_id' => 'required|exists:gesture_words,id',
                'variant' => 'nullable|string|max:30',
            ]);

            $variant = trim($data['variant'] ?? '');

            GestureSample::where('gesture_word_id', $data['word_id'])
                ->when($variant !== '', function ($q) use ($variant) {
                    // rekaman lama tanpa variant dianggap BISINDO (sama seperti getSamplesPayload)
                    $q->where(function ($w) use ($variant) {
                        $w->where('variant', $variant);
                        if ($variant === 'BISINDO') {
                            $w->orWhereNull('variant');
                        }
                    });
                })
                ->delete();
            $this->invalidateSamplesCache(); // rekaman berkurang -> cache lama tidak valid lagi

            return response()->json(['ok' => true]);
        }

        $data = $request->validate([
            'type' => 'required|in:alphabet,word',
        ]);

        $ids = GestureWord::where('type', $data['type'])->pluck('id');
        GestureSample::whereIn('gesture_word_id', $ids)->delete();
        $this->invalidateSamplesCache(); // rekaman berkurang -> cache lama tidak valid lagi

        return response()->json(['ok' => true]);
    }

    /**
     * Hapus kata + seluruh sample-nya (tombol x pada kartu).
     */
    public function destroyWord(GestureWord $word)
    {
        $word->delete();
        $this->invalidateSamplesCache(); // kata + rekamannya hilang -> cache lama tidak valid lagi

        return response()->json(['ok' => true]);
    }

    /**
     * Daftar semua rekaman gestur, dimuat sekali oleh browser untuk
     * pencocokan lokal (tanpa Python).
     */
    public function samples()
    {
        return response()->json($this->getSamplesPayload());
    }

    /**
     * Kirim landmark hasil deteksi live ke service Python untuk dicocokkan
     * dengan sample yang tersimpan, lalu kembalikan label terbaik.
     */
    public function recognize(Request $request)
    {
        $data = $request->validate([
            'landmarks' => 'required|array|min:1',
        ]);

        $pythonUrl = rtrim(config('services.gesture.url', env('GESTURE_SERVICE_URL', 'http://127.0.0.1:5001')), '/');

        try {
            $response = Http::timeout(3)->post($pythonUrl . '/recognize', [
                'landmarks' => $data['landmarks'],
                'samples'   => $this->getSamplesPayload(), // diambil dari cache, bukan query ulang
            ]);

            if ($response->failed()) {
                return response()->json(['ok' => false, 'message' => 'Layanan pengenalan gestur error.'], 502);
            }

            return response()->json($response->json());
        } catch (\Throwable $e) {
            Log::warning('Gesture service unreachable: ' . $e->getMessage());
            return response()->json([
                'ok'      => false,
                'message' => 'Layanan pengenalan gestur (Python) belum aktif.',
            ], 503);
        }
    }
}