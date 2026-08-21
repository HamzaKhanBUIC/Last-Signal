/**
 * Unit Tests for EventBus.js, Camera.js, and InputManager.js
 */

import { EventBus } from '../src/core/EventBus.js';
import { Camera } from '../src/core/Camera.js';
import { InputManager } from '../src/core/InputManager.js';
import { INPUT_ACTIONS } from '../src/utils/Constants.js';

export function runEventBusCameraInputTests(describe, test, expect) {
  describe('EventBus — Publish / Subscribe Messaging', () => {
    test('registers and triggers event listener callbacks', () => {
      const bus = new EventBus();
      let received = null;

      bus.on('TEST_EVENT', data => {
        received = data;
      });

      const count = bus.emit('TEST_EVENT', { msg: 'Hello Signal' });
      expect(count).toBe(1);
      expect(received).toEqual({ msg: 'Hello Signal' });
    });

    test('unsubscribe via returned callback and off()', () => {
      const bus = new EventBus();
      let counter = 0;
      const handler = () => { counter++; };

      const unsubscribe = bus.on('PING', handler);
      bus.emit('PING');
      expect(counter).toBe(1);

      unsubscribe();
      bus.emit('PING');
      expect(counter).toBe(1);

      // Re-add and remove via off
      bus.on('PING', handler);
      bus.off('PING', handler);
      bus.emit('PING');
      expect(counter).toBe(1);
    });

    test('once() executes only on first emit', () => {
      const bus = new EventBus();
      let calls = 0;

      bus.once('ONE_SHOT', () => { calls++; });
      bus.emit('ONE_SHOT');
      bus.emit('ONE_SHOT');
      bus.emit('ONE_SHOT');

      expect(calls).toBe(1);
    });

    test('error isolation: broken listener does not prevent subsequent listeners', () => {
      const bus = new EventBus();
      let secondRan = false;

      bus.on('EXPLODE', () => {
        throw new Error('Boom');
      });

      bus.on('EXPLODE', () => {
        secondRan = true;
      });

      bus.emit('EXPLODE');
      expect(secondRan).toBe(true);
    });

    test('clear() removes listeners correctly', () => {
      const bus = new EventBus();
      bus.on('EV1', () => {});
      bus.on('EV2', () => {});

      expect(bus.listenerCount('EV1')).toBe(1);
      bus.clear('EV1');
      expect(bus.listenerCount('EV1')).toBe(0);
      expect(bus.listenerCount('EV2')).toBe(1);

      bus.clear();
      expect(bus.listenerCount('EV2')).toBe(0);
    });
  });

  describe('Camera — 2D Tracking & Coordinate Transforms', () => {
    test('worldToScreen and screenToWorld are reversible projections', () => {
      const cam = new Camera(1280, 720);
      cam.x = 500;
      cam.y = 300;
      cam.zoom = 1.0;

      const screenCenter = cam.worldToScreen(500, 300);
      expect(screenCenter.x).toBeCloseTo(640);
      expect(screenCenter.y).toBeCloseTo(360);

      const originalWorld = { x: 742, y: 128 };
      const screenPos = cam.worldToScreen(originalWorld.x, originalWorld.y);
      const convertedWorld = cam.screenToWorld(screenPos.x, screenPos.y);

      expect(convertedWorld.x).toBeCloseTo(originalWorld.x);
      expect(convertedWorld.y).toBeCloseTo(originalWorld.y);
    });

    test('zoom scaling affects projection math', () => {
      const cam = new Camera(1280, 720);
      cam.x = 0;
      cam.y = 0;
      cam.zoom = 2.0;

      const screenPos = cam.worldToScreen(100, 0);
      expect(screenPos.x).toBeCloseTo(640 + 200);
    });

    test('world bounds clamping keeps viewport inside map limits', () => {
      const cam = new Camera(1280, 720);
      cam.zoom = 1.0;
      cam.setWorldBounds(0, 0, 2000, 2000);

      cam.snapTo(100, 100);
      expect(cam.x).toBe(640);
      expect(cam.y).toBe(360);

      cam.snapTo(3000, 3000);
      expect(cam.x).toBe(1360);
      expect(cam.y).toBe(1640);
    });

    test('target tracking smoothly updates camera position during tick', () => {
      const cam = new Camera(1280, 720);
      const player = { x: 1000, y: 800 };
      cam.follow(player);
      cam.x = 0;
      cam.y = 0;

      cam.update(0.016);
      expect(cam.x).toBeGreaterThan(0);
      expect(cam.y).toBeGreaterThan(0);
    });

    test('screen shake decay over time', () => {
      const cam = new Camera(1280, 720);
      cam.shake(1.0, 0.5);
      expect(cam.trauma).toBe(1.0);

      cam.update(0.25);
      expect(cam.trauma).toBeLessThan(1.0);
      expect(cam.trauma).toBeGreaterThan(0);

      cam.update(0.5);
      expect(cam.trauma).toBe(0);
      expect(cam.shakeOffset.x).toBe(0);
      expect(cam.shakeOffset.y).toBe(0);
    });
  });

  describe('InputManager — Key and Action Tracking', () => {
    test('maps raw key codes to high-level game actions', () => {
      const input = new InputManager();

      expect(input.isActionActive(INPUT_ACTIONS.MOVE_UP)).toBe(false);

      input._handleKeyDown({ code: 'KeyW', preventDefault: () => {} });
      expect(input.isActionActive(INPUT_ACTIONS.MOVE_UP)).toBe(true);
      expect(input.wasActionJustPressed(INPUT_ACTIONS.MOVE_UP)).toBe(true);

      input.update();
      expect(input.isActionActive(INPUT_ACTIONS.MOVE_UP)).toBe(true);
      expect(input.wasActionJustPressed(INPUT_ACTIONS.MOVE_UP)).toBe(false);

      input._handleKeyUp({ code: 'KeyW' });
      expect(input.isActionActive(INPUT_ACTIONS.MOVE_UP)).toBe(false);
      expect(input.wasActionJustReleased(INPUT_ACTIONS.MOVE_UP)).toBe(true);
    });

    test('computes normalized diagonal movement vector (avoids diagonal speed boost)', () => {
      const input = new InputManager();
      input._handleKeyDown({ code: 'KeyW', preventDefault: () => {} });
      input._handleKeyDown({ code: 'KeyD', preventDefault: () => {} });

      const vec = input.getMovementVector();
      expect(vec.x).toBeCloseTo(1 / Math.SQRT2);
      expect(vec.y).toBeCloseTo(-1 / Math.SQRT2);

      const length = Math.hypot(vec.x, vec.y);
      expect(length).toBeCloseTo(1.0);
    });

    test('virtual controls feed into action queries and movement vector', () => {
      const input = new InputManager();
      input.setVirtualMovement(0.5, -0.866, true);

      const vec = input.getMovementVector();
      expect(vec.x).toBeCloseTo(0.5);
      expect(vec.y).toBeCloseTo(-0.866);

      input.setVirtualAction(INPUT_ACTIONS.INTERACT, true);
      expect(input.isActionActive(INPUT_ACTIONS.INTERACT)).toBe(true);
      expect(input.wasActionJustPressed(INPUT_ACTIONS.INTERACT)).toBe(true);
    });
  });
}
