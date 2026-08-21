/**
 * THE LAST SIGNAL — DYNAMIC HORROR EVENT DIRECTOR
 * 
 * Orchestrates dynamic, paced environmental events and psychological horror beats:
 * - Corridor light brownouts & emergency flickering
 * - Distant structural impacts and metallic groans
 * - Steam vent bursts and electrical cable surges
 * - False acoustic echoes to build tension during quiet moments
 * - Pacing state machine (CALM, UNEASE, SUSPICION, THREAT, CHASE, RECOVERY)
 */

import { EVENTS, THREAT_LEVELS } from '../utils/Constants.js';
import { distance } from '../utils/MathUtils.js';

export const PACING_STATES = Object.freeze({
  CALM: 'CALM',
  UNEASE: 'UNEASE',
  SUSPICION: 'SUSPICION',
  THREAT: 'THREAT',
  CHASE: 'CHASE',
  RECOVERY: 'RECOVERY'
});

export class EventDirector {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   * @param {import('./GameState.js').GameState} [gameState]
   */
  constructor(eventBus = null, gameState = null) {
    this.eventBus = eventBus;
    this.gameState = gameState;

    this.pacingState = PACING_STATES.CALM;
    this.tension = 0; // 0 to 1.0
    this.eventTimer = 0;
    this.nextEventInterval = 14.0 + Math.random() * 8.0;

    // Active temporary event overrides
    this.activeBrownout = false;
    this.brownoutTimer = 0;
  }

  /**
   * Updates pacing tension, detects enemy states, and triggers dynamic events.
   * @param {number} dt Delta time in seconds
   * @param {import('../entities/Player.js').Player} [player]
   * @param {import('../entities/EnemyAI.js').EnemyAI} [enemy]
   * @param {number} [threatLevel=0]
   */
  update(dt, player = null, enemy = null, threatLevel = THREAT_LEVELS.LEVEL_0_NORMAL) {
    // 1. Evaluate Pacing State
    this.updatePacingState(player, enemy, threatLevel);

    // 2. Manage Active Environmental Overrides
    if (this.activeBrownout) {
      this.brownoutTimer -= dt;
      if (this.brownoutTimer <= 0) {
        this.activeBrownout = false;
      }
    }

    // 3. Dynamic Event Trigger Timer
    this.eventTimer += dt;
    if (this.eventTimer >= this.nextEventInterval) {
      this.eventTimer = 0;
      this.nextEventInterval = Math.max(8.0, 20.0 - threatLevel * 2.5 + Math.random() * 6.0);
      this.triggerDynamicEvent(player, enemy, threatLevel);
    }
  }

  /**
   * Evaluates current psychological tension and pacing state.
   */
  updatePacingState(player, enemy, threatLevel) {
    if (enemy && (enemy.state === 'CHASE' || enemy.state === 'FRENZY')) {
      this.pacingState = PACING_STATES.CHASE;
      this.tension = 1.0;
      return;
    }

    if (player && enemy) {
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist < 260) {
        this.pacingState = PACING_STATES.THREAT;
        this.tension = 0.85;
      } else if (dist < 450) {
        this.pacingState = PACING_STATES.SUSPICION;
        this.tension = 0.55;
      } else if (threatLevel >= THREAT_LEVELS.LEVEL_2_SECURITY_BREACH) {
        this.pacingState = PACING_STATES.UNEASE;
        this.tension = 0.35;
      } else {
        this.pacingState = PACING_STATES.CALM;
        this.tension = 0.1;
      }
    }
  }

  /**
   * Triggers a context-aware environmental horror event.
   */
  triggerDynamicEvent(player, enemy, threatLevel) {
    // Choose event based on threat level and pacing
    const roll = Math.random();

    if (roll < 0.35) {
      // Event A: Corridor Lighting Brownout
      this.triggerBrownout();
    } else if (roll < 0.65) {
      // Event B: Distant Structural Impact / Metallic Groan
      this.triggerDistantImpact(player);
    } else if (roll < 0.85) {
      // Event C: False Sensor Acoustic Echo
      this.triggerFalseEcho(player);
    } else {
      // Event D: Steam Vent Burst
      this.triggerSteamBurst(player);
    }
  }

  /**
   * Temporarily dims/flickers station lights.
   */
  triggerBrownout(duration = 4.0) {
    this.activeBrownout = true;
    this.brownoutTimer = duration;
    this.eventBus?.emit(EVENTS.EVENT_TRIGGERED, { type: 'brownout', duration });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'electric_zap' });
    this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 4, duration: 0.2 });
  }

  /**
   * Triggers a low-frequency distant hull groan.
   */
  triggerDistantImpact(player) {
    this.eventBus?.emit(EVENTS.EVENT_TRIGGERED, { type: 'distant_impact' });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'emp_surge' });
    this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 6, duration: 0.4 });
  }

  /**
   * Spawns a false distant footstep / echo to build suspense.
   */
  triggerFalseEcho(player) {
    if (!player) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 240 + Math.random() * 120;
    const ex = player.x + Math.cos(angle) * dist;
    const ey = player.y + Math.sin(angle) * dist;

    this.eventBus?.emit(EVENTS.EVENT_TRIGGERED, { type: 'false_echo', x: ex, y: ey });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'ai_whisper', distance: 300 });
  }

  /**
   * Spawns sudden cryogenic steam release.
   */
  triggerSteamBurst(player) {
    if (!player) return;
    this.eventBus?.emit(EVENTS.EVENT_TRIGGERED, { type: 'steam_burst' });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'cryo_steam', pos: { x: player.x, y: player.y } });
  }
}
