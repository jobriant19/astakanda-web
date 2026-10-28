<?php

namespace App\Http\Controllers;

use App\Models\GameGuestProgress;
use App\Models\GameSkin;
use App\Models\GameUnlockedSkin;
use Illuminate\Http\Request;

class GameSkinController extends Controller
{
    /** Daftar skin + progres pemain (guest), berdasarkan guest_token di browser. */
    public function index(Request $request)
    {
        $data = $request->validate(['guest_token' => 'required|string|max:100']);
        $guest = $data['guest_token'];

        $progress = GameGuestProgress::firstOrCreate(
            ['guest_token' => $guest],
            ['skor_tertinggi' => 0, 'total_main' => 0, 'total_menang' => 0]
        );

        $unlockedIds = GameUnlockedSkin::where('guest_token', $guest)->pluck('game_skin_id')->all();

        $skins = GameSkin::orderBy('tipe')->orderBy('urutan')->get()->map(function ($skin) use ($unlockedIds) {
            return [
                'id' => $skin->id,
                'tipe' => $skin->tipe,
                'kode' => $skin->kode,
                'nama' => $skin->nama,
                'emoji' => $skin->emoji,
                'warna_utama' => $skin->warna_utama,
                'warna_kedua' => $skin->warna_kedua,
                'syarat_tipe' => $skin->syarat_tipe,
                'syarat_nilai' => $skin->syarat_nilai,
                'terbuka' => $skin->syarat_tipe === 'default' || in_array($skin->id, $unlockedIds, true),
            ];
        });

        return response()->json(['progress' => $progress, 'skins' => $skins]);
    }

    /** Dipanggil begitu satu sesi Apple Snake selesai — update progres & buka skin baru bila syarat terpenuhi. */
    public function finish(Request $request)
    {
        $data = $request->validate([
            'guest_token' => 'required|string|max:100',
            'nama' => 'nullable|string|max:40',
            'skor' => 'required|integer|min:0',
            'menang' => 'required|boolean',
        ]);

        $progress = GameGuestProgress::firstOrCreate(
            ['guest_token' => $data['guest_token']],
            ['skor_tertinggi' => 0, 'total_main' => 0, 'total_menang' => 0]
        );
        if (!empty($data['nama'])) $progress->nama = $data['nama'];
        $progress->skor_tertinggi = max($progress->skor_tertinggi, $data['skor']);
        $progress->total_main += 1;
        if ($data['menang']) $progress->total_menang += 1;
        $progress->save();

        $unlockedIds = GameUnlockedSkin::where('guest_token', $data['guest_token'])->pluck('game_skin_id')->all();
        $baruTerbuka = [];

        GameSkin::where('syarat_tipe', '!=', 'default')->get()->each(function ($skin) use (&$baruTerbuka, $unlockedIds, $progress, $data) {
            if (in_array($skin->id, $unlockedIds, true)) return;
            $memenuhi = ($skin->syarat_tipe === 'skor' && $progress->skor_tertinggi >= $skin->syarat_nilai)
                || ($skin->syarat_tipe === 'menang' && $progress->total_menang >= $skin->syarat_nilai);
            if ($memenuhi) {
                GameUnlockedSkin::create(['guest_token' => $data['guest_token'], 'game_skin_id' => $skin->id]);
                $baruTerbuka[] = $skin->only(['id', 'tipe', 'nama', 'emoji']);
            }
        });

        return response()->json(['progress' => $progress, 'skin_baru' => $baruTerbuka]);
    }

    /** 10 skor tertinggi (guest yang sudah pernah mengisi nama). */
    public function leaderboard()
    {
        $top = GameGuestProgress::whereNotNull('nama')
            ->orderByDesc('skor_tertinggi')
            ->limit(10)
            ->get(['nama', 'skor_tertinggi', 'total_menang']);

        return response()->json($top);
    }
}