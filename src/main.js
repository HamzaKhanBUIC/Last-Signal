/**
 * THE LAST SIGNAL — MAIN APPLICATION BOOTSTRAPPER
 * Orchestrates and wires all engine subsystems, UI overlays, minigames,
 * audio synthesizers, 2D raycast lighting, and entity factories.
 */

import { Engine } from './core/Engine.js';
import { HUD } from './ui/HUD.js';
import { TerminalUI } from './ui/TerminalUI.js';
import { DecryptionMinigame } from './ui/DecryptionMinigame.js';
import { MenuManager } from './ui/MenuManager.js';
import { Renderer } from './rendering/Renderer.js';
import { LightingSystem } from './rendering/LightingSystem.js';
import { SpriteGenerator } from './rendering/SpriteGenerator.js';
import { PostProcessing } from './rendering/PostProcessing.js';
import { Player } from './entities/Player.js';
import { EnemyAI } from './entities/EnemyAI.js';
import { createInteractablesFromMap } from './entities/Interactable.js';
import { ParticleSystem } from './entities/Particle.js';
import { PATROL_WAYPOINTS } from './world/MapData.js';
import {
  GAME_STATES,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  INPUT_ACTIONS
} from './utils/Constants.js';

window.addEventListener('DOMContentLoaded', async () => {
  console.log('====================================================');
  console.log('  THE LAST SIGNAL — BOOTSTRAPPING SUBSYSTEMS...    ');
  console.log('====================================================');

  const canvas = document.getElementById('game-canvas');
  const webglCanvas = document.getElementById('webgl-canvas');
  if (!canvas) {
    console.error('[Main] Target #game-canvas not found!');
    return;
  }

  // 1. Instantiate Core Game Engine (with dual-layer WebGL canvas)
  const engine = new Engine(canvas, { webglCanvas });

  // 2. Instantiate Rendering Subsystems
  const spriteGen = new SpriteGenerator();
  spriteGen.init();

  const lighting = new LightingSystem(CANVAS_WIDTH, CANVAS_HEIGHT);
  const postFX = new PostProcessing(CANVAS_WIDTH, CANVAS_HEIGHT);

  const renderer = new Renderer({
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    spriteGenerator: spriteGen,
    lighting,
    postProcessing: postFX
  });

  // 3. Instantiate UI & Minigame Subsystems
  const hud = new HUD(engine.eventBus);

  const decryptionMinigame = new DecryptionMinigame({
    audio: engine.audio,
    eventBus: engine.eventBus
  });

  const terminalUI = new TerminalUI({
    audio: engine.audio,
    eventBus: engine.eventBus,
    gameState: engine.gameState,
    decryptionMinigame
  });

  const menuManager = new MenuManager({
    audio: engine.audio,
    eventBus: engine.eventBus,
    gameState: engine.gameState,
    onStartGame: (opts) => startSession(opts),
    onRestartGame: () => startSession({ tutorial: true })
  });

  // 4. Session Start / Reset Helper
  function startSession(options = {}) {
    console.log('[Main] Initializing fresh gameplay session...', options);

    // Particle System
    const particles = new ParticleSystem(600);

    // Player Entity
    const spawn = engine.level.getPlayerSpawn();
    const player = new Player({
      x: spawn.x,
      y: spawn.y,
      eventBus: engine.eventBus,
      gameState: engine.gameState
    });

    // NEXUS-9 Rogue AI Boss Entity
    const enemySpawn = engine.level.getEnemySpawn();
    const enemy = new EnemyAI({
      x: enemySpawn.x,
      y: enemySpawn.y,
      eventBus: engine.eventBus,
      waypoints: PATROL_WAYPOINTS || []
    });

    // Interactable Station Props (Doors, Terminals, Fragments, Batteries, Medkits)
    const interactables = createInteractablesFromMap(engine.level);

    // Start Engine Session
    engine.startNewGame({
      player,
      enemy,
      interactables,
      particles
    });

    // Trigger guided tutorial if requested
    if (options.tutorial !== false) {
      engine.tutorial?.startTutorial();
    } else {
      engine.tutorial?.skipTutorial();
      hud.showToast('EXPERT MODE: SURVIVE AEGIS-7 AND BROADCAST THE SIGNAL', 'info', 4.5);
    }
  }

  // 5. Initialize Engine with injected modules
  await engine.init({
    Renderer: renderer,
    LightingSystem: lighting,
    SpriteGenerator: spriteGen,
    HUD: hud,
    TerminalUI: terminalUI,
    DecryptionMinigame: decryptionMinigame,
    MenuManager: menuManager
  });

  // 6. Connect Canvas Mouse Clicks to Menus & Terminals
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (engine.gameState.state === GAME_STATES.TITLE ||
        engine.gameState.state === GAME_STATES.PAUSED ||
        engine.gameState.state === GAME_STATES.GAMEOVER ||
        engine.gameState.state === GAME_STATES.VICTORY) {
      menuManager.handleClick(mouseX, mouseY);
    } else if (engine.gameState.state === GAME_STATES.TERMINAL) {
      terminalUI.handleClick(mouseX, mouseY);
    }
  });

  // 7. Connect Keyboard input forwarding for Menus & Terminals
  window.addEventListener('keydown', () => {
    if (engine.gameState.state === GAME_STATES.TITLE ||
        engine.gameState.state === GAME_STATES.PAUSED ||
        engine.gameState.state === GAME_STATES.GAMEOVER ||
        engine.gameState.state === GAME_STATES.VICTORY) {
      menuManager.handleInput(engine.input);
    } else if (engine.gameState.state === GAME_STATES.TERMINAL) {
      terminalUI.handleInput(engine.input);
    }
  });

  // 8. Dynamic CRT Scanlines Overlay Toggle
  const crtOverlay = document.getElementById('crt-overlay');
  if (crtOverlay) {
    engine.eventBus.on('STATE_CHANGED', () => {
      if (menuManager.settings.crtScanlines) {
        crtOverlay.classList.remove('disabled');
      } else {
        crtOverlay.classList.add('disabled');
      }
    });
  }

  // 9. Mobile Touch Controls Setup
  setupTouchControls(engine);

  // 10. Start Animation Loop
  engine.start();
  console.log('[Main] THE LAST SIGNAL initialized and running in TITLE state.');
});

/**
 * Binds touch / mobile on-screen controls to Engine input manager.
 * @param {Engine} engine
 */
function setupTouchControls(engine) {
  const joystickZone = document.getElementById('touch-joystick');
  const joystickStick = document.getElementById('touch-joystick-stick');
  if (!joystickZone || !joystickStick) return;

  let touchId = null;
  let startX = 0;
  let startY = 0;
  const maxRadius = 45;

  joystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        let dx = touch.clientX - startX;
        let dy = touch.clientY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }

        joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
        engine.input.setVirtualMovement(dx / maxRadius, dy / maxRadius, true);
        break;
      }
    }
  }, { passive: false });

  const endJoystick = (e) => {
    if (touchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        touchId = null;
        joystickStick.style.transform = 'translate(0px, 0px)';
        engine.input.setVirtualMovement(0, 0, false);
        break;
      }
    }
  };

  window.addEventListener('touchend', endJoystick);
  window.addEventListener('touchcancel', endJoystick);

  // Tactical Touch & Mouse Buttons
  const bindTouchButton = (elemId, action) => {
    const btn = document.getElementById(elemId);
    if (!btn) return;

    // Mobile touch events
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      engine.input.setVirtualAction(action, true);
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      engine.input.setVirtualAction(action, false);
    }, { passive: false });

    // Desktop mouse events
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btn.classList.add('active');
      engine.input.setVirtualAction(action, true);
    });

    btn.addEventListener('mouseup', (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      engine.input.setVirtualAction(action, false);
    });

    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('active');
      engine.input.setVirtualAction(action, false);
    });
  };

  bindTouchButton('btn-interact', INPUT_ACTIONS.INTERACT);
  bindTouchButton('btn-flashlight', INPUT_ACTIONS.FLASHLIGHT);
  bindTouchButton('btn-sprint', INPUT_ACTIONS.SPRINT);
  bindTouchButton('btn-sneak', INPUT_ACTIONS.CROUCH);
  bindTouchButton('btn-medkit', INPUT_ACTIONS.USE_MEDKIT);
  bindTouchButton('btn-battery', INPUT_ACTIONS.USE_BATTERY);
  bindTouchButton('btn-decoy', INPUT_ACTIONS.USE_DECOY);
  bindTouchButton('btn-emp', INPUT_ACTIONS.USE_EMP);
  bindTouchButton('btn-map', INPUT_ACTIONS.MAP);
  bindTouchButton('btn-pause', INPUT_ACTIONS.PAUSE);
}
