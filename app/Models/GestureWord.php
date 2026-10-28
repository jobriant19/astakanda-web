<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GestureWord extends Model
{
    protected $fillable = ['label', 'type'];

    public function samples(): HasMany
    {
        return $this->hasMany(GestureSample::class);
    }
}
