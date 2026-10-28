<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gesture_samples', function (Blueprint $table) {
            $table->string('variant', 30)->default('Umum')->after('gesture_word_id');
        });
    }

    public function down(): void
    {
        Schema::table('gesture_samples', function (Blueprint $table) {
            $table->dropColumn('variant');
        });
    }
};