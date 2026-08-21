/**
 * THE LAST SIGNAL — V2.0 EXTENDED SYSTEMS TEST SUITE
 * Comprehensive tests for:
 * 1. SaveSystem & Checkpoint validation
 * 2. Gamepad API input normalization
 * 3. StationPASystem & Announcement queue
 * 4. ThreatSystem 6-Tier facility escalation
 * 5. EventDirector dynamic pacing & environmental events
 * 6. CCTVUI multi-channel surveillance & interference
 */

import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/core/GameState.js';
import { SaveSystem } from '../src/core/SaveSystem.js';
import { InputManager } from '../src/core/InputManager.js';
import { StationPASystem } from '../src/audio/StationPASystem.js';
import { ThreatSystem } from '../src/core/ThreatSystem.js';
import { EventDirector, PACING_STATES } from '../src/core/EventDirector.js';
import { CCTVUI } from '../src/ui/CCTVUI.js';
import {
  THREAT_LEVELS,
  EVENTS,
  GAME_STATES,
  INPUT_ACTIONS
} from '../src/utils/Constants.js';

export function runV2SystemsTests(describe, test, expect) {
  describe('V2.0 Extended Systems — Save, Gamepad, PA, Threat, Director & CCTV', () => {
    // =========================================================================
    // 1. SAVE SYSTEM & CHECKPOINT VERIFICATION
    // =========================================================================
    test('SaveSystem: Serializes and loads valid checkpoint with checksum verification', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      const saveSys = new SaveSystem(eventBus);

      gameState.playerHealth = 72;
      gameState.flashlightBattery = 65;
      gameState.inventory.fragments.add('alpha');
      gameState.inventory.medkits = 2;
      gameState.currentObjective = 'Locate Signal Fragment Beta';

      const mockPlayer = { x: 340, y: 520, angle: 1.57, health: 72 };

      // Save checkpoint
      const saved = saveSys.saveCheckpoint(gameState, mockPlayer, THREAT_LEVELS.LEVEL_1_UNSTABLE);
      expect(saved).toBe(true);
      expect(saveSys.hasSavedCheckpoint()).toBe(true);

      // Reset gameState & player to empty
      const freshState = new GameState(eventBus);
      const freshPlayer = { x: 0, y: 0, angle: 0, health: 100 };

      // Load checkpoint
      const result = saveSys.loadCheckpoint(freshState, freshPlayer);
      expect(result.success).toBe(true);
      expect(result.threatLevel).toBe(THREAT_LEVELS.LEVEL_1_UNSTABLE);
      expect(freshState.playerHealth).toBe(72);
      expect(freshState.flashlightBattery).toBe(65);
      expect(freshState.inventory.fragments.has('alpha')).toBe(true);
      expect(freshState.inventory.medkits).toBe(2);
      expect(freshState.currentObjective).toBe('Locate Signal Fragment Beta');
      expect(freshPlayer.x).toBe(340);
      expect(freshPlayer.y).toBe(520);
    });

    test('SaveSystem: Rejects corrupted checkpoint envelope with invalid checksum', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      const saveSys = new SaveSystem(eventBus);

      saveSys.inMemoryStorage = JSON.stringify({
        checksum: 'invalid_tampered_hash_123',
        data: { gameState: { playerHealth: 999 } }
      });

      const result = saveSys.loadCheckpoint(gameState);
      expect(result.success).toBe(false);
    });

    // =========================================================================
    // 2. GAMEPAD API INTEGRATION
    // =========================================================================
    test('InputManager: Maps gamepad buttons and normalizes analog stick axes', () => {
      const input = new InputManager();

      // Mock gamepad axes (Left Stick tilted right and down)
      input.gamepadAxes.leftX = 0.8;
      input.gamepadAxes.leftY = 0.6;
      const move = input.getMovementVector();

      expect(move.x > 0.5).toBe(true);
      expect(move.y > 0.4).toBe(true);
      expect(Math.hypot(move.x, move.y) <= 1.0001).toBe(true);

      // Mock gamepad button 0 (A / Cross -> INTERACT)
      input.gamepadButtonsDown.add(INPUT_ACTIONS.INTERACT);
      expect(input.isActionActive(INPUT_ACTIONS.INTERACT)).toBe(true);
    });

    // =========================================================================
    // 3. STATION PA SYSTEM
    // =========================================================================
    test('StationPASystem: Queues announcements and enforces minimum interval cooldown', () => {
      const eventBus = new EventBus();
      const pa = new StationPASystem(eventBus, null);
      let broadcastCount = 0;
      eventBus.on(EVENTS.STATION_ANNOUNCEMENT, () => broadcastCount++);

      // 1st announcement fires immediately
      const first = pa.broadcast('CONTAINMENT_BREACH');
      expect(first).toBe(true);
      expect(broadcastCount).toBe(1);
      expect(pa.cooldownTimer > 0).toBe(true);

      // 2nd announcement queued during cooldown
      const second = pa.broadcast('POWER_FAILURE');
      expect(second).toBe(false);
      expect(pa.announcementQueue.length).toBe(1);

      // Advance time past cooldown
      pa.update(8.5);
      expect(broadcastCount).toBe(2);
      expect(pa.announcementQueue.length).toBe(0);
    });

    // =========================================================================
    // 4. THREAT ESCALATION SYSTEM
    // =========================================================================
    test('ThreatSystem: Escalates through 6 facility threat levels based on progression', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      const pa = new StationPASystem(eventBus, null);
      const threat = new ThreatSystem(eventBus, gameState, pa);

      expect(threat.threatLevel).toBe(THREAT_LEVELS.LEVEL_0_NORMAL);

      // Collect 1 fragment -> Level 1 (UNSTABLE)
      gameState.inventory.fragments.add('alpha');
      threat.update(gameState);
      expect(threat.threatLevel).toBe(THREAT_LEVELS.LEVEL_1_UNSTABLE);

      // Collect 2nd fragment -> Level 2 (SECURITY BREACH)
      gameState.inventory.fragments.add('beta');
      threat.update(gameState);
      expect(threat.threatLevel).toBe(THREAT_LEVELS.LEVEL_2_SECURITY_BREACH);

      // Repair comms -> Level 4 (QUARANTINE)
      gameState.commsRepaired = true;
      threat.update(gameState);
      expect(threat.threatLevel).toBe(THREAT_LEVELS.LEVEL_4_QUARANTINE);

      // Unlock escape -> Level 5 (CRITICAL FAILURE)
      gameState.escapeUnlocked = true;
      threat.update(gameState);
      expect(threat.threatLevel).toBe(THREAT_LEVELS.LEVEL_5_CRITICAL_FAILURE);
    });

    // =========================================================================
    // 5. EVENT DIRECTOR & PACING
    // =========================================================================
    test('EventDirector: Evaluates pacing tension state and triggers dynamic events', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      const director = new EventDirector(eventBus, gameState);
      const mockPlayer = { x: 500, y: 500 };
      const mockEnemy = { x: 550, y: 500, state: 'CHASE' };

      // When enemy in CHASE mode -> Pacing CHASE & max tension
      director.update(0.1, mockPlayer, mockEnemy, THREAT_LEVELS.LEVEL_3_ACTIVE_HUNT);
      expect(director.pacingState).toBe(PACING_STATES.CHASE);
      expect(director.tension).toBe(1.0);

      // Trigger brownout event
      let eventReceived = false;
      eventBus.on(EVENTS.EVENT_TRIGGERED, (e) => {
        if (e.type === 'brownout') eventReceived = true;
      });

      director.triggerBrownout(3.0);
      expect(director.activeBrownout).toBe(true);
      expect(eventReceived).toBe(true);

      // Advance time to expire brownout
      director.update(3.5, mockPlayer, { x: 2000, y: 2000, state: 'PATROL' });
      expect(director.activeBrownout).toBe(false);
    });

    // =========================================================================
    // 6. CCTV SURVEILLANCE UI
    // =========================================================================
    test('CCTVUI: Cycles through 8 security camera channels and calculates proximity interference', () => {
      const eventBus = new EventBus();
      const gameState = new GameState(eventBus);
      const cctv = new CCTVUI(eventBus, gameState);
      expect(cctv.cameras.length).toBe(8);

      cctv.open(0);
      expect(cctv.isOpen).toBe(true);
      expect(cctv.currentCameraIndex).toBe(0);

      cctv.nextCamera();
      expect(cctv.currentCameraIndex).toBe(1);

      cctv.prevCamera();
      expect(cctv.currentCameraIndex).toBe(0);

      // Test interference calculation when enemy is near active camera
      const activeCam = cctv.cameras[0];
      const mockEnemyNear = { x: activeCam.x + 50, y: activeCam.y + 50, active: true };
      cctv.update(0.1, mockEnemyNear);
      expect(cctv.interferenceLevel > 0.5).toBe(true);

      // Test close
      cctv.close();
      expect(cctv.isOpen).toBe(false);
      expect(gameState.state).toBe(GAME_STATES.PLAYING);
    });
  });
}
