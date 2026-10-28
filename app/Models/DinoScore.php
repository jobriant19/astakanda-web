<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DinoScore extends Model
{
    protected $table = 'dino_scores';

    protected $fillable = ['nama', 'skor_tertinggi', 'kesulitan', 'kategori', 'total_main'];
}