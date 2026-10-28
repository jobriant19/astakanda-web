<?php

namespace App\Http\Controllers;

use App\Models\DinoScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DinoScoreController extends Controller
{
    /** Skor tertinggi setiap pemain, urut dari terbesar (dipakai layar Leaderboard Dino Attack). */
    public function leaderboard(): JsonResponse
    {
        $rows = DinoScore::query()
            ->where('skor_tertinggi', '>', 0)
            ->orderByDesc('skor_tertinggi')
            ->orderBy('updated_at')
            ->limit(10)
            ->get(['nama', 'skor_tertinggi']);

        return response()->json($rows);
    }

    /** Simpan hasil 1 permainan; hanya skor tertinggi per nama pemain yang dipertahankan. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['required', 'string', 'max:40'],
            'skor'      => ['required', 'integer', 'min:0', 'max:1000000'],
            'kesulitan' => ['nullable', 'string', 'in:mudah,sedang,sulit'],
            'kategori'  => ['nullable', 'string', 'in:alfabet,kata,gabungan'],
        ]);

        $nama = trim($data['nama']);
        $skor = (int) $data['skor'];

        $row = DinoScore::whereRaw('LOWER(nama) = ?', [mb_strtolower($nama)])->first();
        $rekorBaru = false;

        if (!$row) {
            DinoScore::create([
                'nama'           => $nama,
                'skor_tertinggi' => $skor,
                'kesulitan'      => $data['kesulitan'] ?? null,
                'kategori'       => $data['kategori'] ?? null,
                'total_main'     => 1,
            ]);
            $rekorBaru = $skor > 0;
            $tertinggi = $skor;
        } else {
            $row->total_main += 1;
            if ($skor > $row->skor_tertinggi) {
                $row->skor_tertinggi = $skor;
                $row->kesulitan = $data['kesulitan'] ?? $row->kesulitan;
                $row->kategori = $data['kategori'] ?? $row->kategori;
                $rekorBaru = true;
            }
            $row->save();
            $tertinggi = $row->skor_tertinggi;
        }

        return response()->json(['ok' => true, 'rekor_baru' => $rekorBaru, 'skor_tertinggi' => $tertinggi]);
    }
}