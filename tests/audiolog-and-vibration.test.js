/**
 * THE LAST SIGNAL — AUDIOLOG & HAPTIC VIBRATION TEST SUITE
 * Tests:
 * 1. AudioLogSystem discovery, playback, duration, and stop lifecycle
 * 2. InputManager vibrateGamepad invocation and parameter clamping
 */

import { AudioLogSystem } from '../src/audio/AudioLogSystem.js';
import { EventBus } from '../src/core/EventBus.js';
import { InputManager } from '../src/core/InputManager.js';
import { STATION_AUDIO_LOGS } from '../src/utils/Constants.js';

export function runAudioLogAndVibrationTests(describe, test, expect) {
  describe('AudioLogSystem & Haptic Feedback Mechanics', () => {
    test('AudioLogSystem: Plays valid audio log, tracks discovery, and emits start event', () => {
      const eventBus = new EventBus();
      let startedEvent = null;
      eventBus.on('AUDIO_LOG_STARTED', (data) => {
        startedEvent = data;
      });

      const audioLogs = new AudioLogSystem(eventBus, null);

      expect(audioLogs.isDiscovered('LOG-01')).toBe(false);
      const success = audioLogs.playLog('LOG-01');

      expect(success).toBe(true);
      expect(audioLogs.isPlaying).toBe(true);
      expect(audioLogs.isDiscovered('LOG-01')).toBe(true);
      expect(audioLogs.getCurrentLog().id).toBe('LOG-01');
      expect(startedEvent).toBeTruthy();
      expect(startedEvent.log.title).toBe(STATION_AUDIO_LOGS['LOG-01'].title);
    });

    test('AudioLogSystem: Automatically stops playback when timer expires', () => {
      const eventBus = new EventBus();
      let finishedCalled = false;
      eventBus.on('AUDIO_LOG_FINISHED', () => {
        finishedCalled = true;
      });

      const audioLogs = new AudioLogSystem(eventBus, null);
      audioLogs.playLog('LOG-01');

      // Update time past duration
      audioLogs.update(10.0);

      expect(audioLogs.isPlaying).toBe(false);
      expect(audioLogs.getCurrentLog()).toBe(null);
      expect(finishedCalled).toBe(true);
    });

    test('AudioLogSystem: Rejects invalid log IDs gracefully', () => {
      const eventBus = new EventBus();
      const audioLogs = new AudioLogSystem(eventBus, null);
      const success = audioLogs.playLog('NON_EXISTENT_LOG_999');

      expect(success).toBe(false);
      expect(audioLogs.isPlaying).toBe(false);
    });

    test('InputManager: vibrateGamepad safely executes without thrown exceptions', () => {
      const input = new InputManager();

      // Should not throw even in Node/headless environment without navigator.getGamepads
      let threw = false;
      try {
        input.vibrateGamepad(0.8, 0.4, 300);
        input.vibrateGamepad(-1, 5, -50); // Boundary clamping
      } catch (_) {
        threw = true;
      }
      expect(threw).toBe(false);
    });
  });
}
