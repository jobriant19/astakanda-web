<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_unlocked_skins', function (Blueprint $table) {
            $table->id();
            $table->string('guest_token');
            $table->foreignId('game_skin_id')->constrained()->cascadeOnDelete();
            $table->timestamp('unlocked_at')->useCurrent();
            $table->unique(['guest_token', 'game_skin_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_unlocked_skins');
    }
};