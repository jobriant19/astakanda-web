/* ASTA KANDA — Dino Attack
 * Porting mesin "DinoTyping" (canvas, sprite dino/hornet/pohon/kaktus, efek, fisika lompat)
 * dengan input BARU: bukan mengetik, melainkan MEMPERAGAKAN GESTUR TANGAN ke kamera.
 *  - Setiap rintangan (darat maupun udara) membawa 1 huruf/kata yang sudah direkam di tab Belajar.
 *  - Gestur benar  -> label di atas rintangan jadi HIJAU, dino melompat / menyerang rintangan udara.
 *  - Gestur salah  -> label jadi MERAH, rintangan menabrak dino / serangan udara mengenai dino (-1 nyawa).
 *  - Rintangan sampai ke dino tanpa dijawab -> sama seperti salah (-1 nyawa). Nyawa habis = Game Over.
 * Deteksi memakai kamera + /gesture/recognize yang sama dengan Apple Snake & Ujian.
 */
(function () {
  'use strict';
  const panelPlay = document.getElementById('game-dino-play');
  if (!panelPlay) return;

  function el(id) { return document.getElementById(id); }
  const canvas = () => el('dino-canvas');
  let state = null;

  const DIFF_CONFIG = {
    mudah:  { baseSpeed: 130, spawnGapMin: 900,  spawnGapMax: 1400, scoreMul: 10, airChance: 0.25, label: 'MUDAH' },
    sedang: { baseSpeed: 190, spawnGapMin: 650,  spawnGapMax: 1050, scoreMul: 15, airChance: 0.35, label: 'SEDANG' },
    sulit:  { baseSpeed: 260, spawnGapMin: 450,  spawnGapMax: 800,  scoreMul: 20, airChance: 0.45, label: 'SULIT' },
  };
  // Setelah dijawab (benar/salah), rintangan dipercepat supaya tidak menunggu lama
  const ANSWER_SPEEDUP = 1.4; // lebih kecil karena kecepatan dasar sudah naik; naiknya dibuat halus (lihat updatePhysics)

const GROUND_Y = 280;
const PLAYER_X = 90;

// Fisika lompat dino, dihitung agar puncak lompatan pas di atas rintangan.
// JUMP_HANG_TIME = jeda singkat "melayang" di puncak, supaya lompatan tidak
// cuma 1 frame lewat dan rintangan tidak menabrak dino.
const JUMP_GRAVITY = 1600;
const JUMP_VY = -630;
const JUMP_RISE_TIME = Math.abs(JUMP_VY) / JUMP_GRAVITY;
const JUMP_HANG_TIME = 0.14; // detik melayang di puncak lompatan

// Variasi model visual rintangan (digambar vector, bukan pixel-art)
const GROUND_MODELS = ['cactus', 'rock', 'spike', 'log', 'crystal'];
const AIR_MODELS = ['drone', 'ufo', 'missile', 'hornet'];

// Lebar (px) tiap model rintangan — dipakai agar label kata selalu presisi
// di tengah-atas bentuknya (bukan offset tetap untuk semua model).
const GROUND_WIDTH = { cactus: 25, rock: 40, spike: 38, log: 44, crystal: 34 };
const AIR_WIDTH = { drone: 40, ufo: 40, missile: 50, hornet: 122 };
// Jarak label kata dari tiap model rintangan udara — beda-beda karena tinggi
// badannya juga beda (hornet jauh lebih tinggi dari model lain).
const AIR_LABEL_OFFSET = { drone: 16, ufo: 20, missile: 14, hornet: 70 };

// Lama (ms) menahan tampilan huruf TERAKHIR sebuah kata: BENAR -> kata penuh
// hijau sejenak sebelum lanjut ke skor/lompat; SALAH -> huruf terakhir merah
// tertahan lebih lama dari kedipan biasa (260ms), supaya hasilnya terbaca jelas.
const WORD_RESULT_HOLD_MS = 380;

// ============================================================
// DINO — sprite PNG animasi jalan (public/assets/images/walk/walk1..240.png)
// ============================================================
const DINO_SPRITE_PATH = '/assets/images/walk/walk';
const WALK_FRAME_COUNT = 240;
const DINO_FRAME_DURATION = 0.02; // detik/frame — kecilkan = animasi lebih cepat

// Ukuran render & titik jangkar "kaki" dino (0-1 relatif ukuran sprite).
// Sesuaikan 4 nilai ini kalau ganti file PNG, supaya kaki pas menapak tanah.
const DINO_SPRITE_W = 160;
const DINO_SPRITE_H = 215;
const DINO_SPRITE_ANCHOR_X = 0.38;
const DINO_SPRITE_ANCHOR_Y = 0.93;

// Jarak pijakan dari garis jalan (GROUND_Y) ke tempat dino & rintangan darat
// benar-benar berpijak. Dipakai KEDUANYA supaya sejajar — jangan diubah
// sepihak, nanti fisika lompat (JUMP_*) ikut meleset.
const GROUND_CONTACT_OFFSET = 40;

// Dorongan turun tambahan KHUSUS dino (rintangan tidak ikut), mengompensasi
// ruang transparan di bagian bawah file PNG dino.
const DINO_EXTRA_DROP = 34;

// Titik mulut dino (relatif thd titik kaki) — tempat bola api & kilau
// serangan muncul. Sesuaikan kalau posisi mulut di sprite kamu berbeda.
const DINO_MOUTH_X = 51;
const DINO_MOUTH_Y = -101;

// Buffer offscreen utk menggambar dino + tint efek damage. Wajib dikomposit
// di sini dulu (bukan langsung ke canvas utama) — kalau langsung, tint akan
// ikut menimpa background di bawah sprite ('source-atop' bereaksi ke semua
// piksel non-transparan yang sudah ada di context tujuan).
const dinoFxBuffer = document.createElement('canvas');
dinoFxBuffer.width = DINO_SPRITE_W;
dinoFxBuffer.height = DINO_SPRITE_H;
const dinoFxCtx = dinoFxBuffer.getContext('2d');

const dinoWalkFrames = [];
function preloadDinoSprites(){
    for (let i = 1; i <= WALK_FRAME_COUNT; i++){
        const img = new Image();
        img.src = `${DINO_SPRITE_PATH}${i}.png`;
        dinoWalkFrames.push(img);
    }
}

// ============================================================
// HORNET — sprite PNG animasi (public/assets/images/hornet/hornet1..240.png),
// di-preload sejak awal supaya sudah siap saat pertama kali muncul.
// ============================================================
const HORNET_SPRITE_PATH = '/assets/images/hornet/hornet';
const HORNET_FRAME_COUNT = 240;
const HORNET_FRAME_DURATION = 0.035; // detik/frame — lebih lambat dari dino krn sprite besar
// Tinggi render hornet; lebar dihitung otomatis dari rasio asli PNG-nya
// (lihat drawAirObstacle) supaya tidak gepeng walau ukurannya besar.
const HORNET_TARGET_H = 156;

const hornetFrames = [];
function preloadHornetSprites(){
    for (let i = 1; i <= HORNET_FRAME_COUNT; i++){
        const img = new Image();
        img.src = `${HORNET_SPRITE_PATH}${i}.png`;
        hornetFrames.push(img);
    }
}

// ============================================================
// POHON — sprite PNG statis (public/assets/images/tree/tree1-2.png),
// dipilih acak tapi stabil per posisi (lihat pickTreeVariant).
// ============================================================
const TREE_SPRITE_PATH = '/assets/images/tree/tree';
const TREE_VARIANT_COUNT = 2;
const TREE_TARGET_H = 130; // lebar dihitung otomatis dari rasio asli PNG

const treeSprites = [];
function preloadTreeSprites(){
    for (let i = 1; i <= TREE_VARIANT_COUNT; i++){
        const img = new Image();
        img.src = `${TREE_SPRITE_PATH}${i}.png`;
        treeSprites.push(img);
    }
}

const CACTUS_SPRITE_PATH = '/assets/images/obstacle/cactus.png';
const CACTUS_TARGET_H = 64; // tinggi target render, menyamai tinggi desain vector sebelumnya

const cactusSprite = new Image();


function drawCactusSprite(ctx, x, baseY){
    const img = cactusSprite;
    // sprite belum termuat -> lewati saja frame ini (menghindari gambar rusak/kotak kosong)
    if (!img.complete || img.naturalWidth === 0) return;

    const targetH = CACTUS_TARGET_H;
    const targetW = targetH * (img.naturalWidth / img.naturalHeight);
    // dipusatkan tepat di titik tengah lebar hitbox kaktus (GROUND_WIDTH.cactus)
    // & bertumpu (anchor bawah) di baseY — sama seperti rintangan darat lain.
    const cx = x + GROUND_WIDTH.cactus / 2;
    ctx.drawImage(img, cx - targetW / 2, baseY - targetH, targetW, targetH);
}

// Pemilih varian pohon PSEUDO-RANDOM: hasilnya terlihat acak, tapi
// SELALU SAMA untuk seed (posisi) yang sama, supaya pohon tidak berganti-
// ganti gambar tiap frame saat scroll (harus stabil per posisi pohon).
function pickTreeVariant(seed){
    return seed % TREE_VARIANT_COUNT;
}

function pickModel(type){
    const models = type === 'air' ? AIR_MODELS : GROUND_MODELS;
    const lastKey = type === 'air' ? 'lastAirModel' : 'lastGroundModel';
    let model = models[Math.floor(Math.random() * models.length)];
    if (models.length > 1){
        while (model === state[lastKey]){
            model = models[Math.floor(Math.random() * models.length)];
        }
    }
    state[lastKey] = model;
    return model;
}
function triggerJump(){
    state.jump.active = true;
    state.jump.vy = JUMP_VY;
    state.jump.pastApex = false;
    state.jump.hanging = false;
    state.jump.hangTimer = 0;
    sfxJump();
}

// Dino menembakkan rentetan bola api homing (selalu akurat, lihat
// updateEffects) ke rintangan udara — jeda & sebaran kecil antar tembakan
// biar terasa seperti rentetan, bukan 1 proyektil tunggal.
const AIR_ATTACK_BURST_COUNT = 4;
function triggerAirAttack(ob, now){
    const originX = PLAYER_X + 18 + DINO_MOUTH_X;
    const originY = GROUND_Y + GROUND_CONTACT_OFFSET + DINO_EXTRA_DROP + state.jump.y + DINO_MOUTH_Y;
    for (let i = 0; i < AIR_ATTACK_BURST_COUNT; i++){
        state.effects.projectiles.push({
            x: originX + (Math.random() * 8 - 4),
            y: originY + (Math.random() * 8 - 4),
            target: ob,     // mengejar posisi target terkini setiap frame -> selalu akurat
            speed: 780 + i * 30,
            hit: false,
            readyAt: now + i * 55, // jeda antar peluru dalam rentetan (ms)
        });
    }
    state.mouthGlowUntil = now + 320;
    sfxAttack();
}

function triggerHit(){
    const now = performance.now();
    state.hitStartAt = now;
    state.hitFlashUntil = now + 420; // durasi kedip merah/putih & guncangan saat kena damage
    sfxDamage();
    spawnExplosion(PLAYER_X + 18, GROUND_Y + GROUND_CONTACT_OFFSET + DINO_EXTRA_DROP - 30, '#ef4444');
    spawnExplosion(PLAYER_X + 18, GROUND_Y + GROUND_CONTACT_OFFSET + DINO_EXTRA_DROP - 30, '#f8fafc');
}

// ============================================================
function spawnExplosion(x, y, color){
    for (let i = 0; i < 12; i++){
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 130;
        state.effects.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.35 + Math.random() * 0.3,
            maxLife: 0.65,
            r: 2 + Math.random() * 3,
            color,
        });
    }
}

// Peluru rintangan udara ke arah dino — selalu dibidik akurat, dianggap
// "kena" begitu jaraknya sudah sangat dekat (lihat updateEffects), jadi
// tidak pernah terlihat meleset. Bentuk bervariasi per model rintangan.
// `delayMs` opsional dipakai spawnEnemyBulletVolley untuk efek rentetan.
function spawnEnemyBullet(ob, now, delayMs){
    const halfW = (AIR_WIDTH[ob.model] || 34) / 2;
    const originX = ob.x + halfW + (Math.random() * 8 - 4);
    const originY = ob.y + 9 + (Math.random() * 6 - 3);
    // Jitter sasaran dibuat sangat kecil supaya peluru selalu terlihat
    // menuju & mengenai badan dino.
    const targetX = PLAYER_X + 18 + (Math.random() * 1.4 - 0.7);
    const targetY = GROUND_Y + GROUND_CONTACT_OFFSET + DINO_EXTRA_DROP + state.jump.y - 34 + (Math.random() * 1.4 - 0.7);
    const dx = targetX - originX, dy = targetY - originY;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = 460 + Math.random() * 70;
    state.effects.enemyBullets.push({
        x: originX, y: originY,
        targetX, targetY,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        speed,
        model: ob.model,
        life: 1.8,
        readyAt: delayMs ? now + delayMs : 0,
        hit: false,
    });
}

// Jumlah peluru per tembakan rintangan udara (1 = satu tembakan akurat,
// langsung kena — lihat spawnEnemyBullet & updateEffects).
const ENEMY_BULLET_BURST_COUNT = 1;
function spawnEnemyBulletVolley(ob, now){
    for (let i = 0; i < ENEMY_BULLET_BURST_COUNT; i++){
        spawnEnemyBullet(ob, now, i * 90);
    }
}

function updateEffects(dt, now){
    state.effects.particles = state.effects.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 180 * dt;
        p.life -= dt;
        return p.life > 0;
    });

    // Cincin kejut (shockwave) ledakan: statis, hanya disaring berdasar usianya.
    state.effects.shockwaves = state.effects.shockwaves.filter(s => (now - s.start) < s.duration);

    // Proyektil homing: bergerak lurus mengejar posisi target TERKINI tiap
    // frame. Proyektil dgn readyAt di masa depan (bagian rentetan tembakan)
    // menunggu dulu sebelum ikut bergerak.
    state.effects.projectiles = state.effects.projectiles.filter(pr => {
        if (pr.hit) return false;
        if (pr.readyAt && now < pr.readyAt) return true;
        const ob = pr.target;
        if (!ob) return false;
        const tx = ob.x + 17, ty = ob.y + 8;
        const dx = tx - pr.x, dy = ty - pr.y;
        const dist = Math.hypot(dx, dy);
        const step = pr.speed * dt;

        // jejak percikan biru di belakang bola api agar terasa halus & bertenaga
        state.effects.particles.push({
            x: pr.x, y: pr.y,
            vx: (Math.random() - 0.5) * 16,
            vy: (Math.random() - 0.5) * 16,
            life: 0.16, maxLife: 0.16,
            r: 1.4 + Math.random() * 1.8,
            color: 'rgba(56,189,248,0.85)',
        });

        if (dist <= step || dist < 5){
            pr.x = tx; pr.y = ty;
            pr.hit = true;
            if (state.current === ob && !ob.exploded){
                ob.exploded = true;
                // Ledakan: 3 gelombang partikel (biru/jingga/putih) + 2 shockwave
                // yang mengembang & memudar.
                spawnExplosion(tx, ty, '#38bdf8');
                spawnExplosion(tx, ty, '#f59e0b');
                spawnExplosion(tx, ty, '#ffffff');
                state.effects.shockwaves.push({ x: tx, y: ty, start: now, duration: 380, maxR: 30, color: 'rgba(148,197,255,0.9)' });
                state.effects.shockwaves.push({ x: tx, y: ty, start: now + 70, duration: 320, maxR: 20, color: 'rgba(251,191,36,0.9)' });
                ob.finalizeAt = now + 450;
            } else if (state.current === ob){
                // Proyektil susulan (target sudah meledak duluan) -> tetap
                // beri percikan kecil supaya terasa kena.
                spawnExplosion(tx, ty, '#7dd3fc');
            }
            return false;
        }

        pr.x += (dx / dist) * step;
        pr.y += (dy / dist) * step;
        return true;
    });

    // Peluru rintangan udara: melaju lurus akurat ke dino, dianggap "kena"
    // begitu jaraknya sudah sangat dekat (percikan lalu hilang) — jadi tidak
    // pernah terlihat meleset lewat dino.
    state.effects.enemyBullets = state.effects.enemyBullets.filter(b => {
        if (b.hit) return false;
        if (b.readyAt && now < b.readyAt) return true;

        const dx = b.targetX - b.x, dy = b.targetY - b.y;
        const dist = Math.hypot(dx, dy);
        const step = (b.speed || 400) * dt;

        if (dist <= step || dist < 6){
            b.hit = true;
            const impactColor = b.model === 'ufo' ? '#c084fc'
                : b.model === 'hornet' ? '#facc15'
                : '#f87171';
            spawnExplosion(b.targetX, b.targetY, impactColor);
            return false;
        }

        b.x += (dx / dist) * step;
        b.y += (dy / dist) * step;
        b.life -= dt;
        if (Math.random() < 0.55){
            const trailColor = b.model === 'ufo' ? 'rgba(168,85,247,0.75)'
                : b.model === 'hornet' ? (Math.random() < 0.5 ? 'rgba(15,15,17,0.7)' : 'rgba(250,204,21,0.7)')
                : 'rgba(239,68,68,0.75)';
            state.effects.particles.push({
                x: b.x, y: b.y,
                vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12,
                life: 0.16, maxLife: 0.16,
                r: 1.2 + Math.random() * 1.4,
                color: trailColor,
            });
        }
        return b.life > 0;
    });
}


// ============================================================
// Suara: dimatikan (stub) — tempat menyambungkan efek suara bila diperlukan
// ============================================================
function sfxTyping(){ if (window.AstaSound) AstaSound.play('typing', { gain: 0.5, offset: 0, duration: 0.22 }); }
function sfxJump(){ if (window.AstaSound) AstaSound.play('jump', { rate: 1.25, gain: 0.55 }); }
function sfxGameOver(){ if (window.AstaSound) AstaSound.play('gameover', { gain: 0.6 }); }
function sfxDamage(){ if (window.AstaSound) AstaSound.play('damage', { gain: 0.6 }); }
function sfxAttack(){
    if (!window.AstaSound) return;
    AstaSound.tone({ freq: 900, duration: 0.12, type: 'sawtooth', gain: 0.14, glideTo: 220 });
    AstaSound.noise({ duration: 0.08, gain: 0.08 });
}

// ============================================================
// Aset (lazy: baru diunduh saat Dino Attack pertama kali dimulai)
// ============================================================
let assetsRequested = false;
let assetsPromise = null;
let assetsTotal = 0, assetsDone = 0;
// onProgress(done, total) dipanggil tiap 1 aset selesai — dipakai pop-up
// loading untuk mengisi progress bar. Aman dipanggil berkali-kali (Main Lagi
// dsb.): kalau aset sudah pernah dimuat, langsung dilaporkan 100% selesai.
function ensureAssets(onProgress){
    if (assetsRequested){
        if (onProgress) onProgress(assetsTotal, assetsTotal);
        return assetsPromise;
    }
    assetsRequested = true;
    preloadDinoSprites(); preloadHornetSprites(); preloadTreeSprites();
    cactusSprite.src = CACTUS_SPRITE_PATH;
    // Cukup tunggu sebagian awal frame animasi; sisanya menyusul di latar belakang
    const targets = [
        ...dinoWalkFrames.slice(0, 12),
        ...hornetFrames.slice(0, 12),
        ...treeSprites,
        cactusSprite,
    ];
    assetsTotal = targets.length;
    assetsDone = 0;
    const bump = () => { assetsDone++; if (onProgress) onProgress(assetsDone, assetsTotal); };
    const wait = (img) => new Promise((res) => {
        if (img.complete && img.naturalWidth > 0) { bump(); return res(); }
        img.addEventListener('load', () => { bump(); res(); }, { once: true });
        img.addEventListener('error', () => { bump(); res(); }, { once: true });
    });
    assetsPromise = Promise.all(targets.map(wait));
    return assetsPromise;
}

// ============================================================
// STATE & ATURAN (versi gestur)
// ============================================================
function freshState(difficulty, playerName, pool){
    return {
        running: false, finished: false, gameOverPending: false,
        difficulty, playerName, pool,
        score: 0, hearts: 3, clearedCount: 0, correctWords: 0, wrongHits: 0,
        startTime: 0, lastFrameTime: 0,
        current: null, typedIndex: 0, wrongFlashAt: 0,
        waitingSpawn: true, recentWords: [],
        lastGroundModel: null, lastAirModel: null,
        jump: { active:false, vy:0, y:0, hanging:false, hangTimer:0, pastApex:false },
        walkFrame: 0, walkTimer: 0,
        hitFlashUntil: 0, hitStartAt: 0, mouthGlowUntil: 0,
        rafId: null,
        effects: { particles: [], projectiles: [], enemyBullets: [], shockwaves: [] },
    };
}

function pickWord(){
    const pool = state.pool;
    let word, tries = 0;
    do {
        word = pool[Math.floor(Math.random() * pool.length)];
        tries++;
    } while (state.recentWords.includes(word) && tries < 8);
    state.recentWords.push(word);
    if (state.recentWords.length > Math.min(3, pool.length - 1)) state.recentWords.shift();
    return word;
}

function currentSpeed(){
    const cfg = DIFF_CONFIG[state.difficulty];
    return cfg.baseSpeed + Math.min(state.clearedCount * 3, 90); // makin lama makin cepat, dibatasi (sama seperti referensi)
}

function trySpawn(now){
    if (state.current || !state.waitingSpawn) return;
    const cfg = DIFF_CONFIG[state.difficulty];
    const type = Math.random() < cfg.airChance ? 'air' : 'ground';
    const word = pickWord();
    state.current = {
        type, model: pickModel(type), word,
        x: logicalW + 40,
        y: type === 'air' ? GROUND_Y - 155 : GROUND_Y - 26,
        resolved: null, answer: null,
        jumped: false, attackTriggered: false, exploded: false,
        finalizeAt: 0, nextShotAt: 0, spawnedAt: now,
    };
    state.typedIndex = 0;
    state.waitingSpawn = false;
    resetAnswerTracking();
    setTarget(word);
}

function scheduleNextSpawn(now){
    const cfg = DIFF_CONFIG[state.difficulty];
    const gap = cfg.spawnGapMin + Math.random() * (cfg.spawnGapMax - cfg.spawnGapMin);
    state.waitingSpawn = false;
    const st = state;
    setTimeout(() => { if (state === st && st.running) st.waitingSpawn = true; }, gap);
}

// Berapa lama label kata (hijau/merah) tetap tampil SETELAH rintangan selesai
// diproses, supaya indikator benar/salah benar-benar sempat terlihat pemain
// (sebelumnya label langsung hilang di frame yang sama saat selesai, jadi
// nyaris tak pernah terlihat).
const LABEL_LINGER_MS = 450;

function resolveObstacle(cleared){
    if (!state.current || state.current.resolved) return;
    const ob = state.current;
    if (cleared){
        state.score += DIFF_CONFIG[state.difficulty].scoreMul + ob.word.replace(/\s/g,'').length;
        state.correctWords++;
        state.clearedCount++;
        ob.resolved = 'cleared';
    } else {
        loseHeart();
        triggerHit();
        ob.resolved = 'missed';
        if (!ob.answer) setFeedback(false, 'Terlewat');
    }
    ob.labelHideAt = performance.now() + LABEL_LINGER_MS;
    state.typedIndex = 0;
    updateHud();
}

function finalizeObstacle(){
    state.current = null;
    state.typedIndex = 0;
    setTarget(null);
    scheduleNextSpawn(performance.now());
}

function loseHeart(){
    if (state.gameOverPending) return;
    state.hearts = Math.max(0, state.hearts - 1);
    state.wrongHits++;
    updateHud();
    triggerHeartLostEffect();
    if (state.hearts <= 0){
        state.gameOverPending = true;
        const st = state;
        setTimeout(() => { if (state === st && !st.finished) endGame(); }, 700);
    }
}

// Port persis dari referensi DinoTyping: ikon hati pecah muncul di tengah
// layar + guncangan singkat pada arena, sama-sama di-restart lewat
// remove -> reflow (void offsetWidth) -> add supaya animasi CSS selalu
// terpicu ulang walau nyawa hilang berturut-turut dengan cepat.
const HEART_LOST_EFFECT_DURATION = 700;
let heartLostTimeoutId = null;
function triggerHeartLostEffect(){
    const box = el('dino-heart-lost');
    const stage = canvas() && canvas().parentElement;
    if (box){ box.classList.remove('play'); void box.offsetWidth; box.classList.add('play'); }
    if (stage){ stage.classList.remove('shake-hit'); void stage.offsetWidth; stage.classList.add('shake-hit'); }
    clearTimeout(heartLostTimeoutId);
    heartLostTimeoutId = setTimeout(() => { if (box) box.classList.remove('play'); }, HEART_LOST_EFFECT_DURATION);
}


function updatePhysics(dt, now){
    // Update posisi & status rintangan aktif
    if (state.current){
        const ob = state.current;
        const speed = currentSpeed();

        if (!ob.resolved){
            // Percepatan HALUS setelah dijawab (bukan loncat instan 1x -> ANSWER_SPEEDUPx)
            ob.speedMul = (ob.speedMul || 1) + ((ob.answer ? ANSWER_SPEEDUP : 1) - (ob.speedMul || 1)) * Math.min(1, dt * 8);
            ob.x -= speed * ob.speedMul * dt;
            // Serangan udara hanya menembak saat sudah dekat/di atas dino,
            // bukan sepanjang perjalanan dari kanan layar.
            const nearDino = ob.type === 'air' && ob.x <= PLAYER_X + 130 && ob.x > PLAYER_X - 50;
            if (nearDino && now >= ob.nextShotAt){
                spawnEnemyBulletVolley(ob, now);
                ob.nextShotAt = now + 420 + Math.random() * 260;
            }
            if (ob.x <= PLAYER_X - 10){
                resolveObstacle(false); // mencapai dino tanpa selesai diketik = MISS
            }
        } else if (ob.resolved === 'cleared' && ob.type === 'ground'){
            // Sudah benar diketik: rintangan tetap melaju, dino melompatinya.
            ob.speedMul = (ob.speedMul || 1) + (ANSWER_SPEEDUP - (ob.speedMul || 1)) * Math.min(1, dt * 8);
            ob.x -= speed * ob.speedMul * dt;
            // Jarak ancang-ancang dihitung dari kecepatan SAAT INI, supaya puncak
            // lompatan pas di atas rintangan saat tiba di posisi dino. +10 sebagai
            // margin kecil (dino agak besar); sisa keamanan datang dari
            // JUMP_HANG_TIME & fase turun. Jangan tambah buffer besar — lompatan
            // jadi terpicu terlalu awal dan malah tersentuh saat mendarat.
            const leadDistance = speed * ANSWER_SPEEDUP * JUMP_RISE_TIME + 10;
            if (!ob.jumped && ob.x <= PLAYER_X + leadDistance){
                triggerJump();
                ob.jumped = true;
            }
            if (ob.x < -60){
                finalizeObstacle();
            }
        } else if (ob.resolved === 'cleared' && ob.type === 'air'){
            // Sudah benar diketik: dino menyerang hingga rintangan hancur.
            if (!ob.attackTriggered){
                ob.attackTriggered = true;
                triggerAirAttack(ob, now);
            }
            if (!ob.exploded){
                ob.x -= speed * 0.4 * dt; // sedikit melaju selama serangan berlangsung
            } else if (now >= ob.finalizeAt){
                finalizeObstacle();
            }
        } else if (ob.resolved === 'missed'){
            // Sudah menabrak dino: lanjutkan lintasan sesaat lalu hilang.
            ob.x -= speed * dt;
            if (ob.x < PLAYER_X - 80){
                finalizeObstacle();
            }
        }
    }

    // Fisika lompat, dengan jeda "melayang" singkat di puncak (JUMP_HANG_TIME)
    // supaya dino benar-benar berada di atas rintangan sesaat, bukan cuma
    // melintas 1 frame.
    if (state.jump.active){
        if (state.jump.hanging){
            state.jump.hangTimer -= dt;
            if (state.jump.hangTimer <= 0){
                state.jump.hanging = false;
            }
        } else {
            state.jump.vy += JUMP_GRAVITY * dt; // gravitasi
            state.jump.y += state.jump.vy * dt;
            if (!state.jump.pastApex && state.jump.vy >= 0){
                // Baru lewat puncak -> mulai jeda melayang
                state.jump.pastApex = true;
                state.jump.hanging = true;
                state.jump.hangTimer = JUMP_HANG_TIME;
            }
            if (state.jump.y >= 0){
                state.jump.y = 0;
                state.jump.active = false;
                state.jump.vy = 0;
                state.jump.hanging = false;
                state.jump.pastApex = false;
            }
        }
    }

    // Animasi jalan dino (loop walk1..walk240 terus-menerus)
    state.walkTimer += dt;
    if (state.walkTimer >= DINO_FRAME_DURATION){
        state.walkTimer -= DINO_FRAME_DURATION;
        state.walkFrame = (state.walkFrame + 1) % WALK_FRAME_COUNT;
    }

    updateEffects(dt, now);
}

// ============================================================
// DRAWING (gaya vector halus / neumorphism, bukan pixel-art)
// ============================================================
function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Gradient aura hornet — dibangun sekali & dipakai ulang (lihat drawAirObstacle).
let hornetGlowGradCache = null;
function getHornetGlowGradient(ctx, hh){
    if (!hornetGlowGradCache){
        const g = ctx.createRadialGradient(0, 0, hh * 0.1, 0, 0, hh * 0.62);
        g.addColorStop(0, 'rgba(250,204,21,0.32)');
        g.addColorStop(1, 'rgba(250,204,21,0)');
        hornetGlowGradCache = g;
    }
    return hornetGlowGradCache;
}

// Label kata mengambang di atas rintangan/serangan udara:
// abu tua = belum diketik, hijau = sudah benar, merah = baru salah ketik.
//
// Perf: kotak putih neumorphism di bawah teks dulu digambar ULANG dengan
// shadowBlur asli setiap frame (operasi paling berat di Canvas2D). Sekarang
// blur itu dirender SEKALI ke kanvas tersembunyi saat rintangan baru muncul
// (ukurannya tetap selama rintangan itu ada), lalu tiap frame cukup
// ctx.drawImage() bitmap-nya — hasil sama persis, jauh lebih ringan.
function buildLabelBoxCache(boxW, boxH, radius){
    const pad = 20; // ruang ekstra supaya blur tidak terpotong tepi kanvas cache
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(boxW + pad * 2);
    cv.height = Math.ceil(boxH + pad * 2);
    const c = cv.getContext('2d');
    c.shadowColor = 'rgba(15,23,42,0.30)';
    c.shadowBlur = 16;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 6;
    const g = c.createLinearGradient(0, pad, 0, pad + boxH);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#e9eef7');
    c.fillStyle = g;
    roundRect(c, pad, pad, boxW, boxH, radius);
    c.fill();
    return { canvas: cv, pad };
}

// Font label: Fredoka (sudah dimuat di halaman) + fallback; dimuat lebih dulu supaya
// frame pertama tidak memakai font cadangan.
const LABEL_FONT = "'Fredoka', 'Baloo 2', 'Poppins', 'Segoe UI', Arial, sans-serif";
if (document.fonts && document.fonts.load) document.fonts.load("700 26px 'Fredoka'");

function drawWordLabel(ctx, word, typedIndex, cx, y, now, ob){
    const correct = !!(ob && ob.answer === 'correct');
    const wrong = !!(ob && ob.answer === 'wrong');

    // Huruf besar & tebal; kata panjang otomatis mengecil agar tetap muat
    let fs = 26;
    const spacing = 1.5;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + fs + 'px ' + LABEL_FONT;
    const measure = () => Array.from(word).reduce((s, ch) => s + ctx.measureText(ch).width + spacing, -spacing);
    let textW = measure();
    while (textW > 230 && fs > 15){ fs -= 1; ctx.font = '700 ' + fs + 'px ' + LABEL_FONT; textW = measure(); }

    const padX = 20, boxH = Math.round(fs + 20), boxW = Math.round(textW + padX * 2), radius = 16;
    const boxBottom = y + 7;                 // tepi bawah tetap seperti sebelumnya
    const boxTop = boxBottom - boxH;
    const boxLeft = cx - boxW / 2;

    ctx.save();

    // Kotak putih bergradasi + bayangan (blur dihitung sekali per rintangan)
    let cache = ob && ob.labelBoxCache;
    if (!cache || cache.boxW !== boxW || cache.boxH !== boxH){
        cache = buildLabelBoxCache(boxW, boxH, radius);
        cache.boxW = boxW; cache.boxH = boxH;
        if (ob) ob.labelBoxCache = cache;
    }
    ctx.drawImage(cache.canvas, boxLeft - cache.pad, boxTop - cache.pad);

    // Benar -> kotak HIJAU, salah -> kotak MERAH (teks putih), netral -> putih bergaris biru
    if (correct || wrong){
        const gg = ctx.createLinearGradient(0, boxTop, 0, boxBottom);
        if (correct){ gg.addColorStop(0, '#4ade80'); gg.addColorStop(1, '#16a34a'); }
        else { gg.addColorStop(0, '#f87171'); gg.addColorStop(1, '#dc2626'); }
        ctx.fillStyle = gg;
        roundRect(ctx, boxLeft, boxTop, boxW, boxH, radius);
        ctx.fill();
    }

    // Ekor penunjuk ke rintangan
    const tailW = 14, tailH = 9;
    ctx.beginPath();
    ctx.moveTo(cx - tailW / 2, boxBottom - 1);
    ctx.lineTo(cx, boxBottom + tailH);
    ctx.lineTo(cx + tailW / 2, boxBottom - 1);
    ctx.closePath();
    ctx.fillStyle = correct ? '#16a34a' : wrong ? '#dc2626' : '#e9eef7';
    ctx.fill();

    const edge = correct ? '#15803d' : wrong ? '#b91c1c' : '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = edge;
    roundRect(ctx, boxLeft, boxTop, boxW, boxH, radius);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - tailW / 2, boxBottom);
    ctx.lineTo(cx, boxBottom + tailH);
    ctx.lineTo(cx + tailW / 2, boxBottom);
    ctx.stroke();

    // Teks: gelap pekat saat netral; putih berkontur saat benar/salah
    let x = boxLeft + padX;
    const ty = boxTop + boxH / 2 + 1;
    for (let i = 0; i < word.length; i++){
        const ch = word[i];
        if (correct || wrong){
            ctx.lineWidth = 3;
            ctx.strokeStyle = correct ? 'rgba(21,128,61,0.55)' : 'rgba(153,27,27,0.55)';
            ctx.strokeText(ch, x, ty);
            ctx.fillStyle = '#ffffff';
        } else {
            ctx.fillStyle = '#0f172a';
        }
        ctx.fillText(ch, x, ty);
        x += ctx.measureText(ch).width + spacing;
    }
    ctx.restore();
}

// Dino: sprite PNG animasi jalan (walk1..walk240). Efek damage mengikuti
// siluet asli sprite (compositing 'source-atop') + guncangan & percikan.
function drawDino(ctx, now){
    const hitActive = now < state.hitFlashUntil;
    const mouthGlowActive = now < state.mouthGlowUntil;
    const footX = PLAYER_X + 18;
    const footY = GROUND_Y + GROUND_CONTACT_OFFSET + DINO_EXTRA_DROP + state.jump.y;

    // guncangan singkat & meredup (knockback) saat kena damage
    let shakeX = 0, shakeY = 0;
    if (hitActive){
        const t = now - state.hitStartAt;
        const decay = Math.max(0, 1 - t / 420);
        shakeX = Math.sin(t / 26) * 5 * decay;
        shakeY = Math.abs(Math.sin(t / 40)) * -2 * decay;
    }

    const frameIndex = Math.floor(state.walkFrame) % WALK_FRAME_COUNT;
    const frame = dinoWalkFrames[frameIndex];
    const spriteReady = frame && frame.complete && frame.naturalWidth > 0;
    const dw = DINO_SPRITE_W, dh = DINO_SPRITE_H;
    const dx = footX + shakeX - dw * DINO_SPRITE_ANCHOR_X;
    const dy = footY + shakeY - dh * DINO_SPRITE_ANCHOR_Y;

    ctx.save();
    if (spriteReady){
        if (hitActive){
            // Gambar dino di buffer terisolasi dulu, tint di sana (hanya
            // menempel ke siluet dino), baru tempel ke canvas utama.
            dinoFxCtx.clearRect(0, 0, DINO_SPRITE_W, DINO_SPRITE_H);
            dinoFxCtx.drawImage(frame, 0, 0, DINO_SPRITE_W, DINO_SPRITE_H);
            const t = now - state.hitStartAt;
            const blink = Math.floor(t / 55) % 2 === 0;
            dinoFxCtx.globalCompositeOperation = 'source-atop';
            dinoFxCtx.fillStyle = blink ? 'rgba(239,68,68,0.55)' : 'rgba(255,255,255,0.5)';
            dinoFxCtx.fillRect(0, 0, DINO_SPRITE_W, DINO_SPRITE_H);
            dinoFxCtx.globalCompositeOperation = 'source-over';
            ctx.drawImage(dinoFxBuffer, dx, dy, dw, dh);
        } else {
            ctx.drawImage(frame, dx, dy, dw, dh);
        }
    } else {
        // penampung sementara selagi sprite belum termuat
        ctx.fillStyle = 'rgba(76,184,92,0.35)';
        roundRect(ctx, dx, dy, dw, dh, 14);
        ctx.fill();
    }

    // kilau mulut biru saat menembak bola api
    if (mouthGlowActive){
        const gx = footX + shakeX + DINO_MOUTH_X, gy = footY + shakeY + DINO_MOUTH_Y;
        const glow = ctx.createRadialGradient(gx, gy, 1, gx, gy, 12);
        glow.addColorStop(0, 'rgba(224,247,255,0.95)');
        glow.addColorStop(0.5, 'rgba(56,189,248,0.65)');
        glow.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(gx, gy, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // percikan debu/cahaya kecil sesekali saat kena damage
    if (hitActive && Math.random() < 0.35){
        spawnExplosion(footX + shakeX, footY + shakeY - 40, Math.random() < 0.5 ? '#ef4444' : '#ffffff');
    }
}


function drawGroundObstacle(ctx, ob, now){
    const x = ob.x;
    const baseY = GROUND_Y + GROUND_CONTACT_OFFSET;

    // bayangan tegas di tanah (digambar dulu agar siluet objek lebih menonjol) —
    // lebarnya mengikuti lebar model masing-masing supaya tetap proporsional.
    const shadowHalfW = (GROUND_WIDTH[ob.model] || 20) * 0.9;
    ctx.fillStyle = 'rgba(15,10,28,0.34)';
    ctx.beginPath();
    ctx.ellipse(x + (GROUND_WIDTH[ob.model] || 20) / 2, baseY + 4, shadowHalfW, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    switch (ob.model){
        case 'cactus': {
            // Kaktus sekarang digambar dari sprite PNG
            // (public/assets/images/obstacle/cactus.png), posisi & anchor
            // tetap sama seperti rintangan darat lainnya — lihat drawCactusSprite.
            drawCactusSprite(ctx, x, baseY);
            break;
        }
        case 'rock': {
            const g = ctx.createLinearGradient(x - 6, baseY - 44, x + 38, baseY);
            g.addColorStop(0, '#c3ccd9');
            g.addColorStop(1, '#818ea0');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#3f4a5c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - 6, baseY);
            ctx.lineTo(x, baseY - 36);
            ctx.lineTo(x + 20, baseY - 44);
            ctx.lineTo(x + 38, baseY - 10);
            ctx.lineTo(x + 30, baseY);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.beginPath();
            ctx.moveTo(x + 2, baseY - 30);
            ctx.lineTo(x + 18, baseY - 38);
            ctx.lineTo(x + 12, baseY - 20);
            ctx.closePath();
            ctx.fill();
            // retakan batu (detail tambahan)
            ctx.strokeStyle = 'rgba(63,74,92,0.65)';
            ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(x + 6, baseY - 6); ctx.lineTo(x + 16, baseY - 22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x + 22, baseY - 30); ctx.lineTo(x + 27, baseY - 12); ctx.stroke();
            // lumut di dasar batu
            ctx.fillStyle = 'rgba(74,145,79,0.75)';
            ctx.beginPath(); ctx.ellipse(x + 4, baseY - 4, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x + 26, baseY - 3, 6, 2.6, 0, 0, Math.PI * 2); ctx.fill();
            // kilau mineral berkedip di permukaan batu (detail tambahan)
            const sparkle = Math.abs(Math.sin(now / 260 + x));
            ctx.fillStyle = `rgba(255,255,255,${(0.3 + sparkle * 0.4).toFixed(2)})`;
            ctx.beginPath(); ctx.arc(x + 14, baseY - 24, 1.6, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'spike': {
            // pelat besi dasar perangkap
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = '#3d4658';
            roundRect(ctx, x - 4, baseY - 6, 46, 6, 2); ctx.fill();
            ctx.strokeStyle = '#1a2029';
            ctx.lineWidth = 1.4;
            ctx.strokeRect(x - 4, baseY - 6, 46, 6);
            for (let b = 0; b < 3; b++){
                ctx.fillStyle = '#6b7280';
                ctx.beginPath(); ctx.arc(x + 4 + b * 18, baseY - 3, 1.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowColor = 'rgba(0,0,0,0.25)';
            ctx.shadowBlur = 6;
            const g = ctx.createLinearGradient(x, baseY - 44, x + 36, baseY);
            g.addColorStop(0, '#c3ccd9');
            g.addColorStop(1, '#7b8494');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#252c38';
            ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++){
                ctx.beginPath();
                ctx.moveTo(x + i * 13, baseY - 6);
                ctx.lineTo(x + i * 13 + 6, baseY - 44);
                ctx.lineTo(x + i * 13 + 12, baseY - 6);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
            }
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            for (let i = 0; i < 3; i++){
                ctx.beginPath();
                ctx.moveTo(x + i * 13 + 6, baseY - 44);
                ctx.lineTo(x + i * 13 + 8, baseY - 20);
                ctx.lineTo(x + i * 13 + 6, baseY - 20);
                ctx.closePath();
                ctx.fill();
            }
            // noda karat (detail tambahan)
            ctx.fillStyle = 'rgba(180,83,9,0.5)';
            for (let i = 0; i < 3; i++){
                ctx.beginPath(); ctx.ellipse(x + i * 13 + 6, baseY - 14, 2, 3.4, 0, 0, Math.PI * 2); ctx.fill();
            }
            // percikan listrik kecil berkedip antar-duri (detail tambahan)
            if (Math.sin(now / 140) > 0.6){
                ctx.strokeStyle = 'rgba(191,219,254,0.85)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(x + 6, baseY - 30); ctx.lineTo(x + 10, baseY - 22); ctx.lineTo(x + 15, baseY - 28);
                ctx.stroke();
            }
            break;
        }
        case 'log': {
            // Batang kayu dirombak agar terlihat seperti gelondongan sungguhan:
            // penampang lingkaran-tahun-pohon di kedua ujung (dekat lebih besar,
            // jauh lebih kecil untuk kesan perspektif), alur kulit kayu melengkung
            // di sepanjang badan, & sorotan cahaya di atas untuk kesan silinder.
            const logW = 54, logH = 24;
            const lx = x - 10, ly = baseY - logH;

            const g = ctx.createLinearGradient(lx, ly, lx, baseY);
            g.addColorStop(0, '#e3b483');
            g.addColorStop(0.5, '#b9814e');
            g.addColorStop(1, '#8a5c34');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#6e4726';
            ctx.lineWidth = 3;
            roundRect(ctx, lx, ly, logW, logH, 11); ctx.fill(); ctx.stroke();
            ctx.shadowColor = 'transparent';

            // penampang ujung dekat (kiri) dengan lingkaran tahun pohon
            ctx.save();
            ctx.beginPath(); ctx.ellipse(lx + 5, ly + logH / 2, 6.5, logH / 2 - 1, 0, 0, Math.PI * 2); ctx.clip();
            ctx.fillStyle = '#eec89c';
            ctx.fillRect(lx - 4, ly, 22, logH);
            ctx.restore();
            ctx.strokeStyle = 'rgba(138,92,52,0.75)';
            ctx.lineWidth = 1.5;
            [3.2, 5.6].forEach(r => { ctx.beginPath(); ctx.ellipse(lx + 5, ly + logH / 2, r, r * 0.72, 0, 0, Math.PI * 2); ctx.stroke(); });
            ctx.strokeStyle = '#6e4726';
            ctx.lineWidth = 2.4;
            ctx.beginPath(); ctx.ellipse(lx + 5, ly + logH / 2, 6.5, logH / 2 - 1, 0, 0, Math.PI * 2); ctx.stroke();

            // penampang ujung jauh (kanan), lebih kecil untuk kesan perspektif
            ctx.strokeStyle = '#8a5f3d';
            ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.ellipse(lx + logW - 5, ly + logH / 2, 4.4, logH / 2 - 2, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(lx + logW - 5, ly + logH / 2, 2, (logH / 2 - 2) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();

            // alur kulit kayu melengkung sepanjang badan (bukan garis lurus kaku)
            ctx.strokeStyle = 'rgba(110,71,38,0.55)';
            ctx.lineWidth = 1.4;
            for (let i = 0; i < 3; i++){
                const oy = ly + 6 + i * 6;
                ctx.beginPath();
                ctx.moveTo(lx + 15, oy);
                ctx.quadraticCurveTo(lx + logW / 2, oy + (i % 2 === 0 ? 2.4 : -2.4), lx + logW - 7, oy);
                ctx.stroke();
            }

            // sorotan cahaya di atas (kesan silinder terkena cahaya matahari)
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath(); ctx.ellipse(lx + logW / 2 + 2, ly + 4, logW / 2 - 8, 3, 0, 0, Math.PI * 2); ctx.fill();

            // jamur kecil tumbuh di batang (detail tambahan)
            ctx.fillStyle = '#fca5a5';
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 1.2;
            roundRect(ctx, lx + logW - 16, ly - 8, 3, 8, 1.4); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(lx + logW - 14.5, ly - 9, 5.2, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fecaca';
            for (let s = 0; s < 3; s++){
                ctx.beginPath(); ctx.arc(lx + logW - 17 + s * 2, ly - 9.4, 0.6, 0, Math.PI * 2); ctx.fill();
            }

            // lumut tipis di dasar batang
            ctx.fillStyle = 'rgba(74,145,79,0.55)';
            ctx.beginPath(); ctx.ellipse(lx + 12, baseY - 1, 7, 2.4, 0, 0, Math.PI * 2); ctx.fill();
            break;
        }
        case 'crystal': {
            const pulse = 0.5 + Math.abs(Math.sin(now / 400)) * 0.5;
            ctx.shadowColor = `rgba(168,85,247,${0.5 * pulse})`;
            ctx.shadowBlur = 14;
            const g = ctx.createLinearGradient(x, baseY - 46, x + 34, baseY);
            g.addColorStop(0, '#e9d5ff');
            g.addColorStop(1, '#9333ea');
            ctx.fillStyle = g;
            ctx.strokeStyle = '#5b21b6';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(x + 6, baseY);
            ctx.lineTo(x, baseY - 24);
            ctx.lineTo(x + 12, baseY - 46);
            ctx.lineTo(x + 24, baseY - 22);
            ctx.lineTo(x + 20, baseY);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 20, baseY);
            ctx.lineTo(x + 22, baseY - 18);
            ctx.lineTo(x + 32, baseY - 36);
            ctx.lineTo(x + 34, baseY - 8);
            ctx.lineTo(x + 30, baseY);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath(); ctx.moveTo(x + 8, baseY - 30); ctx.lineTo(x + 12, baseY - 42); ctx.lineTo(x + 13, baseY - 26); ctx.closePath(); ctx.fill();
            // percikan energi kecil melayang di sekitar kristal
            for (let i = 0; i < 3; i++){
                const ang = now / 500 + i * 2.1;
                const ex = x + 17 + Math.cos(ang) * 16;
                const ey = baseY - 26 + Math.sin(ang) * 14;
                ctx.fillStyle = `rgba(216,180,254,${pulse.toFixed(2)})`;
                ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }
    }

    ctx.restore();
}

function drawAirObstacle(ctx, ob, now){
    const x = ob.x;
    const bob = Math.sin(now / 220 + x * 0.05) * 3;
    const y = ob.y + bob;

    if (!ob.exploded){
        // bayangan proyeksi di tanah agar posisi rintangan udara lebih terbaca —
        // ukurannya kini mengikuti lebar model masing-masing (hornet yang jauh
        // lebih besar mendapat bayangan yang sebanding, bukan bayangan kecil tetap).
        const shadowHalf = (AIR_WIDTH[ob.model] || 34) / 2;
        ctx.fillStyle = 'rgba(15,10,28,0.18)';
        ctx.beginPath();
        ctx.ellipse(x + shadowHalf, GROUND_Y + 4, shadowHalf * 0.95, 4 + (ob.model === 'hornet' ? 3 : 0), 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        switch (ob.model){
            case 'drone': {
                const g = ctx.createLinearGradient(x, y, x + 40, y + 17);
                g.addColorStop(0, '#9aa7ba');
                g.addColorStop(1, '#5c6878');
                ctx.fillStyle = g;
                ctx.strokeStyle = '#242b38';
                ctx.lineWidth = 3;
                roundRect(ctx, x, y, 40, 17, 8); ctx.fill(); ctx.stroke();
                // sensor/panel kecil di badan drone
                ctx.shadowColor = 'transparent';
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                roundRect(ctx, x + 4, y + 3, 32, 4, 2); ctx.fill();
                ctx.lineWidth = 2.4;
                ctx.beginPath(); ctx.moveTo(x + 9, y - 10); ctx.lineTo(x + 9, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + 31, y - 10); ctx.lineTo(x + 31, y); ctx.stroke();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(x + 9, y - 10, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x + 31, y - 10, 5, 0, Math.PI * 2); ctx.fill();
                // baling-baling berputar (blur ganda mengikuti waktu agar terasa berputar)
                const spin = (now / 40) % Math.PI;
                [x + 9, x + 31].forEach(px => {
                    ctx.strokeStyle = 'rgba(30,41,59,0.55)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(px, y - 10, 9, 2.4, spin, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.ellipse(px, y - 10, 9, 2.4, spin + Math.PI / 2, 0, Math.PI * 2);
                    ctx.stroke();
                });
                ctx.strokeStyle = 'rgba(56,189,248,0.7)';
                ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.arc(x + 9, y - 10, 8, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(x + 31, y - 10, 8, 0, Math.PI * 2); ctx.stroke();
                // lampu sorot berkedip di bawah
                const blink = Math.sin(now / 150) > 0 ? 1 : 0.25;
                ctx.fillStyle = `rgba(56,189,248,${blink})`;
                ctx.beginPath(); ctx.arc(x + 20, y + 8.5, 3.6, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(56,189,248,${blink * 0.5})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(x + 20, y + 12); ctx.lineTo(x + 20, y + 22); ctx.stroke();
                break;
            }
            case 'ufo': {
                // sinar tarik digambar LEBIH DULU (di belakang badan) dengan gradasi
                // lembut yang memudar ke bawah, bukan blok warna rata bertepi tegas —
                // supaya terlihat seperti cahaya sungguhan, bukan artefak/anomali.
                const beamGlow = ctx.createLinearGradient(0, y + 12, 0, y + 30);
                beamGlow.addColorStop(0, 'rgba(233,226,255,0.28)');
                beamGlow.addColorStop(1, 'rgba(233,226,255,0)');
                ctx.fillStyle = beamGlow;
                ctx.beginPath();
                ctx.moveTo(x + 13, y + 13); ctx.lineTo(x + 27, y + 13);
                ctx.lineTo(x + 32, y + 30); ctx.lineTo(x + 8, y + 30);
                ctx.closePath(); ctx.fill();

                const g = ctx.createLinearGradient(x, y, x + 40, y + 16);
                g.addColorStop(0, '#cdb6ff');
                g.addColorStop(1, '#8b5cf6');
                ctx.fillStyle = g;
                ctx.strokeStyle = '#5b21b6';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(x + 20, y + 8, 23, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                // cincin energi tipis di pinggir badan (statis, rapi — tanpa distorsi rotasi)
                ctx.strokeStyle = 'rgba(233,226,255,0.85)';
                ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.ellipse(x + 20, y + 8, 17, 4, 0, 0, Math.PI * 2); ctx.stroke();
                // kubah kaca dengan pantulan cahaya
                ctx.fillStyle = '#e9e2ff';
                ctx.beginPath(); ctx.arc(x + 20, y, 11, Math.PI, 0); ctx.fill(); ctx.stroke();
                ctx.shadowColor = 'transparent';
                ctx.fillStyle = 'rgba(255,255,255,0.55)';
                ctx.beginPath(); ctx.ellipse(x + 15, y - 5, 4, 2.4, -0.4, 0, Math.PI * 2); ctx.fill();
                // lampu berkedip bergantian, rapi berjajar di tepi bawah badan
                for (let i = 0; i < 3; i++){
                    const on = Math.sin(now / 220 + i * 2.1) > 0;
                    ctx.fillStyle = on ? '#facc15' : 'rgba(250,204,21,0.3)';
                    ctx.beginPath(); ctx.arc(x + 8 + i * 12, y + 12, 2.4, 0, Math.PI * 2); ctx.fill();
                }
                break;
            }
            case 'missile': {
                // Bom-energi: bola logam berduri berputar, inti berdenyut,
                // jejak ion kebiruan di belakangnya.
                const spin = now / 260;
                const cx = x + 18, cy = y + 8;

                // jejak ion di belakang (gradasi kebiruan, bukan percikan api)
                const trail = ctx.createLinearGradient(cx - 30, cy, cx - 6, cy);
                trail.addColorStop(0, 'rgba(56,189,248,0)');
                trail.addColorStop(1, 'rgba(56,189,248,0.55)');
                ctx.fillStyle = trail;
                ctx.beginPath();
                ctx.moveTo(cx - 30, cy - 2); ctx.lineTo(cx - 6, cy - 5); ctx.lineTo(cx - 6, cy + 5); ctx.lineTo(cx - 30, cy + 2);
                ctx.closePath(); ctx.fill();

                // duri logam berputar mengelilingi bola inti
                ctx.strokeStyle = '#52525b';
                ctx.lineWidth = 2.4;
                for (let i = 0; i < 6; i++){
                    const ang = spin + (i / 6) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(ang) * 9, cy + Math.sin(ang) * 9);
                    ctx.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
                    ctx.stroke();
                }

                // bola logam gelap
                ctx.shadowColor = 'rgba(0,0,0,0.35)';
                const bodyG = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11);
                bodyG.addColorStop(0, '#6b7280');
                bodyG.addColorStop(1, '#27272a');
                ctx.fillStyle = bodyG;
                ctx.strokeStyle = '#18181b';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                ctx.shadowColor = 'transparent';

                // inti energi berdenyut di tengah (tanda bahaya)
                const pulse = 0.5 + Math.abs(Math.sin(now / 140)) * 0.5;
                ctx.fillStyle = `rgba(239,68,68,${pulse.toFixed(2)})`;
                ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath(); ctx.arc(cx - 2.4, cy - 2.4, 1.4, 0, Math.PI * 2); ctx.fill();
                break;
            }
            case 'hornet': {
                // Sprite PNG animasi (hornet1..240), sudah di-preload sejak awal.
                const frameIndex = Math.floor(now / (HORNET_FRAME_DURATION * 1000)) % HORNET_FRAME_COUNT;
                const hFrame = hornetFrames[frameIndex];
                const hReady = hFrame && hFrame.complete && hFrame.naturalWidth > 0;
                const hcx = x + AIR_WIDTH.hornet / 2;
                const hcy = y + 8;
                if (hReady){
                    // Lebar dihitung dari rasio asli PNG, bukan kotak tetap.
                    const aspect = hFrame.naturalWidth / hFrame.naturalHeight;
                    const hh = HORNET_TARGET_H;
                    const hw = hh * aspect;

                    // Aura peringatan berdenyut di belakang sprite biar menonjol.
                    // Perf: gradient-nya dulu dibuat ULANG setiap frame; sekarang
                    // dibuat sekali (posisi & radius relatif terhadap origin via
                    // translate) lalu denyutnya cukup lewat globalAlpha — hasil
                    // sama persis, jauh lebih ringan karena tak ada alokasi
                    // gradient/​string baru tiap frame.
                    ctx.shadowColor = 'transparent';
                    const glowPulse = 0.55 + Math.abs(Math.sin(now / 260)) * 0.25;
                    ctx.save();
                    ctx.translate(hcx, hcy);
                    ctx.globalAlpha = glowPulse;
                    ctx.fillStyle = getHornetGlowGradient(ctx, hh);
                    ctx.beginPath(); ctx.ellipse(0, 0, hh * 0.62, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();

                    // shadowBlur dimatikan di sini (operasi berat) supaya animasi
                    // sprite sebesar ini tetap mulus.
                    ctx.drawImage(hFrame, hcx - hw / 2, hcy - hh / 2, hw, hh);
                } else {
                    // penampung sementara (nyaris tak pernah muncul, sudah di-preload)
                    ctx.fillStyle = 'rgba(250,204,21,0.35)';
                    roundRect(ctx, hcx - HORNET_TARGET_H * 0.65, hcy - HORNET_TARGET_H / 2, HORNET_TARGET_H * 1.3, HORNET_TARGET_H, 10);
                    ctx.fill();
                }
                break;
            }
        }
        ctx.restore();
    }
}

function drawEffects(ctx, now){
    state.effects.enemyBullets.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        if (b.model === 'ufo'){
            const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
            glow.addColorStop(0, '#f3e8ff');
            glow.addColorStop(0.5, '#a855f7');
            glow.addColorStop(1, 'rgba(168,85,247,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
        } else if (b.model === 'hornet'){
            // peluru sengat: lancip & hitam pekat, dibalut pendar kuning tipis
            // + jejak percikan di belakangnya (efek) — bukan lagi elips kuning polos.
            const bGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
            bGlow.addColorStop(0, 'rgba(250,204,21,0.55)');
            bGlow.addColorStop(1, 'rgba(250,204,21,0)');
            ctx.fillStyle = bGlow;
            ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = '#0b0b0d';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(-2, -3.4);
            ctx.lineTo(-9, 0);
            ctx.lineTo(-2, 3.4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(250,204,21,0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            const g = ctx.createLinearGradient(-15, 0, 5, 0);
            g.addColorStop(0, 'rgba(239,68,68,0)');
            g.addColorStop(1, '#f87171');
            ctx.strokeStyle = g;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(5, 0); ctx.stroke();
            ctx.fillStyle = '#fecaca';
            ctx.beginPath(); ctx.arc(5, 0, 2.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    state.effects.projectiles.forEach(pr => {
        ctx.save();
        const glow = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, 13);
        glow.addColorStop(0, '#f0fbff');
        glow.addColorStop(0.35, '#38bdf8');
        glow.addColorStop(1, 'rgba(56,189,248,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 13, 0, Math.PI * 2);
        ctx.fill();
        // cincin energi tipis yang berputar mengelilingi inti bola api —
        // detail tambahan supaya proyektil terasa "berenergi", bukan bulatan polos.
        ctx.strokeStyle = 'rgba(224,247,255,0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, 8, 3, now / 120, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, 8, 3, now / 120 + Math.PI / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#e0f7ff';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Cincin kejut (shockwave) dari ledakan serangan udara: lingkaran yang
    // mengembang & memudar — memberi kesan "boom" yang lebih terasa & detail
    // dibanding sekadar percikan partikel.
    state.effects.shockwaves.forEach(s => {
        const t = (now - s.start) / s.duration;
        if (t < 0 || t > 1) return;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.maxR * t, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });

    state.effects.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ============================================================
// BACKGROUND — bukit berlapis, pohon bergoyang, burung/kupu-kupu, awan.
// Semua digambar via canvas, tanpa file gambar (kecuali sprite pohon).
// ============================================================
function drawHillsLayer(ctx, W, baseY, gradient, offset, amp, waveLen){
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 20);
    for (let hx = 0; hx <= W; hx += 20){
        const hy = baseY - amp - Math.sin((hx + offset) / waveLen) * amp * 0.5;
        ctx.lineTo(hx, hy);
    }
    ctx.lineTo(W, baseY + 20);
    ctx.closePath();
    ctx.fill();
}

function drawTreeSprite(ctx, x, baseY, scale, sway, variantIndex){
    const img = treeSprites[variantIndex];
    if (!img || !img.complete || img.naturalWidth === 0) return; // belum termuat -> lewati

    const targetH = TREE_TARGET_H * scale;
    const targetW = targetH * (img.naturalWidth / img.naturalHeight);

    ctx.save();
    ctx.translate(x, baseY); // (0,0) = dasar batang pohon
    ctx.rotate(sway);
    ctx.drawImage(img, -targetW / 2, -targetH, targetW, targetH);
    ctx.restore();
}

function drawTreesLine(ctx, W, offset, now){
    const baseY = GROUND_Y - 2;
    const spacing = 150;
    let treeSlot = 0;
    for (let bx = offset - spacing; bx < W + spacing; bx += spacing){
        const sway = Math.sin(now / 1400 + bx * 0.01) * 0.045;
        drawTreeSprite(ctx, bx, baseY, 1, sway, pickTreeVariant(treeSlot));
        drawTreeSprite(ctx, bx + 78, baseY, 0.7, -sway * 1.2, pickTreeVariant(treeSlot + 1));
        treeSlot++;
    }
}

function drawClouds(ctx, W, now, y, speed, scale, alpha){
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (let i = 0; i < 3; i++){
        const cx = ((i * 260 + now * speed) % (W + 200)) - 100;
        const cy = y + (i % 2) * 22;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30 * scale, 11 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 20 * scale, cy + 3, 20 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - 18 * scale, cy + 4, 16 * scale, 7 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBirds(ctx, W, now){
    ctx.strokeStyle = 'rgba(70,60,90,0.55)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++){
        const t = (now / 1000 * (18 + i * 4) + i * 260) % (W + 120);
        const bx = W + 60 - t;
        const by = 46 + i * 20 + Math.sin(now / 300 + i) * 4;
        const flap = Math.sin(now / 90 + i * 2) * 6;
        ctx.beginPath();
        ctx.moveTo(bx - 8, by + flap);
        ctx.quadraticCurveTo(bx - 3, by - 4, bx, by);
        ctx.quadraticCurveTo(bx + 3, by - 4, bx + 8, by + flap);
        ctx.stroke();
    }
}

function drawButterflies(ctx, W, now){
    for (let i = 0; i < 3; i++){
        const bx = ((i * 210 + now * 0.05) % (W + 80)) - 40;
        const by = GROUND_Y - 70 - i * 26 + Math.sin(now / 260 + i * 2) * 14;
        const wing = Math.abs(Math.sin(now / 90 + i));
        const hue = i % 2 === 0 ? '#fca5f1' : '#fde68a';
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = hue;
        ctx.beginPath(); ctx.ellipse(-3, 0, 3.4 * wing + 1, 4, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(3, 0, 3.4 * wing + 1, 4, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4b3621';
        ctx.beginPath(); ctx.ellipse(0, 0, 1, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

// Tanah bertema jalan raya: aspal gelap, kerb dua-nada, marka putih di
// bahu jalan, marka kuning putus-putus di tengah.
function drawGroundNature(ctx, W, H, now){
    ctx.fillStyle = bgCache.ground;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Kerb/trotoar di tepi atas jalan: beton terang + garis bayangan tipis di bawahnya
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(0, GROUND_Y, W, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, GROUND_Y + 4, W, 1.5);

    // Marka jalan putus-putus kuning khas jalan raya, bergerak sesuai kecepatan permainan
    ctx.strokeStyle = 'rgba(250,204,21,0.85)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 16]);
    ctx.lineDashOffset = -((now * 0.09) % 36);
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 48);
    ctx.lineTo(W, GROUND_Y + 48);
    ctx.stroke();
    ctx.setLineDash([]);

    // Garis marka putih solid tipis di dekat kerb (khas bahu jalan)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 14);
    ctx.lineTo(W, GROUND_Y + 14);
    ctx.stroke();
}

// Cache gradient statis (tergantung ukuran kanvas saja) — dibangun ulang
// hanya saat resize (lihat fitCanvas), bukan setiap frame, supaya animasi
// tetap mulus meski elemen latar cukup banyak.
let bgCache = null;
function rebuildBackgroundCache(){
    const ctx = canvas().getContext('2d');
    const W = logicalW, H = logicalH;
    const sunX = W - 92, sunY = 56;

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#7ec9f0');
    sky.addColorStop(0.55, '#cdeaf5');
    sky.addColorStop(1, '#eef8e2');

    const sunGlow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    sunGlow.addColorStop(0, 'rgba(255,244,180,0.8)');
    sunGlow.addColorStop(1, 'rgba(255,244,180,0)');

    const hills1 = ctx.createLinearGradient(0, (GROUND_Y - 4) - 60, 0, (GROUND_Y - 4) + 20);
    hills1.addColorStop(0, '#bfe3a0'); hills1.addColorStop(1, '#9fd07f');

    const hills2 = ctx.createLinearGradient(0, (GROUND_Y - 2) - 40, 0, (GROUND_Y - 2) + 20);
    hills2.addColorStop(0, '#a3d787'); hills2.addColorStop(1, '#7fbf63');

    const ground = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    ground.addColorStop(0, '#5b5f68');
    ground.addColorStop(0.45, '#43464e');
    ground.addColorStop(1, '#2a2c31');

    bgCache = { sunX, sunY, sky, sunGlow, hills1, hills2, ground };
}

function drawBackground(ctx, W, H, now){
    if (!bgCache) rebuildBackgroundCache();
    ctx.fillStyle = bgCache.sky;
    ctx.fillRect(0, 0, W, H);

    const sunX = bgCache.sunX, sunY = bgCache.sunY;
    ctx.fillStyle = bgCache.sunGlow;
    ctx.beginPath(); ctx.arc(sunX, sunY, 90, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(now / 8000);
    ctx.strokeStyle = 'rgba(255,238,150,0.5)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++){
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
        ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
        ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

    drawBirds(ctx, W, now);
    drawClouds(ctx, W, now, 40, 0.015, 1, 0.85);
    drawClouds(ctx, W, now, 90, 0.008, 0.7, 0.6);

    drawHillsLayer(ctx, W, GROUND_Y - 4, bgCache.hills1, -((now * 0.01) % 400), 60, 260);
    drawHillsLayer(ctx, W, GROUND_Y - 2, bgCache.hills2, -((now * 0.02) % 300), 40, 180);

    drawTreesLine(ctx, W, -((now * 0.03) % 300), now);
    drawButterflies(ctx, W, now);
    drawGroundNature(ctx, W, H, now);
}

function draw(now){
    const c = canvas();
    const ctx = c.getContext('2d');
    // Semua koordinat gambar memakai satuan logis (W,H); transform ini yang
    // memetakannya ke resolusi fisik kanvas (lihat fitCanvas/dpr) supaya
    // tajam sekaligus tetap 1 sistem koordinat yang sama untuk semua logika.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    const W = logicalW, H = logicalH;

    drawBackground(ctx, W, H, now);
    drawDino(ctx, now);

    if (state.current){
        const ob = state.current;
        if (ob.type === 'ground'){
            drawGroundObstacle(ctx, ob, now);
        } else {
            drawAirObstacle(ctx, ob, now);
        }

        // Titik tengah label kata dihitung per model (lebarnya beda-beda),
        // supaya selalu presisi di tengah-atas bentuk rintangan.
        // Label tetap tampil sejenak (LABEL_LINGER_MS) walau rintangan sudah
        // selesai diproses, supaya warna hijau/merahnya benar-benar terlihat.
        if (!ob.resolved || (ob.labelHideAt && now < ob.labelHideAt)){
            const widthMap = ob.type === 'air' ? AIR_WIDTH : GROUND_WIDTH;
            const halfWidth = (widthMap[ob.model] || 34) / 2;
            const cx = ob.x + halfWidth;
            const labelY = ob.type === 'air' ? ob.y - (AIR_LABEL_OFFSET[ob.model] || 24) : GROUND_Y - 44;
            drawWordLabel(ctx, ob.word, state.typedIndex, cx, labelY, now, ob);
        }
    }

    drawEffects(ctx, now);
}


// ============================================================
// DETEKSI GESTUR (kamera + /gesture/recognize) — pengganti input ketik
// ============================================================
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>';

let pollTimer = null, awaiting = false;
let streakLabel = null, streakCount = 0;
let needRelease = false, lastAnswerLabel = null;
// Latensi 0: dulu gestur harus "ditahan" beberapa kali baca berturut-turut
// (STREAK_CORRECT=2 / STREAK_WRONG=3) sebelum dianggap valid, supaya tahan
// transisi tangan — tapi ini membuat respons terasa lambat walau gestur
// sudah benar. Sekarang keduanya=1: jawaban diproses pada pembacaan
// PERTAMA yang valid, tanpa jeda tambahan sama sekali.
const STREAK_CORRECT = 1;
const STREAK_WRONG = 1;

function resetAnswerTracking(){ streakLabel = null; streakCount = 0; }

function setDetect(label, status){
    const a = el('dino-detect-label'), b = el('dino-detect-state');
    const la = label || '—', st = status || '';
    if (a && a.textContent !== la) a.textContent = la; // hanya tulis DOM bila berubah (hemat reflow tiap polling)
    if (b && b.textContent !== st) b.textContent = st;
}
function setTarget(word){
    const t = el('dino-target');
    if (t) t.textContent = word || '—';
    if (word) setFeedback(null);
}
function setFeedback(ok, text){
    const f = el('dino-feedback');
    if (!f) return;
    if (ok === null){ f.innerHTML = ''; f.className = 'game-play-question-feedback'; return; }
    f.innerHTML = (ok ? ICON_CHECK : ICON_CROSS) + ' ' + text;
    f.className = 'game-play-question-feedback ' + (ok ? 'is-correct' : 'is-wrong');
}

function commitAnswer(ob, label){
    const now = performance.now();
    const benar = String(label).trim().toLowerCase() === ob.word.trim().toLowerCase();
    lastAnswerLabel = String(label).trim().toLowerCase();
    needRelease = true; // tangan harus dilepas/berganti gestur dulu sebelum menjawab rintangan berikutnya
    sfxTyping();
    if (benar){
        ob.answer = 'correct';
        state.typedIndex = ob.word.length;
        setFeedback(true, 'Benar!');
        // PENTING: diselesaikan LANGSUNG (bukan ditunda) supaya lompatan/serangan
        // selalu terpicu. Jeda sebelumnya membuat rintangan sempat "mentok" ke
        // dino (dianggap terlewat) sebelum jawaban benar sempat diproses —
        // itulah penyebab dino kadang tidak melompat/menyerang walau gestur
        // sudah benar.
        resolveObstacle(true);
    } else {
        ob.answer = 'wrong';
        state.wrongFlashAt = now;
        setFeedback(false, 'Salah (' + label + ')');
        // Serangan udara langsung membalas; rintangan darat menabrak dino saat tiba
        if (ob.type === 'air'){
            spawnEnemyBulletVolley(ob, now);
            ob.nextShotAt = now + 420 + Math.random() * 260;
        }
    }
}

function pollDetect(){
    if (!state || !state.running || state.finished || awaiting) return;
    const api = window.astaKanda;
    if (!api) return;
    const lm = api.getLatestLandmarks();
    if (!lm){
        // Tidak menimpa pesan dengan "Mencari tangan..." di sini — badge
        // status kamera sudah menunjukkan itu, biar tidak dobel/berkedip.
        needRelease = false; resetAnswerTracking();
        { const dl = el('dino-detect-label'); if (!dl || !/^[-—–\s]*$/.test(dl.textContent)) setDetect(null, ''); } // kembali "—" hanya jika belum
        return;
    }
    awaiting = true;
    fetch('/gesture/recognize', { method: 'POST', headers: api.jsonHeaders(), body: JSON.stringify({ landmarks: lm }) })
        .then((r) => r.json())
        .then((data) => {
            if (!state || !state.running || state.finished) return;
            const label = (data.ok && data.label) ? String(data.label) : null;
            setDetect(label, label ? 'Tangan terdeteksi' : (data.message || 'Belum dikenali'));
            const ob = state.current;
            if (!ob || ob.resolved || ob.answer){ resetAnswerTracking(); return; }
            if (!label){ resetAnswerTracking(); return; }
            const low = label.trim().toLowerCase();
            if (needRelease){
                if (low === lastAnswerLabel) return; // masih menahan gestur jawaban sebelumnya
                needRelease = false;
            }
            if (low === streakLabel) streakCount++; else { streakLabel = low; streakCount = 1; }
            const benar = low === ob.word.trim().toLowerCase();
            if (streakCount >= (benar ? STREAK_CORRECT : STREAK_WRONG)) commitAnswer(ob, label);
        })
        .catch(() => {})
        .finally(() => { awaiting = false; });
}

// ============================================================
// HUD
// ============================================================
function updateHud(){
    if (!state) return;
    const s = el('dino-skor'); if (s) s.textContent = state.score;
    const h = el('dino-nyawa');
    if (h){
        let out = '';
        for (let i = 0; i < 3; i++) out += i < state.hearts ? '❤️' : '🖤';
        h.textContent = out;
    }
}

// Decode frame sprite sedikit di depan, supaya tidak tersendat saat pertama kali digambar
function warmAhead(frames, i, n){
    for (let k = 1; k <= n; k++){
        const f = frames[(i + k) % frames.length];
        if (f && f.complete && f.decode && !f._warm){ f._warm = true; f.decode().catch(() => {}); }
    }
}
function loop(now){
    if (!state || !state.running) return;
    const dt = Math.min(0.05, (now - (state.lastFrameTime || now)) / 1000);
    state.lastFrameTime = now;
    trySpawn(now);
    updatePhysics(dt, now);
    draw(now);
    warmAhead(dinoWalkFrames, Math.floor(state.walkFrame), 8);
    if (state.current && state.current.model === 'hornet')
        warmAhead(hornetFrames, Math.floor(now / (HORNET_FRAME_DURATION * 1000)) % HORNET_FRAME_COUNT, 8);
    state.rafId = requestAnimationFrame(loop);
}

// ============================================================
// KAMERA (dipindah ke layar bermain, sama seperti Apple Snake)
// ============================================================
function pindahkanKamera(masuk){
    const leftCol = document.getElementById('left-col');
    const slot = el('game-dino-camera-slot');
    if (!leftCol || !slot) return;
    if (masuk){
        window.__astaLeftColParent = window.__astaLeftColParent || leftCol.parentElement;
        window.__astaLeftColNext = window.__astaLeftColNext || leftCol.nextElementSibling;
        slot.appendChild(leftCol);
        leftCol.classList.remove('hidden');
        leftCol.style.display = '';
    } else {
        const parent = window.__astaLeftColParent, next = window.__astaLeftColNext;
        if (parent){
            if (next && next.parentElement === parent) parent.insertBefore(leftCol, next);
            else parent.appendChild(leftCol);
        }
        leftCol.classList.add('hidden');
    }
}

// ============================================================
// SOAL: huruf/kata yang sudah direkam (sama seperti Apple Snake / Ujian)
// ============================================================
function kumpulkanSoal(kategori){
    const sel = kategori === 'alfabet' ? '#grid-alfabet .word-card'
        : kategori === 'kata' ? '#grid-kata .word-card'
        : '#grid-alfabet .word-card, #grid-kata .word-card';
    return Array.from(document.querySelectorAll(sel))
        .filter((c) => (parseInt(c.querySelector('.count').textContent, 10) || 0) > 0)
        .map((c) => c.querySelector('.label').textContent.trim())
        .filter(Boolean);
}

function namaPemain(){ return localStorage.getItem('astakanda_player_nama') || 'Pemain'; }
const ICON_PERSON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

let cfgLast = null;

let logicalW = 800, logicalH = 360, dpr = 1;

function fitCanvas(){
    const c = canvas(), wrap = c.parentElement;
    const w = wrap.clientWidth || 800, h = wrap.clientHeight || 360;
    logicalH = 360;
    logicalW = Math.max(560, Math.min(1100, Math.round(360 * w / h)));
    // Dibatasi 2x: cukup tajam di layar rapat (retina/HP) tanpa membuat
    // kanvas jadi sangat besar (yang bikin lag di perangkat lemah).
    dpr = Math.min(window.devicePixelRatio || 1, 1.5); // shortcut: 1.5x demi kelancaran, naikkan ke 2 bila perangkat kuat
    c.width = Math.round(logicalW * dpr);
    c.height = Math.round(logicalH * dpr);
    rebuildBackgroundCache();
}

// ---------------- Pop-up loading (progress bar) ----------------
const LOADING_TIPS = [
    [0,  'Menyiapkan dino…'],
    [35, 'Menata rintangan…'],
    [70, 'Membangun latar…'],
    [95, 'Hampir siap…'],
];
function setLoadingTip(pct){
    const t = el('dino-loading-tip');
    if (!t) return;
    let tip = LOADING_TIPS[0][1];
    for (const [th, txt] of LOADING_TIPS) if (pct >= th) tip = txt;
    t.textContent = tip;
}
function setLoadingProgress(pct){
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const fill = el('dino-loading-fill'); if (fill) fill.style.width = pct + '%';
    const txt = el('dino-loading-percent'); if (txt) txt.textContent = pct + '%';
    setLoadingTip(pct);
}
function showLoading(){
    setLoadingProgress(0);
    const m = el('dino-loading');
    if (m) m.classList.remove('hidden');
}
function hideLoading(){
    const m = el('dino-loading');
    if (m) m.classList.add('hidden');
}

let startGen = 0; // menjaga jika "Mulai Main" tak sengaja terpicu 2x beruntun

async function start(config){
    cfgLast = config || { kesulitan: 'mudah', kategori: 'alfabet' };
    const pool = kumpulkanSoal(cfgLast.kategori);
    if (!pool.length){
        const m = el('modal-game-syarat'), t = el('modal-game-syarat-text');
        if (m && t){
            t.textContent = 'Belum ada huruf/kata yang direkam untuk kategori "' + cfgLast.kategori + '". Rekam dulu di tab Belajar, ya.';
            m.classList.remove('hidden');
        }
        return;
    }

    const gen = ++startGen;
    if (window.AstaSound) AstaSound.prepare(['jump', 'typing', 'backsound', 'gameover', 'damage']);
    el('game-dino-result').classList.add('hidden');
    // Pop-up loading HANYA muncul saat aset benar-benar belum pernah dimuat
    // (pertama kali Dino Attack dibuka). Saat "Main Lagi" dsb., aset sudah
    // siap di memori, jadi permainan langsung mulai tanpa pop-up lagi.
    const perluLoading = !assetsRequested;
    if (perluLoading) showLoading();

    // Semuanya disiapkan DULU (sprite, canvas, kamera, rekor) — begitu layar
    // Dino Attack dibuka, tidak ada lagi elemen yang "menyusul belakangan"
    // (sprite kotak, kamera kosong, dst).
    const rekorPromise = fetch('/game/dino/leaderboard')
        .then((r) => r.json())
        .then((rows) => (rows || []).find((r) => String(r.nama).toLowerCase() === namaPemain().toLowerCase()))
        .then((me) => (me ? me.skor_tertinggi : 0))
        .catch(() => 0);

    await ensureAssets((done, total) => { if (perluLoading) setLoadingProgress((done / total) * 100); });
    const rekor = await rekorPromise;
    if (gen !== startGen) return; // ada start() lain yang lebih baru, batalkan yang ini
    if (perluLoading) setLoadingProgress(100);

    pindahkanKamera(true);
    const badge = el('dino-player-badge');
    if (badge) badge.innerHTML = ICON_PERSON + ' ' + namaPemain();
    setDetect(null, 'Peragakan gestur untuk menjawab');
    setTarget(null);

    const diff = DIFF_CONFIG[cfgLast.kesulitan] ? cfgLast.kesulitan : 'mudah';
    fitCanvas();
    if (state && state.rafId) cancelAnimationFrame(state.rafId);
    state = freshState(diff, namaPemain(), pool);
    state.startTime = performance.now();
    state.lastFrameTime = state.startTime;
    needRelease = false; lastAnswerLabel = null; resetAnswerTracking();
    el('dino-rekor').textContent = rekor;
    updateHud();
    // Gambar 1 frame arena sebelum layar ditampilkan supaya begitu terlihat,
    // arenanya sudah terisi penuh (bukan kosong sesaat).
    draw(state.lastFrameTime);

    hideLoading();
    window.AstaKandaGameUI.showScreen(panelPlay);
    if (window.AstaSound) { AstaSound.mount(el('dino-btn-settings')); AstaSound.startMusic(); }
    state.running = true;
    // Interval dipercepat (dulu 400ms) supaya jawaban benar langsung
    // terdeteksi nyaris instan.
    clearInterval(pollTimer); pollTimer = setInterval(pollDetect, 50);
    state.rafId = requestAnimationFrame(loop);
}

function hentikan(){
    startGen++; // batalkan start() yang mungkin masih menunggu aset dimuat
    tutupKonfirmasi(false);
    if (window.AstaSound) AstaSound.stopMusic();
    hideLoading();
    clearInterval(pollTimer); pollTimer = null;
    if (state){
        state.running = false;
        if (state.rafId) cancelAnimationFrame(state.rafId);
    }
    pindahkanKamera(false);
}

function endGame(){
    if (!state || state.finished) return;
    state.finished = true;
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    clearInterval(pollTimer); pollTimer = null;
    pindahkanKamera(false);
    if (window.AstaSound) AstaSound.stopMusic();
    sfxGameOver();
    tutupKonfirmasi(false);

    const skor = state.score;
    const detikMain = Math.max(0, Math.round((performance.now() - state.startTime) / 1000));
    const benar = state.correctWords || 0, salah = state.wrongHits || 0;
    const mm = String(Math.floor(detikMain / 60)).padStart(2, '0');
    const ss = String(detikMain % 60).padStart(2, '0');
    const info = {
        popup: el('game-dino-result'), judul: el('dino-result-title'), skor: el('dino-result-skor'),
        tombolAnchor: el('dino-btn-ulangi'), judulNormal: 'Game Over',
        stats: [
            { label: 'Waktu', nilai: mm + ':' + ss },
            { label: 'Benar', nilai: benar, kelas: 'stat-good' },
            { label: 'Salah', nilai: salah, kelas: 'stat-bad' },
        ],
        sertifikat: {
            nama: namaPemain(), game: 'Dino Attack', kesulitan: state.difficulty, skor,
            waktu: detikMain, akurasi: (benar + salah) ? Math.round((benar / (benar + salah)) * 100) : 0,
            tanggal: new Date().toISOString(),
        },
    };

    el('dino-result-skor').textContent = skor;
    const badge = el('dino-result-rekor');
    badge.classList.add('hidden');
    if (window.AstaHasil) AstaHasil.terapkan(Object.assign({ rekor: false }, info));
    else el('dino-result-title').textContent = 'Game Over';
    el('game-dino-result').classList.remove('hidden');
    rapikanPopupHasil(skor, mm + ':' + ss, benar, salah);

    fetch('/game/dino/score', {
        method: 'POST',
        headers: (window.astaKanda ? window.astaKanda.jsonHeaders() : { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nama: namaPemain(), skor, kesulitan: state.difficulty, kategori: (cfgLast && cfgLast.kategori) || 'alfabet' }),
    })
        .then((r) => r.json())
        .then((data) => {
            if (data && data.rekor_baru && skor > 0){
                if (window.AstaHasil) AstaHasil.terapkan(Object.assign({ rekor: true }, info));
                else el('dino-result-title').textContent = 'Rekor Baru!';
                badge.textContent = 'Skor tertinggimu meningkat!';
                badge.classList.remove('hidden');
                rapikanPopupHasil(skor, mm + ':' + ss, benar, salah);
            }
        })
        .catch(() => {});
}

// ---------------- Pop up Game Over (gaya Apple Snake) + konfirmasi Keluar ----------------
const svgIkon = (isi) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + isi + '</svg>';
const ICON_KELUAR = svgIkon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>');
const ICON_PODIUM = svgIkon('<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>');
const ICON_BINTANG = svgIkon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>');
const ICON_JAM = svgIkon('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>');
const RE_EMOJI = /\p{Extended_Pictographic}\uFE0F?/gu;

function cariBarisStat(){
    const lbl = Array.from(el('game-dino-result').querySelectorAll('*'))
        .find((n) => !n.children.length && /^\s*waktu\s*$/i.test(n.textContent));
    return lbl && lbl.parentElement && lbl.parentElement.parentElement;
}

// Idempoten: aman dipanggil lagi saat "Rekor Baru" menimpa isi pop up
function rapikanPopupHasil(skor, waktu, benar, salah){
    el('dino-btn-leaderboard-2').innerHTML = ICON_PODIUM + '<span>Leaderboard</span>';
    el('dino-btn-ganti-pemain').innerHTML = ICON_KELUAR + '<span>Keluar</span>';
    const judul = el('dino-result-title');
    judul.textContent = judul.textContent.replace(RE_EMOJI, '').trim();

    const baris = cariBarisStat();
    if (!baris) return; // shortcut: markup hasil.js berubah -> kartu bawaan dibiarkan; upgrade dengan menyesuaikan cariBarisStat
    const kartu = (kelas, ikon, nilai, label) =>
        '<div class="apple-stat apple-stat--' + kelas + '"><span class="apple-stat-ico">' + ikon + '</span>' +
        '<span class="apple-stat-val">' + nilai + '</span><span class="apple-stat-lbl">' + label + '</span></div>';
    baris.classList.add('apple-stats');
    baris.innerHTML = kartu('skor', ICON_BINTANG, skor, 'Skor') + kartu('waktu', ICON_JAM, waktu, 'Waktu')
        + kartu('benar', ICON_CHECK, benar, 'Benar') + kartu('salah', ICON_CROSS, salah, 'Salah');

    const lama = el('dino-result-skor').parentElement; // baris "Skor: n" lama, sudah jadi kartu pertama
    if (lama && lama !== baris){
        if (lama.contains(baris)){
            lama.childNodes.forEach((n) => { if (n.nodeType === 3) n.nodeValue = ''; });
            Array.from(lama.children).forEach((c) => { if (c !== baris && !c.contains(baris)) c.style.display = 'none'; });
        } else lama.style.display = 'none';
    }
}

// Pop up konfirmasi Keluar: game dijeda selama pop up terbuka
let modalKeluar = null, jedaMulai = 0;
function buatKonfirmasi(){
    modalKeluar = document.createElement('div');
    modalKeluar.className = 'apple-confirm hidden';
    modalKeluar.setAttribute('role', 'dialog');
    modalKeluar.setAttribute('aria-modal', 'true');
    modalKeluar.innerHTML =
        '<div class="apple-confirm-card">' +
            '<div class="apple-confirm-ico">' + ICON_KELUAR + '</div>' +
            '<div class="apple-confirm-title">Keluar dari permainan?</div>' +
            '<p class="apple-confirm-text">Permainan yang sedang berjalan akan dihentikan dan skor tidak disimpan.</p>' +
            '<div class="apple-confirm-actions">' +
                '<button type="button" class="apple-confirm-btn apple-confirm-btn--ghost" data-aksi="batal">Batal</button>' +
                '<button type="button" class="apple-confirm-btn apple-confirm-btn--danger" data-aksi="keluar">Keluar</button>' +
            '</div>' +
        '</div>';
    modalKeluar.addEventListener('click', (e) => {
        const aksi = e.target.closest('[data-aksi]');
        if (aksi && aksi.dataset.aksi === 'keluar'){ tutupKonfirmasi(false); hentikan(); UI().showSelect(); }
        else if (aksi || e.target === modalKeluar) tutupKonfirmasi(true);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalKeluar && !modalKeluar.classList.contains('hidden')) tutupKonfirmasi(true);
    });
    document.body.appendChild(modalKeluar);
}
function bukaKonfirmasiKeluar(){
    if (!state || state.finished){ hentikan(); UI().showSelect(); return; }
    if (!modalKeluar) buatKonfirmasi();
    if (state.running){ // jeda: hentikan loop, catat waktu mulai jeda
        state.running = false;
        cancelAnimationFrame(state.rafId);
        jedaMulai = performance.now();
    }
    modalKeluar.classList.remove('hidden');
    const batal = modalKeluar.querySelector('[data-aksi="batal"]');
    if (batal) batal.focus();
}
function tutupKonfirmasi(lanjut){
    if (!modalKeluar || modalKeluar.classList.contains('hidden')) return;
    modalKeluar.classList.add('hidden');
    if (lanjut && jedaMulai && state && !state.finished){
        const now = performance.now();
        state.startTime += now - jedaMulai; // waktu jeda tidak dihitung ke durasi main
        state.lastFrameTime = now;
        state.running = true;
        state.rafId = requestAnimationFrame(loop);
    }
    jedaMulai = 0;
}

// ---------------- Tombol-tombol ----------------
const UI = () => window.AstaKandaGameUI;
el('dino-btn-ulangi').addEventListener('click', () => { el('game-dino-result').classList.add('hidden'); start(cfgLast); });
el('dino-btn-settings').addEventListener('click', () => { hentikan(); UI().showDinoSetup(); });
el('dino-btn-keluar').addEventListener('click', bukaKonfirmasiKeluar);
el('dino-btn-leaderboard').addEventListener('click', () => { hentikan(); UI().showDinoLeaderboard(); });
el('dino-btn-leaderboard-2').addEventListener('click', () => { el('game-dino-result').classList.add('hidden'); UI().showDinoLeaderboard(); });
el('dino-btn-ganti-pemain').addEventListener('click', () => { el('game-dino-result').classList.add('hidden'); hentikan(); UI().showSelect(); });

// ---------------- Nama Pemain di "Atur Permainan" (di atas Tingkat Kesulitan) ----------------
(function sisipkanNamaPemain(){
    const chips = el('dino-diff-chips');
    const lblDiff = chips && chips.previousElementSibling; // label "Tingkat Kesulitan"
    if (!lblDiff || el('dino-nama-input')) return;
    const KEY = 'astakanda_player_nama';

    const lbl = lblDiff.cloneNode(false); // ikut gaya label yang sudah ada
    lbl.removeAttribute('id'); lbl.removeAttribute('for');
    lbl.textContent = 'Nama Pemain';
    const input = document.createElement('input');
    input.id = 'dino-nama-input';
    input.type = 'text';
    input.className = 'game-nama-input dino-nama-input';
    input.maxLength = 20;
    input.placeholder = 'Masukkan nama pemain';
    input.autocomplete = 'off';
    input.addEventListener('input', () => {
        const v = input.value.trim();
        if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); // kosong -> "Pemain"
    });

    const grup = chips.parentElement;
    if (grup.contains(el('dino-kategori-chips'))){ // label & chips langsung di kotak utama
        grup.insertBefore(lbl, lblDiff);
        grup.insertBefore(input, lblDiff);
    } else { // tiap bagian punya pembungkus sendiri: buat pembungkus yang sama
        const kotak = grup.cloneNode(false);
        kotak.removeAttribute('id');
        kotak.append(lbl, input);
        grup.parentElement.insertBefore(kotak, grup);
    }

    // Isi ulang dari penyimpanan setiap layar Atur Permainan dibuka
    const isi = () => { if (document.activeElement !== input) input.value = localStorage.getItem(KEY) || ''; };
    isi();
    let layar = grup; while (layar && !layar.id) layar = layar.parentElement;
    if (layar) new MutationObserver(() => { if (!layar.classList.contains('hidden')) isi(); })
        .observe(layar, { attributes: true, attributeFilter: ['class'] });
})();

window.AstaKandaGames = window.AstaKandaGames || {};
window.AstaKandaGames.dino = { start, stop: hentikan };
})();