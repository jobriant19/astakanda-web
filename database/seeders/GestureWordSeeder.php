<?php

namespace Database\Seeders;

use App\Models\GestureWord;
use Illuminate\Database\Seeder;

class GestureWordSeeder extends Seeder
{
    public function run(): void
    {
        foreach (range('A', 'Z') as $letter) {
            GestureWord::firstOrCreate(
                ['label' => $letter],
                ['type' => 'alphabet']
            );
        }
    }
}
