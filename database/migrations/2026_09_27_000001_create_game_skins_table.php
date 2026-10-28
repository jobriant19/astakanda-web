<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_skins', function (Blueprint $table) {
            $table->id();
            $table->enum('tipe', ['snake', 'apple']);
            $table->string('kode');
            $table->string('nama');
            $table->string('emoji');
            $table->string('warna_utama');
            $table->string('warna_kedua')->nullable();
            $table->enum('syarat_tipe', ['default', 'skor', 'menang'])->default('default');
            $table->unsignedInteger('syarat_nilai')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
            $table->unique(['tipe', 'kode']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_skins');
    }
};