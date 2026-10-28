<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_guest_progress', function (Blueprint $table) {
            $table->string('nama')->nullable()->after('guest_token');
        });
    }

    public function down(): void
    {
        Schema::table('game_guest_progress', function (Blueprint $table) {
            $table->dropColumn('nama');
        });
    }
};