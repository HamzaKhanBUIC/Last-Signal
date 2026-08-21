/**
 * THE LAST SIGNAL — PLAYER CONTROLLER ENTITY
 * 
 * Manages player mechanics:
 * - Omnidirectional movement with acceleration, velocity damping, and wall sliding collision.
 * - Multi-tier stance system (WALKING, SPRINTING, CROUCHING) modulating speed and acoustic noise footprint.
 * - Aim tracking & directional flashlight mechanics with dynamic battery drain and toggle states.
 * - Noise emission pipeline triggering acoustic awareness in NEXUS-9 AI.
 * - Health management, i-frames (invulnerability frames), damage knockback, and screen shake triggers.
 * - Proximity-based interaction querying and execution.
 */

import { Entity } from './Entity.js';
import {
  PLAYER_RADIUS,
  PLAYER_WALK_SPEED,
  PLAYER_SPRINT_SPEED,
  PLAYER_CROUCH_SPEED,
  PLAYER_ACCELERATION,
  PLAYER_FRICTION,
  PLAYER_MAX_HEALTH,
  INTERACTION_RADIUS,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_CONE_ANGLE,
  NOISE_RADIUS_IDLE,
  NOISE_RADIUS_WALK,
  NOISE_RADIUS_SPRINT,
  NOISE_RADIUS_CROUCH,
  INPUT_ACTIONS,
  EVENTS,
  COLORS
} from '../utils/Constants.js';
import { angleTo, clamp, distance } from '../utils/MathUtils.js';

export const PLAYER_STANCES = Object.freeze({
  WALKING: 'WALKING',
  SPRINTING: 'SPRINTING',
  CROUCHING: 'CROUCHING'
});

export class Player extends Entity {
  /**
   * @param {Object} [config={}]
   * @param {number} [config.x=0] Spawn X
   * @param {number} [config.y=0] Spawn Y
   * @param {import('../core/EventBus.js').EventBus} [config.eventBus]
   * @param {import('../core/GameState.js').GameState} [config.gameState]
   */
  constructor(config = {}) {
    super({
      id: config.id || 'player_main',
      type: 'player',
      x: config.x || 0,
      y: config.y || 0,
      radius: config.radius || PLAYER_RADIUS,
      speed: PLAYER_WALK_SPEED,
      angle: config.angle || 0
    });

    // Subsystem references
    this.eventBus = config.eventBus || null;
    this.gameState = config.gameState || null;

    // Movement physics
    this.acceleration = PLAYER_ACCELERATION;
    this.friction = PLAYER_FRICTION;
    this.targetSpeed = PLAYER_WALK_SPEED;
    this.isMoving = false;

    // Stance
    this.stance = PLAYER_STANCES.WALKING;

    // Health & Combat
    this.health = PLAYER_MAX_HEALTH;
    this.maxHealth = PLAYER_MAX_HEALTH;
    this.invulnerable = false;
    this.invulnerabilityTimer = 0;
    this.invulnerabilityDuration = 0.8; // Seconds of damage i-frames

    // Flashlight & Vision
    this.isFlashlightOn = true;
    this.flashlightAngle = 0;
    this.flashlightDistance = FLASHLIGHT_DISTANCE;
    this.flashlightConeAngle = FLASHLIGHT_CONE_ANGLE;

    // Noise Emission
    this.noiseRadius = NOISE_RADIUS_IDLE;
    this.noiseEmitTimer = 0;
    this.noiseEmitInterval = 0.25; // Interval in seconds to broadcast continuous footstep noise
    this.footstepDistance = 0;
    this.footstepThreshold = 38; // Pixels traveled per footstep audio trigger

    // Interaction & Hiding
    this.interactionRadius = INTERACTION_RADIUS;
    this.closestInteractable = null;
    this.isHiding = false;
    this.currentHidingSpot = null;
    this.speedMultiplier = 1.0;

    // Sync with GameState if available
    if (this.gameState) {
      this.health = this.gameState.playerHealth;
      this.isFlashlightOn = this.gameState.isFlashlightOn;
    }
  }

  /**
   * Sets or updates the GameState reference
   * @param {import('../core/GameState.js').GameState} gameState
   */
  setGameState(gameState) {
    this.gameState = gameState;
    if (this.gameState) {
      this.health = this.gameState.playerHealth;
      this.isFlashlightOn = this.gameState.isFlashlightOn;
    }
  }

  /**
   * Sets or updates the EventBus reference
   * @param {import('../core/EventBus.js').EventBus} eventBus
   */
  setEventBus(eventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Main player physics, input, stance, noise, and interaction update tick
   * @param {number} dt Delta time in seconds
   * @param {import('../core/InputManager.js').InputManager} [input]
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @param {import('../core/Camera.js').Camera} [camera]
   * @param {Array<import('./Interactable.js').Interactable>} [interactables=[]]
   */
  update(dt, input = null, levelManager = null, camera = null, interactables = []) {
    if (!this.active) return;

    // 1. Update Invulnerability timer
    if (this.invulnerable) {
      this.invulnerabilityTimer -= dt;
      if (this.invulnerabilityTimer <= 0) {
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
      }
    }

    // 2. Process Input if available
    if (input) {
      this.handleInput(dt, input, camera, levelManager, interactables);
    } else {
      // Damping when no input controller
      this.vx *= Math.pow(this.friction, dt * 60);
      this.vy *= Math.pow(this.friction, dt * 60);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }

    // 3. Sync Health with GameState
    if (this.gameState) {
      this.health = this.gameState.playerHealth;
      this.isFlashlightOn = this.gameState.isFlashlightOn;
    }

    // 4. Update Noise Footprint & Emit Noise Events
    this.updateNoise(dt);
  }

  /**
   * Handles player input: movement, aiming, stance switching, flashlight, and item use
   * @param {number} dt
   * @param {import('../core/InputManager.js').InputManager} input
   * @param {import('../core/Camera.js').Camera} [camera]
   * @param {import('../world/LevelManager.js').LevelManager} [levelManager]
   * @param {Array<import('./Interactable.js').Interactable>} [interactables=[]]
   */
  handleInput(dt, input, camera, levelManager, interactables = []) {
    // 1. Aim towards mouse cursor world coordinates
    if (camera) {
      const mouseWorld = input.getMouseWorldPos(camera);
      this.angle = angleTo(this.x, this.y, mouseWorld.x, mouseWorld.y);
      this.flashlightAngle = this.angle;
    }

    // 2. Determine Movement Stance & Target Speed
    const moveVec = input.getMovementVector();
    const hasMoveInput = moveVec.x !== 0 || moveVec.y !== 0;

    const wantsSprint = input.isActionActive(INPUT_ACTIONS.SPRINT);
    const wantsCrouch = input.isActionActive(INPUT_ACTIONS.CROUCH);

    const hasStamina = this.gameState ? (!this.gameState.isExhausted && this.gameState.stamina > 0) : true;

    if (wantsSprint && hasStamina && hasMoveInput) {
      this.stance = PLAYER_STANCES.SPRINTING;
      this.targetSpeed = PLAYER_SPRINT_SPEED;
      if (this.gameState) {
        this.gameState.isSprinting = true;
        this.gameState.isCrouching = false;
      }
    } else if (wantsCrouch) {
      this.stance = PLAYER_STANCES.CROUCHING;
      this.targetSpeed = PLAYER_CROUCH_SPEED;
      if (this.gameState) {
        this.gameState.isSprinting = false;
        this.gameState.isCrouching = true;
      }
    } else {
      this.stance = PLAYER_STANCES.WALKING;
      this.targetSpeed = PLAYER_WALK_SPEED;
      if (this.gameState) {
        this.gameState.isSprinting = false;
        this.gameState.isCrouching = false;
      }
    }

    // 3. Velocity and Acceleration Integration
    const targetVx = moveVec.x * this.targetSpeed;
    const targetVy = moveVec.y * this.targetSpeed;

    if (hasMoveInput) {
      // Accelerate towards target velocity
      const accelStep = this.acceleration * dt;
      const dvx = targetVx - this.vx;
      const dvy = targetVy - this.vy;
      const dvLen = Math.hypot(dvx, dvy);

      if (dvLen > 0) {
        const step = Math.min(dvLen, accelStep);
        this.vx += (dvx / dvLen) * step;
        this.vy += (dvy / dvLen) * step;
      }
    } else {
      // Apply friction damping when no movement key is pressed
      const frictionFactor = Math.pow(this.friction, dt * 60);
      this.vx *= frictionFactor;
      this.vy *= frictionFactor;

      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }

    // 4. Proposed Position & Collision Resolution against World Tiles
    const speed = Math.hypot(this.vx, this.vy);
    this.isMoving = speed > 5;

    let nextX = this.x + this.vx * dt;
    let nextY = this.y + this.vy * dt;

    if (levelManager && typeof levelManager.resolveCircleCollision === 'function') {
      const resolved = levelManager.resolveCircleCollision(nextX, nextY, this.radius);
      nextX = resolved.x;
      nextY = resolved.y;
    }

    // Accumulate distance for footstep sound triggers
    const movedDist = Math.hypot(nextX - this.x, nextY - this.y);
    this.x = nextX;
    this.y = nextY;

    if (this.isMoving && movedDist > 0) {
      this.footstepDistance += movedDist;
      if (this.gameState) {
        this.gameState.stats.steps++;
      }

      if (this.footstepDistance >= this.footstepThreshold) {
        this.footstepDistance = 0;
        this.emitFootstep();
      }
    }

    // Reset speed multiplier each frame
    this.speedMultiplier = 1.0;

    // If currently hiding in locker/vent, suppress normal movement
    if (this.isHiding) {
      this.vx = 0;
      this.vy = 0;
      this.isMoving = false;

      if (interactables && interactables.length > 0) {
        this.findClosestInteractable(interactables);
      }
      if (input.wasActionJustPressed(INPUT_ACTIONS.INTERACT)) {
        this.triggerInteraction();
      }
      return;
    }

    // 5. Flashlight Toggle
    if (input.wasActionJustPressed(INPUT_ACTIONS.FLASHLIGHT)) {
      this.toggleFlashlight();
    }

    // 6. Quick Inventory Shortcuts (Medkit, Battery, Decoy, EMP)
    if (input.wasActionJustPressed(INPUT_ACTIONS.USE_MEDKIT)) {
      this.gameState?.useMedkit();
    }
    if (input.wasActionJustPressed(INPUT_ACTIONS.USE_BATTERY)) {
      this.gameState?.useBattery();
    }
    if (input.wasActionJustPressed(INPUT_ACTIONS.USE_DECOY)) {
      this.deployDecoy(input, camera, interactables);
    }
    if (input.wasActionJustPressed(INPUT_ACTIONS.USE_EMP)) {
      this.dischargeEMP();
    }

    // 7. Interaction Queries & Trigger
    if (interactables && interactables.length > 0) {
      this.findClosestInteractable(interactables);
    }

    if (input.wasActionJustPressed(INPUT_ACTIONS.INTERACT)) {
      this.triggerInteraction();
    }
  }

  /**
   * Deploys a Sonic Decoy flare towards aim direction.
   */
  deployDecoy(input, camera, interactables) {
    if (!this.gameState || !this.gameState.useDecoy()) return;

    let targetX = this.x + Math.cos(this.angle) * 140;
    let targetY = this.y + Math.sin(this.angle) * 140;

    if (camera && input) {
      const mouseWorld = input.getMouseWorldPos(camera);
      targetX = mouseWorld.x;
      targetY = mouseWorld.y;
    }

    this.eventBus?.emit('DECOY_DEPLOYED', {
      x: targetX,
      y: targetY,
      source: this
    });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'decoy_chirp', pos: { x: targetX, y: targetY } });
  }

  /**
   * Discharges an EMP Shockwave surge, stunning nearby hostile AI and electronics.
   */
  dischargeEMP() {
    if (!this.gameState || !this.gameState.useEMP()) return;

    this.eventBus?.emit('EMP_TRIGGERED', {
      x: this.x,
      y: this.y,
      radius: 280,
      source: this
    });
    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'emp_surge' });
    this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 14, duration: 0.5 });
  }

  /**
   * Toggles flashlight state and syncs with GameState and EventBus
   * @returns {boolean} New flashlight state
   */
  toggleFlashlight() {
    if (this.gameState) {
      this.isFlashlightOn = this.gameState.toggleFlashlight();
    } else {
      this.isFlashlightOn = !this.isFlashlightOn;
      this.eventBus?.emit(EVENTS.FLASHLIGHT_TOGGLED, { isOn: this.isFlashlightOn });
      this.eventBus?.emit('FLASHLIGHT_TOGGLED', { isOn: this.isFlashlightOn });
    }
    return this.isFlashlightOn;
  }

  /**
   * Sets explicit flashlight state
   * @param {boolean} on
   */
  setFlashlight(on) {
    if (this.gameState) {
      this.gameState.setFlashlight(on);
      this.isFlashlightOn = this.gameState.isFlashlightOn;
    } else {
      this.isFlashlightOn = on;
      this.eventBus?.emit(EVENTS.FLASHLIGHT_TOGGLED, { isOn: this.isFlashlightOn });
      this.eventBus?.emit('FLASHLIGHT_TOGGLED', { isOn: this.isFlashlightOn });
    }
  }

  /**
   * Updates acoustic noise footprint based on current movement and stance
   * Emits continuous and single-frame noise events for AI sensory perception
   * @param {number} dt
   */
  updateNoise(dt) {
    if (!this.isMoving) {
      this.noiseRadius = NOISE_RADIUS_IDLE;
    } else {
      switch (this.stance) {
        case PLAYER_STANCES.SPRINTING:
          this.noiseRadius = NOISE_RADIUS_SPRINT; // 300px
          break;
        case PLAYER_STANCES.WALKING:
          this.noiseRadius = NOISE_RADIUS_WALK; // 100px
          break;
        case PLAYER_STANCES.CROUCHING:
          this.noiseRadius = NOISE_RADIUS_CROUCH; // 0px
          break;
        default:
          this.noiseRadius = NOISE_RADIUS_IDLE;
          break;
      }
    }

    // Periodic noise broadcast to EventBus for AI acoustic stimulation
    if (this.noiseRadius > 0) {
      this.noiseEmitTimer += dt;
      if (this.noiseEmitTimer >= this.noiseEmitInterval) {
        this.noiseEmitTimer = 0;
        this.emitNoise(this.noiseRadius);
      }
    } else {
      this.noiseEmitTimer = 0;
    }
  }

  /**
   * Broadcasts a noise event to the game ecosystem
   * @param {number} radius Acoustic reach in pixels
   * @param {string} [source='movement']
   */
  emitNoise(radius, source = 'movement') {
    if (!this.eventBus || radius <= 0) return;

    const payload = {
      x: this.x,
      y: this.y,
      radius,
      stance: this.stance,
      source
    };

    // Emit both standard constants and direct engine listeners
    this.eventBus.emit(EVENTS.NOISE_EMITTED, payload);
    this.eventBus.emit('PLAYER_NOISE', payload);
  }

  /**
   * Emits footstep sound event based on surface and stance
   */
  emitFootstep() {
    if (!this.eventBus) return;

    this.eventBus.emit('PLAYER_FOOTSTEP', {
      x: this.x,
      y: this.y,
      stance: this.stance,
      isCrouching: this.stance === PLAYER_STANCES.CROUCHING,
      isSprinting: this.stance === PLAYER_STANCES.SPRINTING
    });
  }

  /**
   * Applies damage to player with invulnerability frames, screen shake, and knockback
   * @param {number} amount Damage value
   * @param {number} [sourceAngle] Angle from damage source for knockback calculation
   * @param {number} [knockbackForce=160] Knockback impulse strength
   * @returns {boolean} True if damage was applied
   */
  takeDamage(amount, sourceAngle = null, knockbackForce = 160) {
    if (this.invulnerable || this.health <= 0 || !this.active) {
      return false;
    }

    // Set invulnerability i-frames
    this.invulnerable = true;
    this.invulnerabilityTimer = this.invulnerabilityDuration;

    // Apply knockback impulse
    if (sourceAngle !== null) {
      this.vx = Math.cos(sourceAngle) * knockbackForce;
      this.vy = Math.sin(sourceAngle) * knockbackForce;
    }

    // Reduce health directly or via GameState
    if (this.gameState) {
      this.gameState.takeDamage(amount);
      this.health = this.gameState.playerHealth;
    } else {
      this.health = Math.max(0, this.health - amount);
      this.eventBus?.emit(EVENTS.PLAYER_DAMAGED, {
        damage: amount,
        currentHealth: this.health,
        maxHealth: this.maxHealth
      });
      this.eventBus?.emit('PLAYER_DAMAGED', {
        amount,
        damage: amount,
        currentHealth: this.health,
        angle: sourceAngle
      });
      this.eventBus?.emit(EVENTS.SCREEN_SHAKE, { intensity: 16, duration: 0.45 });
      this.eventBus?.emit('SCREEN_SHAKE', { intensity: 16, duration: 0.45 });

      if (this.health <= 0) {
        this.eventBus?.emit(EVENTS.PLAYER_DIED, { player: this });
      }
    }

    return true;
  }

  /**
   * Restores player health
   * @param {number} amount
   */
  heal(amount) {
    if (this.gameState) {
      this.gameState.heal(amount);
      this.health = this.gameState.playerHealth;
    } else {
      this.health = clamp(this.health + amount, 0, this.maxHealth);
      this.eventBus?.emit(EVENTS.PLAYER_HEALED, { currentHealth: this.health, restored: amount });
    }
  }

  /**
   * Finds the closest interactable entity within interaction radius
   * @param {Array<import('./Interactable.js').Interactable>} interactables
   * @returns {import('./Interactable.js').Interactable|null}
   */
  findClosestInteractable(interactables) {
    let closest = null;
    let closestDistSq = this.interactionRadius * this.interactionRadius;

    for (let i = 0; i < interactables.length; i++) {
      const item = interactables[i];
      if (!item || !item.active) continue;

      const dSq = this.distanceToSq(item);
      const effectiveRadius = (item.interactionRadius || this.interactionRadius);
      const maxSq = effectiveRadius * effectiveRadius;

      if (dSq <= maxSq && dSq < closestDistSq) {
        closestDistSq = dSq;
        closest = item;
      }
    }

    this.closestInteractable = closest;
    return closest;
  }

  /**
   * Triggers interaction with the closest interactable object
   * @returns {boolean} True if interaction was executed
   */
  triggerInteraction() {
    if (!this.closestInteractable || !this.closestInteractable.active) {
      return false;
    }

    const result = this.closestInteractable.interact(this, this.gameState, this.eventBus);
    
    // Interacting produces a small acoustic footprint
    this.emitNoise(80, 'interaction');

    return !!result;
  }

  /**
   * Renders the player sprite, directional aiming torch, and i-frame flicker
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/Camera.js').Camera} [camera]
   */
  render(ctx, camera) {
    if (!this.active || this.isHiding) return;

    // Flash/flicker during invulnerability i-frames
    if (this.invulnerable) {
      const flashPeriod = Math.sin(this.invulnerabilityTimer * 28);
      if (flashPeriod > 0) {
        ctx.globalAlpha = 0.35;
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // 1. Player Body Shadow
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();

    // 2. Space Suit Torso (Cyan/Teal survival aesthetic)
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = this.stance === PLAYER_STANCES.CROUCHING ? '#0f3a40' : '#1b4d5a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.stroke();

    // 3. Helmet Visor (Glow Amber / Gold)
    ctx.beginPath();
    ctx.arc(this.radius * 0.45, 0, this.radius * 0.45, -Math.PI / 3, Math.PI / 3);
    ctx.fillStyle = COLORS.AMBER_BRIGHT;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // 4. Tactical Flashlight Module on Shoulder
    ctx.fillStyle = '#475569';
    ctx.fillRect(this.radius * 0.2, -this.radius * 0.8, 8, 4);

    if (this.isFlashlightOn) {
      ctx.fillStyle = COLORS.CYAN_BRIGHT;
      ctx.fillRect(this.radius * 0.2 + 6, -this.radius * 0.8, 2, 4);
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;

    // 5. Interaction Prompt Badge if near an interactable
    if (this.closestInteractable && this.closestInteractable.active) {
      this.renderInteractionPrompt(ctx, this.closestInteractable);
    }
  }

  /**
   * Renders floating HUD interaction prompt badge above interactable target
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./Interactable.js').Interactable} item
   */
  renderInteractionPrompt(ctx, item) {
    const promptText = typeof item.getPrompt === 'function' 
      ? item.getPrompt(this, this.gameState) 
      : item.prompt || '[E] INTERACT';

    ctx.save();
    ctx.font = 'bold 11px "Courier New", monospace';
    const textWidth = ctx.measureText(promptText).width;
    const px = item.x;
    const py = item.y - item.radius - 14;

    // Badge Background
    ctx.fillStyle = 'rgba(5, 12, 18, 0.85)';
    ctx.strokeStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px - textWidth / 2 - 6, py - 12, textWidth + 12, 18, 3);
    ctx.fill();
    ctx.stroke();

    // Badge Text
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(promptText, px, py - 3);

    ctx.restore();
  }
}
