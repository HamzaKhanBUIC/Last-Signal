/**
 * THE LAST SIGNAL — Audio Synthesizer
 * 100% Procedural Web Audio API sound generator.
 * Zero external audio assets, zero network latency.
 */

export class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.isInitialized = false;
    this.isMuted = false;

    // Bus Gain Nodes
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.musicGain = null;
    this.uiGain = null;
    this.limiter = null;

    // Volume states
    this.volumes = {
      master: 0.8,
      sfx: 0.9,
      ambient: 0.7,
      music: 0.6,
      ui: 0.85
    };

    // Cached noise buffers for performance
    this.noiseBuffers = {
      white: null,
      pink: null,
      brown: null
    };

    // Auto-unlock handlers
    this._boundUnlock = this._handleUserGestureUnlock.bind(this);
    this._setupAutoUnlock();
  }

  /**
   * Safe lazy initialization of AudioContext on user interaction.
   * Complies with all browser autoplay policies (Chrome, Safari, Firefox).
   */
  init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    try {
      const AudioContextClass = typeof window !== 'undefined'
        ? (window.AudioContext || window.webkitAudioContext)
        : null;

      if (!AudioContextClass) {
        // May be in Node.js test environment or non-supported browser
        return false;
      }

      this.ctx = new AudioContextClass();

      // Master Limiter / Compressor to avoid digital clipping
      this.limiter = this.ctx.createDynamicsCompressor();
      this.limiter.threshold.setValueAtTime(-2.0, this.ctx.currentTime);
      this.limiter.knee.setValueAtTime(4.0, this.ctx.currentTime);
      this.limiter.ratio.setValueAtTime(12.0, this.ctx.currentTime);
      this.limiter.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.limiter.release.setValueAtTime(0.1, this.ctx.currentTime);

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);

      // Ambient Bus
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.volumes.ambient, this.ctx.currentTime);

      // Music / Drone Bus
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);

      // UI Bus
      this.uiGain = this.ctx.createGain();
      this.uiGain.gain.setValueAtTime(this.volumes.ui, this.ctx.currentTime);

      // Graph Routing:
      // Sub-buses -> Limiter -> MasterGain -> Destination
      this.sfxGain.connect(this.limiter);
      this.ambientGain.connect(this.limiter);
      this.musicGain.connect(this.limiter);
      this.uiGain.connect(this.limiter);

      this.limiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Pre-warm noise buffers
      this._generateNoiseBuffers();

      this.isInitialized = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      return true;
    } catch (err) {
      console.warn('[AudioSynthesizer] Failed to initialize AudioContext:', err);
      return false;
    }
  }

  /**
   * Listen for user gesture to resume or initialize AudioContext.
   */
  _setupAutoUnlock() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const events = ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'];
    events.forEach(evt => {
      window.addEventListener(evt, this._boundUnlock, { passive: true, capture: true });
    });
  }

  _handleUserGestureUnlock() {
    if (!this.isInitialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Once running, remove listeners
    if (this.ctx && this.ctx.state === 'running' && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      const events = ['click', 'keydown', 'touchstart', 'pointerdown', 'mousedown'];
      events.forEach(evt => {
        window.removeEventListener(evt, this._boundUnlock, { capture: true });
      });
    }
  }

  /**
   * Precomputes noise buffers (White, Pink, Brown) in float buffers.
   */
  _generateNoiseBuffers() {
    if (!this.ctx) return;
    const duration = 3.0; // 3 seconds looped or sampled
    const sampleRate = this.ctx.sampleRate || 44100;
    const bufferSize = Math.floor(sampleRate * duration);

    // 1. White Noise
    const whiteBuf = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const whiteData = whiteBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffers.white = whiteBuf;

    // 2. Pink Noise (Kellet's Filter method)
    const pinkBuf = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const pinkData = pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    this.noiseBuffers.pink = pinkBuf;

    // 3. Brown (Brownian / Red) Noise
    const brownBuf = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const brownData = brownBuf.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + (0.02 * white)) / 1.02;
      brownData[i] = lastOut * 3.5; // Gain compensation
    }
    this.noiseBuffers.brown = brownBuf;
  }

  // =========================================================================
  // VOLUME & BUS CONTROL
  // =========================================================================

  setMasterVolume(val) {
    this.volumes.master = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volumes.master;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
  }

  setSFXVolume(val) {
    this.volumes.sfx = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, this.ctx.currentTime, 0.05);
    }
  }

  setAmbientVolume(val) {
    this.volumes.ambient = Math.max(0, Math.min(1, val));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.volumes.ambient, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(val) {
    this.volumes.music = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.volumes.music, this.ctx.currentTime, 0.05);
    }
  }

  setUIVolume(val) {
    this.volumes.ui = Math.max(0, Math.min(1, val));
    if (this.uiGain && this.ctx) {
      this.uiGain.gain.setTargetAtTime(this.volumes.ui, this.ctx.currentTime, 0.05);
    }
  }

  mute() {
    this.isMuted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
  }

  unmute() {
    this.isMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volumes.master, this.ctx.currentTime, 0.03);
    }
  }

  // =========================================================================
  // PROCEDURAL CORE SYNTHESIS HELPERS
  // =========================================================================

  /**
   * Creates an oscillator connected to a dedicated gain node.
   * @param {Object} options
   * @returns {{osc: OscillatorNode, gain: GainNode, start: Function, stop: Function}}
   */
  createOscillator({ type = 'sine', frequency = 440, detune = 0 } = {}) {
    if (!this.init()) return null;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    osc.detune.setValueAtTime(detune, this.ctx.currentTime);

    osc.connect(gain);

    return {
      osc,
      gain,
      start: (t = this.ctx.currentTime) => osc.start(t),
      stop: (t = this.ctx.currentTime) => {
        try {
          osc.stop(t);
        } catch (_) {}
      }
    };
  }

  /**
   * Applies an ADSR envelope to a Web Audio AudioParam.
   * @param {AudioParam} gainParam
   * @param {Object} adsr
   */
  applyEnvelope(gainParam, {
    attack = 0.01,
    decay = 0.1,
    sustain = 0.7,
    release = 0.2,
    peakGain = 1.0,
    sustainGain = null,
    startTime = null,
    duration = null
  } = {}) {
    if (!this.ctx || !gainParam) return;

    const now = startTime !== null ? startTime : this.ctx.currentTime;
    const susLevel = sustainGain !== null ? sustainGain : peakGain * sustain;
    const safeSus = Math.max(0.00001, susLevel);
    const safePeak = Math.max(0.00001, peakGain);

    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(0.00001, now);

    // Attack
    const attackEnd = now + Math.max(0.001, attack);
    gainParam.linearRampToValueAtTime(safePeak, attackEnd);

    // Decay
    const decayEnd = attackEnd + Math.max(0.001, decay);
    gainParam.exponentialRampToValueAtTime(safeSus, decayEnd);

    // If duration specified, schedule release
    if (duration !== null && duration > 0) {
      const relStart = Math.max(decayEnd, now + duration - release);
      const relEnd = relStart + Math.max(0.005, release);
      gainParam.setValueAtTime(safeSus, relStart);
      gainParam.exponentialRampToValueAtTime(0.00001, relEnd);
    }
  }

  /**
   * Creates a BiquadFilterNode with optional resonance and gain.
   * @param {string} type - 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peaking' | 'lowshelf' | 'highshelf'
   * @param {number} frequency
   * @param {number} q
   * @param {number} gain
   * @returns {BiquadFilterNode}
   */
  createFilter(type = 'lowpass', frequency = 1000, q = 1, gain = 0) {
    if (!this.init()) return null;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    filter.Q.setValueAtTime(q, this.ctx.currentTime);
    filter.gain.setValueAtTime(gain, this.ctx.currentTime);
    return filter;
  }

  /**
   * Sweeps a filter frequency dynamically.
   * @param {BiquadFilterNode} filter
   * @param {number} startFreq
   * @param {number} endFreq
   * @param {number} duration
   * @param {number} startTime
   */
  sweepFilter(filter, startFreq, endFreq, duration, startTime = null) {
    if (!this.ctx || !filter) return;
    const now = startTime !== null ? startTime : this.ctx.currentTime;
    const safeStart = Math.max(10, startFreq);
    const safeEnd = Math.max(10, endFreq);
    filter.frequency.cancelScheduledValues(now);
    filter.frequency.setValueAtTime(safeStart, now);
    filter.frequency.exponentialRampToValueAtTime(safeEnd, now + Math.max(0.01, duration));
  }

  /**
   * Frequency Modulation (FM) Synthesizer Voice.
   * Carrier frequency is modulated by a dedicated Modulator oscillator.
   * @param {Object} config
   * @returns {{carrier: OscillatorNode, modOsc: OscillatorNode, modGain: GainNode, outputGain: GainNode, start: Function, stop: Function}}
   */
  createFMOscillator({
    carrierType = 'sine',
    carrierFreq = 440,
    modType = 'sine',
    modFreq = 110,
    modIndex = 50,
    gain = 0.5
  } = {}) {
    if (!this.init()) return null;

    const carrier = this.ctx.createOscillator();
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const outputGain = this.ctx.createGain();

    carrier.type = carrierType;
    carrier.frequency.setValueAtTime(carrierFreq, this.ctx.currentTime);

    modOsc.type = modType;
    modOsc.frequency.setValueAtTime(modFreq, this.ctx.currentTime);
    modGain.gain.setValueAtTime(modIndex, this.ctx.currentTime);

    outputGain.gain.setValueAtTime(gain, this.ctx.currentTime);

    // FM connection: Modulator -> ModGain -> Carrier.frequency
    modOsc.connect(modGain);
    modGain.connect(carrier.frequency);

    // Audio output
    carrier.connect(outputGain);

    return {
      carrier,
      modOsc,
      modGain,
      outputGain,
      start: (t = this.ctx.currentTime) => {
        modOsc.start(t);
        carrier.start(t);
      },
      stop: (t = this.ctx.currentTime) => {
        try {
          modOsc.stop(t);
          carrier.stop(t);
        } catch (_) {}
      }
    };
  }

  /**
   * Low Frequency Oscillator (LFO) for parameter modulation (pitch, filter, tremolo).
   * @param {Object} config
   * @returns {{lfo: OscillatorNode, depthGain: GainNode, start: Function, stop: Function}}
   */
  createLFO({
    type = 'sine',
    frequency = 5,
    depth = 10,
    targetParam = null
  } = {}) {
    if (!this.init()) return null;

    const lfo = this.ctx.createOscillator();
    const depthGain = this.ctx.createGain();

    lfo.type = type;
    lfo.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    depthGain.gain.setValueAtTime(depth, this.ctx.currentTime);

    lfo.connect(depthGain);

    if (targetParam) {
      depthGain.connect(targetParam);
    }

    return {
      lfo,
      depthGain,
      start: (t = this.ctx.currentTime) => lfo.start(t),
      stop: (t = this.ctx.currentTime) => {
        try {
          lfo.stop(t);
        } catch (_) {}
      }
    };
  }

  /**
   * Creates a non-linear WaveShaper distortion node.
   * @param {number} amount - Distortion drive (e.g. 10 to 100)
   * @returns {WaveShaperNode}
   */
  createDistortion(amount = 20) {
    if (!this.init()) return null;

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const k = typeof amount === 'number' ? amount : 50;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = curve;
    waveShaper.oversample = '4x';
    return waveShaper;
  }

  /**
   * Plays a noise burst using precomputed noise buffers.
   * @param {string} type - 'white' | 'pink' | 'brown'
   * @param {Object} options
   * @returns {{source: AudioBufferSourceNode, gain: GainNode}}
   */
  createNoiseNode(type = 'white', { loop = false } = {}) {
    if (!this.init()) return null;

    let buffer = this.noiseBuffers[type] || this.noiseBuffers.white;
    if (!buffer) {
      this._generateNoiseBuffers();
      buffer = this.noiseBuffers[type] || this.noiseBuffers.white;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = this.ctx.createGain();
    source.connect(gain);

    return {
      source,
      gain,
      start: (t = this.ctx.currentTime) => source.start(t),
      stop: (t = this.ctx.currentTime) => {
        try {
          source.stop(t);
        } catch (_) {}
      }
    };
  }

  // =========================================================================
  // 2D SPATIAL AUDIO PANNER
  // =========================================================================

  /**
   * Computes 2D stereo panning and distance-based attenuation relative to player.
   * @param {Object} sourcePos - { x, y }
   * @param {Object} listenerPos - { x, y }
   * @param {Object} options - { maxDistance: 800, refDistance: 80, rolloff: 1.2, panRange: 450 }
   * @returns {{input: GainNode, panner: StereoPannerNode, distanceGain: GainNode, update: Function, connect: Function}}
   */
  createSpatialPanner(sourcePos = null, listenerPos = null, {
    maxDistance = 800,
    refDistance = 70,
    rolloff = 1.1,
    panRange = 450
  } = {}) {
    if (!this.init()) return null;

    const input = this.ctx.createGain();
    const distanceGain = this.ctx.createGain();
    let panner = null;

    // Use StereoPannerNode if supported
    if (typeof this.ctx.createStereoPanner === 'function') {
      panner = this.ctx.createStereoPanner();
      input.connect(panner);
      panner.connect(distanceGain);
    } else {
      // Fallback for older browsers
      input.connect(distanceGain);
    }

    const update = (sPos, lPos) => {
      if (!this.ctx) return;
      if (!sPos || !lPos) {
        // Center position if no spatial coordinates
        if (panner) panner.pan.setTargetAtTime(0, this.ctx.currentTime, 0.02);
        distanceGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
        return;
      }

      const dx = sPos.x - lPos.x;
      const dy = sPos.y - lPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pan calculation [-1.0 (full left) to +1.0 (full right)]
      const panVal = Math.max(-1.0, Math.min(1.0, dx / panRange));
      if (panner) {
        panner.pan.setTargetAtTime(panVal, this.ctx.currentTime, 0.03);
      }

      // Distance attenuation calculation
      let atten = 1.0;
      if (dist > refDistance) {
        if (dist >= maxDistance) {
          atten = 0.0;
        } else {
          // Smooth non-linear curve
          const normDist = (dist - refDistance) / (maxDistance - refDistance);
          atten = Math.pow(1 - normDist, rolloff);
        }
      }

      const safeAtten = Math.max(0, Math.min(1, atten));
      distanceGain.gain.setTargetAtTime(safeAtten, this.ctx.currentTime, 0.03);
    };

    // Initial update
    update(sourcePos, listenerPos);

    return {
      input,
      panner,
      distanceGain,
      update,
      connect: (destination) => {
        distanceGain.connect(destination);
      }
    };
  }

  /**
   * Helper to route a node through SFX bus.
   */
  connectSFX(node) {
    if (this.sfxGain && node) {
      node.connect(this.sfxGain);
    }
  }

  /**
   * Helper to route a node through Ambient bus.
   */
  connectAmbient(node) {
    if (this.ambientGain && node) {
      node.connect(this.ambientGain);
    }
  }

  /**
   * Helper to route a node through Music bus.
   */
  connectMusic(node) {
    if (this.musicGain && node) {
      node.connect(this.musicGain);
    }
  }

  /**
   * Helper to route a node through UI bus.
   */
  connectUI(node) {
    if (this.uiGain && node) {
      node.connect(this.uiGain);
    }
  }
}
