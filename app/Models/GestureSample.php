<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GestureSample extends Model
{
    protected $fillable = ['gesture_word_id', 'landmarks'];

    protected $casts = [
        'landmarks' => 'array',
    ];

    public function word(): BelongsTo
    {
        return $this->belongsTo(GestureWord::class, 'gesture_word_id');
    }
}
