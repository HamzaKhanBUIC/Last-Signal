/**
 * THE LAST SIGNAL — EVENT BUS
 * Decoupled publish/subscribe messaging system for engine, gameplay, audio, and UI subsystems.
 */

export class EventBus {
  constructor() {
    /** @type {Map<string, Array<{ callback: Function, once: boolean }>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribes a callback function to an event.
   * @param {string} event Event name
   * @param {Function} callback Callback handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!event || typeof callback !== 'function') {
      console.warn(`[EventBus] Invalid subscription for event: "${event}"`);
      return () => {};
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push({ callback, once: false });

    // Return unsubscribe helper
    return () => this.off(event, callback);
  }

  /**
   * Subscribes a one-time callback function to an event.
   * @param {string} event Event name
   * @param {Function} callback Callback handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    if (!event || typeof callback !== 'function') {
      console.warn(`[EventBus] Invalid once subscription for event: "${event}"`);
      return () => {};
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push({ callback, once: true });

    return () => this.off(event, callback);
  }

  /**
   * Unsubscribes a callback function from an event.
   * @param {string} event Event name
   * @param {Function} callback Callback handler to remove
   * @returns {boolean} True if removed, false otherwise
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return false;

    const list = this.listeners.get(event);
    const initialLength = list.length;
    const filtered = list.filter(item => item.callback !== callback);

    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }

    return filtered.length < initialLength;
  }

  /**
   * Emits an event with optional payload data to all registered listeners.
   * Isolates callback errors to prevent subsystem cascade failures.
   * @param {string} event Event name
   * @param {any} [data=null] Payload data
   * @returns {number} Count of listeners invoked
   */
  emit(event, data = null) {
    if (!this.listeners.has(event)) return 0;

    // Snapshot listeners to safely allow removal/addition during emit execution
    const list = [...this.listeners.get(event)];
    let invokedCount = 0;

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      
      // Auto-remove 'once' listeners before execution
      if (entry.once) {
        this.off(event, entry.callback);
      }

      try {
        entry.callback(data);
        invokedCount++;
      } catch (err) {
        console.error(`[EventBus] Error executing listener for event "${event}":`, err);
      }
    }

    return invokedCount;
  }

  /**
   * Clears listeners. If an event is provided, clears that event's listeners; otherwise clears all.
   * @param {string} [event=null]
   */
  clear(event = null) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the count of registered listeners for an event.
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    if (!this.listeners.has(event)) return 0;
    return this.listeners.get(event).length;
  }

  /**
   * Checks if an event has any active listeners.
   * @param {string} event
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }
}

// Global default singleton instance for convenience
export const globalEventBus = new EventBus();
