/**
 * THE LAST SIGNAL — GAME STATE MANAGER
 * Centralized state machine, player vitals, inventory, objectives,
 * survival statistics, and win/loss condition tracking.
 */

import {
  GAME_STATES,
  ITEM_TYPES,
  SECURITY_LEVELS,
  EVENTS,
  HEALTH_MAX,
  STAMINA_MAX,
  STAMINA_SPRINT_DRAIN,
  STAMINA_WALK_RECOVERY,
  STAMINA_IDLE_RECOVERY,
  STAMINA_CROUCH_RECOVERY,
  STAMINA_EXHAUSTION_THRESHOLD,
  STAMINA_RECOVERY_DELAY,
  BATTERY_MAX,
  BATTERY_DRAIN_RATE,
  BATTERY_PACK_RESTORE,
  MEDKIT_RESTORE
} from '../utils/Constants.js';
import { globalEventBus } from './EventBus.js';
import { clamp } from '../utils/MathUtils.js';

export class GameState {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus=globalEventBus]
   */
  constructor(eventBus = globalEventBus) {
    this.eventBus = eventBus;
    this.reset();
  }

  /**
   * Resets all game state parameters to fresh start values.
   */
  reset() {
    // Current Machine State
    this.state = GAME_STATES.TITLE;
    this.previousState = null;

    // Player Vitals
    this.playerHealth = HEALTH_MAX;
    this.flashlightBattery = BATTERY_MAX;
    this.stamina = STAMINA_MAX;

    // Player Status Flags
    this.isFlashlightOn = true;
    this.isSprinting = false;
    this.isCrouching = false;
    this.isExhausted = false;
    this._staminaDelayTimer = 0;

    // Inventory
    this.inventory = {
      keycards: new Set(), // 'BLUE', 'RED', 'MASTER'
      fragments: new Set(), // 'FRAGMENT_ALPHA', 'FRAGMENT_BETA', 'FRAGMENT_GAMMA'
      decryptedFragments: new Set(), // Decrypted fragment identifiers
      medkits: 1,
      batteries: 1,
      decoys: 2,
      empCharges: 1,
      audioLogs: new Set()
    };

    // Station Systems & Objectives
    this.currentObjective = 'Explore AEGIS-7 Station and find Signal Fragment Alpha.';
    this.completedObjectives = [];
    this.commsRepaired = false;
    this.generatorOnline = false;
    this.escapeUnlocked = false;

    // Timers & Statistics
    this.gameTimer = 0;
    this.stats = {
      steps: 0,
      itemsCollected: 0,
      damageTaken: 0,
      timeSurvived: 0,
      fragmentsFound: 0,
      medkitsUsed: 0,
      batteriesUsed: 0,
      decoysUsed: 0,
      empUsed: 0,
      terminalsAccessed: 0
    };
  }

  // ==========================================
  // STATE MACHINE
  // ==========================================

  /**
   * Transitions to a new game state.
   * @param {string} newState Member of GAME_STATES
   * @returns {boolean} True if state changed
   */
  setState(newState) {
    if (!GAME_STATES[newState] && !Object.values(GAME_STATES).includes(newState)) {
      console.warn(`[GameState] Invalid state transition attempted: "${newState}"`);
      return false;
    }

    if (this.state === newState) return false;

    const oldState = this.state;
    this.previousState = oldState;
    this.state = newState;

    this.eventBus.emit(EVENTS.STATE_CHANGED, {
      from: oldState,
      to: newState
    });

    if (newState === GAME_STATES.GAMEOVER) {
      this.eventBus.emit(EVENTS.PLAYER_DIED, { stats: this.getSummaryStats() });
    } else if (newState === GAME_STATES.VICTORY) {
      this.eventBus.emit(EVENTS.OBJECTIVE_COMPLETED, {
        objective: 'Station Evacuated',
        stats: this.getSummaryStats()
      });
    }

    return true;
  }

  /**
   * Returns current active game state.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Checks if game is currently in active gameplay.
   * @returns {boolean}
   */
  isPlaying() {
    return this.state === GAME_STATES.PLAYING;
  }

  // ==========================================
  // INVENTORY & ITEM MANAGEMENT
  // ==========================================

  /**
   * Adds an item to the inventory. Alias for addInventory.
   * @param {string|{id: string, type: string, count?: number}} item
   * @param {Object} [options]
   */
  addItem(item, options = {}) {
    if (typeof item === 'string' && options.count) {
      return this.addInventory({ type: item, count: options.count });
    }
    return this.addInventory(item);
  }

  /**
   * Adds an item to the inventory.
   * @param {string|{id: string, type: string, count?: number}} item
   */
  addInventory(item) {
    const itemType = typeof item === 'string' ? item : item.type || item.id;
    let added = false;

    switch (itemType) {
      case ITEM_TYPES.KEYCARD_BLUE:
      case 'KEYCARD_BLUE':
      case 'BLUE':
        this.inventory.keycards.add(SECURITY_LEVELS.BLUE);
        added = true;
        break;

      case ITEM_TYPES.KEYCARD_RED:
      case 'KEYCARD_RED':
      case 'RED':
        this.inventory.keycards.add(SECURITY_LEVELS.RED);
        added = true;
        break;

      case ITEM_TYPES.KEYCARD_MASTER:
      case 'KEYCARD_MASTER':
      case 'MASTER':
        this.inventory.keycards.add(SECURITY_LEVELS.MASTER);
        added = true;
        break;

      case ITEM_TYPES.FRAGMENT_ALPHA:
      case 'FRAGMENT_ALPHA':
      case 'ALPHA':
        this.inventory.fragments.add(ITEM_TYPES.FRAGMENT_ALPHA);
        this.stats.fragmentsFound = this.inventory.fragments.size;
        this.eventBus.emit(EVENTS.FRAGMENT_COLLECTED, { fragment: ITEM_TYPES.FRAGMENT_ALPHA, total: this.inventory.fragments.size });
        this.checkFragmentProgress();
        added = true;
        break;

      case ITEM_TYPES.FRAGMENT_BETA:
      case 'FRAGMENT_BETA':
      case 'BETA':
        this.inventory.fragments.add(ITEM_TYPES.FRAGMENT_BETA);
        this.stats.fragmentsFound = this.inventory.fragments.size;
        this.eventBus.emit(EVENTS.FRAGMENT_COLLECTED, { fragment: ITEM_TYPES.FRAGMENT_BETA, total: this.inventory.fragments.size });
        this.checkFragmentProgress();
        added = true;
        break;

      case ITEM_TYPES.FRAGMENT_GAMMA:
      case 'FRAGMENT_GAMMA':
      case 'GAMMA':
        this.inventory.fragments.add(ITEM_TYPES.FRAGMENT_GAMMA);
        this.stats.fragmentsFound = this.inventory.fragments.size;
        this.eventBus.emit(EVENTS.FRAGMENT_COLLECTED, { fragment: ITEM_TYPES.FRAGMENT_GAMMA, total: this.inventory.fragments.size });
        this.checkFragmentProgress();
        added = true;
        break;

      case ITEM_TYPES.MEDKIT:
      case 'MEDKIT': {
        const count = typeof item === 'object' && item.count ? item.count : 1;
        this.inventory.medkits += count;
        added = true;
        break;
      }

      case ITEM_TYPES.BATTERY_PACK:
      case 'BATTERY_PACK':
      case 'BATTERY': {
        const count = typeof item === 'object' && item.count ? item.count : 1;
        this.inventory.batteries += count;
        added = true;
        break;
      }

      case ITEM_TYPES.SONIC_DECOY:
      case 'SONIC_DECOY':
      case 'DECOY': {
        const count = typeof item === 'object' && item.count ? item.count : 1;
        this.inventory.decoys = (this.inventory.decoys || 0) + count;
        added = true;
        break;
      }

      case ITEM_TYPES.EMP_CHARGE:
      case 'EMP_CHARGE':
      case 'EMP': {
        const count = typeof item === 'object' && item.count ? item.count : 1;
        this.inventory.empCharges = (this.inventory.empCharges || 0) + count;
        added = true;
        break;
      }

      case ITEM_TYPES.AUDIO_LOG:
      case 'AUDIO_LOG': {
        const logId = typeof item === 'object' && item.id ? item.id : 'LOG_' + Date.now();
        this.inventory.audioLogs.add(logId);
        this.eventBus.emit(EVENTS.LOG_DISCOVERED, { logId });
        added = true;
        break;
      }

      default:
        console.warn(`[GameState] Unknown item type added: "${itemType}"`);
        break;
    }

    if (added) {
      this.stats.itemsCollected++;
      this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
    }

    return added;
  }

  /**
   * Checks if inventory possesses a specific item or type.
   * @param {string} id
   * @returns {boolean}
   */
  hasItem(id) {
    if (this.inventory.keycards.has(id)) return true;
    if (this.inventory.fragments.has(id)) return true;
    if (this.inventory.audioLogs.has(id)) return true;
    if (id === ITEM_TYPES.MEDKIT || id === 'MEDKIT') return this.inventory.medkits > 0;
    if (id === ITEM_TYPES.BATTERY_PACK || id === 'BATTERY_PACK' || id === 'BATTERY') return this.inventory.batteries > 0;
    if (id === ITEM_TYPES.SONIC_DECOY || id === 'SONIC_DECOY' || id === 'DECOY') return (this.inventory.decoys || 0) > 0;
    if (id === ITEM_TYPES.EMP_CHARGE || id === 'EMP_CHARGE' || id === 'EMP') return (this.inventory.empCharges || 0) > 0;
    return false;
  }

  /**
   * Checks if player has required security level clearance.
   * Master keycard grants clearance for all levels.
   * @param {string} requiredLevel 'BLUE', 'RED', 'MASTER'
   * @returns {boolean}
   */
  hasKeycard(requiredLevel) {
    if (!requiredLevel || requiredLevel === SECURITY_LEVELS.NONE) return true;
    if (this.inventory.keycards.has(SECURITY_LEVELS.MASTER)) return true;
    return this.inventory.keycards.has(requiredLevel);
  }

  /**
   * Checks if a specific fragment has been acquired.
   * @param {string} fragmentType 'FRAGMENT_ALPHA', 'FRAGMENT_BETA', 'FRAGMENT_GAMMA', 'alpha', 'beta', 'gamma'
   * @returns {boolean}
   */
  hasFragment(fragmentType) {
    if (this.inventory.fragments.has(fragmentType)) return true;
    const normalized = fragmentType.toUpperCase().startsWith('FRAGMENT_') ? fragmentType : `FRAGMENT_${fragmentType.toUpperCase()}`;
    return this.inventory.fragments.has(normalized);
  }

  /**
   * Checks if a specific fragment has been decrypted.
   * @param {string} fragmentType
   * @returns {boolean}
   */
  isFragmentDecrypted(fragmentType) {
    if (this.inventory.decryptedFragments.has(fragmentType)) return true;
    const normalized = fragmentType.toUpperCase().startsWith('FRAGMENT_') ? fragmentType : `FRAGMENT_${fragmentType.toUpperCase()}`;
    return this.inventory.decryptedFragments.has(normalized);
  }

  /**
   * Decrypts an acquired fragment.
   * @param {string} fragmentType
   * @returns {boolean}
   */
  decryptFragment(fragmentType) {
    const normalized = fragmentType.toUpperCase().startsWith('FRAGMENT_') ? fragmentType : `FRAGMENT_${fragmentType.toUpperCase()}`;
    // Ensure it's in inventory
    this.inventory.fragments.add(normalized);
    this.inventory.decryptedFragments.add(normalized);

    this.eventBus.emit(EVENTS.FRAGMENT_DECRYPTED, {
      fragment: normalized,
      totalDecrypted: this.inventory.decryptedFragments.size
    });

    if (this.inventory.decryptedFragments.size >= 3) {
      this.commsRepaired = true;
      this.updateObjective('All 3 Fragments Decrypted! Transmit subspace broadcast at Comms Array.');
    }

    this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
    return true;
  }

  /**
   * Returns count of fragments collected (0 to 3).
   * @returns {number}
   */
  getFragmentCount() {
    return this.inventory.fragments.size;
  }

  /**
   * Returns count of fragments decrypted (0 to 3).
   * @returns {number}
   */
  getDecryptedFragmentCount() {
    return this.inventory.decryptedFragments.size;
  }

  /**
   * Consumes an inventory item (Medkit or Battery).
   * @param {string} id
   * @returns {boolean} True if consumed successfully
   */
  consumeItem(id) {
    if (id === ITEM_TYPES.MEDKIT || id === 'MEDKIT') {
      return this.useMedkit();
    }
    if (id === ITEM_TYPES.BATTERY_PACK || id === 'BATTERY_PACK' || id === 'BATTERY') {
      return this.useBattery();
    }
    if (id === ITEM_TYPES.SONIC_DECOY || id === 'SONIC_DECOY' || id === 'DECOY') {
      return this.useDecoy();
    }
    if (id === ITEM_TYPES.EMP_CHARGE || id === 'EMP_CHARGE' || id === 'EMP') {
      return this.useEMP();
    }
    return false;
  }

  /**
   * Uses a Medkit to heal player.
   * @returns {boolean}
   */
  useMedkit() {
    if (this.inventory.medkits <= 0 || this.playerHealth >= HEALTH_MAX) return false;
    this.inventory.medkits--;
    this.stats.medkitsUsed++;
    this.heal(MEDKIT_RESTORE);
    this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
    return true;
  }

  /**
   * Uses a Battery Pack to recharge flashlight.
   * @returns {boolean}
   */
  useBattery() {
    if (this.inventory.batteries <= 0 || this.flashlightBattery >= BATTERY_MAX) return false;
    this.inventory.batteries--;
    this.stats.batteriesUsed++;
    this.chargeBattery(BATTERY_PACK_RESTORE);
    this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
    return true;
  }

  /**
   * Deploys a Sonic Decoy acoustic distraction.
   * @returns {boolean}
   */
  useDecoy() {
    if ((this.inventory.decoys || 0) <= 0) return false;
    this.inventory.decoys--;
    this.stats.decoysUsed = (this.stats.decoysUsed || 0) + 1;
    this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
    return true;
  }

  /**
   * Discharges an EMP Surge (uses 1 EMP charge OR 45% flashlight battery).
   * @returns {boolean}
   */
  useEMP() {
    if ((this.inventory.empCharges || 0) > 0) {
      this.inventory.empCharges--;
      this.stats.empUsed = (this.stats.empUsed || 0) + 1;
      this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
      return true;
    }
    if (this.flashlightBattery >= 45) {
      this.drainBattery(45);
      this.stats.empUsed = (this.stats.empUsed || 0) + 1;
      this.eventBus.emit(EVENTS.INVENTORY_CHANGED, { inventory: this.getInventorySummary() });
      return true;
    }
    return false;
  }

  /**
   * Returns a serializable summary of inventory.
   */
  getInventorySummary() {
    return {
      keycards: Array.from(this.inventory.keycards),
      fragments: Array.from(this.inventory.fragments),
      decryptedFragments: Array.from(this.inventory.decryptedFragments),
      medkits: this.inventory.medkits,
      batteries: this.inventory.batteries,
      decoys: this.inventory.decoys || 0,
      empCharges: this.inventory.empCharges || 0,
      audioLogs: Array.from(this.inventory.audioLogs)
    };
  }

  // ==========================================
  // OBJECTIVES & WIN CONDITIONS
  // ==========================================

  /**
   * Updates current primary objective text.
   * @param {string} text
   */
  updateObjective(text) {
    this.currentObjective = text;
    this.eventBus.emit(EVENTS.OBJECTIVE_UPDATED, { objective: text });
  }

  /**
   * Marks current objective completed and logs it.
   * @param {string} text
   */
  completeObjective(text) {
    if (!this.completedObjectives.includes(text)) {
      this.completedObjectives.push(text);
      this.eventBus.emit(EVENTS.OBJECTIVE_COMPLETED, { objective: text });
    }
  }

  /**
   * Checks fragment acquisition progress and updates narrative objectives.
   */
  checkFragmentProgress() {
    const count = this.inventory.fragments.size;
    if (count === 1) {
      this.updateObjective('Locate Signal Fragment Beta in Power Substation.');
    } else if (count === 2) {
      this.updateObjective('Locate Signal Fragment Gamma in Server Core Vault.');
    } else if (count === 3) {
      this.updateObjective('All 3 Fragments Acquired! Proceed to Communications Array to transmit.');
    }
  }

  /**
   * Checks win condition and initiates victory sequence if fulfilled.
   * @returns {boolean}
   */
  checkWinCondition() {
    if (this.inventory.fragments.size >= 3 && this.commsRepaired && this.generatorOnline && this.escapeUnlocked) {
      this.setState(GAME_STATES.VICTORY);
      return true;
    }
    return false;
  }

  // ==========================================
  // PLAYER VITALS & RESOURCES
  // ==========================================

  /**
   * Applies damage to player.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (this.playerHealth <= 0 || this.state === GAME_STATES.GAMEOVER || this.state === GAME_STATES.VICTORY) {
      return;
    }

    const actualDamage = Math.max(0, amount);
    this.playerHealth = Math.max(0, this.playerHealth - actualDamage);
    this.stats.damageTaken += actualDamage;

    this.eventBus.emit(EVENTS.PLAYER_DAMAGED, {
      damage: actualDamage,
      currentHealth: this.playerHealth,
      maxHealth: HEALTH_MAX
    });

    this.eventBus.emit(EVENTS.SCREEN_SHAKE, { intensity: 18, duration: 0.45 });

    if (this.playerHealth <= 0) {
      this.setState(GAME_STATES.GAMEOVER);
    }
  }

  /**
   * Restores player health.
   * @param {number} amount
   */
  heal(amount) {
    if (this.playerHealth <= 0) return;
    const prev = this.playerHealth;
    this.playerHealth = clamp(this.playerHealth + amount, 0, HEALTH_MAX);
    const restored = this.playerHealth - prev;

    if (restored > 0) {
      this.eventBus.emit(EVENTS.PLAYER_HEALED, {
        restored,
        currentHealth: this.playerHealth,
        maxHealth: HEALTH_MAX
      });
    }
  }

  /**
   * Recharges flashlight battery.
   * @param {number} amount
   */
  chargeBattery(amount) {
    this.flashlightBattery = clamp(this.flashlightBattery + amount, 0, BATTERY_MAX);
    this.eventBus.emit(EVENTS.BATTERY_CHANGED, {
      battery: this.flashlightBattery,
      maxBattery: BATTERY_MAX
    });
  }

  /**
   * Drains flashlight battery.
   * @param {number} amount
   */
  drainBattery(amount) {
    if (this.flashlightBattery <= 0) return;
    this.flashlightBattery = Math.max(0, this.flashlightBattery - amount);

    if (this.flashlightBattery <= 0) {
      this.isFlashlightOn = false;
      this.eventBus.emit(EVENTS.FLASHLIGHT_TOGGLED, { isOn: false, reason: 'battery_depleted' });
    }

    this.eventBus.emit(EVENTS.BATTERY_CHANGED, {
      battery: this.flashlightBattery,
      maxBattery: BATTERY_MAX
    });
  }

  /**
   * Toggles flashlight on or off.
   * @returns {boolean} New state of flashlight
   */
  toggleFlashlight() {
    if (this.flashlightBattery <= 0 && !this.isFlashlightOn) {
      // Cannot turn on dead flashlight
      return false;
    }

    this.isFlashlightOn = !this.isFlashlightOn;
    this.eventBus.emit(EVENTS.FLASHLIGHT_TOGGLED, { isOn: this.isFlashlightOn });
    return this.isFlashlightOn;
  }

  /**
   * Sets explicit flashlight state.
   * @param {boolean} on
   */
  setFlashlight(on) {
    if (on && this.flashlightBattery <= 0) return;
    if (this.isFlashlightOn !== on) {
      this.isFlashlightOn = on;
      this.eventBus.emit(EVENTS.FLASHLIGHT_TOGGLED, { isOn: this.isFlashlightOn });
    }
  }

  /**
   * Drains stamina (e.g. during sprint).
   * @param {number} amount
   */
  drainStamina(amount) {
    this.stamina = Math.max(0, this.stamina - amount);
    this._staminaDelayTimer = STAMINA_RECOVERY_DELAY;

    if (this.stamina <= 0) {
      this.isExhausted = true;
    }

    this.eventBus.emit(EVENTS.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: STAMINA_MAX,
      isExhausted: this.isExhausted
    });
  }

  /**
   * Recovers stamina.
   * @param {number} amount
   */
  recoverStamina(amount) {
    if (this.stamina >= STAMINA_MAX) return;

    this.stamina = clamp(this.stamina + amount, 0, STAMINA_MAX);

    if (this.isExhausted && this.stamina >= STAMINA_EXHAUSTION_THRESHOLD) {
      this.isExhausted = false;
    }

    this.eventBus.emit(EVENTS.STAMINA_CHANGED, {
      stamina: this.stamina,
      maxStamina: STAMINA_MAX,
      isExhausted: this.isExhausted
    });
  }

  // ==========================================
  // TICK UPDATE LOOP
  // ==========================================

  /**
   * Updates state timers, battery drain, and stamina recovery.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (this.state !== GAME_STATES.PLAYING) return;

    // Track survival time
    this.gameTimer += dt;
    this.stats.timeSurvived = this.gameTimer;

    // Flashlight battery consumption
    if (this.isFlashlightOn && this.flashlightBattery > 0) {
      this.drainBattery(BATTERY_DRAIN_RATE * dt);
    }

    // Stamina recovery when not sprinting
    if (!this.isSprinting) {
      if (this._staminaDelayTimer > 0) {
        this._staminaDelayTimer -= dt;
      } else {
        let recoveryRate = STAMINA_IDLE_RECOVERY;
        if (this.isCrouching) {
          recoveryRate = STAMINA_CROUCH_RECOVERY;
        } else if (this.stats.steps > 0) {
          recoveryRate = STAMINA_WALK_RECOVERY;
        }
        this.recoverStamina(recoveryRate * dt);
      }
    } else {
      // Sprinting drains stamina
      this.drainStamina(STAMINA_SPRINT_DRAIN * dt);
    }
  }

  /**
   * Alias for update to maintain compatibility with engine call.
   * @param {number} dt Delta time in seconds
   */
  updateTimer(dt) {
    this.update(dt);
  }

  // ==========================================
  // SERIALIZATION & METRICS
  // ==========================================

  /**
   * Returns complete stats summary for Game Over or Victory screens.
   */
  getSummaryStats() {
    return {
      ...this.stats,
      timeFormatted: this.getFormattedTime(),
      fragmentsCollected: `${this.inventory.fragments.size}/3`,
      fragmentsDecrypted: `${this.inventory.decryptedFragments.size}/3`,
      healthRemaining: `${Math.ceil(this.playerHealth)}%`,
      batteryRemaining: `${Math.ceil(this.flashlightBattery)}%`
    };
  }

  /**
   * Returns formatted timer MM:SS.
   * @returns {string}
   */
  getFormattedTime() {
    const totalSec = Math.floor(this.gameTimer);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  /**
   * Serializes state to plain object.
   */
  serialize() {
    return {
      state: this.state,
      playerHealth: this.playerHealth,
      flashlightBattery: this.flashlightBattery,
      stamina: this.stamina,
      isFlashlightOn: this.isFlashlightOn,
      inventory: this.getInventorySummary(),
      currentObjective: this.currentObjective,
      completedObjectives: [...this.completedObjectives],
      commsRepaired: this.commsRepaired,
      generatorOnline: this.generatorOnline,
      escapeUnlocked: this.escapeUnlocked,
      gameTimer: this.gameTimer,
      stats: { ...this.stats }
    };
  }

  /**
   * Restores state from plain object.
   * @param {Object} data
   */
  deserialize(data) {
    if (!data) return;
    this.state = data.state || GAME_STATES.PLAYING;
    this.playerHealth = data.playerHealth ?? HEALTH_MAX;
    this.flashlightBattery = data.flashlightBattery ?? BATTERY_MAX;
    this.stamina = data.stamina ?? STAMINA_MAX;
    this.isFlashlightOn = data.isFlashlightOn ?? true;

    if (data.inventory) {
      this.inventory.keycards = new Set(data.inventory.keycards || []);
      this.inventory.fragments = new Set(data.inventory.fragments || []);
      this.inventory.decryptedFragments = new Set(data.inventory.decryptedFragments || []);
      this.inventory.medkits = data.inventory.medkits || 0;
      this.inventory.batteries = data.inventory.batteries || 0;
      this.inventory.audioLogs = new Set(data.inventory.audioLogs || []);
    }

    this.currentObjective = data.currentObjective || '';
    this.completedObjectives = data.completedObjectives || [];
    this.commsRepaired = !!data.commsRepaired;
    this.generatorOnline = !!data.generatorOnline;
    this.escapeUnlocked = !!data.escapeUnlocked;
    this.gameTimer = data.gameTimer || 0;
    this.stats = { ...this.stats, ...(data.stats || {}) };
  }
}
