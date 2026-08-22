/**
 * THE LAST SIGNAL — INTERACTIVE STEP-BY-STEP TUTORIAL & ONBOARDING SYSTEM
 * 
 * Manages player onboarding, objective validation, holographic floor waypoints,
 * contextual guidance banners, and progression milestones.
 */

export const TUTORIAL_STEPS = Object.freeze([
  {
    id: 'STEP_MOVE',
    title: 'PHASE 1/8 // BASIC LOCOMOTION',
    instruction: 'Use [W][A][S][D] or Arrow Keys to move Dr. Vance.',
    hint: 'Move around the Habitation Quarters to calibrate motor servos.',
    requiredDistance: 80,
    waypoint: { x: 384, y: 384, label: 'HABITATION AREA' }
  },
  {
    id: 'STEP_FLASHLIGHT',
    title: 'PHASE 2/8 // TACTICAL ILLUMINATION',
    instruction: 'Press [F] or Right-Click to toggle your tactical flashlight.',
    hint: 'Dark corridors hide hostile anomalies. Conserve battery power.',
    actionRequired: 'FLASHLIGHT_TOGGLED',
    waypoint: { x: 480, y: 384, label: 'CORRIDOR JUNCTION' }
  },
  {
    id: 'STEP_STEALTH',
    title: 'PHASE 3/8 // ACOUSTIC STEALTH',
    instruction: 'Hold [C] to crouch (zero noise) or [Shift] to sprint (loud acoustic ping).',
    hint: 'NEXUS-9 tracks acoustic noise up to 350px. Use crouch in dark sectors.',
    actionRequired: 'STANCE_CHANGED',
    waypoint: { x: 576, y: 384, label: 'SECURITY AIRLOCK' }
  },
  {
    id: 'STEP_KEYCARD',
    title: 'PHASE 4/8 // SECURITY CLEARANCE',
    instruction: 'Navigate to Sector 2 and collect the Blue Keycard.',
    hint: 'Security keycards unlock restricted blast doors across the station.',
    actionRequired: 'KEYCARD_COLLECTED',
    waypoint: { x: 672, y: 384, label: 'BLUE KEYCARD' }
  },
  {
    id: 'STEP_LOCKER',
    title: 'PHASE 5/8 // TACTICAL CONCEALMENT',
    instruction: 'Approach a Crew Locker and press [E] to conceal yourself.',
    hint: 'Hiding inside lockers breaks line-of-sight and evades pursuing AI.',
    actionRequired: 'LOCKER_ENTERED',
    waypoint: { x: 384, y: 480, label: 'CREW LOCKER' }
  },
  {
    id: 'STEP_CRAFTING',
    title: 'PHASE 6/8 // FIELD SYNTHESIS BENCH',
    instruction: 'Press [C] to open the Field Engineering Bench.',
    hint: 'Craft improvised EMP Mines and Sonic Decoy Flares from salvage.',
    actionRequired: 'CRAFTING_OPENED',
    waypoint: null
  },
  {
    id: 'STEP_PDA_MAP',
    title: 'PHASE 7/8 // TACTICAL PDA & BIOMETRICS',
    instruction: 'Press [M] or [Tab] to inspect Station Blueprints & Body Trauma Doll.',
    hint: 'Monitor limb injuries, suit pressure seal, and core temperature.',
    actionRequired: 'PDA_OPENED',
    waypoint: null
  },
  {
    id: 'STEP_FINAL',
    title: 'PHASE 8/8 // THE LAST SIGNAL OBJECTIVE',
    instruction: 'Recover 3 Signal Fragments (Alpha, Beta, Gamma), align Comms & Evacuate!',
    hint: 'Proceed to Sector 3 (Cryo Bay). Good luck, Dr. Vance.',
    actionRequired: 'TUTORIAL_FINISH',
    waypoint: { x: 800, y: 320, label: 'CRYO LABS [SECTOR 3]' }
  }
]);

export class TutorialSystem {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;

    this.isTutorialActive = false;
    this.activeStepIndex = 0;
    this.completedSteps = new Set();
    this.movedDistance = 0;
    this.lastPlayerPos = null;
    this.stepCompletionTimer = 0;

    this.bindEvents();
  }

  bindEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('FLASHLIGHT_TOGGLED', () => {
      this.checkStepAction('FLASHLIGHT_TOGGLED');
    });

    this.eventBus.on('PLAYER_STANCE_CHANGED', () => {
      this.checkStepAction('STANCE_CHANGED');
    });

    this.eventBus.on('ITEM_COLLECTED', (item) => {
      if (item.type === 'keycard' || item.type === 'keycard_blue') {
        this.checkStepAction('KEYCARD_COLLECTED');
      }
    });

    this.eventBus.on('PLAYER_HIDDEN', () => {
      this.checkStepAction('LOCKER_ENTERED');
    });

    this.eventBus.on('CRAFTING_TOGGLED', () => {
      this.checkStepAction('CRAFTING_OPENED');
    });

    this.eventBus.on('MAP_TOGGLED', () => {
      this.checkStepAction('PDA_OPENED');
    });
  }

  /**
   * Starts or restarts the guided tutorial.
   */
  startTutorial() {
    this.isTutorialActive = true;
    this.activeStepIndex = 0;
    this.completedSteps.clear();
    this.movedDistance = 0;
    this.lastPlayerPos = null;

    this.eventBus?.emit('TUTORIAL_STARTED');
    this.eventBus?.emit('TOAST_NOTIFICATION', {
      message: 'GUIDED ONBOARDING INITIATED // FOLLOW ON-SCREEN DIRECTIVES',
      type: 'info',
      duration: 4.5
    });
  }

  /**
   * Skips the tutorial mode.
   */
  skipTutorial() {
    this.isTutorialActive = false;
    this.eventBus?.emit('TUTORIAL_SKIPPED');
    this.eventBus?.emit('TOAST_NOTIFICATION', {
      message: 'TUTORIAL SKIPPED // STANDARD MISSION ACTIVE',
      type: 'warning'
    });
  }

  /**
   * Gets current active tutorial step.
   * @returns {Object|null}
   */
  getCurrentStep() {
    if (!this.isTutorialActive) return null;
    return TUTORIAL_STEPS[this.activeStepIndex] || null;
  }

  /**
   * Checks action trigger to advance tutorial step.
   * @param {string} action
   */
  checkStepAction(action) {
    if (!this.isTutorialActive) return;

    const current = this.getCurrentStep();
    if (!current) return;

    if (current.actionRequired === action) {
      this.advanceStep();
    }
  }

  /**
   * Advances to next tutorial step.
   */
  advanceStep() {
    const current = this.getCurrentStep();
    if (current) {
      this.completedSteps.add(current.id);
      this.eventBus?.emit('AUDIO_TRIGGER', { type: 'pickup' });
    }

    this.activeStepIndex++;

    if (this.activeStepIndex >= TUTORIAL_STEPS.length) {
      this.isTutorialActive = false;
      this.eventBus?.emit('TUTORIAL_COMPLETED');
      this.eventBus?.emit('TOAST_NOTIFICATION', {
        message: 'TUTORIAL COMPLETE // SURVIVE AND BROADCAST THE LAST SIGNAL',
        type: 'success',
        duration: 5.0
      });
    } else {
      const nextStep = this.getCurrentStep();
      this.eventBus?.emit('TUTORIAL_STEP_ADVANCED', nextStep);
    }
  }

  /**
   * Updates tutorial tracking (movement distance, waypoints).
   * @param {number} dt Delta time
   * @param {Object} player Player reference
   */
  update(dt, player = null) {
    if (!this.isTutorialActive) return;

    const current = this.getCurrentStep();
    if (!current) return;

    // Movement tracking for Step 1
    if (current.id === 'STEP_MOVE' && player) {
      if (this.lastPlayerPos) {
        const dx = player.x - this.lastPlayerPos.x;
        const dy = player.y - this.lastPlayerPos.y;
        this.movedDistance += Math.sqrt(dx * dx + dy * dy);

        if (this.movedDistance >= (current.requiredDistance || 80)) {
          this.advanceStep();
        }
      }
      this.lastPlayerPos = { x: player.x, y: player.y };
    }

    // Step 8 auto-clear after 12 seconds of reading final objective
    if (current.id === 'STEP_FINAL') {
      this.stepCompletionTimer += dt;
      if (this.stepCompletionTimer >= 12.0) {
        this.advanceStep();
      }
    }
  }

  /**
   * Gets current objective waypoint coordinate.
   * @returns {Object|null}
   */
  getActiveWaypoint() {
    if (!this.isTutorialActive) return null;
    const current = this.getCurrentStep();
    return current ? current.waypoint : null;
  }
}
