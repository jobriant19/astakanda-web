<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameSkin extends Model
{
    protected $fillable = [
        'tipe', 'kode', 'nama', 'emoji', 'warna_utama', 'warna_kedua',
        'syarat_tipe', 'syarat_nilai', 'urutan',
    ];
}