/**
 * THE LAST SIGNAL — TUTORIAL & ONBOARDING SYSTEM TEST SUITE
 * Tests:
 * 1. TutorialSystem initial state and step 1 movement tracking
 * 2. Event-driven step advancement (Flashlight, Stance, Keycard, Locker, Crafting, PDA)
 * 3. Waypoint coordinates for visual guidance chevrons
 * 4. Step skipping and completion lifecycle
 */

import { TutorialSystem, TUTORIAL_STEPS } from '../src/core/TutorialSystem.js';
import { EventBus } from '../src/core/EventBus.js';

export function runTutorialSystemTests(describe, test, expect) {
  describe('Interactive Guided Tutorial & Onboarding Engine', () => {
    test('TutorialSystem: Initializes inactive by default', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);

      expect(tutorial.isTutorialActive).toBe(false);
      expect(tutorial.getCurrentStep()).toBe(null);
      expect(tutorial.activeStepIndex).toBe(0);
    });

    test('TutorialSystem: Starts guided tutorial with Phase 1 (Movement)', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      let started = false;
      eventBus.on('TUTORIAL_STARTED', () => { started = true; });

      tutorial.startTutorial();

      expect(tutorial.isTutorialActive).toBe(true);
      expect(started).toBe(true);

      const step1 = tutorial.getCurrentStep();
      expect(step1).toBeTruthy();
      expect(step1.id).toBe('STEP_MOVE');
      expect(step1.title).toContain('PHASE 1/8');
    });

    test('TutorialSystem: Advances from Step 1 when player moves 80px', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      tutorial.startTutorial();

      const dummyPlayer = { x: 384, y: 384 };
      tutorial.update(0.016, dummyPlayer);

      // Move player 100px
      dummyPlayer.x += 100;
      tutorial.update(0.016, dummyPlayer);

      const step2 = tutorial.getCurrentStep();
      expect(step2.id).toBe('STEP_FLASHLIGHT');
      expect(tutorial.completedSteps.has('STEP_MOVE')).toBe(true);
    });

    test('TutorialSystem: Advances upon flashlight toggle event', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      tutorial.startTutorial();
      tutorial.advanceStep(); // Go to Step 2 (Flashlight)

      expect(tutorial.getCurrentStep().id).toBe('STEP_FLASHLIGHT');

      eventBus.emit('FLASHLIGHT_TOGGLED');
      expect(tutorial.getCurrentStep().id).toBe('STEP_STEALTH');
    });

    test('TutorialSystem: Advances across keycard, locker, crafting and PDA stages', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      tutorial.startTutorial();
      tutorial.activeStepIndex = 3; // Step 4: Keycard

      eventBus.emit('ITEM_COLLECTED', { type: 'keycard_blue' });
      expect(tutorial.getCurrentStep().id).toBe('STEP_LOCKER');

      eventBus.emit('PLAYER_HIDDEN');
      expect(tutorial.getCurrentStep().id).toBe('STEP_CRAFTING');

      eventBus.emit('CRAFTING_TOGGLED');
      expect(tutorial.getCurrentStep().id).toBe('STEP_PDA_MAP');

      eventBus.emit('MAP_TOGGLED');
      expect(tutorial.getCurrentStep().id).toBe('STEP_FINAL');
    });

    test('TutorialSystem: Completes and resets state at end of sequence', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      let completed = false;
      eventBus.on('TUTORIAL_COMPLETED', () => { completed = true; });

      tutorial.startTutorial();
      tutorial.activeStepIndex = 7; // Final step
      tutorial.advanceStep();

      expect(tutorial.isTutorialActive).toBe(false);
      expect(completed).toBe(true);
      expect(tutorial.getCurrentStep()).toBe(null);
    });

    test('TutorialSystem: Supports skip mode and emits event', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      let skipped = false;
      eventBus.on('TUTORIAL_SKIPPED', () => { skipped = true; });

      tutorial.startTutorial();
      expect(tutorial.isTutorialActive).toBe(true);

      tutorial.skipTutorial();
      expect(tutorial.isTutorialActive).toBe(false);
      expect(skipped).toBe(true);
    });

    test('TutorialSystem: Returns valid active waypoints for navigation', () => {
      const eventBus = new EventBus();
      const tutorial = new TutorialSystem(eventBus);
      tutorial.startTutorial();
      const wp = tutorial.getActiveWaypoint();

      expect(wp).toBeTruthy();
      expect(wp.x).toBeGreaterThan(0);
      expect(wp.y).toBeGreaterThan(0);
      expect(wp.label).toContain('HABITATION');
    });
  });
}
