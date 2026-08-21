/**
 * THE LAST SIGNAL — INPUT MANAGER
 * Handles keyboard, mouse, and touch/virtual input with single-frame edge triggers,
 * action mappings, camera world coordinate transformation, and mobile hooks.
 */

import { INPUT_ACTIONS } from '../utils/Constants.js';

export class InputManager {
  /**
   * @param {HTMLElement|Window} [targetElement=null]
   */
  constructor(targetElement = null) {
    /** @type {HTMLElement|Window|null} */
    this.target = null;

    // Keyboard states
    /** @type {Set<string>} Active down keys (e.g. 'KeyW', 'ShiftLeft') */
    this.keysDown = new Set();
    /** @type {Set<string>} Keys pressed in current frame */
    this.keysJustPressed = new Set();
    /** @type {Set<string>} Keys released in current frame */
    this.keysJustReleased = new Set();

    // Mouse states
    this.mouse = {
      screenX: 0,
      screenY: 0,
      buttonsDown: new Set(),
      buttonsJustPressed: new Set(),
      buttonsJustReleased: new Set()
    };

    // Virtual / Mobile inputs
    this.virtualJoystick = {
      active: false,
      x: 0,
      y: 0
    };
    this.virtualActionsDown = new Set();
    this.virtualActionsJustPressed = new Set();
    this.virtualActionsJustReleased = new Set();

    // Action Key Mappings
    this.actionMappings = {
      [INPUT_ACTIONS.MOVE_UP]: ['KeyW', 'ArrowUp'],
      [INPUT_ACTIONS.MOVE_DOWN]: ['KeyS', 'ArrowDown'],
      [INPUT_ACTIONS.MOVE_LEFT]: ['KeyA', 'ArrowLeft'],
      [INPUT_ACTIONS.MOVE_RIGHT]: ['KeyD', 'ArrowRight'],
      [INPUT_ACTIONS.SPRINT]: ['ShiftLeft', 'ShiftRight'],
      [INPUT_ACTIONS.CROUCH]: ['ControlLeft', 'ControlRight', 'KeyC'],
      [INPUT_ACTIONS.FLASHLIGHT]: ['KeyF'],
      [INPUT_ACTIONS.INTERACT]: ['KeyE', 'Space'],
      [INPUT_ACTIONS.MAP]: ['KeyM', 'Tab'],
      [INPUT_ACTIONS.PAUSE]: ['Escape', 'KeyP'],
      [INPUT_ACTIONS.USE_MEDKIT]: ['Digit1', 'Numpad1', 'Key1'],
      [INPUT_ACTIONS.USE_BATTERY]: ['Digit2', 'Numpad2', 'Key2'],
      [INPUT_ACTIONS.USE_DECOY]: ['Digit3', 'Numpad3', 'Key3', 'KeyG'],
      [INPUT_ACTIONS.USE_EMP]: ['Digit4', 'Numpad4', 'Key4', 'KeyQ']
    };

    // Gamepad API state
    this.gamepadConnected = false;
    this.gamepadButtonsDown = new Set();
    this.gamepadButtonsJustPressed = new Set();
    this.gamepadButtonsJustReleased = new Set();
    this.gamepadAxes = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    this.deadzone = 0.22;

    // Gamepad button index to action mapping
    this.gamepadMappings = {
      0: INPUT_ACTIONS.INTERACT,     // A / Cross
      1: INPUT_ACTIONS.CROUCH,       // B / Circle
      2: INPUT_ACTIONS.FLASHLIGHT,   // X / Square
      3: INPUT_ACTIONS.MAP,          // Y / Triangle
      4: INPUT_ACTIONS.USE_DECOY,    // LB / L1
      5: INPUT_ACTIONS.USE_EMP,      // RB / R1
      6: INPUT_ACTIONS.USE_MEDKIT,   // LT / L2
      7: INPUT_ACTIONS.USE_BATTERY,  // RT / R2
      8: INPUT_ACTIONS.MAP,          // Select / Back
      9: INPUT_ACTIONS.PAUSE,        // Start
      10: INPUT_ACTIONS.SPRINT       // L3 (Stick press)
    };

    // Bound event handlers for clean attach/detach
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onContextMenu = this._handleContextMenu.bind(this);
    this._onBlur = this._handleBlur.bind(this);

    if (targetElement) {
      this.attach(targetElement);
    }
    this._firstInteractionCallbacks = [];
    this._hasInteracted = false;
  }

  /**
   * Initializes or re-attaches input manager to canvas/element.
   * @param {HTMLElement|Window} element
   */
  init(element) {
    this.attach(element);
  }

  /**
   * Registers a one-time callback for user's first input (e.g. to unlock Web Audio API).
   * @param {Function} callback
   */
  onFirstInteraction(callback) {
    if (this._hasInteracted) {
      callback();
      return;
    }
    this._firstInteractionCallbacks.push(callback);
  }

  _triggerFirstInteraction() {
    if (this._hasInteracted) return;
    this._hasInteracted = true;
    while (this._firstInteractionCallbacks.length > 0) {
      const cb = this._firstInteractionCallbacks.shift();
      try { cb(); } catch (err) { console.error(err); }
    }
  }

  /**
   * Attaches event listeners to target element / window.
   * @param {HTMLElement|Window} element
   */
  attach(element) {
    this.detach();
    this.target = element;

    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: false });
    window.addEventListener('blur', this._onBlur);

    const mouseTarget = this.target || window;
    if (mouseTarget && typeof mouseTarget.addEventListener === 'function') {
      mouseTarget.addEventListener('mousemove', this._onMouseMove, { passive: false });
      mouseTarget.addEventListener('mousedown', this._onMouseDown, { passive: false });
      mouseTarget.addEventListener('mouseup', this._onMouseUp, { passive: false });
      mouseTarget.addEventListener('contextmenu', this._onContextMenu);
    }
  }

  /**
   * Detaches event listeners.
   */
  detach() {
    if (typeof window === 'undefined' || typeof window.removeEventListener !== 'function') {
      this.reset();
      this.target = null;
      return;
    }

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);

    const mouseTarget = this.target || window;
    if (mouseTarget && typeof mouseTarget.removeEventListener === 'function') {
      mouseTarget.removeEventListener('mousemove', this._onMouseMove);
      mouseTarget.removeEventListener('mousedown', this._onMouseDown);
      mouseTarget.removeEventListener('mouseup', this._onMouseUp);
      mouseTarget.removeEventListener('contextmenu', this._onContextMenu);
    }

    this.reset();
    this.target = null;
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  _handleKeyDown(event) {
    this._triggerFirstInteraction();
    const code = event.code;

    // Prevent default browser actions for game-relevant keys
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      event.preventDefault();
    }

    if (!this.keysDown.has(code)) {
      this.keysDown.add(code);
      this.keysJustPressed.add(code);
    }
  }

  _handleKeyUp(event) {
    const code = event.code;
    if (this.keysDown.has(code)) {
      this.keysDown.delete(code);
      this.keysJustReleased.add(code);
    }
  }

  _handleMouseMove(event) {
    if (this.target && this.target.getBoundingClientRect) {
      const rect = this.target.getBoundingClientRect();
      const scaleX = (this.target.width || rect.width) / rect.width;
      const scaleY = (this.target.height || rect.height) / rect.height;
      this.mouse.screenX = (event.clientX - rect.left) * scaleX;
      this.mouse.screenY = (event.clientY - rect.top) * scaleY;
    } else {
      this.mouse.screenX = event.clientX;
      this.mouse.screenY = event.clientY;
    }
  }

  _handleMouseDown(event) {
    this._triggerFirstInteraction();
    const button = event.button; // 0: Left, 1: Middle, 2: Right
    if (!this.mouse.buttonsDown.has(button)) {
      this.mouse.buttonsDown.add(button);
      this.mouse.buttonsJustPressed.add(button);
    }
  }

  _handleMouseUp(event) {
    const button = event.button;
    if (this.mouse.buttonsDown.has(button)) {
      this.mouse.buttonsDown.delete(button);
      this.mouse.buttonsJustReleased.add(button);
    }
  }

  _handleContextMenu(event) {
    // Prevent context menu to allow right-click flashlight toggle
    event.preventDefault();
  }

  _handleBlur() {
    this.reset();
  }

  // ==========================================
  // QUERYING METHODS
  // ==========================================

  /**
   * Checks if a raw key code is currently held down.
   * @param {string} code e.g. 'KeyW'
   * @returns {boolean}
   */
  isKeyDown(code) {
    return this.keysDown.has(code);
  }

  /**
   * Checks if a raw key code was pressed down this frame.
   * @param {string} code
   * @returns {boolean}
   */
  wasKeyJustPressed(code) {
    return this.keysJustPressed.has(code);
  }

  /**
   * Checks if a raw key code was released this frame.
   * @param {string} code
   * @returns {boolean}
   */
  wasKeyJustReleased(code) {
    return this.keysJustReleased.has(code);
  }

  /**
   * Polls connected gamepads and updates button/axis states.
   */
  pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();
    let pad = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        pad = gamepads[i];
        break;
      }
    }

    if (!pad) {
      this.gamepadConnected = false;
      return;
    }

    this.gamepadConnected = true;

    // Process Left Stick Axes
    const lx = Math.abs(pad.axes[0] || 0) > this.deadzone ? pad.axes[0] : 0;
    const ly = Math.abs(pad.axes[1] || 0) > this.deadzone ? pad.axes[1] : 0;
    const rx = Math.abs(pad.axes[2] || 0) > this.deadzone ? pad.axes[2] : 0;
    const ry = Math.abs(pad.axes[3] || 0) > this.deadzone ? pad.axes[3] : 0;

    this.gamepadAxes.leftX = lx;
    this.gamepadAxes.leftY = ly;
    this.gamepadAxes.rightX = rx;
    this.gamepadAxes.rightY = ry;

    // Process Standard Gamepad Buttons
    const currentDown = new Set();
    for (let b = 0; b < pad.buttons.length; b++) {
      const btn = pad.buttons[b];
      const isDown = typeof btn === 'object' ? btn.pressed : btn > 0.5;
      const action = this.gamepadMappings[b];

      if (isDown && action) {
        currentDown.add(action);
        if (!this.gamepadButtonsDown.has(action)) {
          this.gamepadButtonsJustPressed.add(action);
        }
      } else if (action && this.gamepadButtonsDown.has(action)) {
        this.gamepadButtonsJustReleased.add(action);
      }
    }

    this.gamepadButtonsDown = currentDown;
  }

  /**
   * Triggers dual-rumble haptic vibration on active gamepad if supported.
   * @param {number} [strongMagnitude=0.5] Low-frequency heavy rumble (0.0 to 1.0)
   * @param {number} [weakMagnitude=0.5] High-frequency light rumble (0.0 to 1.0)
   * @param {number} [duration=200] Duration in milliseconds
   */
  vibrateGamepad(strongMagnitude = 0.5, weakMagnitude = 0.5, duration = 200) {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    try {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const pad = gamepads[i];
        if (pad && pad.connected && pad.vibrationActuator) {
          pad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: duration,
            weakMagnitude: Math.max(0, Math.min(1, weakMagnitude)),
            strongMagnitude: Math.max(0, Math.min(1, strongMagnitude))
          }).catch(() => {});
        }
      }
    } catch (_) {}
  }

  /**
   * Checks if an action is currently active (keyboard, mouse, touch, or gamepad).
   * @param {string} action Member of INPUT_ACTIONS
   * @returns {boolean}
   */
  isActionActive(action) {
    if (this.virtualActionsDown.has(action)) return true;
    if (this.gamepadButtonsDown.has(action)) return true;

    // Special mouse bindings
    if (action === INPUT_ACTIONS.INTERACT && this.mouse.buttonsDown.has(0)) return true;
    if (action === INPUT_ACTIONS.FLASHLIGHT && this.mouse.buttonsDown.has(2)) return true;

    const keys = this.actionMappings[action];
    if (!keys) return false;

    for (let i = 0; i < keys.length; i++) {
      if (this.keysDown.has(keys[i])) return true;
    }
    return false;
  }

  /**
   * Checks if an action was just triggered this frame.
   * @param {string} action Member of INPUT_ACTIONS
   * @returns {boolean}
   */
  wasActionJustPressed(action) {
    if (this.virtualActionsJustPressed.has(action)) return true;
    if (this.gamepadButtonsJustPressed.has(action)) return true;

    // Special mouse bindings
    if (action === INPUT_ACTIONS.INTERACT && this.mouse.buttonsJustPressed.has(0)) return true;
    if (action === INPUT_ACTIONS.FLASHLIGHT && this.mouse.buttonsJustPressed.has(2)) return true;

    const keys = this.actionMappings[action];
    if (!keys) return false;

    for (let i = 0; i < keys.length; i++) {
      if (this.keysJustPressed.has(keys[i])) return true;
    }
    return false;
  }

  /**
   * Checks if an action was just released this frame.
   * @param {string} action Member of INPUT_ACTIONS
   * @returns {boolean}
   */
  wasActionJustReleased(action) {
    if (this.virtualActionsJustReleased.has(action)) return true;
    if (this.gamepadButtonsJustReleased.has(action)) return true;

    if (action === INPUT_ACTIONS.INTERACT && this.mouse.buttonsJustReleased.has(0)) return true;
    if (action === INPUT_ACTIONS.FLASHLIGHT && this.mouse.buttonsJustReleased.has(2)) return true;

    const keys = this.actionMappings[action];
    if (!keys) return false;

    for (let i = 0; i < keys.length; i++) {
      if (this.keysJustReleased.has(keys[i])) return true;
    }
    return false;
  }

  /**
   * Checks if a mouse button is down.
   * @param {number} button 0: Left, 1: Middle, 2: Right
   * @returns {boolean}
   */
  isMouseButtonDown(button) {
    return this.mouse.buttonsDown.has(button);
  }

  /**
   * Checks if a mouse button was just pressed this frame.
   * @param {number} button 0: Left, 1: Middle, 2: Right
   * @returns {boolean}
   */
  wasMouseButtonJustPressed(button) {
    return this.mouse.buttonsJustPressed.has(button);
  }

  /**
   * Checks if a mouse button was just released this frame.
   * @param {number} button 0: Left, 1: Middle, 2: Right
   * @returns {boolean}
   */
  wasMouseButtonJustReleased(button) {
    return this.mouse.buttonsJustReleased.has(button);
  }

  /**
   * Calculates normalized 2D movement vector from keyboard, virtual joystick, or Gamepad.
   * @returns {{x: number, y: number}} Normalized vector with length <= 1
   */
  getMovementVector() {
    let x = 0;
    let y = 0;

    // Gamepad Left Stick priority
    if (Math.abs(this.gamepadAxes.leftX) > 0 || Math.abs(this.gamepadAxes.leftY) > 0) {
      x = this.gamepadAxes.leftX;
      y = this.gamepadAxes.leftY;
    } else if (this.virtualJoystick.active) {
      x = this.virtualJoystick.x;
      y = this.virtualJoystick.y;
    } else {
      if (this.isActionActive(INPUT_ACTIONS.MOVE_LEFT)) x -= 1;
      if (this.isActionActive(INPUT_ACTIONS.MOVE_RIGHT)) x += 1;
      if (this.isActionActive(INPUT_ACTIONS.MOVE_UP)) y -= 1;
      if (this.isActionActive(INPUT_ACTIONS.MOVE_DOWN)) y += 1;
    }

    const lenSq = x * x + y * y;
    if (lenSq === 0) return { x: 0, y: 0 };
    if (lenSq > 1) {
      const len = Math.sqrt(lenSq);
      return { x: x / len, y: y / len };
    }
    return { x, y };
  }

  /**
   * Gets screen mouse coordinates.
   * @returns {{x: number, y: number}}
   */
  getMouseScreenPos() {
    return { x: this.mouse.screenX, y: this.mouse.screenY };
  }

  /**
   * Converts screen mouse coordinates to game world coordinates using camera.
   * @param {{screenToWorld: Function}} camera
   * @returns {{x: number, y: number}}
   */
  getMouseWorldPos(camera) {
    if (!camera || typeof camera.screenToWorld !== 'function') {
      return { x: this.mouse.screenX, y: this.mouse.screenY };
    }
    return camera.screenToWorld(this.mouse.screenX, this.mouse.screenY);
  }

  // ==========================================
  // VIRTUAL & MOBILE HOOKS
  // ==========================================

  /**
   * Sets virtual joystick vector for mobile controls.
   * @param {number} x [-1, 1]
   * @param {number} y [-1, 1]
   * @param {boolean} [active=true]
   */
  setVirtualMovement(x, y, active = true) {
    this.virtualJoystick.active = active;
    this.virtualJoystick.x = x;
    this.virtualJoystick.y = y;
  }

  /**
   * Triggers or releases a virtual action button.
   * @param {string} action
   * @param {boolean} pressed
   */
  setVirtualAction(action, pressed) {
    if (pressed) {
      if (!this.virtualActionsDown.has(action)) {
        this.virtualActionsDown.add(action);
        this.virtualActionsJustPressed.add(action);
      }
    } else {
      if (this.virtualActionsDown.has(action)) {
        this.virtualActionsDown.delete(action);
        this.virtualActionsJustReleased.add(action);
      }
    }
  }

  // ==========================================
  // FRAME CYCLE
  // ==========================================

  /**
   * Resets single-frame edge triggers and polls gamepads.
   */
  update() {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouse.buttonsJustPressed.clear();
    this.mouse.buttonsJustReleased.clear();
    this.virtualActionsJustPressed.clear();
    this.virtualActionsJustReleased.clear();
    this.gamepadButtonsJustPressed.clear();
    this.gamepadButtonsJustReleased.clear();

    this.pollGamepad();
  }

  /**
   * Resets all inputs to cleared state.
   */
  reset() {
    this.keysDown.clear();
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouse.buttonsDown.clear();
    this.mouse.buttonsJustPressed.clear();
    this.mouse.buttonsJustReleased.clear();
    this.virtualActionsDown.clear();
    this.virtualActionsJustPressed.clear();
    this.virtualActionsJustReleased.clear();
    this.gamepadButtonsDown.clear();
    this.gamepadButtonsJustPressed.clear();
    this.gamepadButtonsJustReleased.clear();
    this.gamepadAxes = { leftX: 0, leftY: 0, rightX: 0, rightY: 0 };
    this.virtualJoystick.active = false;
    this.virtualJoystick.x = 0;
    this.virtualJoystick.y = 0;
  }
}
