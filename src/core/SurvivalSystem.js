/**
 * THE LAST SIGNAL — CDDA-INSPIRED ANATOMICAL SURVIVAL SYSTEM
 * 
 * Simulates detailed body part health (Head, Torso, Arms, Legs),
 * active bleeding with physical blood decals, suit integrity seal,
 * cryogenic hypothermia, pain tremors, and adrenaline surges.
 */

export const BODY_PARTS = Object.freeze({
  HEAD: 'head',
  TORSO: 'torso',
  LEFT_ARM: 'leftArm',
  RIGHT_ARM: 'rightArm',
  LEFT_LEG: 'leftLeg',
  RIGHT_LEG: 'rightLeg'
});

export class SurvivalSystem {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;

    // 6 Anatomical Body Zones (0 to 100 HP each)
    this.limbs = {
      [BODY_PARTS.HEAD]: 100,
      [BODY_PARTS.TORSO]: 100,
      [BODY_PARTS.LEFT_ARM]: 100,
      [BODY_PARTS.RIGHT_ARM]: 100,
      [BODY_PARTS.LEFT_LEG]: 100,
      [BODY_PARTS.RIGHT_LEG]: 100
    };

    // Environmental & Physiological State
    this.bleedingRate = 0;          // HP loss per second from active hemorrhage
    this.suitIntegrity = 100;       // 0 to 100% Hazmat pressure seal
    this.bodyTemperature = 37.0;    // Core temp in Celsius (37.0°C normal, <35.0°C hypothermia)
    this.pain = 0;                  // 0 to 100 pain index
    this.adrenaline = 0;            // 0 to 100 temporary combat boost

    // Blood dripping timer
    this.bloodDripTimer = 0;

    // Event Subscriptions
    if (this.eventBus) {
      this.eventBus.on('PLAYER_DAMAGED', (data) => {
        const zone = data.zone || this.getRandomZone();
        const causesBleed = data.amount > 20 || Math.random() < 0.45;
        this.applyDamage(data.amount, zone, causesBleed);
      });

      this.eventBus.on('APPLY_MEDKIT', () => {
        this.treatAllWounds(50);
      });

      this.eventBus.on('APPLY_HEMOSTATIC', () => {
        this.treatBleeding(100);
        this.repairSuit(35);
      });
    }
  }

  /**
   * Randomly selects a body zone based on anatomical hit probability.
   * @returns {string} Member of BODY_PARTS
   */
  getRandomZone() {
    const roll = Math.random();
    if (roll < 0.15) return BODY_PARTS.HEAD;
    if (roll < 0.50) return BODY_PARTS.TORSO;
    if (roll < 0.65) return BODY_PARTS.LEFT_ARM;
    if (roll < 0.80) return BODY_PARTS.RIGHT_ARM;
    if (roll < 0.90) return BODY_PARTS.LEFT_LEG;
    return BODY_PARTS.RIGHT_LEG;
  }

  /**
   * Applies localized damage to a specific limb.
   * @param {number} amount
   * @param {string} zone
   * @param {boolean} [causesBleed=false]
   */
  applyDamage(amount, zone = BODY_PARTS.TORSO, causesBleed = false) {
    if (!this.limbs[zone]) zone = BODY_PARTS.TORSO;

    this.limbs[zone] = Math.max(0, this.limbs[zone] - amount);

    // Suit puncture on heavy hit
    const suitDamage = Math.floor(amount * 0.4);
    this.suitIntegrity = Math.max(0, this.suitIntegrity - suitDamage);

    // Bleeding initiation
    if (causesBleed) {
      this.bleedingRate += (amount * 0.08); // e.g. 30 damage -> 2.4 HP/sec bleed
      this.eventBus?.emit('TOAST_NOTIFICATION', {
        message: `TRAUMA ALERT: HEMORRHAGE IN ${zone.toUpperCase()}`,
        type: 'alert'
      });
    }

    // Pain & Adrenaline spike
    this.pain = Math.min(100, this.pain + amount * 0.8);
    this.adrenaline = Math.min(100, this.adrenaline + amount * 1.2);

    this.eventBus?.emit('SURVIVAL_STATE_CHANGED', this.getReport());
  }

  /**
   * Treats active bleeding wounds.
   * @param {number} amount
   */
  treatBleeding(amount = 100) {
    this.bleedingRate = Math.max(0, this.bleedingRate - (amount * 0.05));
    if (this.bleedingRate === 0) {
      this.eventBus?.emit('TOAST_NOTIFICATION', {
        message: 'HEMORRHAGE CONTROLLED: WOUNDS SEALED',
        type: 'success'
      });
    }
  }

  /**
   * Repairs hazmat suit pressure seal.
   * @param {number} amount
   */
  repairSuit(amount = 50) {
    this.suitIntegrity = Math.min(100, this.suitIntegrity + amount);
  }

  /**
   * Treats and bandages all limbs.
   * @param {number} amount
   */
  treatAllWounds(amount = 40) {
    for (const key of Object.keys(this.limbs)) {
      this.limbs[key] = Math.min(100, this.limbs[key] + amount);
    }
    this.treatBleeding(100);
    this.pain = Math.max(0, this.pain - 30);
  }

  /**
   * Updates survival simulation (bleeding, temperature, pain, adrenaline).
   * @param {number} dt Delta time in seconds
   * @param {Object} [sector] Active sector info
   * @param {Object} [gameState] Reference to GameState
   * @param {Object} [particles] Particle system to emit blood drops
   * @param {Object} [playerPos] Player { x, y } coordinates
   */
  update(dt, sector = null, gameState = null, particles = null, playerPos = null) {
    // 1. Bleeding damage over time
    if (this.bleedingRate > 0) {
      const bleedDmg = this.bleedingRate * dt;
      if (gameState && typeof gameState.takeDamage === 'function') {
        gameState.takeDamage(bleedDmg, null, false);
      }

      // Drop physical blood drops on deck plates
      this.bloodDripTimer += dt;
      if (this.bloodDripTimer >= 0.8 && particles && playerPos) {
        this.bloodDripTimer = 0;
        particles.emitBloodSpatter?.(playerPos.x, playerPos.y, Math.random() * Math.PI * 2);
      }
    }

    // 2. Cryogenic Hypothermia in Sector 3 (Cryo Bay)
    const isCryoBay = sector && (sector.id === 'sector-3-cryo' || sector.number === 3);
    if (isCryoBay) {
      // Temperature drops faster if suit is compromised
      const coolingRate = 0.15 + (1 - (this.suitIntegrity / 100)) * 0.35;
      this.bodyTemperature = Math.max(31.0, this.bodyTemperature - coolingRate * dt);
    } else {
      // Natural recovery in heated sectors
      this.bodyTemperature = Math.min(37.0, this.bodyTemperature + 0.25 * dt);
    }

    // 3. Adrenaline & Pain Decay
    this.adrenaline = Math.max(0, this.adrenaline - 4.0 * dt);
    this.pain = Math.max(0, this.pain - 1.5 * dt);
  }

  /**
   * Calculates movement speed modifier based on leg injuries and hypothermia.
   * @returns {number} Speed multiplier (e.g. 0.5 to 1.25)
   */
  getMovementMultiplier() {
    let mult = 1.0;

    // Leg injuries
    const legHealth = (this.limbs[BODY_PARTS.LEFT_LEG] + this.limbs[BODY_PARTS.RIGHT_LEG]) / 200;
    mult *= (0.55 + 0.45 * legHealth);

    // Hypothermia penalty (<35.0°C)
    if (this.bodyTemperature < 35.0) {
      mult *= 0.75;
    }

    // Adrenaline combat rush bonus
    if (this.adrenaline > 20) {
      mult *= (1.0 + (this.adrenaline / 100) * 0.25);
    }

    return mult;
  }

  /**
   * Calculates stamina regeneration multiplier based on torso condition.
   * @returns {number}
   */
  getStaminaRegenMultiplier() {
    const torsoHealth = this.limbs[BODY_PARTS.TORSO] / 100;
    return 0.4 + 0.6 * torsoHealth;
  }

  /**
   * Returns current survival metrics report.
   * @returns {Object}
   */
  getReport() {
    return {
      limbs: { ...this.limbs },
      bleedingRate: Number(this.bleedingRate.toFixed(2)),
      suitIntegrity: Math.floor(this.suitIntegrity),
      bodyTemperature: Number(this.bodyTemperature.toFixed(1)),
      pain: Math.floor(this.pain),
      adrenaline: Math.floor(this.adrenaline),
      isBleeding: this.bleedingRate > 0,
      isHypothermic: this.bodyTemperature < 35.0
    };
  }
}
