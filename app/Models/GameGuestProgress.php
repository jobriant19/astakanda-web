<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameGuestProgress extends Model
{
    protected $table = 'game_guest_progress';
    protected $fillable = ['guest_token', 'skor_tertinggi', 'total_main', 'total_menang'];
}