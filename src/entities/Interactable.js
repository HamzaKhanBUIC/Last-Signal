/**
 * THE LAST SIGNAL — SPECIALIZED INTERACTABLE ENTITIES
 * 
 * Defines all world interactable entities in AEGIS-7 Station:
 * - Base Interactable class
 * - Door: Bulkhead doors with security clearances, dynamic grid collision updating, and auto-close timers.
 * - SignalFragment: Floating holographic Cryo/Power/Data signal transceivers with Geiger audio resonance.
 * - Keycard: Blue, Red, and Master security authorization cards.
 * - Terminal: Interactive retro CRT terminals (Lore, Door Overrides, Reactor Generator, Comms Array, Escape Pod).
 * - BatteryPack: Flashlight rechargers.
 * - Medkit: Emergency health restorers.
 * - Factory builder: createInteractablesFromMap(levelManager)
 */

import { Entity } from './Entity.js';
import {
  INTERACTION_RADIUS,
  DOOR_INTERACTION_RADIUS,
  DOOR_AUTO_CLOSE_DELAY,
  TILE_TYPES,
  TILE_SIZE,
  SECURITY_LEVELS,
  KEYCARD_TYPES,
  FRAGMENT_TYPES,
  ITEM_TYPES,
  EVENTS,
  COLORS
} from '../utils/Constants.js';
import { TERMINALS, PICKUPS } from '../world/MapData.js';

// =========================================================================
// 1. BASE INTERACTABLE CLASS
// =========================================================================

export class Interactable extends Entity {
  /**
   * @param {Object} [config={}]
   */
  constructor(config = {}) {
    super({
      id: config.id || `interactable_${Date.now()}`,
      type: config.type || 'interactable',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || INTERACTION_RADIUS,
      active: config.active !== undefined ? config.active : true
    });

    this.prompt = config.prompt || '[E] INTERACT';
    this.interactionRadius = config.interactionRadius || INTERACTION_RADIUS;
    this.isInteractable = config.isInteractable !== undefined ? config.isInteractable : true;
    this.name = config.name || 'Object';
  }

  /**
   * Checks if player is allowed to interact with object
   * @param {import('./Player.js').Player} player
   * @param {import('../core/GameState.js').GameState} [gameState]
   * @returns {boolean}
   */
  canInteract(player, gameState) {
    return this.active && this.isInteractable;
  }

  /**
   * Returns contextual prompt text
   * @param {import('./Player.js').Player} player
   * @param {import('../core/GameState.js').GameState} [gameState]
   * @returns {string}
   */
  getPrompt(player, gameState) {
    return this.prompt;
  }

  /**
   * Executes interaction logic
   * @param {import('./Player.js').Player} player
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @returns {any}
   */
  interact(player, gameState, eventBus) {
    // To be implemented by subclasses
    return false;
  }
}

// =========================================================================
// 2. DOOR ENTITY
// =========================================================================

export class Door extends Interactable {
  /**
   * @param {Object} config
   * @param {number} config.tileX
   * @param {number} config.tileY
   * @param {string} [config.securityLevel='NONE'] 'NONE' | 'BLUE' | 'RED' | 'MASTER'
   * @param {import('../world/LevelManager.js').LevelManager} [config.levelManager]
   * @param {boolean} [config.autoClose=true]
   */
  constructor(config = {}) {
    const tileX = config.tileX || 0;
    const tileY = config.tileY || 0;
    const ts = TILE_SIZE;

    super({
      id: config.id || `door_${tileX}_${tileY}`,
      type: 'door',
      x: config.x || (tileX + 0.5) * ts,
      y: config.y || (tileY + 0.5) * ts,
      radius: config.radius || DOOR_INTERACTION_RADIUS,
      interactionRadius: config.interactionRadius || DOOR_INTERACTION_RADIUS
    });

    this.tileX = tileX;
    this.tileY = tileY;
    this.securityLevel = config.securityLevel || SECURITY_LEVELS.NONE;
    this.levelManager = config.levelManager || null;
    this.autoClose = config.autoClose !== undefined ? config.autoClose : true;
    this.autoCloseDelay = config.autoCloseDelay || DOOR_AUTO_CLOSE_DELAY;
    this.autoCloseTimer = 0;

    // Door animation state
    this.isOpen = false;
    this.openProgress = 0.0; // 0 = fully closed, 1 = fully open
    this.isLocked = this.securityLevel !== SECURITY_LEVELS.NONE;
    this.openSpeed = 3.5;   // Progression per second

    this.updateTileCollision();
  }

  /**
   * Updates grid collision in LevelManager based on current door open state
   */
  updateTileCollision() {
    if (!this.levelManager) return;

    if (this.isOpen) {
      this.levelManager.setTile(this.tileX, this.tileY, TILE_TYPES.DOOR_OPEN);
    } else {
      if (this.securityLevel === SECURITY_LEVELS.BLUE) {
        this.levelManager.setTile(this.tileX, this.tileY, TILE_TYPES.DOOR_LOCKED_BLUE);
      } else if (this.securityLevel === SECURITY_LEVELS.RED) {
        this.levelManager.setTile(this.tileX, this.tileY, TILE_TYPES.DOOR_LOCKED_RED);
      } else if (this.securityLevel === SECURITY_LEVELS.MASTER) {
        this.levelManager.setTile(this.tileX, this.tileY, TILE_TYPES.DOOR_LOCKED_MASTER);
      } else {
        this.levelManager.setTile(this.tileX, this.tileY, TILE_TYPES.DOOR_CLOSED);
      }
    }
  }

  /**
   * Returns contextual prompt text
   * @param {import('./Player.js').Player} player
   * @param {import('../core/GameState.js').GameState} [gameState]
   * @returns {string}
   */
  getPrompt(player, gameState) {
    if (this.isOpen) {
      return '[E] CLOSE BULKHEAD';
    }

    if (this.isLocked && gameState) {
      const hasClearance = gameState.hasKeycard(this.securityLevel);
      if (!hasClearance) {
        return `[LOCKED] REQ: ${this.securityLevel} KEYCARD`;
      }
      return `[E] UNLOCK (${this.securityLevel})`;
    }

    return '[E] OPEN BULKHEAD';
  }

  /**
   * Opens bulkhead door
   */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.autoCloseTimer = this.autoClose ? this.autoCloseDelay : 0;
    this.updateTileCollision();
  }

  /**
   * Closes bulkhead door
   */
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.autoCloseTimer = 0;
    this.updateTileCollision();
  }

  /**
   * Toggles open / close
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Interaction trigger
   * @param {import('./Player.js').Player} player
   * @param {import('../core/GameState.js').GameState} gameState
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @returns {boolean}
   */
  interact(player, gameState, eventBus) {
    if (this.isOpen) {
      this.close();
      eventBus?.emit('DOOR_OPENED', { open: false, door: this, x: this.x, y: this.y });
      eventBus?.emit(EVENTS.DOOR_STATE_CHANGED, { state: 'CLOSED', door: this });
      return true;
    }

    // Check security clearance
    if (this.isLocked && gameState) {
      const hasKey = gameState.hasKeycard(this.securityLevel);
      if (!hasKey) {
        // Access Denied
        eventBus?.emit('DOOR_LOCKED', {
          door: this,
          requiredKey: this.securityLevel,
          x: this.x,
          y: this.y
        });
        eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 4, duration: 0.2 });
        return false;
      }

      // Security authorized: permanently unlocked
      this.isLocked = false;
    }

    this.open();
    eventBus?.emit('DOOR_OPENED', { open: true, door: this, x: this.x, y: this.y });
    eventBus?.emit(EVENTS.DOOR_STATE_CHANGED, { state: 'OPEN', door: this });
    return true;
  }

  /**
   * Updates door animation progress and auto-close timer
   * @param {number} dt
   * @param {import('./Player.js').Player} [player]
   */
  update(dt, player = null) {
    if (!this.active) return;

    // Smooth open progress interpolation
    if (this.isOpen && this.openProgress < 1.0) {
      this.openProgress = Math.min(1.0, this.openProgress + dt * this.openSpeed);
    } else if (!this.isOpen && this.openProgress > 0.0) {
      this.openProgress = Math.max(0.0, this.openProgress - dt * this.openSpeed);
    }

    // Auto-close handling
    if (this.isOpen && this.autoClose && this.autoCloseTimer > 0) {
      // Don't auto-close if player is currently standing inside door threshold
      const playerInside = player ? (distance(this.x, this.y, player.x, player.y) < this.radius * 0.7) : false;

      if (!playerInside) {
        this.autoCloseTimer -= dt;
        if (this.autoCloseTimer <= 0) {
          this.close();
        }
      } else {
        // Reset timer while player is in doorway
        this.autoCloseTimer = this.autoCloseDelay;
      }
    }
  }

  /**
   * Renders bulkhead door with animated sliding panels and clearance lights
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} [camera]
   */
  render(ctx, camera) {
    if (!this.active) return;

    const ts = TILE_SIZE;
    const half = ts / 2;
    const px = this.x - half;
    const py = this.y - half;

    ctx.save();

    // Door Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, py, ts, ts);

    // Clearance Light Bar
    let lightColor = COLORS.CRT_GREEN_BRIGHT;
    if (this.isLocked) {
      if (this.securityLevel === SECURITY_LEVELS.BLUE) lightColor = COLORS.KEYCARD_BLUE;
      else if (this.securityLevel === SECURITY_LEVELS.RED) lightColor = COLORS.KEYCARD_RED;
      else if (this.securityLevel === SECURITY_LEVELS.MASTER) lightColor = COLORS.KEYCARD_MASTER;
      else lightColor = COLORS.ALERT_RED_BRIGHT;
    }

    // Sliding Panels (horizontal split)
    const slideOffset = this.openProgress * (half - 2);

    // Top Panel
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 2, py + 2 - slideOffset, ts - 4, half - 2);

    // Bottom Panel
    ctx.fillRect(px + 2, py + half + slideOffset, ts - 4, half - 2);

    // Central Status LED
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// =========================================================================
// 3. SIGNAL FRAGMENT ENTITY
// =========================================================================

export class SignalFragment extends Interactable {
  /**
   * @param {Object} config
   * @param {string} [config.subType='alpha'] 'alpha' | 'beta' | 'gamma'
   * @param {string} [config.code='CRY-01']
   * @param {string} [config.glowColor='#00ffcc']
   */
  constructor(config = {}) {
    super({
      id: config.id || `frag_${config.subType || 'alpha'}`,
      type: 'fragment',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 24,
      interactionRadius: config.interactionRadius || 36
    });

    this.subType = config.subType || FRAGMENT_TYPES.ALPHA;
    this.code = config.code || 'CRY-01';
    this.name = config.name || `Signal Fragment ${this.subType.toUpperCase()} [${this.code}]`;
    this.glowColor = config.glowColor || COLORS.FRAGMENT_ALPHA;
    this.collected = false;

    this.floatPhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 2.4;
  }

  getPrompt(player, gameState) {
    return `[E] EXTRACT ${this.name.toUpperCase()}`;
  }

  interact(player, gameState, eventBus) {
    if (this.collected || !this.active) return false;

    this.collected = true;
    this.active = false;

    // Add to GameState
    let itemKey = ITEM_TYPES.FRAGMENT_ALPHA;
    if (this.subType === FRAGMENT_TYPES.BETA || this.subType === 'beta') itemKey = ITEM_TYPES.FRAGMENT_BETA;
    if (this.subType === FRAGMENT_TYPES.GAMMA || this.subType === 'gamma') itemKey = ITEM_TYPES.FRAGMENT_GAMMA;

    gameState?.addInventory(itemKey);

    // Emit Events
    eventBus?.emit('ITEM_COLLECTED', {
      type: 'fragment',
      subType: this.subType,
      name: this.name,
      x: this.x,
      y: this.y
    });

    eventBus?.emit(EVENTS.FRAGMENT_COLLECTED, {
      fragment: itemKey,
      subType: this.subType,
      total: gameState ? gameState.getFragmentCount() : 1
    });

    eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 8, duration: 0.3 });

    return true;
  }

  update(dt) {
    if (!this.active || this.collected) return;
    this.floatPhase += dt * this.pulseSpeed;
  }

  render(ctx, camera) {
    if (!this.active || this.collected) return;

    const yOffset = Math.sin(this.floatPhase) * 5;
    const py = this.y + yOffset;

    ctx.save();
    ctx.translate(this.x, py);

    // 1. Outer Hologram Glow Field
    const glowRad = 18 + Math.sin(this.floatPhase * 2) * 4;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, glowRad);
    grad.addColorStop(0, this.glowColor);
    grad.addColorStop(0.5, 'rgba(0, 255, 200, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, glowRad, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // 2. Rotating Diamond Crystal Prism
    ctx.rotate(this.floatPhase * 0.8);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = this.glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 0);
    ctx.lineTo(0, 10);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// =========================================================================
// 4. KEYCARD ENTITY
// =========================================================================

export class Keycard extends Interactable {
  /**
   * @param {Object} config
   * @param {string} [config.level='blue'] 'blue' | 'red' | 'master'
   */
  constructor(config = {}) {
    super({
      id: config.id || `keycard_${config.level || 'blue'}`,
      type: 'keycard',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 20,
      interactionRadius: config.interactionRadius || 32
    });

    this.level = config.level || KEYCARD_TYPES.BLUE;
    this.name = config.name || `${this.level.toUpperCase()} Clearance Keycard`;
    this.glowColor = config.glowColor || COLORS.KEYCARD_BLUE;
    this.collected = false;
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  getPrompt(player, gameState) {
    return `[E] TAKE ${this.name.toUpperCase()}`;
  }

  interact(player, gameState, eventBus) {
    if (this.collected || !this.active) return false;

    this.collected = true;
    this.active = false;

    let itemKey = ITEM_TYPES.KEYCARD_BLUE;
    if (this.level === KEYCARD_TYPES.RED || this.level === 'red') itemKey = ITEM_TYPES.KEYCARD_RED;
    if (this.level === KEYCARD_TYPES.MASTER || this.level === 'master') itemKey = ITEM_TYPES.KEYCARD_MASTER;

    gameState?.addInventory(itemKey);

    eventBus?.emit('ITEM_COLLECTED', {
      type: 'keycard',
      level: this.level,
      name: this.name,
      x: this.x,
      y: this.y
    });

    return true;
  }

  update(dt) {
    if (!this.active || this.collected) return;
    this.floatPhase += dt * 2.0;
  }

  render(ctx, camera) {
    if (!this.active || this.collected) return;

    const yOffset = Math.sin(this.floatPhase) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + yOffset);

    // Glowing outline
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.glowColor;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-7, -10, 14, 20);
    ctx.strokeRect(-7, -10, 14, 20);

    // Magnetic Chip
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-4, -6, 8, 5);

    // Color Stripe
    ctx.fillStyle = this.glowColor;
    ctx.fillRect(-6, 3, 12, 4);

    ctx.restore();
  }
}

// =========================================================================
// 5. TERMINAL ENTITY
// =========================================================================

export class Terminal extends Interactable {
  /**
   * @param {Object} config
   * @param {string} [config.terminalType='lore'] 'lore' | 'security_override' | 'generator_restart' | 'comms_broadcast' | 'escape_launch'
   * @param {string} [config.title]
   * @param {Array<string>} [config.content]
   */
  constructor(config = {}) {
    super({
      id: config.id || `term_${Date.now()}`,
      type: 'terminal',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 28,
      interactionRadius: config.interactionRadius || 48
    });

    this.terminalType = config.terminalType || config.type || 'lore';
    this.title = config.title || 'STATION TERMINAL';
    this.content = config.content || [];
    this.sector = config.sector || '';
    this.accessed = false;
    this.screenGlow = 0;
  }

  getPrompt(player, gameState) {
    if (this.terminalType === 'comms_broadcast') {
      const frags = gameState ? gameState.getFragmentCount() : 0;
      return frags >= 3 ? '[E] ACCESS COMMS TRANSMITTER' : `[E] COMMS ARRAY (${frags}/3 FRAGMENTS)`;
    }
    if (this.terminalType === 'escape_launch') {
      return '[E] INITIATE POD EVACUATION';
    }
    return `[E] ACCESS ${this.title.substring(0, 18)}`;
  }

  interact(player, gameState, eventBus) {
    if (!this.active) return false;

    this.accessed = true;

    // Special Terminal Behaviors
    if (this.terminalType === 'comms_broadcast' && gameState) {
      if (gameState.getFragmentCount() >= 3) {
        gameState.commsRepaired = true;
        gameState.escapeUnlocked = true;
        gameState.completeObjective('Comms Transmission Broadcast');
        gameState.updateObjective('CRITICAL ALERT: Comms Transmitted! Evacuate to Emergency Escape Bay!');
      }
    }

    if (this.terminalType === 'escape_launch' && gameState) {
      if (gameState.checkWinCondition()) {
        return true;
      }
    }

    // Open Interactive Terminal UI Modal
    eventBus?.emit('TERMINAL_OPENED', this);
    eventBus?.emit(EVENTS.TERMINAL_OPENED, this);

    return true;
  }

  update(dt) {
    if (!this.active) return;
    this.screenGlow += dt * 3;
  }

  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Console Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(-14, -14, 28, 28);
    ctx.strokeRect(-14, -14, 28, 28);

    // CRT Screen Face (Bright phosphorescent green or amber)
    const glow = Math.sin(this.screenGlow) * 0.15 + 0.85;
    ctx.fillStyle = `rgba(0, 255, 102, ${glow})`;
    ctx.fillRect(-10, -10, 20, 16);

    // Keyboard shelf
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-12, 8, 24, 4);

    ctx.restore();
  }
}

// =========================================================================
// 6. BATTERY PACK & MEDKIT PICKUPS
// =========================================================================

export class BatteryPack extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `battery_${Date.now()}`,
      type: 'battery',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 18,
      interactionRadius: config.interactionRadius || 30
    });

    this.amount = config.amount || 40;
    this.name = config.name || 'Flashlight Battery Pack';
    this.collected = false;
  }

  getPrompt(player, gameState) {
    return '[E] TAKE BATTERY PACK';
  }

  interact(player, gameState, eventBus) {
    if (this.collected || !this.active) return false;

    this.collected = true;
    this.active = false;

    gameState?.addInventory(ITEM_TYPES.BATTERY_PACK);

    eventBus?.emit('ITEM_COLLECTED', {
      type: 'battery',
      amount: this.amount,
      name: this.name,
      x: this.x,
      y: this.y
    });

    return true;
  }

  render(ctx, camera) {
    if (!this.active || this.collected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Cylindrical Battery Cell
    ctx.fillStyle = '#0284c7';
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 1;
    ctx.fillRect(-6, -8, 12, 16);
    ctx.strokeRect(-6, -8, 12, 16);

    // Positive terminal pip
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-3, -11, 6, 3);

    // Charge indicator
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-4, -4, 8, 8);

    ctx.restore();
  }
}

export class Medkit extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `medkit_${Date.now()}`,
      type: 'medkit',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 18,
      interactionRadius: config.interactionRadius || 30
    });

    this.amount = config.amount || 50;
    this.name = config.name || 'Medi-Gel Injector';
    this.collected = false;
  }

  getPrompt(player, gameState) {
    return '[E] TAKE MEDI-GEL';
  }

  interact(player, gameState, eventBus) {
    if (this.collected || !this.active) return false;

    this.collected = true;
    this.active = false;

    gameState?.addInventory(ITEM_TYPES.MEDKIT);

    eventBus?.emit('ITEM_COLLECTED', {
      type: 'medkit',
      amount: this.amount,
      name: this.name,
      x: this.x,
      y: this.y
    });

    return true;
  }

  render(ctx, camera) {
    if (!this.active || this.collected) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // White Case
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeRect(-8, -8, 16, 16);

    // Red Cross
    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fillRect(-2, -6, 4, 12);
    ctx.fillRect(-6, -2, 12, 4);

    ctx.restore();
  }
}

// =========================================================================
// 7. HIDING SPOT ENTITY (Lockers & Maintenance Alcoves)
// =========================================================================

export class HidingSpot extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `hiding_${Date.now()}`,
      type: 'hiding_spot',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 24,
      interactionRadius: config.interactionRadius || 46
    });

    this.name = config.name || 'CREW LOCKER';
    this.sector = config.sector || '';
    this.isOccupied = false;
    this.facingAngle = config.facingAngle || 0;
  }

  getPrompt(player, gameState) {
    return this.isOccupied ? '[E] EXIT LOCKER' : `[E] HIDE IN ${this.name}`;
  }

  interact(player, gameState, eventBus) {
    if (!this.active) return false;

    if (!this.isOccupied) {
      this.isOccupied = true;
      if (player) {
        player.isHiding = true;
        player.currentHidingSpot = this;
        player.x = this.x;
        player.y = this.y;
      }
      eventBus?.emit('PLAYER_HIDDEN', { spot: this, player });
    } else {
      this.isOccupied = false;
      if (player) {
        player.isHiding = false;
        player.currentHidingSpot = null;
      }
      eventBus?.emit('PLAYER_UNHIDDEN', { spot: this, player });
    }

    return true;
  }

  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Metallic Locker Chassis
    ctx.fillStyle = '#101c28';
    ctx.strokeStyle = this.isOccupied ? '#00ff66' : 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-12, -18, 24, 36);
    ctx.strokeRect(-12, -18, 24, 36);

    // Vent Slats
    ctx.fillStyle = '#05090f';
    for (let i = -10; i <= 10; i += 5) {
      ctx.fillRect(-8, i, 16, 2);
    }

    // Status LED
    ctx.fillStyle = this.isOccupied ? '#00ff66' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, -13, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// =========================================================================
// 8. ACTIVE SONIC DECOY ENTITY (Acoustic Distraction Flare)
// =========================================================================

export class SonicDecoy extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `decoy_${Date.now()}`,
      type: 'sonic_decoy',
      x: config.x || 0,
      y: config.y || 0,
      radius: 12,
      interactionRadius: 0
    });

    this.duration = 6.0;
    this.timer = 0;
    this.pulseInterval = 0.8;
    this.pulseTimer = 0;
    this.pulseRadius = 0;
    this.noiseRadius = 380;
    this.eventBus = config.eventBus || null;
  }

  update(dt, player, gameState, eventBus) {
    if (!this.active) return;
    this.timer += dt;
    this.pulseTimer += dt;
    this.pulseRadius += dt * 180;

    if (this.pulseTimer >= this.pulseInterval) {
      this.pulseTimer = 0;
      this.pulseRadius = 0;
      eventBus?.emit('NOISE_EMITTED', {
        x: this.x,
        y: this.y,
        radius: this.noiseRadius,
        source: 'decoy'
      });
      eventBus?.emit('AUDIO_TRIGGER', {
        type: 'decoy_chirp',
        pos: { x: this.x, y: this.y }
      });
    }

    if (this.timer >= this.duration) {
      this.active = false;
    }
  }

  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing core
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // Sonar ring expansion
    const alpha = Math.max(0, 1 - (this.pulseRadius / 60));
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(60, this.pulseRadius), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// =========================================================================
// 9. ENVIRONMENTAL HAZARD ZONE (Electric Arcs & Cryo Leaks)
// =========================================================================

export class HazardZone extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `hazard_${Date.now()}`,
      type: 'hazard_zone',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || 32,
      interactionRadius: 0
    });

    this.hazardType = config.hazardType || 'electric'; // 'electric' | 'cryo'
    this.damageInterval = 1.0;
    this.damageTimer = 0;
    this.animPhase = Math.random() * Math.PI * 2;
  }

  update(dt, player, gameState, eventBus) {
    if (!this.active) return;
    this.animPhase += dt * 6;
    this.damageTimer += dt;

    if (!player || player.isHiding) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.radius) {
      if (this.hazardType === 'electric' && this.damageTimer >= this.damageInterval) {
        this.damageTimer = 0;
        player.takeDamage(15);
        eventBus?.emit('AUDIO_TRIGGER', { type: 'electric_zap', pos: { x: this.x, y: this.y } });
        eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 8, duration: 0.3 });
      } else if (this.hazardType === 'cryo') {
        player.speedMultiplier = 0.55;
        if (gameState && this.damageTimer >= 0.5) {
          this.damageTimer = 0;
          gameState.drainStamina(8);
          eventBus?.emit('AUDIO_TRIGGER', { type: 'cryo_steam', pos: { x: this.x, y: this.y } });
        }
      }
    }
  }

  render(ctx, camera) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.hazardType === 'electric') {
      // Arcing high voltage sparks
      const sparkGlow = 0.4 + Math.sin(this.animPhase) * 0.3;
      ctx.fillStyle = `rgba(255, 200, 0, ${sparkGlow * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = this.animPhase + i * (Math.PI * 2 / 3);
        const r = this.radius * (0.4 + Math.sin(a * 2) * 0.4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
    } else {
      // Freezing cryogenic vapor mist
      const mistAlpha = 0.25 + Math.sin(this.animPhase * 0.5) * 0.15;
      ctx.fillStyle = `rgba(160, 230, 255, ${mistAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// =========================================================================
// 10. TACTICAL PICKUP ENTITIES (Sonic Decoy & EMP Battery)
// =========================================================================

export class SonicDecoyPickup extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `p_decoy_${Date.now()}`,
      type: 'decoy_pickup',
      x: config.x || 0,
      y: config.y || 0,
      radius: 16,
      interactionRadius: 36
    });
    this.name = config.name || 'Sonic Decoy Flare';
    this.collected = false;
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  getPrompt(player, gameState) {
    return `[E] COLLECT ${this.name.toUpperCase()}`;
  }

  interact(player, gameState, eventBus) {
    if (this.collected) return false;
    this.collected = true;
    this.active = false;
    if (gameState) gameState.addItem(ITEM_TYPES.SONIC_DECOY, { count: 1 });
    eventBus?.emit('AUDIO_TRIGGER', { type: 'pickup' });
    return true;
  }

  render(ctx, camera) {
    if (this.collected) return;
    this.floatPhase += 0.05;
    const yOff = Math.sin(this.floatPhase) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + yOff);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(-4, -8, 8, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-4, -8, 8, 16);
    ctx.restore();
  }
}

export class EMPChargePickup extends Interactable {
  constructor(config = {}) {
    super({
      id: config.id || `p_emp_${Date.now()}`,
      type: 'emp_pickup',
      x: config.x || 0,
      y: config.y || 0,
      radius: 16,
      interactionRadius: 36
    });
    this.name = config.name || 'EMP Pulse Capacitor';
    this.collected = false;
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  getPrompt(player, gameState) {
    return `[E] COLLECT ${this.name.toUpperCase()}`;
  }

  interact(player, gameState, eventBus) {
    if (this.collected) return false;
    this.collected = true;
    this.active = false;
    if (gameState) gameState.addItem(ITEM_TYPES.EMP_CHARGE, { count: 1 });
    eventBus?.emit('AUDIO_TRIGGER', { type: 'pickup' });
    return true;
  }

  render(ctx, camera) {
    if (this.collected) return;
    this.floatPhase += 0.05;
    const yOff = Math.sin(this.floatPhase) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + yOff);
    ctx.fillStyle = '#bf55ec';
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.restore();
  }
}

// =========================================================================
// 11. MAP INTERACTABLES BUILDER FACTORY
// =========================================================================

/**
 * Instantiates all interactive doors, pickups, terminals, hiding spots, and hazards
 * @param {import('../world/LevelManager.js').LevelManager} levelManager
 * @returns {Array<Interactable>}
 */
export function createInteractablesFromMap(levelManager) {
  const interactables = [];

  // 1. Scan and build doors from grid tilemap
  if (levelManager && levelManager.grid) {
    for (let ty = 0; ty < levelManager.height; ty++) {
      for (let tx = 0; tx < levelManager.width; tx++) {
        const type = levelManager.grid[ty][tx];

        if (
          type === TILE_TYPES.DOOR_CLOSED ||
          type === TILE_TYPES.DOOR_LOCKED_BLUE ||
          type === TILE_TYPES.DOOR_LOCKED_RED ||
          type === TILE_TYPES.DOOR_LOCKED_MASTER
        ) {
          let sec = SECURITY_LEVELS.NONE;
          if (type === TILE_TYPES.DOOR_LOCKED_BLUE) sec = SECURITY_LEVELS.BLUE;
          if (type === TILE_TYPES.DOOR_LOCKED_RED) sec = SECURITY_LEVELS.RED;
          if (type === TILE_TYPES.DOOR_LOCKED_MASTER) sec = SECURITY_LEVELS.MASTER;

          interactables.push(new Door({
            tileX: tx,
            tileY: ty,
            securityLevel: sec,
            levelManager
          }));
        }
      }
    }
  }

  // 2. Build Terminals from MapData
  const terminals = levelManager?.getTerminals ? levelManager.getTerminals() : TERMINALS;
  for (const t of terminals) {
    interactables.push(new Terminal({
      id: t.id,
      x: t.x,
      y: t.y,
      terminalType: t.type,
      title: t.title,
      content: t.content,
      sector: t.sector
    }));
  }

  // 3. Build Pickups from MapData
  const pickups = levelManager?.getPickups ? levelManager.getPickups() : PICKUPS;
  for (const p of pickups) {
    if (p.type === 'fragment') {
      interactables.push(new SignalFragment({
        id: p.id,
        x: p.x,
        y: p.y,
        subType: p.subType,
        code: p.code,
        name: p.name,
        glowColor: p.glowColor
      }));
    } else if (p.type === 'keycard') {
      interactables.push(new Keycard({
        id: p.id,
        x: p.x,
        y: p.y,
        level: p.level,
        name: p.name,
        glowColor: p.glowColor
      }));
    } else if (p.type === 'battery') {
      interactables.push(new BatteryPack({
        id: p.id,
        x: p.x,
        y: p.y,
        amount: p.amount,
        name: p.name
      }));
    } else if (p.type === 'medkit') {
      interactables.push(new Medkit({
        id: p.id,
        x: p.x,
        y: p.y,
        amount: p.amount,
        name: p.name
      }));
    } else if (p.type === 'decoy') {
      interactables.push(new SonicDecoyPickup({
        id: p.id,
        x: p.x,
        y: p.y,
        name: p.name
      }));
    } else if (p.type === 'emp') {
      interactables.push(new EMPChargePickup({
        id: p.id,
        x: p.x,
        y: p.y,
        name: p.name
      }));
    }
  }

  // 4. Build Hiding Spots (Lockers & Maintenance Alcoves)
  const hidingSpotsData = [
    { id: 'locker-hab-1', name: 'Crew Locker A-1', x: 7 * 32 + 16, y: 12 * 32 + 16, sector: 'habitation' },
    { id: 'locker-sec-1', name: 'Armory Storage Locker', x: 28 * 32 + 16, y: 14 * 32 + 16, sector: 'security' },
    { id: 'locker-cryo-1', name: 'Cryo Decon Pod', x: 52 * 32 + 16, y: 9 * 32 + 16, sector: 'cryo' },
    { id: 'locker-hyd-1', name: 'Bio-Storage Alcove', x: 50 * 32 + 16, y: 32 * 32 + 16, sector: 'hydroponics' },
    { id: 'locker-pwr-1', name: 'Turbine Access Locker', x: 46 * 32 + 16, y: 52 * 32 + 16, sector: 'power' },
    { id: 'locker-srv-1', name: 'Server Rack Chamber', x: 12 * 32 + 16, y: 48 * 32 + 16, sector: 'server_core' }
  ];
  for (const h of hidingSpotsData) {
    interactables.push(new HidingSpot(h));
  }

  // 5. Build Environmental Hazards
  const hazardsData = [
    { id: 'hazard-elec-1', hazardType: 'electric', x: 53 * 32 + 16, y: 48 * 32 + 16, radius: 36 },
    { id: 'hazard-elec-2', hazardType: 'electric', x: 48 * 32 + 16, y: 56 * 32 + 16, radius: 34 },
    { id: 'hazard-cryo-1', hazardType: 'cryo', x: 50 * 32 + 16, y: 14 * 32 + 16, radius: 42 }
  ];
  for (const hz of hazardsData) {
    interactables.push(new HazardZone(hz));
  }

  // 6. Tactical Pickups (Extra Sonic Decoy & EMP Charge)
  interactables.push(new SonicDecoyPickup({ id: 'pickup-decoy-sec', name: 'Sonic Decoy Flare', x: 25 * 32 + 16, y: 10 * 32 + 16 }));
  interactables.push(new EMPChargePickup({ id: 'pickup-emp-pwr', name: 'EMP Pulse Capacitor', x: 57 * 32 + 16, y: 46 * 32 + 16 }));

  return interactables;
}
