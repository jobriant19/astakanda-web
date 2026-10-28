<?php

namespace Database\Seeders;

use App\Models\SignLanguage;
use Illuminate\Database\Seeder;

class SignLanguageSeeder extends Seeder
{
    public function run(): void
    {
        $daftar = [
            'BISINDO', 'SIBI',
            'ASL (Amerika)', 'BSL (Inggris)', 'Auslan (Australia)', 'NZSL (Selandia Baru)',
            'IrSL (Irlandia)', 'LSQ (Quebec)',
            'LSF (Prancis)', 'DGS (Jerman)', 'OGS (Austria)', 'DSGS (Swiss Jerman)',
            'LIS (Italia)', 'LSE (Spanyol)', 'LGP (Portugal)',
            'NGT (Belanda)', 'VGT (Flandria, Belgia)',
            'SSL (Swedia)', 'NTS (Norwegia)', 'DTS (Denmark)', 'FinSL (Finlandia)', 'ITM (Islandia)',
            'PJM (Polandia)', 'RSL (Rusia)', 'UkrSL (Ukraina)', 'GSL (Yunani)', 'TID (Turki)', 'ISL (Israel)',
            'LIBRAS (Brasil)', 'LSM (Meksiko)', 'LSA (Argentina)', 'LSCol (Kolombia)', 'LSCh (Chili)', 'LSP (Peru)',
            'ArSL (Arab)', 'ESL (Mesir)', 'SASL (Afrika Selatan)', 'KSL (Kenya)',
            'JSL (Jepang)', 'KSL (Korea)', 'CSL (Tiongkok)', 'HKSL (Hong Kong)', 'TSL (Taiwan)',
            'ThSL (Thailand)', 'VSL (Vietnam)', 'BIM (Malaysia)', 'SgSL (Singapura)', 'FSL (Filipina)',
            'ISL (India)', 'PSL (Pakistan)', 'BdSL (Bangladesh)', 'SLSL (Sri Lanka)', 'NSL (Nepal)',
            'International Sign (Gestuno)',
        ];

        foreach ($daftar as $nama) {
            SignLanguage::firstOrCreate(
                ['nama' => $nama],
                ['is_default' => $nama === 'BISINDO']
            );
        }
    }
}