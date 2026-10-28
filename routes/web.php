<?php

use App\Http\Controllers\GestureController;
use App\Http\Controllers\RiwayatController;

Route::get('/', [GestureController::class, 'index'])->name('astakanda.index');
Route::get('/gesture/words', [GestureController::class, 'words'])->name('astakanda.words');
Route::post('/gesture/words', [GestureController::class, 'storeWord'])->name('astakanda.words.store');
Route::delete('/gesture/words/{word}', [GestureController::class, 'destroyWord'])->name('astakanda.words.destroy');
Route::post('/gesture/record', [GestureController::class, 'recordSample'])->name('astakanda.record');
Route::post('/gesture/recognize', [GestureController::class, 'recognize'])->name('astakanda.recognize');
Route::post('/gesture/reset', [GestureController::class, 'resetSamples'])->name('astakanda.reset');
Route::get('/gesture/samples', [GestureController::class, 'samples'])->name('astakanda.samples');

Route::get('/bahasa-isyarat', [\App\Http\Controllers\SignLanguageController::class, 'index'])->name('astakanda.bahasa.index');
Route::post('/bahasa-isyarat', [\App\Http\Controllers\SignLanguageController::class, 'store'])->name('astakanda.bahasa.store');
Route::put('/bahasa-isyarat/{bahasa}', [\App\Http\Controllers\SignLanguageController::class, 'update'])->name('astakanda.bahasa.update');
Route::delete('/bahasa-isyarat/{bahasa}', [\App\Http\Controllers\SignLanguageController::class, 'destroy'])->name('astakanda.bahasa.destroy');

Route::get('/riwayat', [RiwayatController::class, 'index'])->name('astakanda.riwayat.index');
Route::get('/riwayat/{riwayat}', [RiwayatController::class, 'show'])->name('astakanda.riwayat.show');
Route::post('/riwayat', [RiwayatController::class, 'store'])->name('astakanda.riwayat.store');
Route::delete('/riwayat/{riwayat}', [RiwayatController::class, 'destroy'])->name('astakanda.riwayat.destroy');

Route::get('/game/skins', [\App\Http\Controllers\GameSkinController::class, 'index'])->name('astakanda.game.skins');
Route::post('/game/skins/finish', [\App\Http\Controllers\GameSkinController::class, 'finish'])->name('astakanda.game.skins.finish');
Route::get('/game/leaderboard', [\App\Http\Controllers\GameSkinController::class, 'leaderboard'])->name('astakanda.game.leaderboard');

Route::get('/game/dino/leaderboard', [\App\Http\Controllers\DinoScoreController::class, 'leaderboard'])->name('astakanda.dino.leaderboard');
Route::post('/game/dino/score', [\App\Http\Controllers\DinoScoreController::class, 'store'])->name('astakanda.dino.score');