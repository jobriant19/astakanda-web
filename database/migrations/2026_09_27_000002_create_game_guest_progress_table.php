<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_guest_progress', function (Blueprint $table) {
            $table->id();
            $table->string('guest_token')->unique();
            $table->unsignedInteger('skor_tertinggi')->default(0);
            $table->unsignedInteger('total_main')->default(0);
            $table->unsignedInteger('total_menang')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_guest_progress');
    }
};