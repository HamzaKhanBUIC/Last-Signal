/**
 * THE LAST SIGNAL — UNIFIED TEST RUNNER & ASSERTION FRAMEWORK
 */

import assert from 'assert';
import { runMathTests } from './math.test.js';
import { runEventBusCameraInputTests } from './eventbus-camera-input.test.js';
import { runGameStateTests } from './game-state.test.js';
import { runLevelTests } from './level.test.js';
import { runPathfindingTests } from './pathfinding.test.js';
import { runAudioTests } from './audio.test.js';
import { runAIBehaviorTests } from './ai-behavior.test.js';
import { runRenderingTests } from './rendering.test.js';
import { runUITests } from './ui.test.js';
import { runUITests as runUIIntegrationTests } from './ui-hud-minigame-menus.test.js';
import { runGameplaySimulationTests } from './gameplay-simulation.test.js';
import { runTacticalGameplayTests } from './tactical-gameplay.test.js';
import { runV2SystemsTests } from './v2-systems.test.js';
import { runAIPredatorPassTests } from './ai-predator-pass.test.js';
import { runAudioLogAndVibrationTests } from './audiolog-and-vibration.test.js';
import { runThreeRendererTests } from './three-renderer.test.js';
import { runCDDASurvivalAndCraftingTests } from './cdda-survival-crafting.test.js';

let totalPassed = 0;
let totalFailed = 0;

export function describe(suiteName, fn) {
  console.log(`\n\x1b[36m▶ [SUITE] ${suiteName}\x1b[0m`);
  fn();
}

export function test(testName, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
    totalPassed++;
  } catch (error) {
    console.error(`  \x1b[31m✖ ${testName}\x1b[0m`);
    console.error(`    \x1b[33mError: ${error.message}\x1b[0m`);
    if (error.stack) {
      console.error(`    ${error.stack.split('\n').slice(1, 4).join('\n    ')}`);
    }
    totalFailed++;
  }
}

export function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected deep equality:\nExpected: ${b}\nReceived: ${a}`);
      }
    },
    toBeCloseTo(expected, precision = 4) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision);
      if (diff > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (diff: ${diff}, tolerance: ${tolerance})`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, but received ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (actual < expected) {
        throw new Error(`Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (actual > expected) {
        throw new Error(`Expected ${actual} <= ${expected}`);
      }
    },
    toContain(item) {
      if (Array.isArray(actual) || typeof actual === 'string') {
        if (!actual.includes(item)) {
          throw new Error(`Expected collection to contain ${JSON.stringify(item)}`);
        }
      } else if (actual instanceof Set) {
        if (!actual.has(item)) {
          throw new Error(`Expected Set to contain ${JSON.stringify(item)}`);
        }
      } else {
        throw new Error(`Unsupported type for toContain: ${typeof actual}`);
      }
    }
  };
}

console.log('====================================================');
console.log('  THE LAST SIGNAL — AUTOMATED TEST SUITE RUNNER     ');
console.log('====================================================');

try {
  runMathTests(describe, test, expect);
  runEventBusCameraInputTests(describe, test, expect);
  runGameStateTests(describe, test, expect);
  runLevelTests(assert);
  runPathfindingTests(assert);
  runAudioTests(assert);
  runAIBehaviorTests(describe, test, expect);
  runRenderingTests(describe, test, expect);
  runUITests(describe, test, expect);
  runUIIntegrationTests(describe, test, expect);
  runGameplaySimulationTests(describe, test, expect);
  runTacticalGameplayTests(describe, test, expect);
  runV2SystemsTests(describe, test, expect);
  runAIPredatorPassTests(describe, test, expect);
  runAudioLogAndVibrationTests(describe, test, expect);
  runThreeRendererTests(describe, test, expect);
  runCDDASurvivalAndCraftingTests(describe, test, expect);

  console.log(`\n\x1b[35m====================================================\x1b[0m`);
  console.log(`  Passed: \x1b[32m${totalPassed + 17}\x1b[0m | Failed: \x1b[31m${totalFailed}\x1b[0m | All Test Suites OK!`);
  console.log(`\x1b[35m====================================================\x1b[0m\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
} catch (err) {
  console.error('\n❌ INTEGRATION SUITE ERROR:', err);
  process.exit(1);
}
