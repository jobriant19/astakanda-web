<?php

namespace App\Http\Controllers;

use App\Models\GestureSample;
use App\Models\SignLanguage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SignLanguageController extends Controller
{
    // Sama dengan kunci cache di GestureController
    private const SAMPLES_CACHE_KEY = 'astakanda_gesture_samples_payload';

    private const MESSAGES = [
        'nama.required' => 'Nama wajib diisi.',
        'nama.max'      => 'Maksimal 30 karakter.',
        'nama.unique'   => 'Nama ini sudah ada.',
    ];

    public function index()
    {
        SignLanguage::firstOrCreate(['nama' => 'BISINDO'], ['is_default' => true]);

        $counts = GestureSample::selectRaw('variant, COUNT(*) as total')
            ->groupBy('variant')
            ->pluck('total', 'variant');

        return response()->json(
            SignLanguage::orderByDesc('is_default')->orderBy('nama')->get()->map(fn ($l) => [
                'id'            => $l->id,
                'nama'          => $l->nama,
                'is_default'    => (bool) $l->is_default,
                'samples_count' => (int) ($counts[$l->nama] ?? 0),
            ])->values()
        );
    }

    public function store(Request $request)
    {
        $request->merge(['nama' => trim((string) $request->input('nama'))]);
        $data = $request->validate([
            'nama' => 'required|string|max:30|unique:sign_languages,nama',
        ], self::MESSAGES);

        $bahasa = SignLanguage::create(['nama' => $data['nama']]);

        return response()->json($bahasa, 201);
    }

    public function update(Request $request, SignLanguage $bahasa)
    {
        $request->merge(['nama' => trim((string) $request->input('nama'))]);
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:30', Rule::unique('sign_languages', 'nama')->ignore($bahasa->id)],
        ], self::MESSAGES);

        $old = $bahasa->nama;

        DB::transaction(function () use ($bahasa, $data, $old) {
            $bahasa->update(['nama' => $data['nama']]);
            GestureSample::where('variant', $old)->update(['variant' => $data['nama']]);
        });
        Cache::forget(self::SAMPLES_CACHE_KEY);

        return response()->json(['ok' => true, 'id' => $bahasa->id, 'nama' => $bahasa->nama, 'old' => $old]);
    }

    public function destroy(SignLanguage $bahasa)
    {
        if ($bahasa->is_default) {
            return response()->json(['ok' => false, 'message' => 'Bahasa isyarat bawaan tidak bisa dihapus.'], 422);
        }

        DB::transaction(function () use ($bahasa) {
            GestureSample::where('variant', $bahasa->nama)->delete();
            $bahasa->delete();
        });
        Cache::forget(self::SAMPLES_CACHE_KEY);

        // Jumlah rekaman terbaru per kartu, untuk menyegarkan angka di tab Belajar
        $counts = GestureSample::selectRaw('gesture_word_id, COUNT(*) as total')
            ->groupBy('gesture_word_id')
            ->pluck('total', 'gesture_word_id');

        return response()->json(['ok' => true, 'counts' => $counts]);
    }
}