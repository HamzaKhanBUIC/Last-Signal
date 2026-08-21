/**
 * THE LAST SIGNAL — UI & INTERACTIVE MINIGAME TEST SUITE
 */

import { HUD } from '../src/ui/HUD.js';
import { TerminalUI } from '../src/ui/TerminalUI.js';
import { DecryptionMinigame } from '../src/ui/DecryptionMinigame.js';
import { MenuManager } from '../src/ui/MenuManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/core/GameState.js';
import { FRAGMENT_TYPES, GAME_STATES } from '../src/utils/Constants.js';

export function runUITests(describe, test, expect) {
  describe('HUD — Radar, Vitals, Toasts & Action Prompts', () => {
    test('initializes and manages floating notification toasts', () => {
      const bus = new EventBus();
      const hud = new HUD(bus);

      expect(hud.toasts.length).toBe(0);

      hud.showToast('Test Alert', 'alert', 2.0);
      expect(hud.toasts.length).toBe(1);
      expect(hud.toasts[0].message).toBe('Test Alert');
      expect(hud.toasts[0].type).toBe('alert');

      // Update toast time decay
      hud.update(1.0);
      expect(hud.toasts.length).toBe(1);

      hud.update(1.5);
      expect(hud.toasts.length).toBe(0);
    });

    test('sets and clears contextual action prompts', () => {
      const hud = new HUD();
      expect(hud.actionPrompt).toBeNull();

      hud.setActionPrompt('[E] Open Cryo Blast Door', 'Blue Clearance Required');
      expect(hud.actionPrompt).toBeTruthy();
      expect(hud.actionPrompt.text).toBe('[E] Open Cryo Blast Door');

      hud.clearActionPrompt();
      expect(hud.actionPrompt).toBeNull();
    });
  });

  describe('DecryptionMinigame — Waveform Alignment & Resonance', () => {
    test('initializes and calculates resonance percentage', () => {
      const minigame = new DecryptionMinigame();
      minigame.start(FRAGMENT_TYPES.ALPHA);

      expect(minigame.active).toBe(true);
      expect(minigame.fragmentType).toBe(FRAGMENT_TYPES.ALPHA);
      expect(minigame.isLocked).toBe(false);

      // Default state has low resonance
      const initialResonance = minigame.calculateResonance();
      expect(initialResonance).toBeLessThan(0.7);

      // Tune close to target
      minigame.player.freq = minigame.target.freq;
      minigame.player.amp = minigame.target.amp;
      minigame.player.phase = minigame.target.phase;

      const matchedResonance = minigame.calculateResonance();
      expect(matchedResonance).toBeGreaterThanOrEqual(0.9);
    });

    test('frequency lock succeeds only at high resonance', () => {
      const minigame = new DecryptionMinigame();
      let completed = false;
      minigame.start(FRAGMENT_TYPES.BETA, () => {
        completed = true;
      });

      // Detuned attempt
      minigame.player.freq = 0.5;
      minigame.attemptLock();
      expect(minigame.isLocked).toBe(false);
      expect(completed).toBe(false);

      // Perfectly tuned attempt
      minigame.player.freq = minigame.target.freq;
      minigame.player.amp = minigame.target.amp;
      minigame.player.phase = minigame.target.phase;
      minigame.calculateResonance();
      const lockSuccess = minigame.attemptLock();
      expect(lockSuccess).toBe(true);
      expect(minigame.isLocked).toBe(true);

      // Advance timer for unlock callback
      minigame.update(1.7);
      expect(completed).toBe(true);
    });
  });

  describe('TerminalUI — Station Consoles & Breaker Puzzle', () => {
    test('opens and handles screen navigation', () => {
      const bus = new EventBus();
      const gs = new GameState(bus);
      const terminal = new TerminalUI({ gameState: gs, eventBus: bus });

      const termData = {
        id: 'TERM-01',
        name: 'Habitation Log Console',
        type: 'lore',
        title: 'CREW LOGS',
        content: ['Test log content line 1', 'Test log line 2']
      };

      terminal.open(termData);
      expect(terminal.isOpen).toBe(true);
      expect(terminal.currentTerminal.id).toBe('TERM-01');

      terminal.close();
      expect(terminal.isOpen).toBe(false);
    });

    test('reactor breaker puzzle toggles and validates solution', () => {
      const terminal = new TerminalUI();
      const reactorTerm = {
        id: 'TERM-PWR-01',
        type: 'generator_restart',
        title: 'REACTOR SUBSTATION'
      };

      terminal.open(reactorTerm);
      expect(terminal.areAllBreakersOnline()).toBe(false);

      // Toggle all 4 breakers
      terminal.toggleBreaker(0);
      terminal.toggleBreaker(1);
      terminal.toggleBreaker(2);
      terminal.toggleBreaker(3);

      expect(terminal.areAllBreakersOnline()).toBe(true);
    });
  });

  describe('MenuManager — State Transitions & Settings Configuration', () => {
    test('manages menu settings and audio volume adjustments', () => {
      let started = false;
      const menu = new MenuManager({
        onStartGame: () => { started = true; }
      });

      expect(menu.settings.masterVolume).toBe(1.0);
      menu.adjustSetting('masterVolume', -0.2);
      expect(menu.settings.masterVolume).toBeCloseTo(0.8);

      menu.toggleSetting('crtScanlines');
      expect(menu.settings.crtScanlines).toBe(false);

      menu.triggerAction('START');
      expect(started).toBe(true);
    });
  });
}
