<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sign_languages', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 30)->unique();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // Rekaman lama berlabel "Umum" dipindah ke BISINDO (bawaan)
        DB::table('gesture_samples')->where('variant', 'Umum')->update(['variant' => 'BISINDO']);
        Schema::table('gesture_samples', function (Blueprint $table) {
            $table->string('variant', 30)->default('BISINDO')->change();
        });

        $now = now();
        DB::table('sign_languages')->insert([
            'nama' => 'BISINDO', 'is_default' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        // Variasi yang sudah terlanjur terekam ikut didaftarkan
        DB::table('gesture_samples')->distinct()->pluck('variant')
            ->filter()
            ->reject(fn ($v) => $v === 'BISINDO')
            ->each(fn ($nama) => DB::table('sign_languages')->insertOrIgnore([
                'nama' => $nama, 'is_default' => false, 'created_at' => $now, 'updated_at' => $now,
            ]));
    }

    public function down(): void
    {
        Schema::dropIfExists('sign_languages');
    }
};