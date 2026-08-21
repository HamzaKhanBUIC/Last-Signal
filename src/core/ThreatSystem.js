/**
 * THE LAST SIGNAL — FACILITY THREAT & ESCALATION SYSTEM
 * 
 * Manages 6-tier facility containment threat progression (0 to 5),
 * modulating station alert states, PA broadcast triggers,
 * lighting volatility, and AI pursuit aggression.
 */

import { THREAT_LEVELS, THREAT_NAMES, EVENTS } from '../utils/Constants.js';

export class ThreatSystem {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   * @param {import('./GameState.js').GameState} [gameState]
   * @param {import('../audio/StationPASystem.js').StationPASystem} [paSystem]
   */
  constructor(eventBus = null, gameState = null, paSystem = null) {
    this.eventBus = eventBus;
    this.gameState = gameState;
    this.paSystem = paSystem;

    this.threatLevel = THREAT_LEVELS.LEVEL_0_NORMAL;
    this.previousLevel = THREAT_LEVELS.LEVEL_0_NORMAL;
  }

  /**
   * Sets current threat level and emits events/PA if escalated.
   * @param {number} newLevel
   * @returns {boolean} True if level changed
   */
  setThreatLevel(newLevel) {
    newLevel = Math.max(0, Math.min(THREAT_LEVELS.LEVEL_5_CRITICAL_FAILURE, Math.floor(newLevel)));
    if (this.threatLevel === newLevel) return false;

    const oldLevel = this.threatLevel;
    this.previousLevel = oldLevel;
    this.threatLevel = newLevel;

    this.eventBus?.emit(EVENTS.THREAT_LEVEL_CHANGED, {
      from: oldLevel,
      to: newLevel,
      name: THREAT_NAMES[newLevel] || 'UNKNOWN THREAT'
    });

    // Trigger context PA announcement on escalation
    if (newLevel > oldLevel && this.paSystem) {
      if (newLevel === THREAT_LEVELS.LEVEL_1_UNSTABLE) {
        this.paSystem.broadcast('CONTAINMENT_BREACH');
      } else if (newLevel === THREAT_LEVELS.LEVEL_2_SECURITY_BREACH) {
        this.paSystem.broadcast('POWER_FAILURE');
      } else if (newLevel === THREAT_LEVELS.LEVEL_3_ACTIVE_HUNT) {
        this.paSystem.broadcast('THREAT_LEVEL_ACTIVE');
      } else if (newLevel === THREAT_LEVELS.LEVEL_5_CRITICAL_FAILURE) {
        this.paSystem.broadcast('EVACUATION_COUNTDOWN', true);
      }
    }

    return true;
  }

  /**
   * Evaluates progression state and auto-escalates threat levels accordingly.
   * @param {import('./GameState.js').GameState} gameState
   * @param {import('../entities/EnemyAI.js').EnemyAI} [enemy]
   */
  update(gameState, enemy = null) {
    if (!gameState) return;

    let targetLevel = THREAT_LEVELS.LEVEL_0_NORMAL;

    if (gameState.escapeUnlocked || (enemy && enemy.isFrenzyActive)) {
      targetLevel = THREAT_LEVELS.LEVEL_5_CRITICAL_FAILURE;
    } else if (gameState.commsRepaired) {
      targetLevel = THREAT_LEVELS.LEVEL_4_QUARANTINE;
    } else {
      const frags = gameState.inventory?.fragments?.size || 0;
      if (frags >= 3) {
        targetLevel = THREAT_LEVELS.LEVEL_3_ACTIVE_HUNT;
      } else if (frags === 2 || gameState.generatorOnline) {
        targetLevel = THREAT_LEVELS.LEVEL_2_SECURITY_BREACH;
      } else if (frags === 1) {
        targetLevel = THREAT_LEVELS.LEVEL_1_UNSTABLE;
      }
    }

    if (targetLevel > this.threatLevel) {
      this.setThreatLevel(targetLevel);
    }
  }
}
