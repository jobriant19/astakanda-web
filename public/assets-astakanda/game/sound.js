/* ASTA KANDA — Suara (Web Audio API), dipakai Dino Attack & Apple Snake.
 * Sampel dari public/assets/sounds/: jump, typing, backsound, gameover, damage (.mp3).
 * Mute tersimpan di localStorage dan dipakai bersama oleh kedua game.
 */
(function () {
  'use strict';
  const BASE = '/assets/sounds/';
  const FILES = { jump: 'jump.mp3', typing: 'typing.mp3', backsound: 'backsound.mp3', gameover: 'gameover.mp3', damage: 'damage.mp3' };
  const MUSIC_GAIN = 0.35;
  const KEY = 'astakanda_sound_muted';

  let ctx = null;
  const buffers = {}, loading = {}, activeSrc = {};
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}
  let musicWanted = false, musicSrc = null, musicGain = null;

  function getCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    const url = BASE + FILES[name];
    loading[name] = fetch(url)
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then((data) => { const c = getCtx(); return c ? c.decodeAudioData(data) : null; })
      .then((buf) => { if (buf) buffers[name] = buf; return buf; })
      .catch((err) => { console.warn('[suara] Gagal memuat ' + url + ':', err.message); loading[name] = null; return null; });
    return loading[name];
  }
  function prepare(names) { return Promise.all((names || Object.keys(FILES)).map(load)); }

  function playMusic() {
    if (!musicWanted || musicSrc) return;
    const c = getCtx(), buf = buffers.backsound;
    if (!c || !buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true; // loop tanpa jeda
    const g = c.createGain();
    g.gain.value = muted ? 0 : MUSIC_GAIN;
    src.connect(g).connect(c.destination);
    src.start(0);
    musicSrc = src; musicGain = g;
  }
  function startMusic() { musicWanted = true; load('backsound').then(playMusic); }
  function stopMusic() {
    musicWanted = false;
    if (musicSrc) { try { musicSrc.stop(); } catch (e) {} }
    musicSrc = null; musicGain = null;
  }

  function play(name, opts) {
    const o = Object.assign({ rate: 1, gain: 0.6, offset: 0, duration: null }, opts || {});
    if (muted) return;
    const c = getCtx(), buf = buffers[name];
    if (!c || !buf) return;
    if (activeSrc[name]) { try { activeSrc[name].stop(); } catch (e) {} }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate;
    const g = c.createGain();
    g.gain.value = o.gain;
    src.connect(g).connect(c.destination);
    const off = Math.min(Math.max(o.offset, 0), Math.max(buf.duration - 0.02, 0));
    if (o.duration) src.start(0, off, o.duration); else src.start(0, off);
    activeSrc[name] = src;
    src.onended = () => { if (activeSrc[name] === src) activeSrc[name] = null; };
  }

  function tone(o) {
    o = Object.assign({ freq: 440, duration: 0.08, type: 'sine', gain: 0.18, glideTo: null, delay: 0 }, o || {});
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + o.delay;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(o.glideTo, 1), t0 + o.duration);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + o.duration + 0.02);
  }

  function noise(o) {
    o = Object.assign({ duration: 0.15, gain: 0.22, delay: 0 }, o || {});
    if (muted) return;
    const c = getCtx();
    if (!c) return;
    const t0 = c.currentTime + o.delay;
    const size = Math.floor(c.sampleRate * o.duration);
    const buf = c.createBuffer(1, size, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const n = c.createBufferSource();
    n.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(o.gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);
    n.connect(g).connect(c.destination);
    n.start(t0);
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
    if (musicGain) musicGain.gain.value = muted ? 0 : MUSIC_GAIN;
    document.querySelectorAll('.asta-sound-btn').forEach((b) => {
      b.classList.toggle('is-muted', muted);
      b.setAttribute('aria-pressed', muted ? 'true' : 'false');
      b.title = muted ? 'Nyalakan suara' : 'Matikan suara';
    });
  }

  const ICON_ON = '<svg class="asta-ico-on" viewBox="0 0 24 24" fill="none"><path d="M3 10v4a1 1 0 0 0 1 1h3.2l4.3 3.6a.6.6 0 0 0 1-.46V5.86a.6.6 0 0 0-1-.46L7.2 9H4a1 1 0 0 0-1 1Z" fill="currentColor"/><path d="M15.5 9a3.5 3.5 0 0 1 0 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 6.5a7 7 0 0 1 0 11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_OFF = '<svg class="asta-ico-off" viewBox="0 0 24 24" fill="none"><path d="M3 10v4a1 1 0 0 0 1 1h3.2l4.3 3.6a.6.6 0 0 0 1-.46V5.86a.6.6 0 0 0-1-.46L7.2 9H4a1 1 0 0 0-1 1Z" fill="currentColor"/><path d="m16.5 9.5 5 5M21.5 9.5l-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // Memasang tombol suara tepat sebelum tombol `ref` (mis. tombol pengaturan di topbar permainan)
  function mount(ref) {
    if (!ref || !ref.parentElement) return;
    if (ref.parentElement.querySelector('.asta-sound-btn')) { setMuted(muted); return; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'game-play-icon-btn asta-sound-btn';
    b.setAttribute('aria-label', 'Musik dan suara');
    b.innerHTML = ICON_ON + ICON_OFF;
    b.addEventListener('click', () => { getCtx(); setMuted(!muted); });
    ref.parentElement.insertBefore(b, ref);
    setMuted(muted);
  }

  // Browser memblokir suara sebelum ada interaksi -> dibuka di setiap interaksi
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) => {
    document.addEventListener(evt, () => { if (ctx || musicWanted) getCtx(); playMusic(); }, { passive: true });
  });

  window.AstaSound = { prepare, startMusic, stopMusic, play, tone, noise, mount, setMuted, toggle: () => setMuted(!muted), get muted() { return muted; } };
})();