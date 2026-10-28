<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Leaderboard Dino Attack — terpisah dari leaderboard Apple Snake.
        Schema::create('dino_scores', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 40);
            $table->unsignedInteger('skor_tertinggi')->default(0);
            $table->string('kesulitan', 10)->nullable();
            $table->string('kategori', 10)->nullable();
            $table->unsignedInteger('total_main')->default(0);
            $table->timestamps();
            $table->index('skor_tertinggi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dino_scores');
    }
};