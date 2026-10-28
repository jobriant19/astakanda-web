<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SignLanguage extends Model
{
    protected $fillable = ['nama', 'is_default'];

    protected $casts = [
        'is_default' => 'boolean',
    ];
}