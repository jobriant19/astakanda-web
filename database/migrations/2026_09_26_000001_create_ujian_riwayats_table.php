<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ujian_riwayats', function (Blueprint $table) {
            $table->id();
            $table->string('kesulitan');            // mudah/sedang/sulit/custom
            $table->unsignedInteger('total_soal');
            $table->unsignedInteger('benar');
            $table->unsignedInteger('salah');
            $table->unsignedInteger('nilai');        // 0-100
            $table->unsignedInteger('durasi_detik')->default(0);
            $table->json('detail')->nullable();      // [{target, hasil}]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ujian_riwayats');
    }
};