<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gesture_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gesture_word_id')->constrained()->cascadeOnDelete();
            // landmarks = array of frame, tiap frame = array hand (maks 2) berisi 21 titik {x,y,z}
            $table->json('landmarks');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gesture_samples');
    }
};
