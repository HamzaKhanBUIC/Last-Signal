/**
 * THE LAST SIGNAL — CHECKPOINT & STATE PERSISTENCE SYSTEM
 * 
 * Manages schema-validated save/load lifecycle with checksum verification,
 * local storage caching, in-memory fallbacks for headless testing,
 * and robust corruption protection.
 */

import { EVENTS, HEALTH_MAX, STAMINA_MAX, BATTERY_MAX, THREAT_LEVELS } from '../utils/Constants.js';

export const SAVE_SCHEMA_VERSION = '2.0.0';
export const STORAGE_KEY = 'the_last_signal_v2_checkpoint';

export class SaveSystem {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.inMemoryStorage = null; // Headless/test fallback
  }

  /**
   * Generates a fast 32-bit hash checksum for data integrity verification.
   * @param {string} str
   * @returns {string}
   */
  generateChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Serializes active game state and player data into a validated checkpoint.
   * @param {import('./GameState.js').GameState} gameState
   * @param {import('../entities/Player.js').Player} [player]
   * @param {number} [threatLevel=0]
   * @returns {boolean} True if successfully saved
   */
  saveCheckpoint(gameState, player = null, threatLevel = THREAT_LEVELS.LEVEL_0_NORMAL) {
    if (!gameState) return false;

    try {
      const payload = {
        schemaVersion: SAVE_SCHEMA_VERSION,
        timestamp: Date.now(),
        threatLevel: threatLevel || 0,
        gameState: {
          playerHealth: gameState.playerHealth,
          flashlightBattery: gameState.flashlightBattery,
          stamina: gameState.stamina,
          isFlashlightOn: gameState.isFlashlightOn,
          currentObjective: gameState.currentObjective,
          completedObjectives: [...gameState.completedObjectives],
          commsRepaired: gameState.commsRepaired,
          generatorOnline: gameState.generatorOnline,
          escapeUnlocked: gameState.escapeUnlocked,
          gameTimer: gameState.gameTimer,
          stats: { ...gameState.stats },
          inventory: {
            keycards: Array.from(gameState.inventory.keycards || []),
            fragments: Array.from(gameState.inventory.fragments || []),
            decryptedFragments: Array.from(gameState.inventory.decryptedFragments || []),
            medkits: gameState.inventory.medkits || 0,
            batteries: gameState.inventory.batteries || 0,
            decoys: gameState.inventory.decoys || 0,
            empCharges: gameState.inventory.empCharges || 0,
            audioLogs: Array.from(gameState.inventory.audioLogs || [])
          }
        },
        player: player ? {
          x: player.x,
          y: player.y,
          angle: player.angle,
          health: player.health
        } : null
      };

      const jsonStr = JSON.stringify(payload);
      const envelope = {
        checksum: this.generateChecksum(jsonStr),
        data: payload
      };

      const envelopeStr = JSON.stringify(envelope);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, envelopeStr);
      } else {
        this.inMemoryStorage = envelopeStr;
      }

      this.eventBus?.emit(EVENTS.CHECKPOINT_SAVED, { timestamp: payload.timestamp, threatLevel });
      return true;
    } catch (err) {
      console.error('[SaveSystem] Checkpoint serialization failed:', err);
      return false;
    }
  }

  /**
   * Validates and loads a saved checkpoint into GameState and Player.
   * @param {import('./GameState.js').GameState} gameState
   * @param {import('../entities/Player.js').Player} [player]
   * @returns {{ success: boolean, threatLevel: number }}
   */
  loadCheckpoint(gameState, player = null) {
    if (!gameState) return { success: false, threatLevel: 0 };

    try {
      let rawStr = null;
      if (typeof localStorage !== 'undefined') {
        rawStr = localStorage.getItem(STORAGE_KEY);
      } else {
        rawStr = this.inMemoryStorage;
      }

      if (!rawStr) return { success: false, threatLevel: 0 };

      const envelope = JSON.parse(rawStr);
      if (!envelope || !envelope.checksum || !envelope.data) {
        console.warn('[SaveSystem] Checkpoint envelope corrupted.');
        return { success: false, threatLevel: 0 };
      }

      // Checksum validation
      const computedChecksum = this.generateChecksum(JSON.stringify(envelope.data));
      if (computedChecksum !== envelope.checksum) {
        console.warn('[SaveSystem] Checkpoint checksum mismatch, rejecting save data.');
        return { success: false, threatLevel: 0 };
      }

      const d = envelope.data;
      const gs = d.gameState;

      // Restore GameState
      gameState.playerHealth = gs.playerHealth !== undefined ? gs.playerHealth : HEALTH_MAX;
      gameState.flashlightBattery = gs.flashlightBattery !== undefined ? gs.flashlightBattery : BATTERY_MAX;
      gameState.stamina = gs.stamina !== undefined ? gs.stamina : STAMINA_MAX;
      gameState.isFlashlightOn = !!gs.isFlashlightOn;
      gameState.currentObjective = gs.currentObjective || '';
      gameState.completedObjectives = Array.isArray(gs.completedObjectives) ? [...gs.completedObjectives] : [];
      gameState.commsRepaired = !!gs.commsRepaired;
      gameState.generatorOnline = !!gs.generatorOnline;
      gameState.escapeUnlocked = !!gs.escapeUnlocked;
      gameState.gameTimer = gs.gameTimer || 0;
      if (gs.stats) gameState.stats = { ...gs.stats };

      // Restore Inventory Sets
      gameState.inventory = {
        keycards: new Set(gs.inventory?.keycards || []),
        fragments: new Set(gs.inventory?.fragments || []),
        decryptedFragments: new Set(gs.inventory?.decryptedFragments || []),
        medkits: gs.inventory?.medkits || 0,
        batteries: gs.inventory?.batteries || 0,
        decoys: gs.inventory?.decoys || 0,
        empCharges: gs.inventory?.empCharges || 0,
        audioLogs: new Set(gs.inventory?.audioLogs || [])
      };

      // Restore Player Transform & Vitals
      if (player && d.player) {
        player.x = d.player.x;
        player.y = d.player.y;
        player.angle = d.player.angle || 0;
        player.health = d.player.health || gameState.playerHealth;
      }

      this.eventBus?.emit(EVENTS.CHECKPOINT_LOADED, {
        timestamp: d.timestamp,
        threatLevel: d.threatLevel
      });

      return { success: true, threatLevel: d.threatLevel || 0 };
    } catch (err) {
      console.error('[SaveSystem] Checkpoint restoration failed:', err);
      return { success: false, threatLevel: 0 };
    }
  }

  /**
   * Checks whether a valid saved checkpoint exists.
   * @returns {boolean}
   */
  hasSavedCheckpoint() {
    let rawStr = null;
    if (typeof localStorage !== 'undefined') {
      rawStr = localStorage.getItem(STORAGE_KEY);
    } else {
      rawStr = this.inMemoryStorage;
    }
    return !!rawStr;
  }

  /**
   * Clears saved checkpoint data.
   */
  clearCheckpoint() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.inMemoryStorage = null;
  }
}
