// Synthesised sound: no audio files, everything is WebAudio oscillators and noise.
// The context starts on the first user gesture; every call is safe before that.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenHigh = false;
  let sirenTimer = 0;
  let musicTimer = 0;
  let musicStep = 0;
  let muted = false;
  const bassLine = [55, 55, 65.4, 55, 49, 55, 82.4, 73.4]; // A1 A1 C2 A1 G1 A1 E2 D2

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 750;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch { return false; }
    return true;
  }

  function noiseBurst(duration, filterFreq, gain) {
    if (!ctx || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(filter); filter.connect(g); g.connect(master);
    source.start();
  }

  function tone(freq, duration, type, gain, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(g); g.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  return {
    ensure,
    setMuted(value) { muted = value; if (master) master.gain.value = muted ? 0 : 0.5; },
    isMuted() { return muted; },
    engine(speedRatio, inCar) {
      if (!ctx || muted) return;
      const target = inCar ? 0.028 + speedRatio * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(55 + speedRatio * 130, ctx.currentTime, 0.08);
    },
    siren(on, dt) {
      if (!ctx) return;
      sirenTimer += dt;
      if (on && sirenTimer > 0.42) { sirenTimer = 0; sirenHigh = !sirenHigh; }
      const target = on && !muted ? 0.035 : 0;
      sirenGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      if (on) sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 700, ctx.currentTime, 0.05);
    },
    shot() { noiseBurst(0.09, 1800, 0.5); tone(180, 0.07, 'square', 0.25, 60); },
    crash() { noiseBurst(0.25, 300, 0.7); },
    blip() { tone(880, 0.09, 'sine', 0.3, 1320); },
    pickup() { tone(660, 0.1, 'sine', 0.3); setTimeout(() => tone(990, 0.14, 'sine', 0.3), 90); },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.35), i * 110));
    },
    fail() { tone(220, 0.3, 'sawtooth', 0.25, 110); },
    phone() { tone(1200, 0.12, 'sine', 0.25); setTimeout(() => tone(1200, 0.12, 'sine', 0.25), 180); },
    update(dt, playing) {
      if (!ctx || muted || !playing) return;
      musicTimer += dt;
      if (musicTimer >= 0.24) {
        musicTimer = 0;
        tone(bassLine[musicStep % bassLine.length], 0.22, 'triangle', 0.12);
        if (musicStep % 4 === 2) tone(bassLine[musicStep % bassLine.length] * 2, 0.1, 'sine', 0.05);
        musicStep += 1;
      }
    },
  };
}
