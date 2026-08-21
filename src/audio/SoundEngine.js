/**
 * THE LAST SIGNAL — Procedural Sound Engine
 * 100% Web Audio API procedural sound effects & dark sci-fi atmospheric drone.
 * Zero external audio files required.
 */

import { AudioSynthesizer } from './AudioSynthesizer.js';

export class SoundEngine {
  constructor(synthesizer = null) {
    this.synth = synthesizer || new AudioSynthesizer();

    // Listener / Player world coordinates
    this.listenerPos = { x: 0, y: 0 };

    // Ambient Drone state
    this.ambientDrone = {
      isPlaying: false,
      nodes: [],
      subOsc: null,
      pad1: null,
      pad2: null,
      ventNoise: null,
      filter: null,
      lfo: null,
      gain: null,
      stingerTimer: null
    };

    // Emergency Alarm state
    this.alarmState = {
      isPlaying: false,
      nodes: [],
      osc: null,
      lfo: null,
      gain: null,
      panner: null
    };

    // Heartbeat dynamic state
    this.heartbeat = {
      enabled: false,
      bpm: 60,
      intensity: 0.2,
      lastBeatTime: 0,
      timerId: null
    };

    // Entity proximity drone continuous state
    this.proximityDrone = {
      isPlaying: false,
      oscLeft: null,
      oscRight: null,
      filter: null,
      gain: null,
      distortion: null
    };

    // Geiger counter tracking
    this.geiger = {
      lastClickTime: 0,
      clickInterval: 2.0,
      distance: 9999
    };

    // Entity tracking
    this.entityDistance = 9999;
    this.stationHasPower = true;
  }

  /**
   * Initialize audio context on user interaction.
   */
  init() {
    return this.synth.init();
  }

  /**
   * Set listener (Player) coordinates for 2D spatial audio panning.
   */
  setListenerPosition(x, y) {
    this.listenerPos.x = x;
    this.listenerPos.y = y;
  }

  // =========================================================================
  // VOLUME & MUTE CONTROLS
  // =========================================================================

  setMasterVolume(val) {
    this.synth.setMasterVolume(val);
  }

  setSFXVolume(val) {
    this.synth.setSFXVolume(val);
  }

  setAmbientVolume(val) {
    this.synth.setAmbientVolume(val);
  }

  setMusicVolume(val) {
    this.synth.setMusicVolume(val);
  }

  setUIVolume(val) {
    this.synth.setUIVolume(val);
  }

  mute() {
    this.synth.mute();
  }

  unmute() {
    this.synth.unmute();
  }

  get isMuted() {
    return this.synth.isMuted;
  }

  // =========================================================================
  // 1. FOOTSTEP PROCEDURAL SYNTHESIS
  // =========================================================================

  /**
   * Plays a footstep sound effect.
   * @param {string} surfaceType - 'metal' | 'grate' | 'tile' | 'vent'
   * @param {boolean} isCrouching - stealth mode (muffled, soft)
   * @param {boolean} isSprinting - sprint mode (punchy, loud, rapid)
   * @param {Object} pos - { x, y }
   */
  playFootstep(surfaceType = 'metal', isCrouching = false, isSprinting = false, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    // Spatial Panning
    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos, {
      maxDistance: 700,
      panRange: 400
    });

    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    // Base gain & filter settings
    let gainLevel = 0.35;
    let duration = 0.09;
    let filterFreq = 1200;
    let filterQ = 2.0;

    if (isCrouching) {
      gainLevel = 0.08;
      duration = 0.06;
      filterFreq = 400;
      filterQ = 0.8;
    } else if (isSprinting) {
      gainLevel = 0.65;
      duration = 0.12;
      filterFreq = 2200;
      filterQ = 3.5;
    }

    // 1. Noise burst for foot texture
    const noiseType = (surfaceType === 'tile') ? 'brown' : 'pink';
    const noise = this.synth.createNoiseNode(noiseType);
    if (noise) {
      const filter = this.synth.createFilter('bandpass', filterFreq, filterQ);
      noise.gain.gain.setValueAtTime(0.001, now);
      noise.gain.gain.linearRampToValueAtTime(gainLevel, now + 0.01);
      noise.gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.source.connect(filter);
      filter.connect(outNode);
      noise.start(now);
      noise.stop(now + duration + 0.05);
    }

    // 2. Sub/Metallic thud component
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();

    let startFreq = 140;
    let endFreq = 45;
    if (surfaceType === 'metal' || surfaceType === 'grate') {
      startFreq = 220;
      endFreq = 65;
    } else if (surfaceType === 'vent') {
      startFreq = 300;
      endFreq = 80;
    }

    thud.type = (surfaceType === 'metal') ? 'triangle' : 'sine';
    thud.frequency.setValueAtTime(startFreq, now);
    thud.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const thudVol = isCrouching ? 0.05 : (isSprinting ? 0.4 : 0.22);
    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(thudVol, now + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.9);

    thud.connect(thudGain);
    thudGain.connect(outNode);

    thud.start(now);
    try { thud.stop(now + duration); } catch (_) {}

    // 3. Metallic ping for grate / metal surface
    if ((surfaceType === 'metal' || surfaceType === 'grate') && !isCrouching) {
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();
      const pingFilter = this.synth.createFilter('bandpass', 1800, 8);

      ping.type = 'sawtooth';
      ping.frequency.setValueAtTime(850 + Math.random() * 200, now);

      pingGain.gain.setValueAtTime(0.001, now);
      pingGain.gain.linearRampToValueAtTime(isSprinting ? 0.15 : 0.08, now + 0.005);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 1.4);

      ping.connect(pingFilter);
      pingFilter.connect(pingGain);
      pingGain.connect(outNode);

      ping.start(now);
      try { ping.stop(now + duration * 1.5); } catch (_) {}
    }

    if (spatial) {
      this.synth.connectSFX(spatial.distanceGain);
    }
  }

  // =========================================================================
  // 2. FLASHLIGHT TOGGLE
  // =========================================================================

  /**
   * Plays tactical mechanical flashlight switch click + capacitor whine.
   * @param {boolean} isOn - turn on vs turn off
   * @param {Object} pos - { x, y }
   */
  playFlashlightToggle(isOn = true, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    // Dual micro-clicks (tactical mechanical latch)
    const playClick = (timeOffset, freq, vol) => {
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      const clickFilter = this.synth.createFilter('highpass', 1200, 2);

      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(freq, now + timeOffset);
      clickOsc.frequency.exponentialRampToValueAtTime(100, now + timeOffset + 0.015);

      clickGain.gain.setValueAtTime(0.001, now + timeOffset);
      clickGain.gain.linearRampToValueAtTime(vol, now + timeOffset + 0.002);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + timeOffset + 0.018);

      clickOsc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(outNode);

      clickOsc.start(now + timeOffset);
      try { clickOsc.stop(now + timeOffset + 0.02); } catch (_) {}
    };

    playClick(0.0, 3200, 0.4);
    playClick(0.022, 1800, 0.3);

    // Capacitor Whine / Power coil
    const whine = ctx.createOscillator();
    const whineGain = ctx.createGain();
    const whineFilter = this.synth.createFilter('bandpass', 7500, 5);

    whine.type = 'sine';

    if (isOn) {
      // Rising high pitch capacitor charge
      whine.frequency.setValueAtTime(3500, now + 0.01);
      whine.frequency.exponentialRampToValueAtTime(11000, now + 0.28);

      whineGain.gain.setValueAtTime(0.0001, now + 0.01);
      whineGain.gain.linearRampToValueAtTime(0.12, now + 0.06);
      whineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    } else {
      // Falling dying discharge whine
      whine.frequency.setValueAtTime(8000, now);
      whine.frequency.exponentialRampToValueAtTime(800, now + 0.2);

      whineGain.gain.setValueAtTime(0.0001, now);
      whineGain.gain.linearRampToValueAtTime(0.09, now + 0.02);
      whineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    }

    whine.connect(whineFilter);
    whineFilter.connect(whineGain);
    whineGain.connect(outNode);

    whine.start(now);
    try { whine.stop(now + 0.32); } catch (_) {}

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  // =========================================================================
  // 3. DOOR SLIDE & LOCK
  // =========================================================================

  /**
   * Plays heavy pneumatic blast door open/close slide.
   * @param {boolean} isOpen - opening vs closing
   * @param {Object} pos - { x, y }
   */
  playDoorSlide(isOpen = true, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const duration = 0.65;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos, {
      maxDistance: 900,
      panRange: 450
    });
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    // 1. Pneumatic Air Hiss
    const hiss = this.synth.createNoiseNode('pink');
    if (hiss) {
      const hissFilter = this.synth.createFilter('bandpass', isOpen ? 800 : 1400, 3);
      const startF = isOpen ? 400 : 1800;
      const endF = isOpen ? 2200 : 350;

      this.synth.sweepFilter(hissFilter, startF, endF, duration, now);

      hiss.gain.gain.setValueAtTime(0.001, now);
      hiss.gain.gain.linearRampToValueAtTime(0.35, now + 0.08);
      hiss.gain.gain.setValueAtTime(0.3, now + duration - 0.15);
      hiss.gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      hiss.source.connect(hissFilter);
      hissFilter.connect(outNode);

      hiss.start(now);
      hiss.stop(now + duration + 0.05);
    }

    // 2. Heavy Metallic Servo Motor Grind (FM Synthesis)
    const servo = this.synth.createFMOscillator({
      carrierType: 'sawtooth',
      carrierFreq: isOpen ? 75 : 95,
      modType: 'sawtooth',
      modFreq: 30,
      modIndex: 60,
      gain: 0.28
    });

    if (servo) {
      const servoFilter = this.synth.createFilter('lowpass', 550, 4);
      servo.outputGain.gain.setValueAtTime(0.001, now);
      servo.outputGain.gain.linearRampToValueAtTime(0.26, now + 0.1);
      servo.outputGain.gain.setValueAtTime(0.24, now + duration - 0.1);
      servo.outputGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      servo.outputGain.connect(servoFilter);
      servoFilter.connect(outNode);

      servo.start(now);
      servo.stop(now + duration + 0.05);
    }

    // 3. Heavy Locking Clunk on close
    if (!isOpen) {
      const clunkTime = now + duration - 0.08;
      const clunk = ctx.createOscillator();
      const clunkGain = ctx.createGain();

      clunk.type = 'triangle';
      clunk.frequency.setValueAtTime(160, clunkTime);
      clunk.frequency.exponentialRampToValueAtTime(35, clunkTime + 0.12);

      clunkGain.gain.setValueAtTime(0.001, clunkTime);
      clunkGain.gain.linearRampToValueAtTime(0.5, clunkTime + 0.01);
      clunkGain.gain.exponentialRampToValueAtTime(0.0001, clunkTime + 0.15);

      clunk.connect(clunkGain);
      clunkGain.connect(outNode);

      clunk.start(clunkTime);
      try { clunk.stop(clunkTime + 0.18); } catch (_) {}
    }

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  /**
   * Plays door locked / security rejection double-buzz.
   * @param {Object} pos - { x, y }
   */
  playDoorLocked(pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    const playBuzz = (timeOffset) => {
      const t = now + timeOffset;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = this.synth.createFilter('lowpass', 1100, 2);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(115, t);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(122, t); // Dissonant beating

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(outNode);

      osc1.start(t);
      osc2.start(t);
      try {
        osc1.stop(t + 0.13);
        osc2.stop(t + 0.13);
      } catch (_) {}
    };

    // Double rejection buzz
    playBuzz(0.0);
    playBuzz(0.14);

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  // =========================================================================
  // 4. ITEM PICKUP HARMONIC SHIMMERS
  // =========================================================================

  /**
   * Plays crystal / sci-fi harmonic chime when picking up items.
   * @param {string} itemType - 'fragment' | 'battery' | 'medkit' | 'keycard' | 'generic'
   * @param {Object} pos - { x, y }
   */
  playPickup(itemType = 'generic', pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    let notes = [];
    let noteSpacing = 0.05;
    let waveType = 'sine';
    let baseGain = 0.22;
    let noteDuration = 0.45;

    switch (itemType) {
      case 'fragment':
        // Grand ethereal pentatonic/major9 shimmer
        notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
        noteSpacing = 0.06;
        waveType = 'triangle';
        baseGain = 0.28;
        noteDuration = 0.7;
        break;

      case 'battery':
        // Ascending electric dual-spark
        notes = [440, 659.25, 880, 1320, 1760];
        noteSpacing = 0.04;
        waveType = 'sine';
        baseGain = 0.24;
        noteDuration = 0.35;
        break;

      case 'medkit':
        // Warm soothing major chord
        notes = [392.0, 493.88, 587.33, 783.99];
        noteSpacing = 0.06;
        waveType = 'sine';
        baseGain = 0.25;
        noteDuration = 0.6;
        break;

      case 'keycard':
        // High-tech crisp chime
        notes = [880, 1174.66, 1760];
        noteSpacing = 0.045;
        waveType = 'triangle';
        baseGain = 0.26;
        noteDuration = 0.3;
        break;

      default:
        notes = [587.33, 880, 1174.66];
        noteSpacing = 0.05;
        break;
    }

    notes.forEach((freq, idx) => {
      const startTime = now + idx * noteSpacing;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle detune for shimmer
      osc.detune.setValueAtTime((Math.random() - 0.5) * 12, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(baseGain * Math.pow(0.9, idx), startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

      osc.connect(gain);
      gain.connect(outNode);

      osc.start(startTime);
      try { osc.stop(startTime + noteDuration + 0.05); } catch (_) {}
    });

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  // =========================================================================
  // 5. TERMINAL KEYSTROKE, BEEP & BOOT
  // =========================================================================

  /**
   * Plays vintage mechanical terminal keystroke click.
   * @param {Object} pos - { x, y }
   */
  playTerminalKeystroke(pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.uiGain;

    // 1. High frequency tactile snap
    const noise = this.synth.createNoiseNode('pink');
    if (noise) {
      const filter = this.synth.createFilter('bandpass', 3500 + (Math.random() * 400), 5);
      noise.gain.gain.setValueAtTime(0.001, now);
      noise.gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
      noise.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      noise.source.connect(filter);
      filter.connect(outNode);

      noise.start(now);
      noise.stop(now + 0.035);
    }

    // 2. Plastic bottom-out resonance
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    const randomPitch = 480 + (Math.random() * 60 - 30);

    thud.type = 'triangle';
    thud.frequency.setValueAtTime(randomPitch, now);
    thud.frequency.exponentialRampToValueAtTime(120, now + 0.03);

    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(0.15, now + 0.003);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    thud.connect(thudGain);
    thudGain.connect(outNode);

    thud.start(now);
    try { thud.stop(now + 0.04); } catch (_) {}

    if (spatial) this.synth.connectUI(spatial.distanceGain);
  }

  /**
   * Plays vintage CRT terminal beep (clean prompt, error buzz, or success chirp).
   * @param {string} type - 'normal' | 'error' | 'success' | 'data'
   * @param {Object} pos - { x, y }
   */
  playTerminalBeep(type = 'normal', pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.uiGain;

    if (type === 'normal') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(outNode);

      osc.start(now);
      try { osc.stop(now + 0.08); } catch (_) {}
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(outNode);

      osc.start(now);
      try { osc.stop(now + 0.2); } catch (_) {}
    } else if (type === 'success') {
      const notes = [659.25, 987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        osc.connect(gain);
        gain.connect(outNode);

        osc.start(t);
        try { osc.stop(t + 0.15); } catch (_) {}
      });
    } else if (type === 'data') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(2400, now + 0.04);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(outNode);

      osc.start(now);
      try { osc.stop(now + 0.05); } catch (_) {}
    }

    if (spatial) this.synth.connectUI(spatial.distanceGain);
  }

  /**
   * Plays full CRT terminal power-on sequence (degauss thump, 15kHz flyback whine, ready chimes).
   * @param {Object} pos - { x, y }
   */
  playTerminalBoot(pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.uiGain;

    // 1. Magnetic Degauss Coil Thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();

    thump.type = 'sine';
    thump.frequency.setValueAtTime(110, now);
    thump.frequency.exponentialRampToValueAtTime(25, now + 0.35);

    thumpGain.gain.setValueAtTime(0.001, now);
    thumpGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    thump.connect(thumpGain);
    thumpGain.connect(outNode);

    thump.start(now);
    try { thump.stop(now + 0.5); } catch (_) {}

    // 2. High-Frequency 15.6kHz Flyback Transformer Whine
    const whine = ctx.createOscillator();
    const whineGain = ctx.createGain();

    whine.type = 'sine';
    whine.frequency.setValueAtTime(15625, now + 0.1);

    whineGain.gain.setValueAtTime(0.0001, now + 0.1);
    whineGain.gain.linearRampToValueAtTime(0.08, now + 0.4);
    whineGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    whine.connect(whineGain);
    whineGain.connect(outNode);

    whine.start(now + 0.1);
    try { whine.stop(now + 1.3); } catch (_) {}

    // 3. Ready Chimes
    const bootChimes = [587.33, 880.0, 1174.66];
    bootChimes.forEach((freq, idx) => {
      const t = now + 0.55 + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

      osc.connect(gain);
      gain.connect(outNode);

      osc.start(t);
      try { osc.stop(t + 0.3); } catch (_) {}
    });

    if (spatial) this.synth.connectUI(spatial.distanceGain);
  }

  // =========================================================================
  // 6. DYNAMIC HEARTBEAT SUBSYSTEM
  // =========================================================================

  /**
   * Triggers a single dual-thump heartbeat (systolic + diastolic).
   * @param {number} bpm - Heart rate (e.g. 50 to 160)
   * @param {number} intensity - 0.0 to 1.0 (scales volume, distortion, sub-bass)
   */
  playHeartbeat(bpm = 60, intensity = 0.5) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const safeIntensity = Math.max(0.05, Math.min(1.0, intensity));
    const lubVol = 0.3 + safeIntensity * 0.5;
    const dubVol = lubVol * 0.65;

    // Pulse 1: "Lub" (Systolic: punchier, 58Hz -> 40Hz)
    const playThump = (timeOffset, startF, endF, vol, dur) => {
      const t = now + timeOffset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = this.synth.createFilter('lowpass', 120 + safeIntensity * 60, 3);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startF, t);
      osc.frequency.exponentialRampToValueAtTime(endF, t + dur);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(filter);

      if (safeIntensity > 0.65) {
        const dist = this.synth.createDistortion(15);
        filter.connect(dist);
        dist.connect(gain);
      } else {
        filter.connect(gain);
      }

      gain.connect(this.synth.sfxGain);

      osc.start(t);
      try { osc.stop(t + dur + 0.05); } catch (_) {}
    };

    // First thump (Lub)
    playThump(0.0, 58 + safeIntensity * 12, 40, lubVol, 0.12);

    // Second thump (Dub) ~0.14s later
    const dubDelay = Math.max(0.1, 0.18 - (bpm / 200) * 0.06);
    playThump(dubDelay, 50 + safeIntensity * 10, 34, dubVol, 0.14);
  }

  // =========================================================================
  // 7. GEIGER COUNTER SIGNAL PING
  // =========================================================================

  /**
   * Plays a Geiger crackle and crystal ping when near a signal fragment.
   * @param {number} distanceToFragment - Distance in pixels
   * @param {Object} pos - { x, y }
   */
  playGeigerPing(distanceToFragment, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos, {
      maxDistance: 600,
      panRange: 350
    });
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    const maxDist = 500;
    const closeness = Math.max(0, Math.min(1, 1 - (distanceToFragment / maxDist)));
    if (closeness <= 0.02) return;

    // 1. Sharp Stochastic Geiger Crackle / Click
    const noise = this.synth.createNoiseNode('white');
    if (noise) {
      const clickFilter = this.synth.createFilter('highpass', 2400, 3);
      const clickVol = 0.1 + closeness * 0.35;

      noise.gain.gain.setValueAtTime(0.001, now);
      noise.gain.gain.linearRampToValueAtTime(clickVol, now + 0.001);
      noise.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);

      noise.source.connect(clickFilter);
      clickFilter.connect(outNode);

      noise.start(now);
      noise.stop(now + 0.015);
    }

    // 2. High Resonant Crystal Ping (if moderately close)
    if (closeness > 0.25) {
      const ping = ctx.createOscillator();
      const pingGain = ctx.createGain();

      const pingFreq = 2800 + closeness * 1600;
      ping.type = 'sine';
      ping.frequency.setValueAtTime(pingFreq, now);
      ping.frequency.exponentialRampToValueAtTime(pingFreq * 0.7, now + 0.06);

      const pingVol = 0.05 + closeness * 0.2;
      pingGain.gain.setValueAtTime(0.001, now);
      pingGain.gain.linearRampToValueAtTime(pingVol, now + 0.004);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      ping.connect(pingGain);
      pingGain.connect(outNode);

      ping.start(now);
      try { ping.stop(now + 0.09); } catch (_) {}
    }

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  // =========================================================================
  // 8. NEXUS-9 ENTITY SCREECH & PROXIMITY DRONE
  // =========================================================================

  /**
   * Terrifying frequency-modulated distorted synthetic shriek when NEXUS-9 enters CHASE mode.
   * @param {number} distance - Distance to player
   * @param {Object} pos - { x, y }
   */
  playEntityScreech(distance = 0, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const duration = 1.3;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos, {
      maxDistance: 1000,
      panRange: 500
    });
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    // Screaming FM Synth Carrier + Fast LFO Modulator
    const fm = this.synth.createFMOscillator({
      carrierType: 'sawtooth',
      carrierFreq: 850,
      modType: 'square',
      modFreq: 140,
      modIndex: 320,
      gain: 0.45
    });

    if (fm) {
      // Frequency envelope: starts medium, swoops up to screaming heights, drops violently
      fm.carrier.frequency.setValueAtTime(650, now);
      fm.carrier.frequency.exponentialRampToValueAtTime(2200, now + 0.25);
      fm.carrier.frequency.exponentialRampToValueAtTime(450, now + duration);

      // Modulator index swoops
      fm.modGain.gain.setValueAtTime(180, now);
      fm.modGain.gain.linearRampToValueAtTime(600, now + 0.3);
      fm.modGain.gain.exponentialRampToValueAtTime(50, now + duration);

      // Resonant sweeping bandpass filter
      const formant = this.synth.createFilter('bandpass', 1200, 4.5);
      this.synth.sweepFilter(formant, 800, 3200, 0.4, now);

      // Heavy distortion
      const dist = this.synth.createDistortion(45);

      fm.outputGain.gain.setValueAtTime(0.001, now);
      fm.outputGain.gain.linearRampToValueAtTime(0.55, now + 0.08);
      fm.outputGain.gain.setValueAtTime(0.5, now + duration - 0.3);
      fm.outputGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      fm.outputGain.connect(formant);
      formant.connect(dist);
      dist.connect(outNode);

      fm.start(now);
      fm.stop(now + duration + 0.05);
    }

    // Sub-bass dread impact
    const subImpact = ctx.createOscillator();
    const subGain = ctx.createGain();

    subImpact.type = 'triangle';
    subImpact.frequency.setValueAtTime(110, now);
    subImpact.frequency.exponentialRampToValueAtTime(28, now + 0.7);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.6, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    subImpact.connect(subGain);
    subGain.connect(outNode);

    subImpact.start(now);
    try { subImpact.stop(now + 0.85); } catch (_) {}

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  /**
   * Dark rumbling saw-bass drone with binaural beating that swells when entity is near.
   * @param {number} distance - Distance to player
   * @param {Object} pos - { x, y }
   */
  playEntityProximityDrone(distance = 300, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const maxRange = 500;
    const closeness = Math.max(0, Math.min(1, 1 - (distance / maxRange)));
    if (closeness <= 0.01) return;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.ambientGain;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = this.synth.createFilter('lowpass', 120 + closeness * 280, 3.5);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(43, now); // Low binaural rumble

    const vol = closeness * 0.45;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(outNode);

    osc.start(now);
    try { osc.stop(now + 0.85); } catch (_) {}

    if (spatial) this.synth.connectAmbient(spatial.distanceGain);
  }

  // =========================================================================
  // 9. PLAYER HIT & DAMAGE
  // =========================================================================

  /**
   * Plays player damage impact + piercing high tinnitus tone.
   * @param {number} damage - Damage amount (e.g. 20 to 50)
   * @param {Object} pos - { x, y }
   */
  playPlayerHit(damage = 50, pos = null) {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const spatial = this.synth.createSpatialPanner(pos, this.listenerPos);
    const outNode = spatial ? spatial.input : this.synth.sfxGain;

    // 1. Flesh/Bone heavy blunt impact
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();

    thud.type = 'triangle';
    thud.frequency.setValueAtTime(140, now);
    thud.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    thudGain.gain.setValueAtTime(0.001, now);
    thudGain.gain.linearRampToValueAtTime(0.7, now + 0.008);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    thud.connect(thudGain);
    thudGain.connect(outNode);

    thud.start(now);
    try { thud.stop(now + 0.35); } catch (_) {}

    // 2. Heavy Noise impact crunch
    const noise = this.synth.createNoiseNode('brown');
    if (noise) {
      const crunchFilter = this.synth.createFilter('lowpass', 600, 2);
      noise.gain.gain.setValueAtTime(0.001, now);
      noise.gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
      noise.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      noise.source.connect(crunchFilter);
      crunchFilter.connect(outNode);

      noise.start(now);
      noise.stop(now + 0.25);
    }

    // 3. Piercing Tinnitus Ringing
    const tinnitus = ctx.createOscillator();
    const tinnitusGain = ctx.createGain();

    tinnitus.type = 'sine';
    tinnitus.frequency.setValueAtTime(3800, now);

    const ringDuration = 1.6 + (damage / 50) * 1.0;
    const ringVol = 0.22 + (damage / 100) * 0.15;

    tinnitusGain.gain.setValueAtTime(0.0001, now);
    tinnitusGain.gain.linearRampToValueAtTime(ringVol, now + 0.04);
    tinnitusGain.gain.exponentialRampToValueAtTime(0.0001, now + ringDuration);

    tinnitus.connect(tinnitusGain);
    tinnitusGain.connect(outNode);

    tinnitus.start(now);
    try { tinnitus.stop(now + ringDuration + 0.1); } catch (_) {}

    if (spatial) this.synth.connectSFX(spatial.distanceGain);
  }

  // =========================================================================
  // 10. STATION EMERGENCY ALARM KLAXON
  // =========================================================================

  /**
   * Starts or stops the looping station emergency alarm.
   * @param {boolean} isActive
   * @param {Object} pos - { x, y }
   */
  playAlarm(isActive = true, pos = null) {
    if (!this.synth.init()) return;

    if (isActive) {
      if (this.alarmState.isPlaying) return;
      const ctx = this.synth.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = this.synth.createFilter('bandpass', 780, 3.5);
      const gain = ctx.createGain();

      // Dual-frequency warble siren
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(720, now);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(1.3, now); // 1.3 Hz pulse cycle
      lfoGain.gain.setValueAtTime(180, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);

      const spatial = this.synth.createSpatialPanner(pos, this.listenerPos, {
        maxDistance: 1200,
        panRange: 600
      });

      if (spatial) {
        gain.connect(spatial.input);
        this.synth.connectSFX(spatial.distanceGain);
        this.alarmState.panner = spatial;
      } else {
        this.synth.connectSFX(gain);
      }

      lfo.start(now);
      osc.start(now);

      this.alarmState.isPlaying = true;
      this.alarmState.osc = osc;
      this.alarmState.lfo = lfo;
      this.alarmState.gain = gain;
    } else {
      if (!this.alarmState.isPlaying) return;
      const ctx = this.synth.ctx;
      const now = ctx.currentTime;

      if (this.alarmState.gain) {
        this.alarmState.gain.gain.cancelScheduledValues(now);
        this.alarmState.gain.gain.setValueAtTime(this.alarmState.gain.gain.value, now);
        this.alarmState.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      }

      setTimeout(() => {
        try {
          if (this.alarmState.osc) this.alarmState.osc.stop();
          if (this.alarmState.lfo) this.alarmState.lfo.stop();
        } catch (_) {}
        this.alarmState.isPlaying = false;
        this.alarmState.osc = null;
        this.alarmState.lfo = null;
        this.alarmState.gain = null;
        this.alarmState.panner = null;
      }, 450);
    }
  }

  // =========================================================================
  // 11. VICTORY & GAME OVER SEQUENCES
  // =========================================================================

  /**
   * Plays grand triumphant sci-fi synth chord progression on escape victory.
   */
  playVictory() {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    // Majestic Sci-Fi Chord Progression: Dmin9 -> Fmaj7 -> Gsus4 -> Dmaj
    const chords = [
      { time: 0.0, freqs: [146.83, 220.0, 261.63, 329.63, 440.0], dur: 1.2 }, // Dm9
      { time: 1.1, freqs: [174.61, 261.63, 329.63, 392.0, 523.25], dur: 1.2 }, // Fmaj7
      { time: 2.2, freqs: [196.0, 293.66, 392.0, 440.0, 587.33], dur: 1.4 },  // Gsus4
      { time: 3.5, freqs: [146.83, 220.0, 293.66, 369.99, 440.0, 587.33, 880.0], dur: 3.5 } // Dmaj
    ];

    chords.forEach(chord => {
      const chordStart = now + chord.time;
      chord.freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = this.synth.createFilter('lowpass', 2400, 2);

        osc.type = (idx % 2 === 0) ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, chordStart);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 10, chordStart);

        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.18 / Math.sqrt(chord.freqs.length), chordStart + 0.18);
        gain.gain.setValueAtTime(0.15 / Math.sqrt(chord.freqs.length), chordStart + chord.dur - 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + chord.dur);

        osc.connect(filter);
        filter.connect(gain);
        this.synth.connectMusic(gain);

        osc.start(chordStart);
        try { osc.stop(chordStart + chord.dur + 0.1); } catch (_) {}
      });
    });
  }

  /**
   * Plays descending glitch blackout drone on player demise.
   */
  playGameOver() {
    if (!this.synth.init()) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const duration = 2.8;

    // 1. Descending dissonant saw swarm
    const rootFreqs = [110, 116.54, 155.56]; // Dissonant minor cluster
    rootFreqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = this.synth.createFilter('lowpass', 1800, 4);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(22, now + duration);

      this.synth.sweepFilter(filter, 2200, 30, duration, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.1);
      gain.gain.setValueAtTime(0.22, now + duration - 0.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const dist = this.synth.createDistortion(35);

      osc.connect(filter);
      filter.connect(dist);
      dist.connect(gain);
      this.synth.connectSFX(gain);

      osc.start(now);
      try { osc.stop(now + duration + 0.1); } catch (_) {}
    });

    // 2. Glitch noise collapse
    const noise = this.synth.createNoiseNode('brown');
    if (noise) {
      const filter = this.synth.createFilter('bandpass', 600, 4);
      this.synth.sweepFilter(filter, 1200, 40, duration, now);

      noise.gain.gain.setValueAtTime(0.001, now);
      noise.gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      noise.gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.9);

      noise.source.connect(filter);
      filter.connect(noise.gain);
      this.synth.connectSFX(noise.gain);

      noise.start(now);
      noise.stop(now + duration);
    }
  }

  // =========================================================================
  // 12. AMBIENT BACKGROUND DRONE & SOUNDSCAPE
  // =========================================================================

  /**
   * Starts multi-oscillator dark space station ambient drone.
   */
  startAmbientDrone() {
    if (!this.synth.init()) return;
    if (this.ambientDrone.isPlaying) return;

    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    const masterDroneGain = ctx.createGain();
    masterDroneGain.gain.setValueAtTime(0.001, now);
    masterDroneGain.gain.linearRampToValueAtTime(0.5, now + 2.0);

    // 1. Sub-Bass Fundamental (55Hz / A1 sine)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55.0, now);
    subGain.gain.setValueAtTime(0.4, now);
    subOsc.connect(subGain);
    subGain.connect(masterDroneGain);
    subOsc.start(now);

    // 2. Mid Pad 1 (110Hz saw with slow LFO resonant lowpass sweep)
    const pad1 = ctx.createOscillator();
    const pad1Gain = ctx.createGain();
    const pad1Filter = this.synth.createFilter('lowpass', 280, 3.0);

    pad1.type = 'sawtooth';
    pad1.frequency.setValueAtTime(110.0, now);
    pad1.detune.setValueAtTime(-4, now);

    // LFO for slow filter breathing (0.06 Hz)
    const lfo = this.synth.createLFO({
      type: 'sine',
      frequency: 0.06,
      depth: 140,
      targetParam: pad1Filter.frequency
    });
    if (lfo) lfo.start(now);

    pad1Gain.gain.setValueAtTime(0.18, now);
    pad1.connect(pad1Filter);
    pad1Filter.connect(pad1Gain);
    pad1Gain.connect(masterDroneGain);
    pad1.start(now);

    // 3. Ambient Pad 2 (164.81Hz / E3 triangle fifth with subtle detuning)
    const pad2 = ctx.createOscillator();
    const pad2Gain = ctx.createGain();
    const pad2Filter = this.synth.createFilter('lowpass', 350, 1.5);

    pad2.type = 'triangle';
    pad2.frequency.setValueAtTime(164.81, now);
    pad2.detune.setValueAtTime(6, now);

    pad2Gain.gain.setValueAtTime(0.14, now);
    pad2.connect(pad2Filter);
    pad2Filter.connect(pad2Gain);
    pad2Gain.connect(masterDroneGain);
    pad2.start(now);

    // 4. Station Air Duct / Ventilation Pink Noise
    const ventNoise = this.synth.createNoiseNode('pink', { loop: true });
    let ventFilter = null;
    if (ventNoise) {
      ventFilter = this.synth.createFilter('bandpass', 260, 2.5);
      ventNoise.gain.gain.setValueAtTime(0.12, now);
      ventNoise.source.connect(ventFilter);
      ventFilter.connect(masterDroneGain);
      ventNoise.start(now);
    }

    this.synth.connectAmbient(masterDroneGain);

    this.ambientDrone = {
      isPlaying: true,
      masterGain: masterDroneGain,
      subOsc,
      pad1,
      pad2,
      pad1Filter,
      pad2Filter,
      lfo,
      ventNoise,
      ventFilter,
      stingerTimer: null
    };

    // Schedule random eerie metallic stingers
    this._scheduleRandomAmbientStinger();
  }

  /**
   * Stops ambient background drone.
   */
  stopAmbientDrone() {
    if (!this.ambientDrone.isPlaying) return;
    const ctx = this.synth.ctx;
    const now = ctx ? ctx.currentTime : 0;

    if (this.ambientDrone.stingerTimer) {
      clearTimeout(this.ambientDrone.stingerTimer);
      this.ambientDrone.stingerTimer = null;
    }

    if (this.ambientDrone.masterGain && ctx) {
      this.ambientDrone.masterGain.gain.cancelScheduledValues(now);
      this.ambientDrone.masterGain.gain.setValueAtTime(this.ambientDrone.masterGain.gain.value, now);
      this.ambientDrone.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    }

    setTimeout(() => {
      try {
        if (this.ambientDrone.subOsc) this.ambientDrone.subOsc.stop();
        if (this.ambientDrone.pad1) this.ambientDrone.pad1.stop();
        if (this.ambientDrone.pad2) this.ambientDrone.pad2.stop();
        if (this.ambientDrone.lfo) this.ambientDrone.lfo.stop();
        if (this.ambientDrone.ventNoise) this.ambientDrone.ventNoise.stop();
      } catch (_) {}

      this.ambientDrone.isPlaying = false;
      this.ambientDrone.subOsc = null;
      this.ambientDrone.pad1 = null;
      this.ambientDrone.pad2 = null;
      this.ambientDrone.lfo = null;
      this.ambientDrone.ventNoise = null;
      this.ambientDrone.masterGain = null;
    }, 1100);
  }

  /**
   * Dynamically alters ambient tension based on NEXUS-9 entity distance.
   */
  setEntityDistance(dist) {
    this.entityDistance = dist;
    if (!this.ambientDrone.isPlaying || !this.synth.ctx) return;

    const ctx = this.synth.ctx;
    const now = ctx.currentTime;
    const maxRange = 600;
    const closeness = Math.max(0, Math.min(1, 1 - (dist / maxRange)));

    // When entity is near, drop the warm pad frequencies and boost ominous sub-bass
    if (this.ambientDrone.pad1Filter) {
      const baseCutoff = 280 - closeness * 160;
      this.ambientDrone.pad1Filter.frequency.setTargetAtTime(baseCutoff, now, 0.2);
    }
  }

  /**
   * Random subtle metallic reverberation stingers in space station background.
   */
  _scheduleRandomAmbientStinger() {
    if (!this.ambientDrone.isPlaying) return;

    const delay = 9000 + Math.random() * 12000; // 9 - 21 seconds
    this.ambientDrone.stingerTimer = setTimeout(() => {
      if (!this.ambientDrone.isPlaying) return;
      this._playAmbientStinger();
      this._scheduleRandomAmbientStinger();
    }, delay);
  }

  _playAmbientStinger() {
    if (!this.synth.init() || !this.ambientDrone.isPlaying) return;
    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    // Eerie metal resonant chime
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = this.synth.createFilter('bandpass', 1400 + Math.random() * 800, 6.0);
    const panner = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;

    const notes = [440, 523.25, 622.25, 739.99, 880];
    const freq = notes[Math.floor(Math.random() * notes.length)];

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    if (panner) {
      panner.pan.setValueAtTime((Math.random() * 2 - 1) * 0.8, now);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

    osc.connect(filter);
    if (panner) {
      filter.connect(panner);
      panner.connect(gain);
    } else {
      filter.connect(gain);
    }

    this.synth.connectAmbient(gain);

    osc.start(now);
    try { osc.stop(now + 2.6); } catch (_) {}
  }

  // =========================================================================
  // 13. REAL-TIME ENGINE UPDATE LOOP
  // =========================================================================

  /**
   * Main game tick update for dynamic audio events (heartbeat pacing, Geiger clicks).
   * @param {number} deltaTime - Time in seconds
   * @param {Object} player - { x, y, health, maxHealth }
   * @param {Object} entity - { x, y, state: 'PATROL'|'INVESTIGATE'|'CHASE'|'FRENZY' }
   * @param {Array} fragments - Array of uncollected fragment objects with { x, y, collected }
   */
  update(deltaTime = 0.016, player = null, entity = null, fragments = []) {
    if (player) {
      this.setListenerPosition(player.x, player.y);
    }

    const now = (this.synth.ctx ? this.synth.ctx.currentTime : Date.now() / 1000);

    // 1. Entity Proximity & Heartbeat Management
    let entityDist = 9999;
    if (player && entity) {
      const dx = entity.x - player.x;
      const dy = entity.y - player.y;
      entityDist = Math.sqrt(dx * dx + dy * dy);
      this.setEntityDistance(entityDist);
    }

    // Heartbeat dynamic tempo & intensity
    let healthFactor = 1.0;
    if (player && player.health !== undefined && player.maxHealth !== undefined) {
      healthFactor = Math.max(0.1, player.health / player.maxHealth);
    }

    // Proximity factor [0 = far, 1 = right on top]
    const proxFactor = Math.max(0, Math.min(1, 1 - (entityDist / 450)));
    const chaseBoost = (entity && (entity.state === 'CHASE' || entity.state === 'FRENZY')) ? 0.35 : 0;

    // Heartbeat urgency
    const urgency = Math.max(proxFactor + chaseBoost, 1 - healthFactor);

    if (urgency > 0.15) {
      // Calculate dynamic BPM (60 BPM -> 160 BPM)
      const targetBpm = 60 + urgency * 100;
      const beatInterval = 60 / targetBpm;

      if (now - this.heartbeat.lastBeatTime >= beatInterval) {
        this.playHeartbeat(targetBpm, urgency);
        this.heartbeat.lastBeatTime = now;
      }
    }

    // 2. Dynamic Geiger Counter click interval based on closest fragment
    if (player && fragments && fragments.length > 0) {
      let closestDist = 9999;
      for (const frag of fragments) {
        if (frag.collected) continue;
        const dx = frag.x - player.x;
        const dy = frag.y - player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) closestDist = d;
      }

      this.geiger.distance = closestDist;

      if (closestDist < 450) {
        const norm = closestDist / 450; // 0 (touching) to 1 (far)
        // Interval: 0.08s when touching, up to 1.8s when at 450px
        const clickInterval = 0.08 + Math.pow(norm, 1.8) * 1.6;

        if (now - this.geiger.lastClickTime >= clickInterval) {
          this.playGeigerPing(closestDist, { x: player.x, y: player.y });
          this.geiger.lastClickTime = now;
        }
      }
    }
  }

  /**
   * Sonic Decoy Acoustic Pulse Chirp.
   * High-frequency FM sonar ping with fast exponential pitch drop.
   * @param {Object} [worldPos]
   */
  playDecoyChirp(worldPos = null) {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    const panner = this.synth.createSpatialPanner(this.listenerPos, worldPos);
    const gain = this.synth.createGain(0.35);

    const osc1 = this.synth.createOscillator('sine', 2400);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.18);

    const osc2 = this.synth.createOscillator('triangle', 4800);
    osc2.frequency.exponentialRampToValueAtTime(640, t + 0.12);

    const gainEnv = this.synth.createGain(0.001);
    gainEnv.gain.setValueAtTime(0.001, t);
    gainEnv.gain.linearRampToValueAtTime(0.4, t + 0.02);
    gainEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

    osc1.connect(gainEnv);
    osc2.connect(gainEnv);
    gainEnv.connect(gain);
    gain.connect(panner);
    panner.connect(this.synth.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.25);
    osc2.stop(t + 0.25);
  }

  /**
   * High-Energy EMP Shockwave Burst.
   * Sub-bass thunderous transient, white-noise static burst, and high-pitch capacitor discharge.
   */
  playEMPSurge() {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    // 1. Sub-Bass Thump
    const subOsc = this.synth.createOscillator('sine', 160);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const subGain = this.synth.createGain(0.001);
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.linearRampToValueAtTime(0.8, t + 0.03);
    subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

    subOsc.connect(subGain);
    subGain.connect(this.synth.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.75);

    // 2. Electrical Noise Static Burst
    const noise = this.synth.createNoiseNode('white');
    const filter = this.synth.createFilter('bandpass', 1200, 3.0);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.5);
    const noiseGain = this.synth.createGain(0.001);
    noiseGain.gain.setValueAtTime(0.001, t);
    noiseGain.gain.linearRampToValueAtTime(0.6, t + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.synth.sfxGain);
    noise.start(t);
    noise.stop(t + 0.65);

    // 3. High Capacitor Ion Ring
    const ionOsc = this.synth.createOscillator('sawtooth', 3600);
    ionOsc.frequency.exponentialRampToValueAtTime(450, t + 0.8);
    const ionGain = this.synth.createGain(0.001);
    ionGain.gain.setValueAtTime(0.001, t);
    ionGain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    ionGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

    ionOsc.connect(ionGain);
    ionGain.connect(this.synth.sfxGain);
    ionOsc.start(t);
    ionOsc.stop(t + 0.9);
  }

  /**
   * Locker / Vent Hiding Enclosure Sound.
   * Metallic hatch slide + air latch seal.
   * @param {boolean} isEntering
   */
  playLockerEnter(isEntering = true) {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    const noise = this.synth.createNoiseNode('brown');
    const filter = this.synth.createFilter('lowpass', isEntering ? 450 : 750, 1.5);
    const gain = this.synth.createGain(0.001);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.synth.sfxGain);

    noise.start(t);
    noise.stop(t + 0.35);

    // Mechanical Latch Click
    const osc = this.synth.createOscillator('square', isEntering ? 220 : 330);
    osc.frequency.setValueAtTime(isEntering ? 180 : 280, t + 0.08);
    const clickGain = this.synth.createGain(0.001);
    clickGain.gain.setValueAtTime(0.001, t + 0.08);
    clickGain.gain.linearRampToValueAtTime(0.25, t + 0.09);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(clickGain);
    clickGain.connect(this.synth.sfxGain);
    osc.start(t + 0.08);
    osc.stop(t + 0.22);
  }

  /**
   * Live Electrical Arcing / Sparks Sound.
   * @param {Object} [worldPos]
   */
  playElectricZap(worldPos = null) {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    const panner = this.synth.createSpatialPanner(this.listenerPos, worldPos);
    const noise = this.synth.createNoiseNode('white');
    const filter = this.synth.createFilter('bandpass', 2400 + Math.random() * 800, 4.0);
    const gain = this.synth.createGain(0.001);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.synth.sfxGain);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  /**
   * Sub-zero Cryogenic Steam Gas Leak.
   * @param {Object} [worldPos]
   */
  playCryoSteam(worldPos = null) {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    const panner = this.synth.createSpatialPanner(this.listenerPos, worldPos);
    const noise = this.synth.createNoiseNode('pink');
    const filter = this.synth.createFilter('highpass', 1800, 1.2);
    const gain = this.synth.createGain(0.001);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.synth.ambientGain);

    noise.start(t);
    noise.stop(t + 0.5);
  }

  /**
   * Procedural Psychological AI Whisper Ingress.
   * Formant-filtered robotic resonance simulating voice synthesis.
   * @param {number} [distance=200]
   */
  playAIWhisper(distance = 200) {
    if (!this.synth.isInitialized) return;
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    const norm = Math.max(0, Math.min(1, 1 - (distance / 350)));
    const masterVol = 0.25 * norm;
    if (masterVol <= 0.01) return;

    // Dual Formant synthesis (Vowel "AH/OH" resonance filter)
    const baseFreq = 85 + Math.sin(t * 3) * 15;
    const osc = this.synth.createOscillator('sawtooth', baseFreq);

    const f1 = this.synth.createFilter('bandpass', 520, 6.0); // Formant 1
    const f2 = this.synth.createFilter('bandpass', 1100, 7.0); // Formant 2

    const gain = this.synth.createGain(0.001);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(masterVol, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(gain);
    f2.connect(gain);
    gain.connect(this.synth.ambientGain);

    osc.start(t);
    osc.stop(t + 1.7);
  }

  /**
   * Plays a vintage audio log playback stinger with radio cassette click,
   * magnetic tape hiss, and synthesized speech formant cadence.
   */
  playAudioLogStinger() {
    this.synth.init();
    if (!this.synth.ctx) return;

    const ctx = this.synth.ctx;
    const now = ctx.currentTime;

    // 1. Mechanical cassette deck latch click
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(800, now);
    clickOsc.frequency.exponentialRampToValueAtTime(120, now + 0.05);

    clickGain.gain.setValueAtTime(0.35, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    clickOsc.connect(clickGain);
    clickGain.connect(this.synth.sfxGain);
    clickOsc.start(now);
    clickOsc.stop(now + 0.06);

    // 2. Radio static tape hiss burst
    const hiss = this.synth.createNoiseBuffer('pink', 0.3);
    if (hiss) {
      const hissSource = ctx.createBufferSource();
      hissSource.buffer = hiss;
      const hissGain = ctx.createGain();
      hissGain.gain.setValueAtTime(0.15, now + 0.04);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.setValueAtTime(2200, now);
      hissFilter.Q.setValueAtTime(3.0, now);

      hissSource.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(this.synth.sfxGain);
      hissSource.start(now + 0.04);
    }
  }
}
