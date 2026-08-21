/**
 * THE LAST SIGNAL — NEXUS-9 ROGUE AI ENTITY CONTROLLER
 * 
 * Hostile Rogue AI Entity: NEXUS-9
 * - State Machine: PATROL, INVESTIGATE, CHASE, SEARCH, FRENZY, STALK, IDLE.
 * - Sensory Perception: 110-degree line-of-sight vision cone with 2D wall occlusion raycasting,
 *   acoustic stimulus hearing radius, and heightened direct flashlight beam sensitivity.
 * - Environmental Aura: Proximity-based distortion, heartbeat urgency, and CRT glitch broadcast.
 * - Combat & Attacks: Melee swipe attack with cooldown, screen shake trauma, and player knockback.
 * - Navigation: High-performance A* pathfinding with waypoint cycling and dynamic repathing.
 */

import { Entity } from './Entity.js';
import {
  ENEMY_RADIUS,
  ENEMY_PATROL_SPEED,
  ENEMY_INVESTIGATE_SPEED,
  ENEMY_CHASE_SPEED,
  ENEMY_FRENZY_SPEED,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_RANGE,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_SIGHT_CONE_ANGLE,
  ENEMY_SIGHT_DISTANCE,
  ENEMY_SEARCH_DURATION,
  ENEMY_AURA_FAR_DIST,
  ENEMY_AURA_NEAR_DIST,
  AI_STATES,
  EVENTS,
  COLORS
} from '../utils/Constants.js';
import {
  angleTo,
  angleDifference,
  distance,
  distanceSq,
  normalizeAngle,
  clamp,
  lineIntersection
} from '../utils/MathUtils.js';

export class EnemyAI extends Entity {
  /**
   * @param {Object} [config={}]
   * @param {number} [config.x=0] Spawn X
   * @param {number} [config.y=0] Spawn Y
   * @param {import('../core/EventBus.js').EventBus} [config.eventBus]
   * @param {Array<{ x: number, y: number, waitTime?: number }>} [config.waypoints=[]]
   */
  constructor(config = {}) {
    super({
      id: config.id || 'nexus_9_boss',
      type: 'enemy',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || ENEMY_RADIUS,
      speed: ENEMY_PATROL_SPEED,
      angle: config.angle || 0
    });

    this.name = 'NEXUS-9';
    this.eventBus = config.eventBus || null;

    // State Machine
    this.state = AI_STATES.PATROL;
    this.previousState = null;
    this.stateTimer = 0;

    // Movement speeds for different states
    this.patrolSpeed = ENEMY_PATROL_SPEED;         // 85 px/s
    this.investigateSpeed = ENEMY_INVESTIGATE_SPEED; // 115 px/s
    this.chaseSpeed = ENEMY_CHASE_SPEED;             // 195 px/s
    this.frenzySpeed = ENEMY_FRENZY_SPEED;           // 235 px/s
    this.stalkSpeed = 135;                           // 135 px/s

    // Combat specs
    this.attackDamage = ENEMY_ATTACK_DAMAGE;       // 45 damage
    this.attackRange = ENEMY_ATTACK_RANGE;         // 40 px
    this.attackCooldown = ENEMY_ATTACK_COOLDOWN;   // 1.2s
    this.attackTimer = 0;

    // Sensory Perception
    this.sightAngle = ENEMY_SIGHT_CONE_ANGLE;       // 110 degrees
    this.sightDistance = ENEMY_SIGHT_DISTANCE;     // 400 px
    this.searchDuration = ENEMY_SEARCH_DURATION;   // 6.0s
    this.searchTimer = 0;
    this.searchSweepAngle = 0;
    this.searchSweepDir = 1;

    // Targets & Memory
    this.investigateTarget = null;                 // { x, y }
    this.lastKnownPlayerPos = null;               // { x, y }
    this.hasDirectSight = false;
    this.timeSinceLastSeen = 999;
    this.lightDetectionMultiplier = 3.0;

    // Patrol Navigation
    this.waypoints = config.waypoints ? [...config.waypoints] : [];
    this.currentWaypointIndex = 0;
    this.waypointWaitTimer = 0;

    // Pathfinding Execution
    this.currentPath = [];
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.repathInterval = 0.35;                   // Recalculate chase path every 0.35s
    this.nodeReachThreshold = 18;                  // Distance in px to consider waypoint reached

    // Aura & Proximity
    this.auraFarDist = ENEMY_AURA_FAR_DIST;        // 260 px
    this.auraNearDist = ENEMY_AURA_NEAR_DIST;      // 130 px
    this.proximityDistance = 9999;
    this.screechPlayed = false;

    // Special Modes
    this.isFrenzyActive = false;
    this.isStunned = false;
    this.stunTimer = 0;
    this.whisperTimer = 3.0;
    this.stalkFlickerTimer = 0;
    this.visualGlitchPhase = 0;

    // Bind EventBus listeners for EMP and Noise
    if (this.eventBus) {
      this.bindEventListeners();
    }
  }

  /**
   * Subscribes to world events (EMP shocks, noise decoys, player concealment)
   */
  bindEventListeners() {
    if (!this.eventBus) return;

    this.eventBus.on('EMP_TRIGGERED', (data) => {
      const dist = distance(this.x, this.y, data.x, data.y);
      if (dist <= (data.radius || 280)) {
        this.stun(4.5);
      }
    });

    this.eventBus.on('NOISE_EMITTED', (data) => {
      this.hearNoise(data.x, data.y, data.radius);
    });
  }

  /**
   * Sets or updates the EventBus reference
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
    if (this.eventBus) {
      this.bindEventListeners();
    }
  }

  /**
   * Stuns NEXUS-9 for a duration, disabling sensory perception and motor circuits.
   * @param {number} [duration=4.5]
   */
  stun(duration = 4.5) {
    this.isStunned = true;
    this.stunTimer = duration;
    this.speed = 0;
    this.currentPath = [];
    this.eventBus?.emit('ENEMY_STUNNED', { entity: this, duration });
    this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 10, duration: 0.4 });
  }

  /**
   * Sets patrol waypoints for station navigation
   * @param {Array<{ x: number, y: number, waitTime?: number, sector?: string }>} waypoints
   */
  setWaypoints(waypoints) {
    this.waypoints = Array.isArray(waypoints) ? [...waypoints] : [];
    this.currentWaypointIndex = 0;
    this.waypointWaitTimer = 0;
    this.currentPath = [];
    this.pathIndex = 0;
  }

  /**
   * Triggers FRENZY overdrive mode (unrelenting pursuit when comms transmission starts)
   */
  triggerFrenzy() {
    this.isFrenzyActive = true;
    this.setState(AI_STATES.FRENZY);
  }

  /**
   * Transitions AI state and broadcasts state change events
   * @param {string} newState Member of AI_STATES or custom string
   */
  setState(newState) {
    if (this.state === newState) return;

    const oldState = this.state;
    this.previousState = oldState;
    this.state = newState;
    this.stateTimer = 0;

    // Configure state specifics
    switch (newState) {
      case AI_STATES.PATROL:
        this.speed = this.patrolSpeed;
        this.currentPath = [];
        this.pathIndex = 0;
        this.screechPlayed = false;
        break;

      case AI_STATES.INVESTIGATE:
        this.speed = this.investigateSpeed;
        this.currentPath = [];
        this.pathIndex = 0;
        break;

      case AI_STATES.CHASE:
        this.speed = this.chaseSpeed;
        this.currentPath = [];
        this.pathIndex = 0;
        this.repathTimer = 0;
        this.timeSinceLastSeen = 0;

        // Emit screech stinger on first chase transition
        if (!this.screechPlayed) {
          this.screechPlayed = true;
          this.eventBus?.emit('ENTITY_SCREECH', {
            distance: this.proximityDistance,
            pos: { x: this.x, y: this.y }
          });
          this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 14, duration: 0.6 });
        }
        this.eventBus?.emit(EVENTS.ENEMY_ALERTED, { entity: this, state: AI_STATES.CHASE });
        break;

      case 'SEARCH':
        this.speed = 0;
        this.searchTimer = this.searchDuration;
        this.currentPath = [];
        this.pathIndex = 0;
        this.searchSweepAngle = this.angle;
        this.searchSweepDir = 1;
        break;

      case AI_STATES.FRENZY:
        this.speed = this.frenzySpeed;
        this.isFrenzyActive = true;
        this.currentPath = [];
        this.pathIndex = 0;
        this.repathTimer = 0;
        this.eventBus?.emit('ENTITY_SCREECH', {
          distance: this.proximityDistance,
          pos: { x: this.x, y: this.y }
        });
        this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 18, duration: 0.8 });
        break;

      case 'STALK':
        this.speed = this.stalkSpeed;
        this.currentPath = [];
        this.pathIndex = 0;
        break;

      case AI_STATES.IDLE:
        this.speed = 0;
        this.currentPath = [];
        this.pathIndex = 0;
        break;
    }

    this.eventBus?.emit(EVENTS.ENEMY_STATE_CHANGED, {
      from: oldState,
      to: newState,
      entity: this
    });
  }

  /**
   * Puts NEXUS-9 into full FRENZY pursuit mode.
   */
  triggerFrenzy() {
    this.setState(AI_STATES.FRENZY);
  }

  /**
   * Master update tick for NEXUS-9 AI simulation
   * @param {number} dt Delta time in seconds
   * @param {import('./Player.js').Player} [player]
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @param {import('../world/Pathfinding.js').Pathfinding} [pathfinding]
   */
  update(dt, player = null, levelManager = null, pathfinding = null) {
    if (!this.active) return;

    // Handle Stunned State from EMP
    if (this.isStunned) {
      this.stunTimer -= dt;
      this.visualGlitchPhase += dt * 25;
      if (this.stunTimer <= 0) {
        this.isStunned = false;
        this.setState(AI_STATES.INVESTIGATE);
      }
      if (player) this.updateProximityAura(player);
      return;
    }

    this.stateTimer += dt;
    this.visualGlitchPhase += dt * 8;

    // Procedural Voice Telemetry Whispers
    if (player && this.proximityDistance < 280 && this.state !== AI_STATES.CHASE) {
      this.whisperTimer -= dt;
      if (this.whisperTimer <= 0) {
        this.whisperTimer = 5.0 + Math.random() * 4.0;
        this.eventBus?.emit('AI_WHISPER', { distance: this.proximityDistance });
        this.eventBus?.emit('AUDIO_TRIGGER', { type: 'ai_whisper', distance: this.proximityDistance });
      }
    }

    // Decrement attack cooldown timer
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }

    // 1. Sensory Perception Check against Player
    if (player && player.active && player.health > 0) {
      this.updatePerception(dt, player, levelManager, pathfinding);
    }

    // 2. State Machine Execution
    switch (this.state) {
      case AI_STATES.PATROL:
        this.updatePatrol(dt, pathfinding, levelManager);
        break;

      case AI_STATES.INVESTIGATE:
        this.updateInvestigate(dt, pathfinding, levelManager);
        break;

      case AI_STATES.CHASE:
        this.updateChase(dt, player, pathfinding, levelManager);
        break;

      case 'SEARCH':
        this.updateSearch(dt, player, levelManager);
        break;

      case AI_STATES.FRENZY:
        this.updateFrenzy(dt, player, pathfinding, levelManager);
        break;

      case 'STALK':
        this.updateStalk(dt, player, pathfinding, levelManager);
        break;

      case AI_STATES.IDLE:
      default:
        // Stand still
        break;
    }

    // 3. Proximity Aura & Disturbance Calculation
    if (player) {
      this.updateProximityAura(player);
    }
  }

  /**
   * Updates sensory perception: vision cone line-of-sight & flashlight illumination
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @param {import('../world/Pathfinding.js').Pathfinding} [pathfinding]
   */
  updatePerception(dt, player, levelManager, pathfinding) {
    const canSee = this.canSeePlayer(player, levelManager);
    this.hasDirectSight = canSee;

    if (canSee) {
      this.timeSinceLastSeen = 0;
      this.lastKnownPlayerPos = { x: player.x, y: player.y };

      // Instant transition to CHASE if not already chasing or in frenzy
      if (this.state !== AI_STATES.CHASE && this.state !== AI_STATES.FRENZY) {
        this.setState(AI_STATES.CHASE);
      }
    } else {
      this.timeSinceLastSeen += dt;

      // Check if flashlight shines on entity from darkness
      if (this.state !== AI_STATES.CHASE && this.state !== AI_STATES.FRENZY) {
        this.checkFlashlightAlert(player, levelManager);
      }
    }
  }

  /**
   * Evaluates if Player is within the 110-degree vision cone and has unobstructed Line of Sight (LOS)
   * @param {import('./Player.js').Player} player
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @returns {boolean} True if player is visible
   */
  canSeePlayer(player, levelManager = null) {
    if (!player || !player.active || player.health <= 0) return false;

    // If player is concealed in a locker/vent
    if (player.isHiding) {
      if (this.timeSinceLastSeen < 1.0) {
        this.investigateTarget = { x: player.x, y: player.y };
      }
      return false;
    }

    const dist = distance(this.x, this.y, player.x, player.y);
    if (dist > this.sightDistance) {
      return false;
    }

    // Vision cone angle check
    const targetAngle = angleTo(this.x, this.y, player.x, player.y);
    const angularDiff = Math.abs(angleDifference(targetAngle, this.angle));

    if (angularDiff > this.sightAngle / 2) {
      // Behind or outside vision cone (unless within extreme touch proximity ~24px)
      if (dist > 24) return false;
    }

    // Line of Sight wall raycast check
    return this.hasLineOfSightTo(player.x, player.y, levelManager);
  }

  /**
   * Raycasts between entity and target point to check for light-blocking wall occlusions
   * @param {number} targetX
   * @param {number} targetY
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @returns {boolean} True if unobstructed line of sight exists
   */
  hasLineOfSightTo(targetX, targetY, levelManager = null) {
    if (!levelManager) return true;

    // Sub-pixel segment raycast intersection check against all occluding wall edges
    const p1 = { x: this.x, y: this.y };
    const p2 = { x: targetX, y: targetY };
    const segments = typeof levelManager.getWallSegments === 'function' ? levelManager.getWallSegments() : [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const hit = lineIntersection(p1, p2, seg.p1, seg.p2);
      if (hit && hit.param > 0.01 && hit.param < 0.99) {
        return false; // Occluded by wall segment!
      }
    }

    return true;
  }

  /**
   * Evaluates acoustic stimulus: checks if noise reaches NEXUS-9 acoustic range
   * @param {number} noiseX Sound source X
   * @param {number} noiseY Sound source Y
   * @param {number} noiseRadius Acoustic radius in pixels
   * @returns {boolean} True if noise was heard
   */
  hearNoise(noiseX, noiseY, noiseRadius) {
    if (!this.active || noiseRadius <= 0) return false;

    const dist = distance(this.x, this.y, noiseX, noiseY);
    if (dist <= noiseRadius) {
      // Noise detected!
      if (this.state !== AI_STATES.CHASE && this.state !== AI_STATES.FRENZY) {
        this.investigateTarget = { x: noiseX, y: noiseY };
        this.setState(AI_STATES.INVESTIGATE);
        return true;
      }
    }
    return false;
  }

  /**
   * Heightened light sensitivity: alerts AI if player's flashlight shines directly on NEXUS-9
   * @param {import('./Player.js').Player} player
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @returns {boolean} True if illuminated
   */
  checkFlashlightAlert(player, levelManager = null) {
    if (!player || !player.isFlashlightOn) return false;

    const dist = distance(player.x, player.y, this.x, this.y);
    if (dist > player.flashlightDistance) return false;

    // Check if enemy is within player's flashlight cone
    const angleToEnemy = angleTo(player.x, player.y, this.x, this.y);
    const angularDiff = Math.abs(angleDifference(angleToEnemy, player.angle));

    if (angularDiff <= player.flashlightConeAngle / 2) {
      // Check raycast LOS from player to enemy
      if (this.hasLineOfSightTo(player.x, player.y, levelManager)) {
        // Direct beam illumination! Rapidly alerts AI towards player's position
        this.investigateTarget = { x: player.x, y: player.y };
        this.setState(AI_STATES.INVESTIGATE);
        return true;
      }
    }

    return false;
  }

  // ==========================================
  // STATE MACHINE UPDATE ROUTINES
  // ==========================================

  /**
   * Patrol state: moves along waypoint loop
   * @param {number} dt
   * @param {import('../world/Pathfinding.js').Pathfinding} pathfinding
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updatePatrol(dt, pathfinding, levelManager) {
    if (!this.waypoints || this.waypoints.length === 0) return;

    // If waiting at a waypoint
    if (this.waypointWaitTimer > 0) {
      this.waypointWaitTimer -= dt;
      // Slowly rotate/scan while waiting
      this.angle = normalizeAngle(this.angle + dt * 0.8);
      return;
    }

    const targetWp = this.waypoints[this.currentWaypointIndex];
    if (!targetWp) return;

    // Generate path to waypoint if no active path
    if (!this.currentPath || this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
      if (pathfinding) {
        this.currentPath = pathfinding.findPath(this.x, this.y, targetWp.x, targetWp.y, {
          isWorldCoords: true,
          smooth: true
        }) || [];
        this.pathIndex = 0;
      } else {
        // Direct fallback step
        this.currentPath = [{ x: targetWp.x, y: targetWp.y }];
        this.pathIndex = 0;
      }
    }

    // Follow path
    const reachedWp = this.followPath(dt, levelManager);

    if (reachedWp || distance(this.x, this.y, targetWp.x, targetWp.y) <= this.nodeReachThreshold) {
      // Reached current waypoint
      this.waypointWaitTimer = targetWp.waitTime || 1.5;
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      this.currentPath = [];
      this.pathIndex = 0;
    }
  }

  /**
   * Investigate state: moves towards sound or light anomaly
   * @param {number} dt
   * @param {import('../world/Pathfinding.js').Pathfinding} pathfinding
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updateInvestigate(dt, pathfinding, levelManager) {
    if (!this.investigateTarget) {
      this.setState('SEARCH');
      return;
    }

    // Generate path to investigate target if none
    if (!this.currentPath || this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
      if (pathfinding) {
        this.currentPath = pathfinding.findPath(this.x, this.y, this.investigateTarget.x, this.investigateTarget.y, {
          isWorldCoords: true,
          smooth: true
        }) || [];
        this.pathIndex = 0;
      } else {
        this.currentPath = [{ x: this.investigateTarget.x, y: this.investigateTarget.y }];
        this.pathIndex = 0;
      }
    }

    const reached = this.followPath(dt, levelManager);

    if (reached || distance(this.x, this.y, this.investigateTarget.x, this.investigateTarget.y) <= this.nodeReachThreshold) {
      // Reached investigation spot; begin search
      this.investigateTarget = null;
      this.setState('SEARCH');
    }
  }

  /**
   * Chase state: direct high-speed pursuit of player
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../world/Pathfinding.js').Pathfinding} pathfinding
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updateChase(dt, player, pathfinding, levelManager) {
    if (!player || player.health <= 0) {
      this.setState('SEARCH');
      return;
    }

    // Check melee attack range
    this.checkMeleeAttack(player);

    // Periodically repath with predictive interception lead
    this.repathTimer -= dt;
    if (this.repathTimer <= 0) {
      this.repathTimer = this.repathInterval;

      // Predictive lead vector based on player movement
      const leadX = player.x + (player.vx || 0) * 0.35;
      const leadY = player.y + (player.vy || 0) * 0.35;

      if (pathfinding) {
        this.currentPath = pathfinding.findPath(this.x, this.y, leadX, leadY, {
          isWorldCoords: true,
          smooth: true,
          allowLockedDoors: true // Hostile AI can breach standard doors
        }) || [];
        this.pathIndex = 0;
      } else {
        this.currentPath = [{ x: leadX, y: leadY }];
        this.pathIndex = 0;
      }
    }

    // Follow path
    this.followPath(dt, levelManager);

    // If player has been out of sight for too long, switch to SEARCH
    if (this.timeSinceLastSeen > 4.5) {
      this.setState('SEARCH');
    }
  }

  /**
   * Search state: scans local area for lost player, performs double-back scans and inspects concealment
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updateSearch(dt, player, levelManager) {
    this.searchTimer -= dt;

    // Tactical Double-Back Scan: At mid-search, spin 180 deg to catch operators exiting lockers
    if (this.searchTimer > 2.0 && this.searchTimer < 3.2) {
      if (this.lastKnownPlayerPos) {
        const angleToLastPos = angleTo(this.x, this.y, this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y);
        this.angle = angleToLastPos;
      }
    } else {
      // Smooth sinusoidal head/cone sweeping
      this.searchSweepAngle += this.searchSweepDir * dt * 2.2;
      this.angle = this.searchSweepAngle;

      if (Math.abs(angleDifference(this.searchSweepAngle, this.angle)) > Math.PI / 2) {
        this.searchSweepDir *= -1;
      }
    }

    // Search timeout: resume patrol
    if (this.searchTimer <= 0) {
      this.setState(AI_STATES.PATROL);
    }
  }

  /**
   * Frenzy state: overdrive mode with unrelenting pursuit
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../world/Pathfinding.js').Pathfinding} pathfinding
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updateFrenzy(dt, player, pathfinding, levelManager) {
    if (!player || player.health <= 0) return;

    this.checkMeleeAttack(player);

    this.repathTimer -= dt;
    if (this.repathTimer <= 0) {
      this.repathTimer = 0.22; // Very fast repathing in frenzy

      if (pathfinding) {
        this.currentPath = pathfinding.findPath(this.x, this.y, player.x, player.y, {
          isWorldCoords: true,
          smooth: true,
          allowLockedDoors: true
        }) || [];
        this.pathIndex = 0;
      } else {
        this.currentPath = [{ x: player.x, y: player.y }];
        this.pathIndex = 0;
      }
    }

    this.followPath(dt, levelManager);
  }

  /**
   * Stalk state: stealthily flanks player when unobserved
   * @param {number} dt
   * @param {import('./Player.js').Player} player
   * @param {import('../world/Pathfinding.js').Pathfinding} pathfinding
   * @param {import('../world/LevelManager.js').LevelManager} levelManager
   */
  updateStalk(dt, player, pathfinding, levelManager) {
    if (!player || player.health <= 0) {
      this.setState(AI_STATES.PATROL);
      return;
    }

    // If player looks directly at entity, break stalk and chase!
    const angleToAI = angleTo(player.x, player.y, this.x, this.y);
    const playerFacingAI = Math.abs(angleDifference(angleToAI, player.angle)) < Math.PI / 4;

    if (playerFacingAI && player.isFlashlightOn && this.canSeePlayer(player, levelManager)) {
      this.setState(AI_STATES.CHASE);
      return;
    }

    // Flank towards player rear
    const rearAngle = player.angle + Math.PI;
    const flankDist = 120;
    const targetX = player.x + Math.cos(rearAngle) * flankDist;
    const targetY = player.y + Math.sin(rearAngle) * flankDist;

    this.repathTimer -= dt;
    if (this.repathTimer <= 0) {
      this.repathTimer = 0.5;
      if (pathfinding) {
        this.currentPath = pathfinding.findPath(this.x, this.y, targetX, targetY, {
          isWorldCoords: true,
          smooth: true
        }) || [];
        this.pathIndex = 0;
      }
    }

    this.followPath(dt, levelManager);

    // If extremely close, lunge and attack
    if (distance(this.x, this.y, player.x, player.y) < 65) {
      this.setState(AI_STATES.CHASE);
    }
  }

  /**
   * Follows current path nodes smoothly towards destination
   * @param {number} dt
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @returns {boolean} True if entire path was completed
   */
  followPath(dt, levelManager = null) {
    if (!this.currentPath || this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length) {
      return true;
    }

    const node = this.currentPath[this.pathIndex];
    const dist = distance(this.x, this.y, node.x, node.y);

    if (dist <= this.nodeReachThreshold) {
      this.pathIndex++;
      if (this.pathIndex >= this.currentPath.length) {
        return true; // Path completed
      }
    }

    const nextNode = this.currentPath[this.pathIndex];
    const moveAngle = angleTo(this.x, this.y, nextNode.x, nextNode.y);

    // Smoothly rotate facing angle
    this.angle = moveAngle;

    // Movement step
    const step = this.speed * dt;
    let nextX = this.x + Math.cos(moveAngle) * step;
    let nextY = this.y + Math.sin(moveAngle) * step;

    if (levelManager && typeof levelManager.resolveCircleCollision === 'function') {
      const res = levelManager.resolveCircleCollision(nextX, nextY, this.radius);
      nextX = res.x;
      nextY = res.y;
    }

    this.x = nextX;
    this.y = nextY;

    return false;
  }

  /**
   * Executes melee attack on player when within attack range and cooldown ready
   * @param {import('./Player.js').Player} player
   * @returns {boolean} True if attack landed
   */
  checkMeleeAttack(player) {
    if (!player || player.health <= 0 || this.attackTimer > 0) {
      return false;
    }

    const dist = distance(this.x, this.y, player.x, player.y);
    if (dist <= this.attackRange) {
      // Execute swipe attack!
      this.attackTimer = this.attackCooldown;

      const hitAngle = angleTo(this.x, this.y, player.x, player.y);
      player.takeDamage(this.attackDamage, hitAngle, 220);

      this.eventBus?.emit(EVENTS.ENEMY_ATTACKED, {
        damage: this.attackDamage,
        entity: this,
        target: player
      });
      this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 18, duration: 0.5 });

      return true;
    }

    return false;
  }

  /**
   * Calculates proximity distance to player and emits ENTITY_PROXIMITY events
   * @param {import('./Player.js').Player} player
   */
  updateProximityAura(player) {
    this.proximityDistance = distance(this.x, this.y, player.x, player.y);

    const intensity = clamp(1 - (this.proximityDistance / this.auraFarDist), 0, 1);

    this.eventBus?.emit(EVENTS.ENTITY_PROXIMITY, {
      distance: this.proximityDistance,
      intensity,
      entity: this,
      state: this.state
    });
    this.eventBus?.emit('ENTITY_PROXIMITY', {
      distance: this.proximityDistance,
      intensity,
      entity: this,
      state: this.state
    });
  }

  /**
   * Renders NEXUS-9 dynamic glitching form, red optical cluster, and dark tendrils
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} [camera]
   */
  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Shifting Dark Energy Distortion Field
    const flickerRadius = this.radius + Math.sin(this.visualGlitchPhase * 2) * 4;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, flickerRadius * 1.4);
    grad.addColorStop(0, COLORS.ALERT_RED_BRIGHT);
    grad.addColorStop(0.4, 'rgba(180, 0, 30, 0.6)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, flickerRadius * 1.4, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Glitching Holographic Wireframe Shell
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#050103';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.state === AI_STATES.FRENZY ? '#ff0055' : COLORS.ALERT_RED_BRIGHT;
    ctx.stroke();

    // 3. Ominous Red Optical Eye Cluster
    const eyeOffsetX = Math.cos(0) * (this.radius * 0.45);
    const eyeOffsetY = Math.sin(0) * (this.radius * 0.45);

    ctx.beginPath();
    ctx.arc(eyeOffsetX, eyeOffsetY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eyeOffsetX, eyeOffsetY, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fill();

    // Tendril spines
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 34, 68, 0.7)';
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i + Math.sin(this.visualGlitchPhase + i) * 0.3;
      const tx = Math.cos(angle) * (this.radius + 8);
      const ty = Math.sin(angle) * (this.radius + 8);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    ctx.restore();
  }
}
