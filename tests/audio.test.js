/**
 * THE LAST SIGNAL — Audio Synthesizer & Sound Engine Tests
 * Unit and integration tests for 100% procedural Web Audio API system.
 */

import { AudioSynthesizer } from '../src/audio/AudioSynthesizer.js';
import { SoundEngine } from '../src/audio/SoundEngine.js';

// =========================================================================
// MOCK WEB AUDIO API ENVIRONMENT FOR HEADLESS / NODE TESTS
// =========================================================================

class MockAudioParam {
  constructor(defaultValue = 1.0) {
    this.value = defaultValue;
    this.events = [];
  }

  setValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'setValueAtTime', val, time });
  }

  linearRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'linearRampToValueAtTime', val, time });
  }

  exponentialRampToValueAtTime(val, time) {
    this.value = val;
    this.events.push({ type: 'exponentialRampToValueAtTime', val, time });
  }

  setTargetAtTime(target, time, timeConstant) {
    this.value = target;
    this.events.push({ type: 'setTargetAtTime', target, time, timeConstant });
  }

  cancelScheduledValues(time) {
    this.events.push({ type: 'cancelScheduledValues', time });
  }
}

class MockAudioNode {
  constructor() {
    this.connectedTo = [];
  }

  connect(destination) {
    this.connectedTo.push(destination);
    return destination;
  }

  disconnect() {
    this.connectedTo = [];
  }
}

class MockGainNode extends MockAudioNode {
  constructor(defaultGain = 1.0) {
    super();
    this.gain = new MockAudioParam(defaultGain);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'sine';
    this.frequency = new MockAudioParam(440);
    this.detune = new MockAudioParam(0);
    this.started = false;
    this.stopped = false;
  }

  start(t = 0) {
    this.started = true;
  }

  stop(t = 0) {
    this.stopped = true;
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(1000);
    this.Q = new MockAudioParam(1);
    this.gain = new MockAudioParam(0);
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.loop = false;
    this.started = false;
    this.stopped = false;
  }

  start(t = 0) {
    this.started = true;
  }

  stop(t = 0) {
    this.stopped = true;
  }
}

class MockDynamicsCompressorNode extends MockAudioNode {
  constructor() {
    super();
    this.threshold = new MockAudioParam(-24);
    this.knee = new MockAudioParam(30);
    this.ratio = new MockAudioParam(12);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.25);
  }
}

class MockStereoPannerNode extends MockAudioNode {
  constructor() {
    super();
    this.pan = new MockAudioParam(0);
  }
}

class MockWaveShaperNode extends MockAudioNode {
  constructor() {
    super();
    this.curve = null;
    this.oversample = 'none';
  }
}

class MockAudioBuffer {
  constructor(numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.data = new Float32Array(length);
  }

  getChannelData(channel) {
    return this.data;
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0.0;
    this.sampleRate = 44100;
    this.destination = new MockAudioNode();
  }

  createGain() {
    return new MockGainNode();
  }

  createOscillator() {
    return new MockOscillatorNode();
  }

  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }

  createBufferSource() {
    return new MockAudioBufferSourceNode();
  }

  createDynamicsCompressor() {
    return new MockDynamicsCompressorNode();
  }

  createStereoPanner() {
    return new MockStereoPannerNode();
  }

  createWaveShaper() {
    return new MockWaveShaperNode();
  }

  createBuffer(channels, length, sampleRate) {
    return new MockAudioBuffer(channels, length, sampleRate);
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }
}

// Attach mock globals
globalThis.AudioContext = MockAudioContext;
globalThis.window = globalThis;

// =========================================================================
// RUNNER FUNCTION FOR INTEGRATION
// =========================================================================

export function runAudioTests(assert = null) {
  const localAssert = assert || {
    strictEqual: (a, b, msg) => {
      if (a !== b) throw new Error(`${msg || 'Assertion failed'}: ${a} !== ${b}`);
    },
    ok: (val, msg) => {
      if (!val) throw new Error(`${msg || 'Expected truthy value'}`);
    }
  };

  console.log('\n--- Running AudioSynthesizer & SoundEngine Tests ---');

  // Test 1: AudioSynthesizer initialization & bus graph
  const synth = new AudioSynthesizer();
  const initSuccess = synth.init();
  localAssert.strictEqual(initSuccess, true, 'AudioSynthesizer init should succeed');
  localAssert.strictEqual(synth.isInitialized, true, 'AudioSynthesizer should be marked initialized');
  localAssert.ok(synth.ctx, 'AudioContext instance exists');
  localAssert.ok(synth.masterGain, 'Master gain exists');
  localAssert.ok(synth.sfxGain, 'SFX gain exists');
  localAssert.ok(synth.ambientGain, 'Ambient gain exists');
  localAssert.ok(synth.musicGain, 'Music gain exists');
  localAssert.ok(synth.uiGain, 'UI gain exists');
  localAssert.ok(synth.limiter, 'Limiter dynamics compressor exists');

  // Test 2: Volume controls & mute
  synth.setMasterVolume(0.65);
  localAssert.strictEqual(synth.volumes.master, 0.65, 'Master volume set correctly');

  synth.setSFXVolume(1.5);
  localAssert.strictEqual(synth.volumes.sfx, 1.0, 'SFX volume clamped to 1.0');

  synth.setAmbientVolume(-0.5);
  localAssert.strictEqual(synth.volumes.ambient, 0.0, 'Ambient volume clamped to 0.0');

  synth.mute();
  localAssert.strictEqual(synth.isMuted, true, 'Synthesizer muted');
  synth.unmute();
  localAssert.strictEqual(synth.isMuted, false, 'Synthesizer unmuted');

  // Test 3: Procedural Noise Buffers
  localAssert.ok(synth.noiseBuffers.white, 'White noise buffer created');
  localAssert.ok(synth.noiseBuffers.pink, 'Pink noise buffer created');
  localAssert.ok(synth.noiseBuffers.brown, 'Brown noise buffer created');
  const whiteData = synth.noiseBuffers.white.getChannelData(0);
  localAssert.ok(whiteData.length > 1000, 'Noise buffer has valid sample count');

  // Test 4: Oscillators, Filters, FM Synth & LFO
  const osc = synth.createOscillator({ type: 'triangle', frequency: 330 });
  localAssert.strictEqual(osc.osc.type, 'triangle', 'Oscillator type set');

  const filter = synth.createFilter('bandpass', 1200, 3.0);
  localAssert.strictEqual(filter.type, 'bandpass', 'Filter type set');
  synth.sweepFilter(filter, 500, 2000, 0.5);

  const fm = synth.createFMOscillator({
    carrierType: 'sawtooth',
    carrierFreq: 220,
    modType: 'sine',
    modFreq: 55,
    modIndex: 80
  });
  localAssert.strictEqual(fm.carrier.type, 'sawtooth', 'FM carrier type set');
  localAssert.strictEqual(fm.modOsc.type, 'sine', 'FM modulator type set');

  const lfo = synth.createLFO({ frequency: 4, depth: 30 });
  localAssert.strictEqual(lfo.lfo.frequency.value, 4, 'LFO frequency set');

  // Test 5: ADSR Envelopes
  const testParam = new MockAudioParam(0);
  synth.applyEnvelope(testParam, { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2, duration: 0.5 });
  localAssert.ok(testParam.events.length >= 4, 'ADSR envelope scheduled');

  // Test 6: 2D Spatial Audio Panner
  const listener = { x: 100, y: 100 };
  const sourceRight = { x: 300, y: 100 };
  const spatial = synth.createSpatialPanner(sourceRight, listener, { maxDistance: 600, panRange: 400 });
  localAssert.ok(spatial.panner.pan.value > 0, 'Spatial panner pans right for source on right');
  localAssert.ok(spatial.distanceGain.gain.value > 0, 'Distance gain is positive within max range');

  const sourceFar = { x: 1000, y: 1000 };
  const spatialFar = synth.createSpatialPanner(sourceFar, listener, { maxDistance: 400 });
  localAssert.strictEqual(spatialFar.distanceGain.gain.value, 0.0, 'Sound fully attenuated beyond max distance');

  // Test 7: SoundEngine Sound FX Triggers
  const sound = new SoundEngine(synth);
  sound.init();

  sound.playFootstep('metal', false, false);
  sound.playFootstep('grate', true, false); // crouch
  sound.playFootstep('tile', false, true);  // sprint
  sound.playFootstep('vent', false, false);

  sound.playFlashlightToggle(true, { x: 120, y: 120 });
  sound.playFlashlightToggle(false, { x: 120, y: 120 });

  sound.playDoorSlide(true, { x: 200, y: 200 });
  sound.playDoorSlide(false, { x: 200, y: 200 });
  sound.playDoorLocked({ x: 200, y: 200 });

  sound.playPickup('fragment', { x: 50, y: 50 });
  sound.playPickup('battery');
  sound.playPickup('medkit');
  sound.playPickup('keycard');
  sound.playPickup('generic');

  sound.playTerminalKeystroke();
  sound.playTerminalBeep('normal');
  sound.playTerminalBeep('error');
  sound.playTerminalBeep('success');
  sound.playTerminalBeep('data');
  sound.playTerminalBoot();

  sound.playHeartbeat(80, 0.5);
  sound.playHeartbeat(150, 0.95);

  sound.playGeigerPing(60);
  sound.playGeigerPing(300);

  sound.playEntityScreech(100, { x: 250, y: 250 });
  sound.playEntityProximityDrone(200, { x: 250, y: 250 });

  sound.playPlayerHit(50);

  sound.playAlarm(true);
  localAssert.strictEqual(sound.alarmState.isPlaying, true, 'Alarm klaxon active');
  sound.playAlarm(false);

  sound.playVictory();
  sound.playGameOver();

  // Test 8: Ambient Background Drone Lifecycle
  sound.startAmbientDrone();
  localAssert.strictEqual(sound.ambientDrone.isPlaying, true, 'Ambient drone playing');
  sound.setEntityDistance(150);
  localAssert.strictEqual(sound.entityDistance, 150, 'Entity distance registered');
  sound.stopAmbientDrone();

  // Test 9: Real-time update loop
  const player = { x: 100, y: 100, health: 40, maxHealth: 100 };
  const entity = { x: 220, y: 100, state: 'CHASE' };
  const fragments = [
    { x: 150, y: 100, collected: false },
    { x: 900, y: 900, collected: true }
  ];

  sound.update(0.016, player, entity, fragments);
  localAssert.strictEqual(sound.listenerPos.x, 100, 'Listener position updated');
  localAssert.strictEqual(sound.entityDistance, 120, 'Entity distance calculated');
  localAssert.strictEqual(sound.geiger.distance, 50, 'Closest fragment distance calculated');

  console.log('✓ All AudioSynthesizer & SoundEngine tests passed! (100% Procedural Web Audio OK)');
}

// Standalone execution if run directly
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runAudioTests();
}
