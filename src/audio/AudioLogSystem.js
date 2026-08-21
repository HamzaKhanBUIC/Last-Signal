/**
 * THE LAST SIGNAL — DIEGETIC AUDIO LOG SYSTEM
 * 
 * Manages collectible audio cassette logs, synthesized radio playback,
 * tape hiss, formant frequency filtering, and subtitle events.
 */

import { STATION_AUDIO_LOGS } from '../utils/Constants.js';

export class AudioLogSystem {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('./SoundEngine.js').SoundEngine} soundEngine
   */
  constructor(eventBus, soundEngine = null) {
    this.eventBus = eventBus;
    this.soundEngine = soundEngine;

    // Discovered logs tracker
    this.discoveredLogs = new Set();
    this.currentPlayingLog = null;
    this.playbackTimer = 0;
    this.playbackDuration = 0;
    this.isPlaying = false;

    // Event subscriptions
    if (this.eventBus) {
      this.eventBus.on('PLAY_AUDIO_LOG', (data) => {
        this.playLog(data.id || data);
      });
      this.eventBus.on('STOP_AUDIO_LOG', () => {
        this.stopLog();
      });
    }
  }

  /**
   * Plays an audio log by ID.
   * @param {string} logId e.g. 'LOG-01'
   * @returns {boolean} True if playback started
   */
  playLog(logId) {
    const logData = STATION_AUDIO_LOGS[logId];
    if (!logData) return false;

    this.discoveredLogs.add(logId);
    this.currentPlayingLog = logData;
    this.playbackDuration = logData.duration || 6.0;
    this.playbackTimer = this.playbackDuration;
    this.isPlaying = true;

    // Trigger procedural tape playback sound
    if (this.soundEngine && typeof this.soundEngine.playAudioLogStinger === 'function') {
      this.soundEngine.playAudioLogStinger();
    }

    // Broadcast event for HUD subtitle overlay
    this.eventBus?.emit('AUDIO_LOG_STARTED', {
      log: logData,
      duration: this.playbackDuration
    });

    return true;
  }

  /**
   * Stops active audio log.
   */
  stopLog() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.currentPlayingLog = null;
    this.playbackTimer = 0;
    this.eventBus?.emit('AUDIO_LOG_FINISHED');
  }

  /**
   * Updates playback timer.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isPlaying) return;

    this.playbackTimer -= dt;
    if (this.playbackTimer <= 0) {
      this.stopLog();
    }
  }

  /**
   * Returns current active log or null.
   * @returns {Object|null}
   */
  getCurrentLog() {
    return this.isPlaying ? this.currentPlayingLog : null;
  }

  /**
   * Checks if an audio log was discovered.
   * @param {string} logId
   * @returns {boolean}
   */
  isDiscovered(logId) {
    return this.discoveredLogs.has(logId);
  }
}
