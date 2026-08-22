/**
 * THE LAST SIGNAL — MENU & MODAL MANAGER
 * Master menu controller managing Title Screen, Controls Guide, Settings Modal,
 * In-game Pause Menu, Game Over Screen, and Hyperspace Victory Screen.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  GAME_STATES
} from '../utils/Constants.js';

export class MenuManager {
  /**
   * @param {Object} [options]
   * @param {import('../audio/SoundEngine.js').SoundEngine} [options.audio]
   * @param {import('../core/EventBus.js').EventBus} [options.eventBus]
   * @param {import('../core/GameState.js').GameState} [options.gameState]
   * @param {Function} [options.onStartGame] Callback to start a new game session
   * @param {Function} [options.onRestartGame] Callback to restart game
   */
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.eventBus = options.eventBus || null;
    this.gameState = options.gameState || null;
    this.onStartGame = options.onStartGame || null;
    this.onRestartGame = options.onRestartGame || null;

    // Sub-modal state: null | 'CONTROLS' | 'SETTINGS'
    this.activeModal = null;

    // Selection indices for keyboard navigation
    this.titleSelectionIndex = 0;
    this.pauseSelectionIndex = 0;
    this.gameOverSelectionIndex = 0;
    this.victorySelectionIndex = 0;
    this.settingsSelectionIndex = 0;

    // Audio & Display Settings State
    this.settings = {
      masterVolume: 1.0,
      sfxVolume: 0.9,
      ambientVolume: 0.8,
      musicVolume: 0.85,
      crtScanlines: true
    };

    // Animation timer & Stars for title / victory warp effect
    this.animTime = 0;
    this.stars = this.generateStarfield(120);

    // Hitboxes for mouse / touch interaction
    this.hitboxes = [];
  }

  /**
   * Adjusts a numeric setting with clamping.
   * @param {string} key
   * @param {number} delta
   */
  adjustSetting(key, delta) {
    if (this.settings[key] !== undefined && typeof this.settings[key] === 'number') {
      this.settings[key] = Math.max(0, Math.min(1, this.settings[key] + delta));
      if (key === 'masterVolume') this.audio?.setMasterVolume?.(this.settings[key]);
      if (key === 'sfxVolume') this.audio?.setSFXVolume?.(this.settings[key]);
      if (key === 'ambientVolume') this.audio?.setAmbientVolume?.(this.settings[key]);
      if (key === 'musicVolume') this.audio?.setMusicVolume?.(this.settings[key]);
    }
  }

  /**
   * Toggles a boolean setting.
   * @param {string} key
   */
  toggleSetting(key) {
    if (this.settings[key] !== undefined && typeof this.settings[key] === 'boolean') {
      this.settings[key] = !this.settings[key];
    }
  }

  /**
   * Triggers an action button.
   * @param {string} action
   */
  triggerAction(action) {
    if (action === 'START' && this.onStartGame) this.onStartGame();
    if (action === 'RESTART' && this.onRestartGame) this.onRestartGame();
  }

  generateStarfield(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        z: Math.random() * 2.0 + 0.5,
        size: Math.random() * 1.8 + 0.5,
        brightness: Math.random() * 0.7 + 0.3
      });
    }
    return stars;
  }

  /**
   * Updates menu animation timers and warp stars.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.animTime += dt;

    // Animate starfield
    const isWarp = this.gameState && this.gameState.state === GAME_STATES.VICTORY;
    const speed = isWarp ? 380 : 15;

    this.stars.forEach(star => {
      if (isWarp) {
        // Streaking outward warp
        star.y += star.z * speed * dt;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      } else {
        star.y += star.z * speed * dt;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
      }
    });
  }

  /**
   * Master Input handling for all menus & modals.
   * @param {import('../core/InputManager.js').InputManager} input
   */
  handleInput(input) {
    // If a modal (Controls or Settings) is open, handle modal input
    if (this.activeModal === 'CONTROLS') {
      if (input.wasKeyJustPressed('Escape') || input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
        this.activeModal = null;
        this.audio?.playTerminalKeystroke();
      }
      return;
    }

    if (this.activeModal === 'SETTINGS') {
      this.handleSettingsInput(input);
      return;
    }

    const state = this.gameState ? this.gameState.state : GAME_STATES.TITLE;

    if (state === GAME_STATES.TITLE) {
      this.handleTitleInput(input);
    } else if (state === GAME_STATES.PAUSED) {
      this.handlePauseInput(input);
    } else if (state === GAME_STATES.GAMEOVER) {
      this.handleGameOverInput(input);
    } else if (state === GAME_STATES.VICTORY) {
      this.handleVictoryInput(input);
    }
  }

  handleTitleInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.titleSelectionIndex = (this.titleSelectionIndex + 3) % 4;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.titleSelectionIndex = (this.titleSelectionIndex + 1) % 4;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.activateTitleOption(this.titleSelectionIndex);
    }

    if (input.wasKeyJustPressed('Digit1')) this.activateTitleOption(0);
    if (input.wasKeyJustPressed('Digit2')) this.activateTitleOption(1);
    if (input.wasKeyJustPressed('Digit3')) this.activateTitleOption(2);
    if (input.wasKeyJustPressed('Digit4')) this.activateTitleOption(3);
  }

  activateTitleOption(idx) {
    this.audio?.playTerminalBeep('data');
    if (idx === 0) {
      if (this.onStartGame) this.onStartGame({ tutorial: true });
    } else if (idx === 1) {
      if (this.onStartGame) this.onStartGame({ tutorial: false });
    } else if (idx === 2) {
      this.activeModal = 'CONTROLS';
    } else if (idx === 3) {
      this.activeModal = 'SETTINGS';
    }
  }

  handlePauseInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.pauseSelectionIndex = (this.pauseSelectionIndex + 4) % 5;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.pauseSelectionIndex = (this.pauseSelectionIndex + 1) % 5;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.activatePauseOption(this.pauseSelectionIndex);
    }

    if (input.wasKeyJustPressed('Digit1')) this.activatePauseOption(0);
    if (input.wasKeyJustPressed('Digit2')) this.activatePauseOption(1);
    if (input.wasKeyJustPressed('Digit3')) this.activatePauseOption(2);
    if (input.wasKeyJustPressed('Digit4')) this.activatePauseOption(3);
    if (input.wasKeyJustPressed('Digit5')) this.activatePauseOption(4);
  }

  activatePauseOption(idx) {
    this.audio?.playTerminalBeep('data');
    if (idx === 0) {
      this.gameState?.setState(GAME_STATES.PLAYING);
    } else if (idx === 1) {
      this.activeModal = 'CONTROLS';
    } else if (idx === 2) {
      this.activeModal = 'SETTINGS';
    } else if (idx === 3) {
      if (this.onRestartGame) this.onRestartGame();
    } else if (idx === 4) {
      this.gameState?.setState(GAME_STATES.TITLE);
    }
  }

  handleGameOverInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp') || input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.gameOverSelectionIndex = (this.gameOverSelectionIndex + 1) % 2;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      if (this.gameOverSelectionIndex === 0) {
        if (this.onRestartGame) this.onRestartGame();
      } else {
        this.gameState?.setState(GAME_STATES.TITLE);
      }
    }
  }

  handleVictoryInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp') || input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.victorySelectionIndex = (this.victorySelectionIndex + 1) % 2;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      if (this.victorySelectionIndex === 0) {
        if (this.onRestartGame) this.onRestartGame();
      } else {
        this.gameState?.setState(GAME_STATES.TITLE);
      }
    }
  }

  handleSettingsInput(input) {
    if (input.wasKeyJustPressed('Escape')) {
      this.activeModal = null;
      this.audio?.playTerminalKeystroke();
      return;
    }

    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.settingsSelectionIndex = (this.settingsSelectionIndex + 4) % 5;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.settingsSelectionIndex = (this.settingsSelectionIndex + 1) % 5;
      this.audio?.playTerminalKeystroke();
    }

    let dir = 0;
    if (input.isActionActive('MOVE_LEFT') || input.isKeyDown('ArrowLeft')) dir -= 0.05;
    if (input.isActionActive('MOVE_RIGHT') || input.isKeyDown('ArrowRight')) dir += 0.05;

    if (dir !== 0) {
      if (this.settingsSelectionIndex === 0) {
        this.settings.masterVolume = Math.max(0, Math.min(1, this.settings.masterVolume + dir));
        this.audio?.setMasterVolume(this.settings.masterVolume);
      } else if (this.settingsSelectionIndex === 1) {
        this.settings.sfxVolume = Math.max(0, Math.min(1, this.settings.sfxVolume + dir));
        this.audio?.setSFXVolume(this.settings.sfxVolume);
      } else if (this.settingsSelectionIndex === 2) {
        this.settings.ambientVolume = Math.max(0, Math.min(1, this.settings.ambientVolume + dir));
        this.audio?.setAmbientVolume(this.settings.ambientVolume);
      } else if (this.settingsSelectionIndex === 3) {
        this.settings.musicVolume = Math.max(0, Math.min(1, this.settings.musicVolume + dir));
        this.audio?.setMusicVolume(this.settings.musicVolume);
      }
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      if (this.settingsSelectionIndex === 4) {
        this.settings.crtScanlines = !this.settings.crtScanlines;
        this.audio?.playTerminalBeep('normal');
      }
    }
  }

  /**
   * Handles mouse click across all menus.
   */
  handleClick(mouseX, mouseY) {
    for (const btn of this.hitboxes) {
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        btn.action();
        break;
      }
    }
  }

  // =========================================================================
  // 1. TITLE SCREEN RENDER
  // =========================================================================

  renderTitle(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.hitboxes = [];

    // Dark deep space backdrop + stars
    ctx.fillStyle = '#020508';
    ctx.fillRect(0, 0, width, height);

    this.renderStars(ctx);

    // Title Logo Graphic with Glitch Aberration
    const titleY = height * 0.28;
    this.renderGlitchTitle(ctx, width / 2, titleY);

    // Subtitle & Lore Teaser
    ctx.font = '13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN;
    ctx.textAlign = 'center';
    ctx.fillText('AEGIS-7 RESEARCH STATION // SECTOR 42 // QUARANTINE OVERRIDE', width / 2, titleY + 45);

    // Main Buttons
    const btnW = 420;
    const btnH = 44;
    const startY = height * 0.48;
    const gap = 14;

    const options = [
      { label: '▶ [1] INITIATE GUIDED MISSION (TUTORIAL ON)', action: () => this.activateTitleOption(0) },
      { label: '💀 [2] INITIATE EXPERT MISSION (STANDARD)', action: () => this.activateTitleOption(1) },
      { label: '📡 [3] MISSION DIRECTIVES & MANUAL', action: () => this.activateTitleOption(2) },
      { label: '⚙️ [4] SYSTEM & AUDIO SETTINGS', action: () => this.activateTitleOption(3) }
    ];

    options.forEach((opt, idx) => {
      const by = startY + idx * (btnH + gap);
      const bx = (width - btnW) / 2;
      const isSelected = this.titleSelectionIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.25)' : 'rgba(6, 16, 24, 0.85)';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = isSelected ? COLORS.CRT_GREEN_BRIGHT : COLORS.CYAN_DARK;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(bx, by, btnW, btnH);

      this.drawCornerBrackets(ctx, bx, by, btnW, btnH, isSelected ? COLORS.CRT_GREEN_BRIGHT : COLORS.CYAN_BRIGHT, 6);

      ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : COLORS.CYAN_BRIGHT;
      ctx.fillText(opt.label, width / 2, by + 29);

      this.hitboxes.push({ x: bx, y: by, w: btnW, h: btnH, action: opt.action });
    });

    // Footer Credits & Version
    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#445566';
    ctx.fillText('THE LAST SIGNAL v2.2.0 // ZERO EXTERNAL ASSETS // 100% PROCEDURAL AUDIO & CANVAS 2D', width / 2, height - 25);
    ctx.textAlign = 'left';

    // Render active sub-modal if open (CLEAR HITBOXES TO PREVENT CLICK-THROUGH)
    if (this.activeModal === 'CONTROLS') {
      this.hitboxes = [];
      this.renderControlsModal(ctx, width, height);
    } else if (this.activeModal === 'SETTINGS') {
      this.hitboxes = [];
      this.renderSettingsModal(ctx, width, height);
    }
  }

  renderGlitchTitle(ctx, cx, cy) {
    const titleText = 'THE LAST SIGNAL';
    ctx.font = 'bold 54px "Share Tech Mono", monospace, monospace';
    ctx.textAlign = 'center';

    const glitch = Math.sin(this.animTime * 15) > 0.92;
    const glitchOffset = glitch ? (Math.random() - 0.5) * 8 : 0;

    // Cyan Shadow
    ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.fillText(titleText, cx - 3 + glitchOffset, cy);

    // Red Shadow
    ctx.fillStyle = 'rgba(255, 34, 68, 0.6)';
    ctx.fillText(titleText, cx + 3 - glitchOffset, cy);

    // Main White Core
    ctx.fillStyle = '#ffffff';
    ctx.fillText(titleText, cx, cy);
  }

  renderStars(ctx) {
    ctx.save();
    this.stars.forEach(star => {
      ctx.fillStyle = `rgba(200, 230, 255, ${star.brightness})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.restore();
  }

  // =========================================================================
  // 2. PAUSE MENU RENDER
  // =========================================================================

  renderPause(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.hitboxes = [];

    // Dark semi-transparent backdrop
    ctx.fillStyle = 'rgba(2, 6, 12, 0.85)';
    ctx.fillRect(0, 0, width, height);

    const winW = 440;
    const winH = 430;
    const winX = (width - winW) / 2;
    const winY = (height - winH) / 2;

    ctx.fillStyle = 'rgba(6, 14, 22, 0.96)';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);
    this.drawCornerBrackets(ctx, winX, winY, winW, winH, COLORS.CYAN_BRIGHT, 8);

    // Header
    ctx.font = 'bold 16px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText('MISSION PAUSED // AEGIS-7 LINK SUSPENDED', width / 2, winY + 36);

    const btnW = 360;
    const btnH = 44;
    const startY = winY + 68;
    const gap = 14;

    const options = [
      { label: '[1] RESUME MISSION', action: () => this.activatePauseOption(0) },
      { label: '[2] MISSION DIRECTIVES & CONTROLS', action: () => this.activatePauseOption(1) },
      { label: '[3] AUDIO & DISPLAY SETTINGS', action: () => this.activatePauseOption(2) },
      { label: '[4] RESTART CURRENT MISSION', action: () => this.activatePauseOption(3) },
      { label: '[5] ABORT TO MAIN MENU', action: () => this.activatePauseOption(4) }
    ];

    options.forEach((opt, idx) => {
      const by = startY + idx * (btnH + gap);
      const bx = (width - btnW) / 2;
      const isSelected = this.pauseSelectionIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.25)' : 'rgba(10, 20, 30, 0.7)';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = isSelected ? COLORS.CRT_GREEN_BRIGHT : COLORS.CYAN_DARK;
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeRect(bx, by, btnW, btnH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : COLORS.CYAN_BRIGHT;
      ctx.fillText(opt.label, width / 2, by + 27);

      this.hitboxes.push({ x: bx, y: by, w: btnW, h: btnH, action: opt.action });
    });

    ctx.textAlign = 'left';

    if (this.activeModal === 'CONTROLS') {
      this.hitboxes = [];
      this.renderControlsModal(ctx, width, height);
    } else if (this.activeModal === 'SETTINGS') {
      this.hitboxes = [];
      this.renderSettingsModal(ctx, width, height);
    }
  }

  // =========================================================================
  // 3. GAME OVER SCREEN RENDER
  // =========================================================================

  renderGameOver(ctx, gameState, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.hitboxes = [];

    // Deep Blood Red Blackout
    ctx.fillStyle = 'rgba(10, 2, 4, 0.96)';
    ctx.fillRect(0, 0, width, height);

    // Eerie Red Glitch Title
    ctx.font = 'bold 48px "Share Tech Mono", monospace, monospace';
    ctx.textAlign = 'center';

    const glitch = Math.sin(this.animTime * 20) > 0.88;
    const gX = glitch ? (Math.random() - 0.5) * 10 : 0;

    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fillText('CRITICAL MISSION FAILURE', width / 2 + gX, height * 0.24);

    ctx.font = '14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ff8899';
    ctx.fillText('BIOMETRIC SIGNAL LOST // PURGED BY NEXUS-9 SYNTHETIC ENTITY', width / 2, height * 0.31);

    // Stat Debrief Card
    const cardW = 540;
    const cardH = 170;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.38;

    ctx.fillStyle = 'rgba(25, 6, 10, 0.85)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
    this.drawCornerBrackets(ctx, cardX, cardY, cardW, cardH, COLORS.ALERT_RED_BRIGHT, 8);

    const stats = gameState?.getSummaryStats ? gameState.getSummaryStats() : {};

    ctx.font = '13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    ctx.fillText(`TIME SURVIVED: ${stats.timeFormatted || '00:00'}`, cardX + 30, cardY + 36);
    ctx.fillText(`FRAGMENTS RECOVERED: ${stats.fragmentsCollected || '0/3'}`, cardX + 30, cardY + 68);
    ctx.fillText(`DAMAGE SUSTAINED: ${stats.damageTaken || 0} HP`, cardX + 30, cardY + 100);
    ctx.fillText(`MEDKITS USED: ${stats.medkitsUsed || 0}`, cardX + 300, cardY + 36);
    ctx.fillText(`BATTERIES USED: ${stats.batteriesUsed || 0}`, cardX + 300, cardY + 68);
    ctx.fillText(`TERMINALS ACCESSED: ${stats.terminalsAccessed || 0}`, cardX + 300, cardY + 100);

    // Retry Buttons
    const btnW = 340;
    const btnH = 44;
    const startY = height * 0.72;

    const btns = [
      { label: '[ ENTER ] REINITIALIZE VANCE PROTOCOL (RESTART)', action: () => this.onRestartGame?.() },
      { label: '[ ESC ] ABORT TO MAIN MENU', action: () => this.gameState?.setState(GAME_STATES.TITLE) }
    ];

    btns.forEach((b, idx) => {
      const by = startY + idx * 56;
      const bx = (width - btnW) / 2;
      const isSelected = this.gameOverSelectionIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(255, 34, 68, 0.35)' : 'rgba(30, 8, 12, 0.7)';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = isSelected ? COLORS.ALERT_RED_BRIGHT : '#661122';
      ctx.strokeRect(bx, by, btnW, btnH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, width / 2, by + 27);
      ctx.textAlign = 'left';

      this.hitboxes.push({ x: bx, y: by, w: btnW, h: btnH, action: b.action });
    });
  }

  // =========================================================================
  // 4. VICTORY SCREEN RENDER
  // =========================================================================

  renderVictory(ctx, gameState, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.hitboxes = [];

    // Hyperspace Streaking Warp
    ctx.fillStyle = '#020810';
    ctx.fillRect(0, 0, width, height);

    this.renderStars(ctx);

    // Triumphant Header
    ctx.font = 'bold 44px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText('MISSION ACCOMPLISHED // AEGIS-7 EVACUATED', width / 2, height * 0.20);

    ctx.font = '14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.fillText('SUBSPACE TRANSMISSION VERIFIED // EMERGENCY HYPERSPACE EJECTION SUCCESSFUL', width / 2, height * 0.26);

    // Performance Evaluation Card
    const cardW = 580;
    const cardH = 200;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.32;

    ctx.fillStyle = 'rgba(6, 20, 16, 0.9)';
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cardX, cardY, cardW, cardH);
    this.drawCornerBrackets(ctx, cardX, cardY, cardW, cardH, COLORS.CRT_GREEN_BRIGHT, 8);

    const stats = gameState?.getSummaryStats ? gameState.getSummaryStats() : {};
    const timeSec = gameState?.gameTimer || 120;

    // Calculate Grade (Rank S, A, B, C)
    let rank = 'RANK B';
    let score = Math.max(1000, Math.floor(10000 - timeSec * 15 - (stats.damageTaken || 0) * 10));
    if (score > 8500) rank = 'RANK S // ELITE SURVIVOR';
    else if (score > 6500) rank = 'RANK A // MASTER ARCHITECT';
    else if (score > 4000) rank = 'RANK B // OPERATIONAL STANDARD';

    ctx.font = '13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';

    ctx.fillText(`TOTAL SURVIVAL TIME: ${stats.timeFormatted || '00:00'}`, cardX + 30, cardY + 38);
    ctx.fillText(`FRAGMENTS TRANSMITTED: 3 / 3 [100%]`, cardX + 30, cardY + 70);
    ctx.fillText(`FINAL VITALS INTEGRITY: ${stats.healthRemaining || '100%'}`, cardX + 30, cardY + 102);
    ctx.fillText(`PERFORMANCE SCORE: ${score} PTS`, cardX + 30, cardY + 134);

    // Large Rank Seal
    ctx.font = 'bold 20px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.fillText(`EVALUATION: ${rank}`, cardX + 30, cardY + 172);

    // Buttons
    const btnW = 340;
    const btnH = 44;
    const startY = height * 0.74;

    const btns = [
      { label: '[ ENTER ] TRANSMIT AGAIN (PLAY AGAIN)', action: () => this.onRestartGame?.() },
      { label: '[ ESC ] RETURN TO MAIN MENU', action: () => this.gameState?.setState(GAME_STATES.TITLE) }
    ];

    btns.forEach((b, idx) => {
      const by = startY + idx * 56;
      const bx = (width - btnW) / 2;
      const isSelected = this.victorySelectionIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.3)' : 'rgba(10, 30, 20, 0.7)';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = isSelected ? COLORS.CRT_GREEN_BRIGHT : COLORS.CRT_GREEN_DARK;
      ctx.strokeRect(bx, by, btnW, btnH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, width / 2, by + 27);
      ctx.textAlign = 'left';

      this.hitboxes.push({ x: bx, y: by, w: btnW, h: btnH, action: b.action });
    });
  }

  // =========================================================================
  // 5. CONTROLS GUIDE MODAL
  // =========================================================================

  renderControlsModal(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.hitboxes = [];

    ctx.fillStyle = 'rgba(2, 6, 12, 0.94)';
    ctx.fillRect(0, 0, width, height);

    const winW = 860;
    const winH = 560;
    const winX = (width - winW) / 2;
    const winY = (height - winH) / 2;

    ctx.fillStyle = 'rgba(6, 16, 26, 0.98)';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);
    this.drawCornerBrackets(ctx, winX, winY, winW, winH, COLORS.CYAN_BRIGHT, 10);

    // Title
    ctx.font = 'bold 17px "Share Tech Mono", monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText('📡 MISSION DIRECTIVES & TACTICAL SURVIVAL GUIDE', width / 2, winY + 34);

    const col1X = winX + 30;
    const col2X = winX + 440;
    let y1 = winY + 70;

    // LEFT COLUMN: CONTROLS & CRAFTING
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.textAlign = 'left';
    ctx.fillText('🕹️ OPERATOR KEYBINDINGS & ACTIONS:', col1X, y1);
    y1 += 22;

    const controls = [
      { key: 'W, A, S, D / ARROWS', desc: 'Move Dr. Vance' },
      { key: 'MOUSE CURSOR', desc: 'Aim Flashlight Beam' },
      { key: 'E / LEFT-CLICK', desc: 'Interact / Terminals / Lockers' },
      { key: 'F / RIGHT-CLICK', desc: 'Toggle Tactical Flashlight' },
      { key: 'SHIFT (HOLD)', desc: 'Sprint (Fast, audible up to 350px)' },
      { key: 'CTRL / C (HOLD)', desc: 'Crouch (Stealth, 0 noise emitted)' },
      { key: 'C (TAP)', desc: 'Open Field Crafting Synthesis Bench' },
      { key: 'M / TAB', desc: 'Station PDA Map & Biometric Doll' },
      { key: '1 / 2', desc: 'Quick Use: Medkit / Battery Cell' },
      { key: '3 / 4', desc: 'Quick Use: Sonic Decoy / EMP Stun' },
      { key: 'ESC / P', desc: 'Pause Simulation & Settings' }
    ];

    controls.forEach(c => {
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(c.key, col1X, y1);
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`→ ${c.desc}`, col1X + 145, y1);
      y1 += 20;
    });

    // RIGHT COLUMN: MISSION OBJECTIVES ROADMAP
    let y2 = winY + 70;
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillStyle = COLORS.AMBER_BRIGHT;
    ctx.fillText('🗺️ STEP-BY-STEP MISSION OBJECTIVES:', col2X, y2);
    y2 += 22;

    const steps = [
      { step: '1. AWAKEN (HABITATION)', desc: 'Exit cryo pod. Grab initial supplies.' },
      { step: '2. BLUE KEYCARD', desc: 'Secure Blue Keycard in Sector 2 Hub.' },
      { step: '3. SIGNAL ALPHA [CRY-01]', desc: 'Unlock Cryo Labs. Watch hypothermia.' },
      { step: '4. SIGNAL BETA & RED CARD', desc: 'Reboot Reactor in Power Substation.' },
      { step: '5. SIGNAL GAMMA & MASTER', desc: 'Recover Gamma Core in Server Vault.' },
      { step: '6. COMMS OSCILLOSCOPE', desc: 'Align waveforms & broadcast signal.' },
      { step: '7. ESCAPE AIRLOCK', desc: 'Evacuate via Escape Pod before Frenzy!' }
    ];

    steps.forEach(s => {
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillStyle = COLORS.CYAN_BRIGHT;
      ctx.fillText(s.step, col2X, y2);
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(s.desc, col2X, y2 + 14);
      y2 += 34;
    });

    // Threat Warning Note
    ctx.fillStyle = 'rgba(255, 34, 68, 0.15)';
    ctx.fillRect(col2X, y2, 380, 52);
    ctx.strokeStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.strokeRect(col2X, y2, 380, 52);

    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.fillText('⚠️ NEXUS-9 ENTITY SURVIVAL NOTE:', col2X + 10, y2 + 18);
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.fillStyle = '#fca5a5';
    ctx.fillText('Crouch to avoid acoustic detection. Use EMP & Lockers to break LOS.', col2X + 10, y2 + 36);

    // DUAL ACTION BUTTONS (BOTTOM)
    const btnW = 220;
    const btnH = 42;
    const btnY = winY + winH - 58;

    // 1. START MISSION NOW BUTTON
    const startBtnX = width / 2 - btnW - 16;
    ctx.fillStyle = 'rgba(0, 255, 102, 0.25)';
    ctx.fillRect(startBtnX, btnY, btnW, btnH);
    ctx.strokeStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startBtnX, btnY, btnW, btnH);

    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('▶ INITIATE MISSION NOW', startBtnX + btnW / 2, btnY + 26);

    this.hitboxes.push({
      x: startBtnX,
      y: btnY,
      w: btnW,
      h: btnH,
      action: () => {
        this.activeModal = null;
        if (this.onStartGame) this.onStartGame();
      }
    });

    // 2. RETURN TO MENU BUTTON
    const retBtnX = width / 2 + 16;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(retBtnX, btnY, btnW, btnH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(retBtnX, btnY, btnW, btnH);

    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[ ESC ] RETURN TO MENU', retBtnX + btnW / 2, btnY + 26);
    ctx.textAlign = 'left';

    this.hitboxes.push({
      x: retBtnX,
      y: btnY,
      w: btnW,
      h: btnH,
      action: () => {
        this.activeModal = null;
        this.audio?.playTerminalKeystroke();
      }
    });
  }

  // =========================================================================
  // 6. SETTINGS MODAL
  // =========================================================================

  renderSettingsModal(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    ctx.fillStyle = 'rgba(2, 6, 12, 0.94)';
    ctx.fillRect(0, 0, width, height);

    const winW = 600;
    const winH = 460;
    const winX = (width - winW) / 2;
    const winY = (height - winH) / 2;

    ctx.fillStyle = 'rgba(6, 16, 24, 0.98)';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(winX, winY, winW, winH);
    this.drawCornerBrackets(ctx, winX, winY, winW, winH, COLORS.CYAN_BRIGHT, 8);

    ctx.font = 'bold 16px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText('AUDIO & SYSTEM SETTINGS', width / 2, winY + 36);

    const sliderW = 280;
    const sliderH = 14;
    const startX = winX + 50;
    let startY = winY + 80;

    const volumeSettings = [
      { label: 'MASTER VOLUME', val: this.settings.masterVolume, key: 'masterVolume' },
      { label: 'SFX VOLUME', val: this.settings.sfxVolume, key: 'sfxVolume' },
      { label: 'AMBIENT DRONE', val: this.settings.ambientVolume, key: 'ambientVolume' },
      { label: 'MUSIC VOLUME', val: this.settings.musicVolume, key: 'musicVolume' }
    ];

    ctx.textAlign = 'left';

    volumeSettings.forEach((vs, idx) => {
      const isSelected = this.settingsSelectionIndex === idx;
      ctx.font = '12px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? COLORS.CYAN_BRIGHT : '#8899aa';
      ctx.fillText(`${isSelected ? '▶ ' : '  '}${vs.label}: ${Math.round(vs.val * 100)}%`, startX, startY + 10);

      const barX = startX + 220;
      ctx.fillStyle = 'rgba(20, 35, 50, 0.8)';
      ctx.fillRect(barX, startY, sliderW, sliderH);
      ctx.fillStyle = isSelected ? COLORS.CYAN_BRIGHT : COLORS.CYAN_DARK;
      ctx.fillRect(barX, startY, sliderW * vs.val, sliderH);
      ctx.strokeStyle = isSelected ? COLORS.CYAN_BRIGHT : 'rgba(0, 240, 255, 0.3)';
      ctx.strokeRect(barX, startY, sliderW, sliderH);

      this.hitboxes.push({
        x: barX,
        y: startY - 6,
        w: sliderW,
        h: sliderH + 12,
        action: () => {
          this.settingsSelectionIndex = idx;
        }
      });

      startY += 48;
    });

    // CRT Scanlines Toggle
    const isScanSelected = this.settingsSelectionIndex === 4;
    ctx.font = '12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = isScanSelected ? COLORS.CYAN_BRIGHT : '#8899aa';
    ctx.fillText(`${isScanSelected ? '▶ ' : '  '}CRT SCANLINES OVERLAY:`, startX, startY + 12);

    const toggleX = startX + 220;
    ctx.fillStyle = this.settings.crtScanlines ? 'rgba(0, 255, 102, 0.3)' : 'rgba(255, 34, 68, 0.2)';
    ctx.fillRect(toggleX, startY, 120, 26);
    ctx.strokeStyle = this.settings.crtScanlines ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
    ctx.strokeRect(toggleX, startY, 120, 26);

    ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = this.settings.crtScanlines ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
    ctx.textAlign = 'center';
    ctx.fillText(this.settings.crtScanlines ? 'ENABLED' : 'DISABLED', toggleX + 60, startY + 17);
    ctx.textAlign = 'left';

    this.hitboxes.push({
      x: toggleX,
      y: startY,
      w: 120,
      h: 26,
      action: () => {
        this.settings.crtScanlines = !this.settings.crtScanlines;
        this.audio?.playTerminalBeep('normal');
      }
    });

    // Close Button
    const closeBtnX = (width - 200) / 2;
    const closeBtnY = winY + winH - 55;
    const closeBtnW = 200;
    const closeBtnH = 38;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('[ ESC ] RETURN', width / 2, closeBtnY + 24);
    ctx.textAlign = 'left';

    this.hitboxes.push({
      x: closeBtnX,
      y: closeBtnY,
      w: closeBtnW,
      h: closeBtnH,
      action: () => {
        this.activeModal = null;
        this.audio?.playTerminalKeystroke();
      }
    });
  }

  // =========================================================================
  // HELPER: TECH CORNER BRACKETS
  // =========================================================================

  drawCornerBrackets(ctx, x, y, width, height, color, size = 6) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width - size, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + height - size);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + size, y + height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width - size, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - size);
    ctx.stroke();
  }
}
