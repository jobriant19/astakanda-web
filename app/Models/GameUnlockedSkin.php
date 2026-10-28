<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GameUnlockedSkin extends Model
{
    protected $fillable = ['guest_token', 'game_skin_id'];
    public $timestamps = false;
}