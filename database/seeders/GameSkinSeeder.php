<?php

namespace Database\Seeders;

use App\Models\GameSkin;
use Illuminate\Database\Seeder;

class GameSkinSeeder extends Seeder
{
    public function run(): void
    {
        $skins = [
            ['tipe' => 'snake', 'kode' => 'klasik', 'nama' => 'Klasik',     'emoji' => '🐍', 'warna_utama' => '#16a34a', 'warna_kedua' => '#15803d', 'syarat_tipe' => 'default', 'syarat_nilai' => null, 'urutan' => 1],
            ['tipe' => 'snake', 'kode' => 'biru',   'nama' => 'Biru Laut',  'emoji' => '🐍', 'warna_utama' => '#2563eb', 'warna_kedua' => '#1d4ed8', 'syarat_tipe' => 'skor',   'syarat_nilai' => 50,   'urutan' => 2],
            ['tipe' => 'snake', 'kode' => 'emas',   'nama' => 'Emas',      'emoji' => '🐍', 'warna_utama' => '#f59e0b', 'warna_kedua' => '#b45309', 'syarat_tipe' => 'menang', 'syarat_nilai' => 5,    'urutan' => 3],
            ['tipe' => 'apple', 'kode' => 'klasik', 'nama' => 'Klasik',     'emoji' => '🍎', 'warna_utama' => '#dc2626', 'warna_kedua' => '#facc15', 'syarat_tipe' => 'default', 'syarat_nilai' => null, 'urutan' => 1],
            ['tipe' => 'apple', 'kode' => 'ungu',   'nama' => 'Anggur',    'emoji' => '🍇', 'warna_utama' => '#7c3aed', 'warna_kedua' => '#facc15', 'syarat_tipe' => 'skor',   'syarat_nilai' => 100,  'urutan' => 2],
            ['tipe' => 'apple', 'kode' => 'pelangi','nama' => 'Pelangi',   'emoji' => '🌟', 'warna_utama' => '#ec4899', 'warna_kedua' => '#facc15', 'syarat_tipe' => 'menang', 'syarat_nilai' => 10,   'urutan' => 3],
        ];

        foreach ($skins as $skin) {
            GameSkin::firstOrCreate(['tipe' => $skin['tipe'], 'kode' => $skin['kode']], $skin);
        }
    }
}