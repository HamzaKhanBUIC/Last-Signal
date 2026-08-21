/**
 * THE LAST SIGNAL — PROCEDURAL STATION PA & QUARANTINE ANNOUNCEMENT SYSTEM
 * 
 * Synthesizes diegetic automated space station public address announcements
 * with two-tone radio chime stingers and formant-modulated speech audio bursts.
 * Zero external audio files needed.
 */

import { EVENTS } from '../utils/Constants.js';

export class StationPASystem {
  /**
   * @param {import('../core/EventBus.js').EventBus} [eventBus]
   * @param {import('./AudioSynthesizer.js').AudioSynthesizer} [synthesizer]
   */
  constructor(eventBus = null, synthesizer = null) {
    this.eventBus = eventBus;
    this.synth = synthesizer;

    this.announcementQueue = [];
    this.isPlaying = false;
    this.cooldownTimer = 0;
    this.minInterval = 8.0; // Minimum seconds between automated announcements

    // Catalogue of Station Announcements
    this.announcements = {
      CONTAINMENT_BREACH: {
        id: 'CONTAINMENT_BREACH',
        title: 'CONTAINMENT ALERT',
        message: 'WARNING: Biological containment compromised in Cryo Lab. Sector sealed.',
        priority: 'alert',
        pitch: 1.0
      },
      POWER_FAILURE: {
        id: 'POWER_FAILURE',
        title: 'GRID INSTABILITY',
        message: 'ALERT: Substation main power grid failure. Auxiliary batteries engaged.',
        priority: 'warning',
        pitch: 0.85
      },
      REACTOR_ONLINE: {
        id: 'REACTOR_ONLINE',
        title: 'POWER RESTORED',
        message: 'NOTICE: Main reactor breakers reset. Auxiliary systems online.',
        priority: 'success',
        pitch: 1.15
      },
      FRAGMENT_ACQUIRED: {
        id: 'FRAGMENT_ACQUIRED',
        title: 'SECURITY ADVISORY',
        message: 'SECURITY: Classified telemetry fragment retrieved. AI tracking escalated.',
        priority: 'info',
        pitch: 0.95
      },
      THREAT_LEVEL_ACTIVE: {
        id: 'THREAT_LEVEL_ACTIVE',
        title: 'CODE RED',
        message: 'CRITICAL: Hostile anomaly NEXUS-9 active in sector. Protocol Omega active.',
        priority: 'alert',
        pitch: 0.8
      },
      SUBSPACE_TRANSMISSION: {
        id: 'SUBSPACE_TRANSMISSION',
        title: 'STATION BROADCAST',
        message: 'NOTICE: Subspace transmission broadcast successful. Emergency evac unlocked.',
        priority: 'success',
        pitch: 1.1
      },
      EVACUATION_COUNTDOWN: {
        id: 'EVACUATION_COUNTDOWN',
        title: 'FACILITY PURGE',
        message: 'ATTENTION: Station self-purge sequence initiated. Evacuate immediately.',
        priority: 'alert',
        pitch: 1.25
      }
    };
  }

  /**
   * Sets the audio synthesizer instance.
   * @param {import('./AudioSynthesizer.js').AudioSynthesizer} synth
   */
  setSynthesizer(synth) {
    this.synth = synth;
  }

  /**
   * Triggers a station announcement by key if available.
   * @param {string} key
   * @param {boolean} [bypassCooldown=false]
   */
  broadcast(key, bypassCooldown = false) {
    const ann = this.announcements[key];
    if (!ann) return false;

    if (!bypassCooldown && this.cooldownTimer > 0) {
      // Defer to queue
      this.announcementQueue.push(ann);
      return false;
    }

    this.playAnnouncement(ann);
    this.cooldownTimer = this.minInterval;
    return true;
  }

  /**
   * Plays the chime and synthesized speech burst for an announcement.
   * @param {Object} ann
   */
  playAnnouncement(ann) {
    this.isPlaying = true;

    // 1. Synthesize Radio Chime & Vocal Modulation in Web Audio API
    if (this.synth && this.synth.isInitialized) {
      this.synthesizePAAudio(ann.pitch || 1.0);
    }

    // 2. Broadcast Toast & Event to Game World
    this.eventBus?.emit(EVENTS.STATION_ANNOUNCEMENT, ann);
    this.eventBus?.emit('TOAST_NOTIFICATION', {
      message: `[PA] ${ann.message}`,
      type: ann.priority || 'info',
      duration: 5.0
    });
  }

  /**
   * Web Audio API synthesis for PA chime and robotic speech cadence.
   * @param {number} [pitch=1.0]
   */
  synthesizePAAudio(pitch = 1.0) {
    const ctx = this.synth.ctx;
    const t = ctx.currentTime;

    // A. Two-Tone Radio Chime (587Hz -> 880Hz)
    const chime1 = this.synth.createOscillator('sine', 587 * pitch);
    const chime2 = this.synth.createOscillator('sine', 880 * pitch);

    const chimeGain1 = this.synth.createGain(0.001);
    chimeGain1.gain.setValueAtTime(0.001, t);
    chimeGain1.gain.linearRampToValueAtTime(0.25, t + 0.03);
    chimeGain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    const chimeGain2 = this.synth.createGain(0.001);
    chimeGain2.gain.setValueAtTime(0.001, t + 0.2);
    chimeGain2.gain.linearRampToValueAtTime(0.3, t + 0.23);
    chimeGain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

    chime1.connect(chimeGain1);
    chime2.connect(chimeGain2);
    chimeGain1.connect(this.synth.ambientGain);
    chimeGain2.connect(this.synth.ambientGain);

    chime1.start(t);
    chime2.start(t + 0.2);
    chime1.stop(t + 0.4);
    chime2.stop(t + 0.7);

    // B. Formant-Filtered Speech Cadence Bursts (Simulated AI voice phonemes)
    const voiceStart = t + 0.75;
    const numPhonemes = 5;

    for (let i = 0; i < numPhonemes; i++) {
      const pt = voiceStart + i * 0.16;
      const osc = this.synth.createOscillator('sawtooth', (110 + (i % 3) * 20) * pitch);
      const f1 = this.synth.createFilter('bandpass', 650 + (i % 2) * 300, 5.0);
      const f2 = this.synth.createFilter('bandpass', 1400 + (i % 3) * 250, 6.0);

      const vGain = this.synth.createGain(0.001);
      vGain.gain.setValueAtTime(0.001, pt);
      vGain.gain.linearRampToValueAtTime(0.18, pt + 0.03);
      vGain.gain.exponentialRampToValueAtTime(0.0001, pt + 0.14);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(vGain);
      f2.connect(vGain);
      vGain.connect(this.synth.ambientGain);

      osc.start(pt);
      osc.stop(pt + 0.15);
    }
  }

  /**
   * Updates queue timers.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0 && this.announcementQueue.length > 0) {
        const nextAnn = this.announcementQueue.shift();
        this.playAnnouncement(nextAnn);
        this.cooldownTimer = this.minInterval;
      }
    }
  }
}
