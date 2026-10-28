<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UjianRiwayat extends Model
{
    protected $fillable = [
        'nama_peserta', 'kesulitan', 'total_soal', 'benar', 'salah', 'nilai', 'durasi_detik', 'detail',
    ];

    protected $casts = [
        'detail' => 'array',
    ];
}