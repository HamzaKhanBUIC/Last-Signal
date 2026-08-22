/**
 * THE LAST SIGNAL — MAIN GAME ENGINE CORE
 * Master orchestrator managing loop lifecycle, subsystems, event binding, and updates.
 */

import { GAME_STATES, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, COLORS, EVENTS } from '../utils/Constants.js';
import { EventBus } from './EventBus.js';
import { InputManager } from './InputManager.js';
import { GameState } from './GameState.js';
import { Camera } from './Camera.js';
import { LevelManager } from '../world/LevelManager.js';
import { Pathfinding } from '../world/Pathfinding.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { SonicDecoy } from '../entities/Interactable.js';
import { SaveSystem } from './SaveSystem.js';
import { StationPASystem } from '../audio/StationPASystem.js';
import { ThreatSystem } from './ThreatSystem.js';
import { EventDirector } from './EventDirector.js';
import { CCTVUI } from '../ui/CCTVUI.js';
import { AudioLogSystem } from '../audio/AudioLogSystem.js';
import { SurvivalSystem } from './SurvivalSystem.js';
import { CraftingSystem } from './CraftingSystem.js';
import { CraftingUI } from '../ui/CraftingUI.js';
import { ThreeRenderer } from '../rendering/ThreeRenderer.js';
import { TutorialSystem } from './TutorialSystem.js';

export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    // Subsystems
    this.eventBus = new EventBus();
    this.input = new InputManager();
    this.gameState = new GameState(this.eventBus);
    this.camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.level = new LevelManager();
    this.pathfinding = new Pathfinding(this.level);
    this.audio = new SoundEngine();

    // V2.0 Extended Systems
    this.saveSystem = new SaveSystem(this.eventBus);
    this.paSystem = new StationPASystem(this.eventBus, this.audio.synth);
    this.threatSystem = new ThreatSystem(this.eventBus, this.gameState, this.paSystem);
    this.eventDirector = new EventDirector(this.eventBus, this.gameState);
    this.cctvUI = new CCTVUI(this.eventBus, this.gameState);
    this.audioLogs = new AudioLogSystem(this.eventBus, this.audio);

    // CDDA-Inspired Deep Survival & Crafting Systems
    this.survival = new SurvivalSystem(this.eventBus);
    this.crafting = new CraftingSystem(this.eventBus);
    this.craftingUI = new CraftingUI(this.eventBus, this.crafting);
    this.threeRenderer = new ThreeRenderer(options.webglCanvas || null);
    this.tutorial = new TutorialSystem(this.eventBus);

    // Rendering & Entities (wired on initialization)
    this.renderer = null;
    this.lighting = null;
    this.spriteGenerator = null;
    this.hud = null;
    this.terminalUI = null;
    this.decryptionMinigame = null;
    this.menuManager = null;

    // Entities in World
    this.player = null;
    this.enemy = null;
    this.interactables = [];
    this.particles = [];

    // Loop Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1 / 60; // 60Hz fixed physics step
    this.isRunning = false;
    this.animationFrameId = null;

    // Active Sector Tracking
    this.currentSector = 'Unknown';

    // Proximity tracker
    this.entityDistance = 9999;
  }

  /**
   * Initializes all subsystems, bindings, and start conditions.
   * @param {Object} modules Injected rendering, UI, and entity modules
   */
  async init(modules = {}) {
    console.log('[Engine] Initializing THE LAST SIGNAL engine...');

    // Assign injected modules
    if (modules.Renderer) this.renderer = modules.Renderer;
    if (modules.LightingSystem) this.lighting = modules.LightingSystem;
    if (modules.SpriteGenerator) this.spriteGenerator = modules.SpriteGenerator;
    if (modules.HUD) this.hud = modules.HUD;
    if (modules.TerminalUI) this.terminalUI = modules.TerminalUI;
    if (modules.DecryptionMinigame) this.decryptionMinigame = modules.DecryptionMinigame;
    if (modules.MenuManager) this.menuManager = modules.MenuManager;

    // Setup Canvas Resolution
    this.resizeCanvas();
    if (typeof window !== 'undefined' && window && typeof window.addEventListener === 'function') {
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    // Setup Camera Bounds based on Map
    this.camera.setWorldBounds(
      0,
      0,
      this.level.width * this.level.tileSize,
      this.level.height * this.level.tileSize
    );

    // Bind Event Listeners
    this.bindEvents();

    // Bind Input Listeners
    if (this.canvas) {
      this.input.init(this.canvas);
    }

    // Audio lazy unlock
    this.input.onFirstInteraction(() => {
      this.audio.init();
    });

    console.log('[Engine] Engine initialization complete.');
  }

  /**
   * Sets canvas dimensions and scaling for crisp pixel-ratio rendering.
   */
  resizeCanvas() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      if (this.canvas) {
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
      }
      this.camera.setViewport(CANVAS_WIDTH, CANVAS_HEIGHT);
      return;
    }

    const winW = window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 1280;
    const winH = window.innerHeight || (document.documentElement && document.documentElement.clientHeight) || 720;

    // Maintain 16:9 aspect ratio
    const targetAspect = 16 / 9;
    let width = winW;
    let height = winW / targetAspect;

    if (height > winH) {
      height = winH;
      width = winH * targetAspect;
    }

    const bezel = document.querySelector('.crt-bezel');
    if (bezel && bezel.style) {
      bezel.style.width = `${Math.floor(width)}px`;
      bezel.style.height = `${Math.floor(height)}px`;
    }

    if (this.canvas && this.canvas.style) {
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
    }
    if (this.canvas) {
      this.canvas.width = CANVAS_WIDTH;
      this.canvas.height = CANVAS_HEIGHT;
    }

    this.camera.setViewport(CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Subscribes to events across the game ecosystem.
   */
  bindEvents() {
    // State Changes
    this.eventBus.on('STATE_CHANGED', (data = {}) => {
      const fromState = data.from || data.oldState;
      const toState = data.to || data.newState;
      console.log(`[Engine] Game state changed from ${fromState} to ${toState}`);
      if (toState === GAME_STATES.PLAYING) {
        this.audio.startAmbientDrone();
      } else if (toState === GAME_STATES.GAMEOVER) {
        this.audio.playGameOver();
        this.camera.shake(1.5, 1.0);
      } else if (toState === GAME_STATES.VICTORY) {
        this.audio.playVictory();
      }
    });

    // Player Noise Generation (triggers acoustic awareness for AI)
    this.eventBus.on('PLAYER_NOISE', (data) => {
      if (this.enemy && this.enemy.active) {
        this.enemy.hearNoise(data.x, data.y, data.radius);
      }
    });

    // Flashlight Toggle
    this.eventBus.on('FLASHLIGHT_TOGGLED', (data) => {
      this.audio.playFlashlightToggle(data.isOn, this.player ? { x: this.player.x, y: this.player.y } : null);
      if (this.enemy && data.isOn) {
        this.enemy.checkFlashlightAlert(this.player);
      }
    });

    // Player Damaged
    this.eventBus.on('PLAYER_DAMAGED', (data) => {
      this.audio.playPlayerHit(data.amount, this.player);
      this.camera.shake(1.2, 0.4);
      this.input.vibrateGamepad(0.8, 0.4, 300);
      if (this.particles) {
        this.particles.emitBloodSpatter?.(this.player.x, this.player.y, data.angle || 0);
      }
    });

    // Item Collected
    this.eventBus.on('ITEM_COLLECTED', (data) => {
      this.audio.playPickup(data.type, { x: data.x, y: data.y });
      this.hud?.showToast(`ACQUIRED: ${data.name}`);
    });

    // Terminal Interaction
    this.eventBus.on('TERMINAL_OPENED', (terminal) => {
      this.audio.playTerminalBoot();
      if (terminal && (terminal.id === 'TERM-SEC-01' || terminal.type === 'cctv')) {
        this.gameState.setState(GAME_STATES.CCTV);
        this.cctvUI?.open(0);
      } else {
        this.gameState.setState(GAME_STATES.TERMINAL);
        this.terminalUI?.open(terminal);
      }
    });

    // CCTV Events
    this.eventBus.on(EVENTS.CCTV_OPENED, () => {
      this.gameState.setState(GAME_STATES.CCTV);
    });

    this.eventBus.on(EVENTS.CCTV_CLOSED, () => {
      this.gameState.setState(GAME_STATES.PLAYING);
    });

    // Door Interacted
    this.eventBus.on('DOOR_OPENED', (door) => {
      this.audio.playDoorSlide(true, { x: door.x, y: door.y });
    });

    this.eventBus.on('DOOR_LOCKED', (door) => {
      this.audio.playDoorLocked({ x: door.x, y: door.y });
      this.hud?.showToast(`SECURITY LOCK: ${door.requiredKey || 'RESTRICTED'}`);
    });

    // Entity Screech / Chase
    this.eventBus.on('ENTITY_SCREECH', (data) => {
      this.audio.playEntityScreech(data.distance, data.pos);
      this.camera.shake(0.8, 0.6);
      this.hud?.showToast('WARNING: HOSTILE AI DETECTED // NEXUS-9 PURSUIT');
    });

    // Entity Proximity
    this.eventBus.on('ENTITY_PROXIMITY', (data) => {
      this.entityDistance = data.distance;
      this.audio.setEntityDistance(data.distance);
    });

    // Decoy Deployed
    this.eventBus.on('DECOY_DEPLOYED', (data) => {
      const decoy = new SonicDecoy({ x: data.x, y: data.y, eventBus: this.eventBus });
      this.interactables.push(decoy);
    });

    // Universal Audio Triggers
    this.eventBus.on('AUDIO_TRIGGER', (data = {}) => {
      if (!this.audio) return;
      if (data.type === 'decoy_chirp') this.audio.playDecoyChirp?.(data.pos);
      else if (data.type === 'emp_surge') this.audio.playEMPSurge?.();
      else if (data.type === 'electric_zap') this.audio.playElectricZap?.(data.pos);
      else if (data.type === 'cryo_steam') this.audio.playCryoSteam?.(data.pos);
      else if (data.type === 'ai_whisper') this.audio.playAIWhisper?.(data.distance);
      else if (data.type === 'pickup') this.audio.playPickup?.('item');
    });

    // Locker Hiding SFX
    this.eventBus.on('PLAYER_HIDDEN', () => this.audio.playLockerEnter?.(true));
    this.eventBus.on('PLAYER_UNHIDDEN', () => this.audio.playLockerEnter?.(false));
  }

  /**
   * Resets and starts a fresh new game session.
   * @param {Object} entities Constructed player, enemy, interactables, particles instances
   */
  startNewGame(entities = {}) {
    console.log('[Engine] Starting fresh game session...');

    this.gameState.reset();
    this.interactables = entities.interactables || [];
    this.player = entities.player || null;
    this.enemy = entities.enemy || null;
    this.particles = entities.particles || null;

    if (this.player) {
      const spawn = this.level.getPlayerSpawn();
      this.player.x = spawn.x;
      this.player.y = spawn.y;
      this.camera.snapTo(this.player.x, this.player.y);
      this.camera.follow(this.player);
    }

    if (this.enemy) {
      const enemySpawn = this.level.getEnemySpawn();
      this.enemy.x = enemySpawn.x;
      this.enemy.y = enemySpawn.y;
    }

    this.gameState.setState(GAME_STATES.PLAYING);
    this.gameState.updateObjective('Locate Signal Fragment Alpha [CRY-01] in Cryo Bay.');

    if (!this.isRunning) {
      this.start();
    }
  }

  /**
   * Starts game animation loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.loop = (currentTime) => {
      if (!this.isRunning) return;
      if (typeof requestAnimationFrame !== 'undefined') {
        this.animationFrameId = requestAnimationFrame(this.loop);
      }
      const now = currentTime || (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.update(delta);
      this.render();
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  /**
   * Stops game animation loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.animationFrameId);
      } else if (typeof clearTimeout !== 'undefined') {
        clearTimeout(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
  }

  /**
   * Master Update Step.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    // Always update Input states
    this.input.update();

    // Check Pause Toggle
    if (this.input.wasActionJustPressed('PAUSE')) {
      if (this.gameState.state === GAME_STATES.PLAYING) {
        this.gameState.setState(GAME_STATES.PAUSED);
      } else if (this.gameState.state === GAME_STATES.PAUSED) {
        this.gameState.setState(GAME_STATES.PLAYING);
      }
    }

    // Check Tactical Map Toggle
    if (this.input.wasActionJustPressed('MAP')) {
      this.hud?.toggleMap();
    }

    // Only update gameplay physics/AI if in PLAYING state
    if (this.gameState.state === GAME_STATES.PLAYING) {
      this.accumulator += dt;

      while (this.accumulator >= this.fixedStep) {
        this.fixedUpdate(this.fixedStep);
        this.accumulator -= this.fixedStep;
      }

      // Update Game Timer
      this.gameState.updateTimer(dt);

      // Camera Lerp & Shake
      this.camera.update(dt);

      // Audio engine tick (listener positioning & proximity)
      if (this.player) {
        this.audio.update(dt, this.player, this.enemy, this.interactables);
      }

      // Threat & Event Director Ticks
      this.threatSystem?.update(this.gameState, this.enemy);
      this.eventDirector?.update(dt, this.player, this.enemy, this.threatSystem?.threatLevel || 0);
      this.paSystem?.update(dt);

      // Particles Update
      this.particles?.update?.(dt);
    } else if (this.gameState.state === GAME_STATES.TERMINAL) {
      this.terminalUI?.update?.(dt);
    } else if (this.gameState.state === GAME_STATES.CCTV) {
      this.cctvUI?.handleInput(this.input);
      this.cctvUI?.update(dt, this.enemy);
    } else if (this.gameState.state === GAME_STATES.TITLE || this.gameState.state === GAME_STATES.PAUSED) {
      this.menuManager?.update?.(dt);
    }

    // UI Toast and animations
    this.hud?.update?.(dt);
  }

  /**
   * Fixed 60Hz Physics & AI update tick.
   * @param {number} fixedDt
   */
  fixedUpdate(fixedDt) {
    // 1. Update Player
    if (this.player) {
      this.player.update(fixedDt, this.input, this.level, this.camera);

      // Check current sector
      const sector = this.level.getSectorAt(this.player.x, this.player.y);
      if (sector && sector.name !== this.currentSector) {
        this.currentSector = sector.name;
        this.hud?.showToast(`ENTERING: ${sector.name}`);
      }
    }

    // 2. Update Enemy AI
    if (this.enemy && this.enemy.active) {
      this.enemy.update(fixedDt, this.player, this.level, this.pathfinding);
    }

    // 3. Update Interactables
    for (let i = 0; i < this.interactables.length; i++) {
      const item = this.interactables[i];
      if (item.active) {
        item.update(fixedDt, this.player, this.gameState, this.eventBus);
      }
    }

    // 4. Check Proximity & Aura
    if (this.player && this.enemy && this.enemy.active) {
      const dx = this.player.x - this.enemy.x;
      const dy = this.player.y - this.enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.entityDistance = dist;
      this.eventBus.emit('ENTITY_PROXIMITY', { distance: dist, entity: this.enemy });
    }

    // 5. Update Audio Log System
    this.audioLogs?.update(fixedDt);

    // 6. Update CDDA Survival & Physiology Simulation
    if (this.player && this.survival) {
      const sectorInfo = this.level?.getSectorAt(this.player.x, this.player.y);
      this.survival.update(fixedDt, sectorInfo, this.gameState, this.particles, this.player);
      this.gameState.survivalReport = this.survival.getReport();
      this.player.speedMultiplier = this.survival.getMovementMultiplier();
    }

    // 7. Update Guided Tutorial Engine
    this.tutorial?.update(fixedDt, this.player);
  }

  /**
   * Master Render Step.
   */
  render() {
    // 0. Clear canvas to deep space station background
    this.ctx.fillStyle = COLORS.BACKGROUND_BLACK;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.gameState.state === GAME_STATES.TITLE) {
      this.menuManager?.renderTitle(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
      return;
    }

    if (this.gameState.state === GAME_STATES.CCTV) {
      this.cctvUI?.render(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT, this.level, this.enemy, this.player);
      return;
    }

    // Apply Camera Viewport Transform
    this.camera.apply(this.ctx);

    // 1. Render World Tilemap (Floors, Walls, Bulkheads, Decals)
    this.renderer?.renderWorld(this.ctx, this.level, this.camera);

    // 2. Render Interactive Station Props (Doors, Terminals, Fragments, Batteries, Medkits, Lockers)
    if (this.interactables) {
      for (const item of this.interactables) {
        if (item.active && this.camera.isRectInView(item.x - 48, item.y - 48, 96, 96)) {
          item.render(this.ctx, this.camera);
        }
      }
    }

    // 3. Render Floor Particles (Steam, dust motes)
    this.particles?.renderFloor?.(this.ctx, this.camera);

    // 4. Render Entities (Dr. Vance, NEXUS-9)
    if (this.player) this.player.render(this.ctx, this.camera);
    if (this.enemy && this.enemy.active) this.enemy.render(this.ctx, this.camera);

    // 5. Render Top Particles (Sparks, blood splatters, glitch shards)
    this.particles?.renderTop?.(this.ctx, this.camera);

    // Restore Camera context before Lighting & UI Overlays
    this.camera.restore(this.ctx);

    // 6. Dynamic 2D Lighting & Soft Shadow Mask
    if (this.lighting && this.gameState.state !== GAME_STATES.TITLE) {
      this.lighting.render(this.ctx, this.player, this.enemy, this.level, this.camera);
    }

    // 7. Post-Processing Effects (CRT Scanlines, Chromatic Aberration, Glitch)
    if (this.renderer?.postProcessing) {
      this.renderer.postProcessing.render(this.ctx, this.entityDistance, this.camera.trauma);
    }

    // 8. HUD & UI Overlays (with Tutorial Guidance Banner)
    if (this.gameState.state === GAME_STATES.PLAYING || this.gameState.state === GAME_STATES.PAUSED) {
      this.hud?.render(
        this.ctx,
        this.gameState,
        this.player,
        this.enemy,
        this.currentSector,
        this.tutorial?.getCurrentStep()
      );
    }

    // 9. Modal UI (Terminal, Minigame, Pause, GameOver, Victory, Crafting)
    if (this.craftingUI?.isOpen) {
      this.craftingUI.render(this.ctx, this.gameState);
    } else if (this.gameState.state === GAME_STATES.TERMINAL) {
      this.terminalUI?.render(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (this.gameState.state === GAME_STATES.PAUSED) {
      this.menuManager?.renderPause(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (this.gameState.state === GAME_STATES.GAMEOVER) {
      this.menuManager?.renderGameOver(this.ctx, this.gameState, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (this.gameState.state === GAME_STATES.VICTORY) {
      this.menuManager?.renderVictory(this.ctx, this.gameState, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
}
