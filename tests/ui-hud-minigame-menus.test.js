/**
 * THE LAST SIGNAL — UI, HUD, TERMINAL & MINIGAME TEST SUITE
 * Unit & integration tests for HUD, DecryptionMinigame, TerminalUI, and MenuManager.
 */

import { HUD } from '../src/ui/HUD.js';
import { DecryptionMinigame } from '../src/ui/DecryptionMinigame.js';
import { TerminalUI } from '../src/ui/TerminalUI.js';
import { MenuManager } from '../src/ui/MenuManager.js';
import { GameState } from '../src/core/GameState.js';
import { EventBus } from '../src/core/EventBus.js';
import { GAME_STATES, SECURITY_LEVELS, ITEM_TYPES } from '../src/utils/Constants.js';

export function runUITests(describe, test, expect) {
  // Mock 2D Canvas Context for render tests
  const createMockContext = () => ({
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    rect: () => {},
    clip: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    measureText: (text) => ({ width: text.length * 8 }),
    createRadialGradient: () => ({
      addColorStop: () => {}
    }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    globalAlpha: 1.0
  });

  describe('HUD System — Vitals, Radar, Objectives & Toasts', () => {
    test('initializes with clean default state', () => {
      const bus = new EventBus();
      const hud = new HUD(bus);

      expect(hud.toasts.length).toBe(0);
      expect(hud.actionPrompt).toBeNull();
    });

    test('toasts queue and auto-capping at max capacity', () => {
      const hud = new HUD();
      hud.showToast('ALERT 1', 'alert');
      hud.showToast('ALERT 2', 'info');
      hud.showToast('ALERT 3', 'warning');
      hud.showToast('ALERT 4', 'success');
      hud.showToast('ALERT 5', 'info');
      hud.showToast('ALERT 6', 'info'); // Should shift first

      expect(hud.toasts.length).toBe(5);
      expect(hud.toasts[0].message).toBe('ALERT 2');
      expect(hud.toasts[4].message).toBe('ALERT 6');
    });

    test('toast decays and cleans up after duration expires', () => {
      const hud = new HUD();
      hud.showToast('QUICK MESSAGE', 'info', 1.0);
      expect(hud.toasts.length).toBe(1);

      hud.update(0.5);
      expect(hud.toasts.length).toBe(1);

      hud.update(0.6); // elapsed >= 1.0, begins fade
      hud.update(0.5); // alpha reaches 0, removed
      expect(hud.toasts.length).toBe(0);
    });

    test('action prompt set, clear, and timeout buffer', () => {
      const hud = new HUD();
      hud.setActionPrompt('[E] OPEN BULKHEAD', 'Blue Clearance', 'locked');

      expect(hud.actionPrompt.text).toBe('[E] OPEN BULKHEAD');
      expect(hud.actionPrompt.subtext).toBe('Blue Clearance');
      expect(hud.actionPrompt.type).toBe('locked');

      hud.update(0.3);
      expect(hud.actionPrompt).toBeNull();
    });

    test('renders complete HUD frame without throwing errors', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      gs.setState(GAME_STATES.PLAYING);
      gs.addInventory(ITEM_TYPES.KEYCARD_BLUE);
      gs.addInventory(ITEM_TYPES.FRAGMENT_ALPHA);

      const hud = new HUD(bus);
      hud.showToast('SYSTEM ONLINE');
      hud.setActionPrompt('[E] ACCESS');

      const ctx = createMockContext();
      const mockPlayer = { x: 100, y: 100, health: 80, maxHealth: 100 };
      const mockEnemy = { x: 250, y: 200, active: true };

      // Verify render does not throw
      hud.render(ctx, gs, mockPlayer, mockEnemy, 'Sector 3: Cryo Lab');
      expect(true).toBe(true);
    });
  });

  describe('DecryptionMinigame — Oscilloscope Resonance & Alignment', () => {
    test('initializes target wave parameters according to fragment type', () => {
      const minigame = new DecryptionMinigame();

      minigame.start('FRAGMENT_ALPHA');
      expect(minigame.active).toBe(true);
      expect(minigame.target.freq).toBe(2.2);

      minigame.start('FRAGMENT_BETA');
      expect(minigame.target.freq).toBe(3.4);

      minigame.start('FRAGMENT_GAMMA');
      expect(minigame.target.freq).toBe(4.1);
    });

    test('calculates resonance accuracy based on parameter closeness', () => {
      const minigame = new DecryptionMinigame();
      minigame.start('FRAGMENT_ALPHA');

      // Initial mismatched values should yield low resonance
      const initialResonance = minigame.calculateResonance();
      expect(initialResonance).toBeLessThan(0.95);

      // Set player wave exactly to target wave
      minigame.player.freq = minigame.target.freq;
      minigame.player.amp = minigame.target.amp;
      minigame.player.phase = minigame.target.phase;

      const perfectResonance = minigame.calculateResonance();
      expect(perfectResonance).toBeGreaterThanOrEqual(0.95);
    });

    test('attemptLock blocks under 95% and succeeds at >= 95%', () => {
      let completedFragment = null;
      const minigame = new DecryptionMinigame();

      minigame.start('FRAGMENT_ALPHA', (frag) => {
        completedFragment = frag;
      });

      // Attempt lock on misaligned wave
      const lockedPremature = minigame.attemptLock();
      expect(lockedPremature).toBe(false);
      expect(minigame.isLocked).toBe(false);

      // Align perfectly
      minigame.player.freq = minigame.target.freq;
      minigame.player.amp = minigame.target.amp;
      minigame.player.phase = minigame.target.phase;
      minigame.calculateResonance();

      const lockedSuccess = minigame.attemptLock();
      expect(lockedSuccess).toBe(true);
      expect(minigame.isLocked).toBe(true);

      // Update timer to finish win animation
      minigame.update(2.0);
      expect(minigame.active).toBe(false);
      expect(completedFragment).toBe('FRAGMENT_ALPHA');
    });
  });

  describe('TerminalUI — Systems, Logs, Breakers & Override', () => {
    test('opens with boot sequence and navigates to contextual screen', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const terminal = new TerminalUI({ eventBus: bus, gameState: gs });

      terminal.open({ type: 'generator_restart', name: 'Power Substation' });
      expect(terminal.isOpen).toBe(true);
      expect(terminal.isBooting).toBe(true);
      expect(terminal.screenTheme).toBe('amber');

      // Finish boot sequence
      terminal.update(1.0);
      expect(terminal.isBooting).toBe(false);
      expect(terminal.currentScreen).toBe('REACTOR');

      terminal.close();
      expect(terminal.isOpen).toBe(false);
    });

    test('reactor breaker puzzle toggling restores station power', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const terminal = new TerminalUI({ eventBus: bus, gameState: gs });

      terminal.open({ type: 'generator_restart' });
      terminal.update(1.0);

      expect(gs.generatorOnline).toBe(false);

      // Toggle all 4 breakers ON
      terminal.toggleBreaker(0);
      terminal.toggleBreaker(1);
      terminal.toggleBreaker(2);
      expect(gs.generatorOnline).toBe(false);

      terminal.toggleBreaker(3); // 4th breaker
      expect(gs.generatorOnline).toBe(true);
    });

    test('door override security clearance checks', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const terminal = new TerminalUI({ eventBus: bus, gameState: gs });

      terminal.open({ type: 'security_override' });
      terminal.update(1.0);

      // Attempt override Blue door without keycard
      terminal.toggleDoorOverride(0); // Blue door
      expect(terminal.doorsList[0].unlocked).toBe(false);

      // Grant Blue clearance
      gs.addInventory(ITEM_TYPES.KEYCARD_BLUE);
      terminal.toggleDoorOverride(0);
      expect(terminal.doorsList[0].unlocked).toBe(true);
    });

    test('comms broadcast transmission triggers escape unlock when 3 fragments decrypted', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const terminal = new TerminalUI({ eventBus: bus, gameState: gs });

      terminal.open({ type: 'comms_broadcast' });
      terminal.update(1.0);

      // Try broadcast with 0 fragments
      terminal.transmitFinalBroadcast();
      expect(gs.escapeUnlocked).toBe(false);

      // Add & decrypt all 3 fragments
      gs.decryptFragment('FRAGMENT_ALPHA');
      gs.decryptFragment('FRAGMENT_BETA');
      gs.decryptFragment('FRAGMENT_GAMMA');

      terminal.transmitFinalBroadcast();
      expect(gs.escapeUnlocked).toBe(true);
      expect(gs.commsRepaired).toBe(true);
    });
  });

  describe('MenuManager — Title, Pause, Settings & Win/Loss Overlays', () => {
    test('manages Title and Pause menu options and sub-modals', () => {
      let started = false;
      const bus = new EventBus();
      const gs = new GameState(bus);

      const menu = new MenuManager({
        eventBus: bus,
        gameState: gs,
        onStartGame: () => { started = true; }
      });

      menu.activateTitleOption(2); // Open Controls
      expect(menu.activeModal).toBe('CONTROLS');

      menu.activeModal = null;
      menu.activateTitleOption(3); // Open Settings
      expect(menu.activeModal).toBe('SETTINGS');

      menu.activeModal = null;
      menu.activateTitleOption(0); // Start Game (Guided)
      expect(started).toBe(true);
    });

    test('settings adjustments for volume and CRT scanlines', () => {
      const menu = new MenuManager();

      expect(menu.settings.masterVolume).toBe(1.0);
      expect(menu.settings.crtScanlines).toBe(true);

      menu.settings.masterVolume = 0.5;
      menu.settings.crtScanlines = false;

      expect(menu.settings.masterVolume).toBe(0.5);
      expect(menu.settings.crtScanlines).toBe(false);
    });

    test('renders Title, Pause, GameOver, and Victory screens without errors', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const menu = new MenuManager({ eventBus: bus, gameState: gs });
      const ctx = createMockContext();

      menu.renderTitle(ctx);
      menu.renderPause(ctx);
      menu.renderGameOver(ctx, gs);
      menu.renderVictory(ctx, gs);

      expect(true).toBe(true);
    });
  });
}
