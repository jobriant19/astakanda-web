<?php

namespace App\Http\Controllers;

use App\Models\UjianRiwayat;
use Illuminate\Http\Request;

class RiwayatController extends Controller
{
    /**
     * Daftar riwayat ujian, terbaru dulu. Sudah termasuk rincian per soal ('detail')
     * supaya layar detail langsung tampil tanpa request tambahan.
     */
    public function index()
    {
        return response()->json(
            UjianRiwayat::orderByDesc('created_at')
                ->limit(200)
                ->get(['id', 'nama_peserta', 'kesulitan', 'total_soal', 'benar', 'salah', 'nilai', 'durasi_detik', 'detail', 'created_at'])
        );
    }

    /**
     * Detail satu riwayat (cadangan bila cache lama belum berisi rincian).
     */
    public function show(UjianRiwayat $riwayat)
    {
        return response()->json($riwayat);
    }

    /**
     * Simpan satu hasil ujian (dipanggil otomatis oleh ujian.js saat ujian selesai).
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'nama_peserta' => 'nullable|string|max:50',
            'kesulitan'    => 'required|string|max:20',
            'total_soal'   => 'required|integer|min:0',
            'benar'        => 'required|integer|min:0',
            'salah'        => 'required|integer|min:0',
            'nilai'        => 'required|integer|min:0|max:100',
            'durasi_detik' => 'nullable|integer|min:0',
            'detail'       => 'nullable|array',
        ]);

        $data['nama_peserta'] = trim($data['nama_peserta'] ?? '') ?: null;

        return response()->json(UjianRiwayat::create($data), 201);
    }

    /**
     * Hapus satu riwayat.
     */
    public function destroy(UjianRiwayat $riwayat)
    {
        $riwayat->delete();

        return response()->json(['ok' => true]);
    }
}