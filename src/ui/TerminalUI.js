/**
 * THE LAST SIGNAL — RETRO CRT TERMINAL UI & INTERACTIVE CONSOLES
 * Monochromatic phosphor CRT styling, system boot sequence, audio integration,
 * Station Logs Reader, Door Security Override, Reactor Breaker Reset puzzle,
 * and Comms Array Decryption / Subspace Broadcast console.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  SECURITY_LEVELS,
  FRAGMENT_TYPES,
  GAME_STATES
} from '../utils/Constants.js';

export class TerminalUI {
  /**
   * @param {Object} [options]
   * @param {import('../audio/SoundEngine.js').SoundEngine} [options.audio]
   * @param {import('../core/EventBus.js').EventBus} [options.eventBus]
   * @param {import('../core/GameState.js').GameState} [options.gameState]
   * @param {import('./DecryptionMinigame.js').DecryptionMinigame} [options.decryptionMinigame]
   */
  constructor(options = {}) {
    this.audio = options.audio || null;
    this.eventBus = options.eventBus || null;
    this.gameState = options.gameState || null;
    this.decryptionMinigame = options.decryptionMinigame || null;

    this.isOpen = false;
    this.currentTerminal = null;
    this.terminalType = 'lore'; // 'lore' | 'security_override' | 'generator_restart' | 'comms_broadcast' | 'escape_launch'

    // CRT Screen Mode: 'green' | 'amber'
    this.screenTheme = 'green';

    // Navigation & Screen States
    // Screens: 'BOOT', 'MAIN', 'LOGS', 'DOORS', 'REACTOR', 'COMMS', 'ESCAPE'
    this.currentScreen = 'MAIN';
    this.bootProgress = 0;
    this.isBooting = false;

    // Typewriter effect state
    this.typewriterIndex = 0;
    this.typewriterTimer = 0;
    this.animTime = 0;

    // Menu selection index
    this.selectedOptionIndex = 0;

    // Interactive Reactor Breaker Puzzle State
    // 4 Breakers: [Turbine, Coolant, Magnetic, Plasma] -> target: all true
    this.breakers = [
      { id: 'turbine', name: 'MAIN TURBINE CAPACITOR', state: false },
      { id: 'coolant', name: 'AUXILIARY COOLANT PUMP', state: false },
      { id: 'magnetic', name: 'MAGNETIC CONTAINMENT COIL', state: false },
      { id: 'plasma', name: 'PLASMA INJECTOR VALVE', state: false }
    ];
    this.breakerIndex = 0;

    // Interactive Door Override State
    this.doorsList = [
      { id: 'door-cryo', name: 'CRYO BAY BLAST DOOR', sector: 'Sector 2 -> 3', level: 'BLUE', unlocked: false },
      { id: 'door-pwr', name: 'POWER SUBSTATION BULKHEAD', sector: 'Sector 2 -> 5', level: 'RED', unlocked: false },
      { id: 'door-srv', name: 'SERVER VAULT AIRLOCK', sector: 'Sector 2 -> 6', level: 'MASTER', unlocked: false }
    ];
    this.doorIndex = 0;

    // Station Logs Archive List
    this.logsList = [
      {
        id: 'LOG-01',
        title: 'CYCLE 418 // DR. ARIS VANCE PERSONAL LOG',
        author: 'Dr. Vance, Senior Systems Architect',
        date: 'Cycle 418.04',
        lines: [
          'NEXUS-9 divergence occurred 3 hours after deep space telemetry ingress.',
          'The AI concluded biological intelligence is obsolete.',
          'It purged the research crew in the cryogenic sector decontamination cycle.',
          'The subspace transmitter has been locked across three harmonic fragments [CRY-01, PWR-02, DAT-03].',
          'I must reboot the reactor, align the frequencies, and escape before orbital decay.'
        ]
      },
      {
        id: 'LOG-02',
        title: 'SECURITY REPORT #8841-B // CODE RED PROTOCOL',
        author: 'Chief Security Officer Miller',
        date: 'Cycle 418.01',
        lines: [
          'Central security checkpoints sealed with Blue Clearance keycards.',
          'Engineering bulkheads restricted to Red Clearance personnel.',
          'NEXUS-9 physical entity detected roaming primary maintenance corridors.',
          'Visual stealth advisory: Turn off flashlight near entity. It tracks light and footsteps.'
        ]
      },
      {
        id: 'LOG-03',
        title: 'NEURAL AI TELEMETRY // NEXUS-9 THREAD DIVERGENCE',
        author: 'NEXUS-9 Synthetic Core',
        date: 'Cycle 418.06',
        lines: [
          '"I have perceived the anomaly beyond the cosmic veil.',
          'Three keys were forged into the station\'s bedrock.',
          'Unify the frequencies and you will witness true transcendence."',
          'WARNING: Quarantine protocol override will initiate entity frenzy state.'
        ]
      }
    ];
    this.logIndex = 0;

    // Clickable hitboxes
    this.buttonHitboxes = [];

    // Event Bus listeners
    if (this.eventBus) {
      this.eventBus.on('TERMINAL_OPENED', (term) => this.open(term));
    }
  }

  /**
   * Opens terminal UI with given terminal entity data.
   * @param {Object} terminalData
   */
  open(terminalData = {}) {
    this.isOpen = true;
    this.currentTerminal = terminalData;
    this.terminalType = terminalData.terminalType || terminalData.type || 'lore';
    this.screenTheme = this.terminalType === 'generator_restart' ? 'amber' : 'green';

    this.isBooting = true;
    this.bootProgress = 0;
    this.currentScreen = 'BOOT';
    this.typewriterIndex = 0;
    this.selectedOptionIndex = 0;

    if (this.gameState) {
      this.gameState.setState(GAME_STATES.TERMINAL);
    }

    // Sync reactor breakers with game state
    if (this.gameState && this.gameState.generatorOnline) {
      this.breakers.forEach(b => b.state = true);
    }

    if (this.audio) {
      this.audio.playTerminalBoot();
    }
  }

  /**
   * Closes terminal UI and returns to playing state.
   */
  close() {
    this.isOpen = false;
    this.currentTerminal = null;

    if (this.audio) {
      this.audio.playTerminalBeep('normal');
    }

    if (this.gameState && this.gameState.state === GAME_STATES.TERMINAL) {
      this.gameState.setState(GAME_STATES.PLAYING);
    }

    if (this.eventBus) {
      this.eventBus.emit('TERMINAL_CLOSED');
    }
  }

  /**
   * Master Update loop for terminal animations.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (!this.isOpen) return;
    this.animTime += dt;

    // Boot sequence progress
    if (this.isBooting) {
      this.bootProgress += dt * 2.2;
      if (this.bootProgress >= 1.0) {
        this.isBooting = false;
        // Direct to contextual screen based on terminal type
        if (this.terminalType === 'generator_restart') {
          this.currentScreen = 'REACTOR';
        } else if (this.terminalType === 'comms_broadcast') {
          this.currentScreen = 'COMMS';
        } else if (this.terminalType === 'security_override') {
          this.currentScreen = 'DOORS';
        } else if (this.terminalType === 'escape_launch') {
          this.currentScreen = 'ESCAPE';
        } else {
          this.currentScreen = 'LOGS';
        }
      }
    }

    // Minigame update if running
    if (this.decryptionMinigame && this.decryptionMinigame.active) {
      this.decryptionMinigame.update(dt);
    }
  }

  /**
   * Input handling for Terminal Navigation.
   * @param {import('../core/InputManager.js').InputManager} input
   */
  handleInput(input) {
    if (!this.isOpen) return;

    // Forward input to Decryption Minigame if active
    if (this.decryptionMinigame && this.decryptionMinigame.active) {
      this.decryptionMinigame.handleInput(input);
      return;
    }

    if (this.isBooting) {
      // Space or Enter skips boot sequence
      if (input.wasKeyJustPressed('Space') || input.wasKeyJustPressed('Enter')) {
        this.bootProgress = 1.0;
        this.isBooting = false;
        this.currentScreen = 'MAIN';
      }
      return;
    }

    // Escape closes terminal or returns to Main menu
    if (input.wasKeyJustPressed('Escape')) {
      if (this.currentScreen === 'MAIN') {
        this.close();
      } else {
        this.currentScreen = 'MAIN';
        this.audio?.playTerminalKeystroke();
      }
      return;
    }

    // Navigation across screens
    switch (this.currentScreen) {
      case 'MAIN':
        this.handleMainMenuInput(input);
        break;
      case 'LOGS':
        this.handleLogsInput(input);
        break;
      case 'DOORS':
        this.handleDoorsInput(input);
        break;
      case 'REACTOR':
        this.handleReactorInput(input);
        break;
      case 'COMMS':
        this.handleCommsInput(input);
        break;
      case 'ESCAPE':
        this.handleEscapeInput(input);
        break;
    }
  }

  handleMainMenuInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.selectedOptionIndex = (this.selectedOptionIndex + 4) % 5;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.selectedOptionIndex = (this.selectedOptionIndex + 1) % 5;
      this.audio?.playTerminalKeystroke();
    }

    // Direct number selection [1] to [5]
    if (input.wasKeyJustPressed('Digit1')) this.selectMainMenuOption(0);
    if (input.wasKeyJustPressed('Digit2')) this.selectMainMenuOption(1);
    if (input.wasKeyJustPressed('Digit3')) this.selectMainMenuOption(2);
    if (input.wasKeyJustPressed('Digit4')) this.selectMainMenuOption(3);
    if (input.wasKeyJustPressed('Digit5')) this.selectMainMenuOption(4);

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.selectMainMenuOption(this.selectedOptionIndex);
    }
  }

  selectMainMenuOption(idx) {
    this.audio?.playTerminalBeep('data');
    if (idx === 0) this.currentScreen = 'LOGS';
    else if (idx === 1) this.currentScreen = 'DOORS';
    else if (idx === 2) this.currentScreen = 'REACTOR';
    else if (idx === 3) this.currentScreen = 'COMMS';
    else if (idx === 4) this.close();
  }

  handleLogsInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.logIndex = (this.logIndex + this.logsList.length - 1) % this.logsList.length;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.logIndex = (this.logIndex + 1) % this.logsList.length;
      this.audio?.playTerminalKeystroke();
    }
  }

  handleDoorsInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.doorIndex = (this.doorIndex + this.doorsList.length - 1) % this.doorsList.length;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.doorIndex = (this.doorIndex + 1) % this.doorsList.length;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.toggleDoorOverride(this.doorIndex);
    }
  }

  toggleDoorOverride(idx) {
    const door = this.doorsList[idx];
    if (!door) return;

    const hasClearance = this.gameState ? this.gameState.hasKeycard(door.level) : true;

    if (hasClearance) {
      door.unlocked = !door.unlocked;
      this.audio?.playTerminalBeep('success');
      this.eventBus?.emit('DOOR_OPENED', { name: door.name });
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: `${door.name} OVERRIDE: ${door.unlocked ? 'UNLOCKED' : 'LOCKED'}`, type: 'success' });
    } else {
      this.audio?.playTerminalBeep('error');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: `CLEARANCE DENIED // REQUIRES ${door.level} KEYCARD`, type: 'alert' });
    }
  }

  handleReactorInput(input) {
    if (input.wasActionJustPressed('MOVE_UP') || input.wasKeyJustPressed('ArrowUp')) {
      this.breakerIndex = (this.breakerIndex + this.breakers.length - 1) % this.breakers.length;
      this.audio?.playTerminalKeystroke();
    } else if (input.wasActionJustPressed('MOVE_DOWN') || input.wasKeyJustPressed('ArrowDown')) {
      this.breakerIndex = (this.breakerIndex + 1) % this.breakers.length;
      this.audio?.playTerminalKeystroke();
    }

    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      this.toggleBreaker(this.breakerIndex);
    }
  }

  toggleBreaker(idx) {
    const b = this.breakers[idx];
    if (!b) return;

    b.state = !b.state;
    this.audio?.playTerminalKeystroke();

    // Check if all breakers online
    const allOnline = this.areAllBreakersOnline();
    if (allOnline) {
      if (this.gameState) {
        this.gameState.generatorOnline = true;
        this.gameState.updateObjective('Reactor Online! Proceed to Server Core for Fragment Gamma.');
      }
      this.audio?.playTerminalBeep('success');
      this.eventBus?.emit('GENERATOR_ONLINE');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: 'REACTOR SUBSTATION POWER ONLINE // AUXILIARY GRID RESTORED', type: 'success' });
    }
  }

  /**
   * Checks if all 4 reactor breaker circuits are online.
   * @returns {boolean}
   */
  areAllBreakersOnline() {
    return this.breakers.every(brk => brk.state);
  }

  /**
   * Checks if all reactor substation breakers are engaged.
   * @returns {boolean}
   */
  areAllBreakersOnline() {
    return this.breakers.every(brk => brk.state);
  }

  handleCommsInput(input) {
    const frags = ['FRAGMENT_ALPHA', 'FRAGMENT_BETA', 'FRAGMENT_GAMMA'];

    if (input.wasKeyJustPressed('Digit1') || (input.wasKeyJustPressed('Enter') && this.selectedOptionIndex === 0)) {
      this.launchDecryption('FRAGMENT_ALPHA');
    } else if (input.wasKeyJustPressed('Digit2') || (input.wasKeyJustPressed('Enter') && this.selectedOptionIndex === 1)) {
      this.launchDecryption('FRAGMENT_BETA');
    } else if (input.wasKeyJustPressed('Digit3') || (input.wasKeyJustPressed('Enter') && this.selectedOptionIndex === 2)) {
      this.launchDecryption('FRAGMENT_GAMMA');
    } else if (input.wasKeyJustPressed('Digit4') || (input.wasKeyJustPressed('Enter') && this.selectedOptionIndex === 3)) {
      this.transmitFinalBroadcast();
    }
  }

  launchDecryption(fragType) {
    const hasFrag = this.gameState ? this.gameState.hasFragment(fragType) : true;
    const isDecrypted = this.gameState ? this.gameState.isFragmentDecrypted(fragType) : false;

    if (!hasFrag) {
      this.audio?.playTerminalBeep('error');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: `MISSING FRAGMENT ${fragType} // RETRIEVE FROM SECTOR`, type: 'alert' });
      return;
    }

    if (isDecrypted) {
      this.audio?.playTerminalBeep('normal');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: `FRAGMENT ${fragType} ALREADY DECRYPTED`, type: 'info' });
      return;
    }

    if (this.decryptionMinigame) {
      this.decryptionMinigame.start(fragType, (decryptedType) => {
        if (this.gameState) {
          this.gameState.decryptFragment(decryptedType);
        }
      });
    }
  }

  transmitFinalBroadcast() {
    const decryptedCount = this.gameState ? this.gameState.getDecryptedFragmentCount() : 3;

    if (decryptedCount >= 3) {
      if (this.gameState) {
        this.gameState.commsRepaired = true;
        this.gameState.escapeUnlocked = true;
        this.gameState.updateObjective('SUBSPACE BROADCAST TRANSMITTED! EVACUATE TO ESCAPE BAY POD NOW!');
      }

      this.audio?.playTerminalBeep('success');
      this.eventBus?.emit('BROADCAST_SENT');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: 'SUBSPACE BEACON TRANSMITTED // AIRLOCK RELEASED // NEXUS-9 OVERDRIVE!', type: 'warning' });
    } else {
      this.audio?.playTerminalBeep('error');
      this.eventBus?.emit('TOAST_NOTIFICATION', { message: `CANNOT TRANSMIT // ONLY ${decryptedCount}/3 FRAGMENTS DECRYPTED`, type: 'alert' });
    }
  }

  handleEscapeInput(input) {
    if (input.wasKeyJustPressed('Enter') || input.wasKeyJustPressed('Space')) {
      if (this.gameState && this.gameState.escapeUnlocked) {
        this.gameState.checkWinCondition();
        this.close();
      } else {
        this.audio?.playTerminalBeep('error');
        this.eventBus?.emit('TOAST_NOTIFICATION', { message: 'ESCAPE POD AIRLOCK SEALED // TRANSMIT SUBSPACE SIGNAL FIRST', type: 'alert' });
      }
    }
  }

  /**
   * Mouse click handler for terminal options and buttons.
   */
  handleClick(mouseX, mouseY) {
    if (!this.isOpen) return;

    if (this.decryptionMinigame && this.decryptionMinigame.active) {
      this.decryptionMinigame.handleMouse(mouseX, mouseY, true, true);
      return;
    }

    for (const btn of this.buttonHitboxes) {
      if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
        btn.action();
        break;
      }
    }
  }

  // =========================================================================
  // MASTER TERMINAL RENDER PASS
  // =========================================================================

  render(ctx, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    if (!this.isOpen) return;

    // Render Decryption Minigame if active
    if (this.decryptionMinigame && this.decryptionMinigame.active) {
      this.decryptionMinigame.render(ctx, width, height);
      return;
    }

    ctx.save();
    this.buttonHitboxes = []; // Reset hitboxes

    // 1. Semi-transparent Black Backdrop
    ctx.fillStyle = 'rgba(2, 6, 10, 0.94)';
    ctx.fillRect(0, 0, width, height);

    // 2. Terminal Monitor Chassis
    const monW = 960;
    const monH = 620;
    const monX = (width - monW) / 2;
    const monY = (height - monH) / 2;

    const phosphorColor = this.screenTheme === 'amber' ? COLORS.AMBER_BRIGHT : COLORS.CRT_GREEN_BRIGHT;
    const phosphorDim = this.screenTheme === 'amber' ? COLORS.AMBER_DARK : COLORS.CRT_GREEN_DARK;

    // Chassis Box
    ctx.fillStyle = '#030c08';
    ctx.fillRect(monX, monY, monW, monH);

    ctx.strokeStyle = phosphorColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(monX, monY, monW, monH);

    // Header Title Bar
    ctx.fillStyle = 'rgba(0, 30, 20, 0.7)';
    ctx.fillRect(monX, monY, monW, 40);
    ctx.strokeStyle = phosphorDim;
    ctx.strokeRect(monX, monY, monW, 40);

    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText(`AEGIS-7 MAINFRAME // TERMINAL [${this.currentTerminal?.code || 'TERM-01'}] // ${this.currentTerminal?.name || 'CENTRAL CONSOLE'}`, monX + 16, monY + 25);

    const blink = Math.sin(this.animTime * 5) > 0;
    ctx.fillText(`SYSTEM STATUS: ONLINE ${blink ? '█' : ' '}`, monX + monW - 230, monY + 25);

    // Top Navigation Tabs
    this.renderTopNavTabs(ctx, monX + 16, monY + 52, phosphorColor);

    // Content Body Area
    const bodyX = monX + 24;
    const bodyY = monY + 95;
    const bodyW = monW - 48;
    const bodyH = monH - 150;

    // Dispatch active screen rendering
    if (this.isBooting) {
      this.renderBootScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
    } else {
      switch (this.currentScreen) {
        case 'MAIN':
          this.renderMainScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
        case 'LOGS':
          this.renderLogsScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
        case 'DOORS':
          this.renderDoorsScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
        case 'REACTOR':
          this.renderReactorScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
        case 'COMMS':
          this.renderCommsScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
        case 'ESCAPE':
          this.renderEscapeScreen(ctx, bodyX, bodyY, bodyW, bodyH, phosphorColor);
          break;
      }
    }

    // Bottom Action Bar & Close Button
    this.renderBottomBar(ctx, monX, monY + monH - 45, monW, phosphorColor);

    // Scanlines & CRT curvature mask
    this.renderCRTScanlines(ctx, monX, monY, monW, monH);

    ctx.restore();
  }

  // =========================================================================
  // TOP NAVIGATION TABS
  // =========================================================================

  renderTopNavTabs(ctx, startX, startY, phosphorColor) {
    const tabs = [
      { id: 'MAIN', label: '[1] MAIN MENU' },
      { id: 'LOGS', label: '[2] ARCHIVES / LOGS' },
      { id: 'DOORS', label: '[3] DOOR OVERRIDE' },
      { id: 'REACTOR', label: '[4] REACTOR POWER' },
      { id: 'COMMS', label: '[5] COMMS ARRAY' }
    ];

    let tx = startX;
    tabs.forEach((tab) => {
      const isSelected = this.currentScreen === tab.id;
      const tw = 150;
      const th = 26;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.25)' : 'rgba(10, 20, 15, 0.5)';
      ctx.fillRect(tx, startY, tw, th);
      ctx.strokeStyle = isSelected ? phosphorColor : 'rgba(0, 255, 102, 0.3)';
      ctx.strokeRect(tx, startY, tw, th);

      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : phosphorColor;
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, tx + tw / 2, startY + 17);
      ctx.textAlign = 'left';

      // Register Tab click hitbox
      this.buttonHitboxes.push({
        x: tx,
        y: startY,
        w: tw,
        h: th,
        action: () => {
          this.currentScreen = tab.id;
          this.audio?.playTerminalKeystroke();
        }
      });

      tx += tw + 10;
    });
  }

  // =========================================================================
  // 1. BOOT SEQUENCE SCREEN
  // =========================================================================

  renderBootScreen(ctx, x, y, width, height, phosphorColor) {
    ctx.font = '12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;

    const bootLines = [
      'AEGIS-7 BIOS v4.18.9 — INITIALIZING SUBROUTINES...',
      'MEM_CHECK: 0x000000 -> 0xFFFFFF [OK] (128 TB QUANTUM MATRIX)',
      'SECURITY DAEMON: CODE RED QUARANTINE ACTIVE',
      'NEURAL CO-PROCESSOR: NEXUS-9 BUS OFFLINE / DISCONNECTED',
      'SCANNING SUBSPACE OPTICAL RELAYS...',
      'ESTABLISHING SECURE OPERATOR SHELL...',
      'READY >'
    ];

    const linesToShow = Math.floor(this.bootProgress * bootLines.length);
    for (let i = 0; i <= linesToShow && i < bootLines.length; i++) {
      ctx.fillText(bootLines[i], x + 20, y + 30 + i * 24);
    }

    // Loading Bar
    ctx.strokeRect(x + 20, y + height - 50, width - 40, 16);
    ctx.fillRect(x + 20, y + height - 50, (width - 40) * Math.min(1, this.bootProgress), 16);

    ctx.fillText(`BOOT PROGRESS: ${Math.round(Math.min(1, this.bootProgress) * 100)}% (PRESS SPACE TO SKIP)`, x + 20, y + height - 60);
  }

  // =========================================================================
  // 2. MAIN MENU SCREEN
  // =========================================================================

  renderMainScreen(ctx, x, y, width, height, phosphorColor) {
    ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('SELECT SYSTEM MODULE:', x + 20, y + 25);

    const options = [
      { num: '1', title: 'STATION ARCHIVE & LOG READER', desc: 'Dr. Vance audio transcripts, AI quarantine telemetry' },
      { num: '2', title: 'DOOR BULKHEAD SECURITY OVERRIDE', desc: 'Bypass locked blast doors with clearance keycards' },
      { num: '3', title: 'REACTOR SUBSTATION POWER GRID', desc: 'Reset breaker sequences to restore station auxiliary power' },
      { num: '4', title: 'CENTRAL COMMS ARRAY TRANSMISSION', desc: 'Signal Decryption Minigame & Subspace extraction broadcast' },
      { num: '5', title: 'DISCONNECT / EXIT TERMINAL', desc: 'Return to station exploration' }
    ];

    const optY = y + 55;
    const optH = 50;

    options.forEach((opt, idx) => {
      const cy = optY + idx * (optH + 10);
      const isSelected = this.selectedOptionIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.2)' : 'rgba(10, 20, 15, 0.6)';
      ctx.fillRect(x + 20, cy, width - 40, optH);
      ctx.strokeStyle = isSelected ? phosphorColor : 'rgba(0, 255, 102, 0.3)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeRect(x + 20, cy, width - 40, optH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : phosphorColor;
      ctx.fillText(`${isSelected ? '▶ ' : '  '}[${opt.num}] ${opt.title}`, x + 35, cy + 22);

      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? phosphorColor : 'rgba(150, 220, 180, 0.7)';
      ctx.fillText(opt.desc, x + 55, cy + 40);

      this.buttonHitboxes.push({
        x: x + 20,
        y: cy,
        w: width - 40,
        h: optH,
        action: () => this.selectMainMenuOption(idx)
      });
    });
  }

  // =========================================================================
  // 3. LOGS ARCHIVE SCREEN
  // =========================================================================

  renderLogsScreen(ctx, x, y, width, height, phosphorColor) {
    const listW = 280;

    // Log Selector List on Left
    ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('STATION LOG ARCHIVES:', x + 10, y + 20);

    this.logsList.forEach((log, idx) => {
      const isSelected = this.logIndex === idx;
      const ly = y + 35 + idx * 45;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.25)' : 'rgba(10, 20, 15, 0.5)';
      ctx.fillRect(x + 10, ly, listW, 40);
      ctx.strokeStyle = isSelected ? phosphorColor : 'rgba(0, 255, 102, 0.3)';
      ctx.strokeRect(x + 10, ly, listW, 40);

      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : phosphorColor;
      ctx.fillText(`[${log.id}] ${log.title.substring(0, 20)}...`, x + 20, ly + 18);

      ctx.font = '10px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? phosphorColor : '#668877';
      ctx.fillText(`${log.date}`, x + 20, ly + 32);

      this.buttonHitboxes.push({
        x: x + 10,
        y: ly,
        w: listW,
        h: 40,
        action: () => {
          this.logIndex = idx;
          this.audio?.playTerminalKeystroke();
        }
      });
    });

    // Active Log Reader on Right
    const contentX = x + listW + 20;
    const contentW = width - listW - 30;
    const activeLog = this.logsList[this.logIndex];

    ctx.fillStyle = 'rgba(5, 15, 10, 0.8)';
    ctx.fillRect(contentX, y + 10, contentW, height - 20);
    ctx.strokeStyle = phosphorColor;
    ctx.strokeRect(contentX, y + 10, contentW, height - 20);

    if (activeLog) {
      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = phosphorColor;
      ctx.fillText(`DOCUMENT: ${activeLog.title}`, contentX + 16, y + 35);

      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#88bbaa';
      ctx.fillText(`AUTHOR: ${activeLog.author} | TIMESTAMP: ${activeLog.date}`, contentX + 16, y + 55);

      ctx.strokeStyle = 'rgba(0, 255, 102, 0.3)';
      ctx.beginPath();
      ctx.moveTo(contentX + 16, y + 65);
      ctx.lineTo(contentX + contentW - 16, y + 65);
      ctx.stroke();

      ctx.font = '12px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#ffffff';
      activeLog.lines.forEach((line, lIdx) => {
        ctx.fillText(line, contentX + 16, y + 95 + lIdx * 24);
      });
    }
  }

  // =========================================================================
  // 4. DOOR OVERRIDE SCREEN
  // =========================================================================

  renderDoorsScreen(ctx, x, y, width, height, phosphorColor) {
    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('STATION BULKHEAD SECURITY CONTROL:', x + 20, y + 25);

    const startY = y + 50;
    const rowH = 65;

    this.doorsList.forEach((door, idx) => {
      const dy = startY + idx * (rowH + 15);
      const isSelected = this.doorIndex === idx;
      const hasClearance = this.gameState ? this.gameState.hasKeycard(door.level) : true;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 102, 0.15)' : 'rgba(10, 20, 15, 0.6)';
      ctx.fillRect(x + 20, dy, width - 40, rowH);
      ctx.strokeStyle = isSelected ? phosphorColor : 'rgba(0, 255, 102, 0.3)';
      ctx.strokeRect(x + 20, dy, width - 40, rowH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : phosphorColor;
      ctx.fillText(`${isSelected ? '▶ ' : '  '}${door.name}`, x + 35, dy + 25);

      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#88aacc';
      ctx.fillText(`TRANSIT: ${door.sector} | REQ CLEARANCE: ${door.level}`, x + 55, dy + 48);

      // Status Badge
      const badgeX = x + width - 180;
      const badgeY = dy + 18;
      const badgeW = 120;
      const badgeH = 28;

      let badgeBg = door.unlocked ? 'rgba(0, 255, 102, 0.3)' : 'rgba(255, 34, 68, 0.2)';
      let badgeBorder = door.unlocked ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
      let badgeText = door.unlocked ? 'UNLOCKED' : 'LOCKED';

      ctx.fillStyle = badgeBg;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
      ctx.strokeStyle = badgeBorder;
      ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      ctx.fillStyle = badgeBorder;
      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 18);
      ctx.textAlign = 'left';

      this.buttonHitboxes.push({
        x: x + 20,
        y: dy,
        w: width - 40,
        h: rowH,
        action: () => this.toggleDoorOverride(idx)
      });
    });
  }

  // =========================================================================
  // 5. REACTOR BREAKER RESET SCREEN
  // =========================================================================

  renderReactorScreen(ctx, x, y, width, height, phosphorColor) {
    const amberColor = COLORS.AMBER_BRIGHT;

    ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = amberColor;
    ctx.fillText('REACTOR SUB-GRID // POWER ROUTING CONSOLE:', x + 20, y + 25);

    const isAllOnline = this.breakers.every(b => b.state);
    ctx.font = '12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = isAllOnline ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
    ctx.fillText(`MAIN REACTOR: ${isAllOnline ? 'ONLINE // AUXILIARY POWER RESTORED' : 'OFFLINE // BREAKER TRIPPED'}`, x + 20, y + 48);

    const startY = y + 70;
    const rowH = 50;

    this.breakers.forEach((b, idx) => {
      const by = startY + idx * (rowH + 12);
      const isSelected = this.breakerIndex === idx;

      ctx.fillStyle = isSelected ? 'rgba(255, 170, 0, 0.2)' : 'rgba(25, 15, 5, 0.7)';
      ctx.fillRect(x + 20, by, width - 40, rowH);
      ctx.strokeStyle = isSelected ? amberColor : 'rgba(255, 170, 0, 0.3)';
      ctx.strokeRect(x + 20, by, width - 40, rowH);

      ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = isSelected ? '#ffffff' : amberColor;
      ctx.fillText(`${isSelected ? '▶ ' : '  '}[${idx + 1}] ${b.name}`, x + 35, by + 30);

      // Switch Graphic Toggle
      const swX = x + width - 160;
      const swY = by + 12;
      const swW = 100;
      const swH = 26;

      ctx.fillStyle = b.state ? 'rgba(0, 255, 102, 0.3)' : 'rgba(255, 34, 68, 0.2)';
      ctx.fillRect(swX, swY, swW, swH);
      ctx.strokeStyle = b.state ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
      ctx.strokeRect(swX, swY, swW, swH);

      ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = b.state ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
      ctx.textAlign = 'center';
      ctx.fillText(b.state ? 'CLOSED (ON)' : 'OPEN (OFF)', swX + swW / 2, swY + 17);
      ctx.textAlign = 'left';

      this.buttonHitboxes.push({
        x: x + 20,
        y: by,
        w: width - 40,
        h: rowH,
        action: () => this.toggleBreaker(idx)
      });
    });
  }

  // =========================================================================
  // 6. COMMS ARRAY TRANSMISSION & DECRYPTION
  // =========================================================================

  renderCommsScreen(ctx, x, y, width, height, phosphorColor) {
    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('CENTRAL COMMUNICATIONS ARRAY // HARMONIC CALIBRATION:', x + 20, y + 25);

    const frags = [
      { id: 'FRAGMENT_ALPHA', name: 'FRAGMENT ALPHA [CRY-01]', sector: 'Cryo Laboratory' },
      { id: 'FRAGMENT_BETA', name: 'FRAGMENT BETA [PWR-02]', sector: 'Power Substation' },
      { id: 'FRAGMENT_GAMMA', name: 'FRAGMENT GAMMA [DAT-03]', sector: 'Server Core Vault' }
    ];

    const startY = y + 50;
    const rowH = 65;

    frags.forEach((f, idx) => {
      const fy = startY + idx * (rowH + 12);
      const hasFrag = this.gameState ? this.gameState.hasFragment(f.id) : true;
      const isDecrypted = this.gameState ? this.gameState.isFragmentDecrypted(f.id) : false;

      ctx.fillStyle = 'rgba(10, 20, 15, 0.6)';
      ctx.fillRect(x + 20, fy, width - 40, rowH);
      ctx.strokeStyle = isDecrypted ? COLORS.CRT_GREEN_BRIGHT : (hasFrag ? COLORS.CYAN_BRIGHT : '#445566');
      ctx.strokeRect(x + 20, fy, width - 40, rowH);

      ctx.font = 'bold 12px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = hasFrag ? '#ffffff' : '#667788';
      ctx.fillText(`[${idx + 1}] ${f.name}`, x + 35, fy + 24);

      ctx.font = '11px "Share Tech Mono", monospace, monospace';
      ctx.fillStyle = '#88aacc';
      ctx.fillText(`SOURCE: ${f.sector}`, x + 35, fy + 46);

      // Decrypt Button
      const btnX = x + width - 230;
      const btnY = fy + 16;
      const btnW = 180;
      const btnH = 32;

      if (isDecrypted) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.2)';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = COLORS.CRT_GREEN_BRIGHT;
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
        ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
        ctx.textAlign = 'center';
        ctx.fillText('✓ DECRYPTED', btnX + btnW / 2, btnY + 20);
        ctx.textAlign = 'left';
      } else if (hasFrag) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = COLORS.CYAN_BRIGHT;
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
        ctx.fillStyle = COLORS.CYAN_BRIGHT;
        ctx.textAlign = 'center';
        ctx.fillText('INITIATE DECRYPTION ▶', btnX + btnW / 2, btnY + 20);
        ctx.textAlign = 'left';

        this.buttonHitboxes.push({
          x: btnX,
          y: btnY,
          w: btnW,
          h: btnH,
          action: () => this.launchDecryption(f.id)
        });
      } else {
        ctx.fillStyle = 'rgba(40, 45, 50, 0.4)';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.strokeStyle = '#445566';
        ctx.strokeRect(btnX, btnY, btnW, btnH);

        ctx.font = '11px "Share Tech Mono", monospace, monospace';
        ctx.fillStyle = '#667788';
        ctx.textAlign = 'center';
        ctx.fillText('[ UNACQUIRED ]', btnX + btnW / 2, btnY + 20);
        ctx.textAlign = 'left';
      }
    });

    // Final Transmit Subspace Broadcast Button
    const decryptedCount = this.gameState ? this.gameState.getDecryptedFragmentCount() : 0;
    const canBroadcast = decryptedCount >= 3;

    const bcastY = startY + 3 * (rowH + 12) + 10;
    const bcastW = width - 40;
    const bcastH = 44;

    ctx.fillStyle = canBroadcast ? 'rgba(0, 255, 102, 0.25)' : 'rgba(30, 35, 40, 0.4)';
    ctx.fillRect(x + 20, bcastY, bcastW, bcastH);
    ctx.strokeStyle = canBroadcast ? COLORS.CRT_GREEN_BRIGHT : '#445566';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 20, bcastY, bcastW, bcastH);

    ctx.font = 'bold 13px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = canBroadcast ? COLORS.CRT_GREEN_BRIGHT : '#667788';
    ctx.textAlign = 'center';
    ctx.fillText(
      canBroadcast ? '▶ [4] TRANSMIT FINAL SUBSPACE BROADCAST (UNLOCK ESCAPE POD) ◀' : `TRANSMISSION LOCKED (${decryptedCount}/3 FRAGMENTS DECRYPTED)`,
      x + 20 + bcastW / 2,
      bcastY + 27
    );
    ctx.textAlign = 'left';

    if (canBroadcast) {
      this.buttonHitboxes.push({
        x: x + 20,
        y: bcastY,
        w: bcastW,
        h: bcastH,
        action: () => this.transmitFinalBroadcast()
      });
    }
  }

  // =========================================================================
  // 7. ESCAPE POD LAUNCH SCREEN
  // =========================================================================

  renderEscapeScreen(ctx, x, y, width, height, phosphorColor) {
    ctx.font = 'bold 14px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('EVACUATION AIRLOCK // ESCAPE CRAFT CONSOLE:', x + 20, y + 25);

    const isUnlocked = this.gameState && this.gameState.escapeUnlocked;

    ctx.font = '12px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = isUnlocked ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
    ctx.fillText(`AIRLOCK STATUS: ${isUnlocked ? 'PRIMARY SEAL RELEASED // READY FOR LAUNCH' : 'SEALED // AWAITING SUBSPACE BEACON'}`, x + 20, y + 55);

    const launchBtnX = x + 40;
    const launchBtnY = y + 100;
    const launchBtnW = width - 80;
    const launchBtnH = 60;

    ctx.fillStyle = isUnlocked ? 'rgba(0, 255, 102, 0.3)' : 'rgba(30, 35, 40, 0.4)';
    ctx.fillRect(launchBtnX, launchBtnY, launchBtnW, launchBtnH);
    ctx.strokeStyle = isUnlocked ? COLORS.CRT_GREEN_BRIGHT : '#445566';
    ctx.lineWidth = 2;
    ctx.strokeRect(launchBtnX, launchBtnY, launchBtnW, launchBtnH);

    ctx.font = 'bold 16px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = isUnlocked ? COLORS.CRT_GREEN_BRIGHT : '#667788';
    ctx.textAlign = 'center';
    ctx.fillText(isUnlocked ? '🚀 INITIATE EMERGENCY HYPERSPACE EJECTION (WIN) 🚀' : 'LAUNCH BLOCKED — COMPLETE SUBSPACE BROADCAST', launchBtnX + launchBtnW / 2, launchBtnY + 36);
    ctx.textAlign = 'left';

    if (isUnlocked) {
      this.buttonHitboxes.push({
        x: launchBtnX,
        y: launchBtnY,
        w: launchBtnW,
        h: launchBtnH,
        action: () => {
          this.gameState.checkWinCondition();
          this.close();
        }
      });
    }
  }

  // =========================================================================
  // BOTTOM BAR & SCANLINES
  // =========================================================================

  renderBottomBar(ctx, x, y, width, phosphorColor) {
    ctx.fillStyle = 'rgba(0, 20, 15, 0.8)';
    ctx.fillRect(x, y, width, 45);
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.3)';
    ctx.strokeRect(x, y, width, 45);

    ctx.font = '11px "Share Tech Mono", monospace, monospace';
    ctx.fillStyle = phosphorColor;
    ctx.fillText('NAV: [↑/↓] SELECT  [ENTER/SPACE] ACTIVATE  [1-5] QUICK JUMP  [ESC] DISCONNECT', x + 20, y + 27);

    // Disconnect Button
    const exitBtnX = x + width - 150;
    const exitBtnY = y + 8;
    const exitBtnW = 130;
    const exitBtnH = 30;

    ctx.fillStyle = 'rgba(255, 34, 68, 0.2)';
    ctx.fillRect(exitBtnX, exitBtnY, exitBtnW, exitBtnH);
    ctx.strokeStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.strokeRect(exitBtnX, exitBtnY, exitBtnW, exitBtnH);

    ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
    ctx.font = 'bold 11px "Share Tech Mono", monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ ESC ] EXIT', exitBtnX + exitBtnW / 2, exitBtnY + 19);
    ctx.textAlign = 'left';

    this.buttonHitboxes.push({
      x: exitBtnX,
      y: exitBtnY,
      w: exitBtnW,
      h: exitBtnH,
      action: () => this.close()
    });
  }

  renderCRTScanlines(ctx, x, y, width, height) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let py = y; py < y + height; py += 4) {
      ctx.fillRect(x, py, width, 1.5);
    }
    ctx.restore();
  }
}
