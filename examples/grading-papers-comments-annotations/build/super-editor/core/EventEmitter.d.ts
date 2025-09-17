/**
 * EventEmitter class is used to emit and subscribe to events.
 */
export class EventEmitter {
    /**
     * Subscribe to the event.
     * @param {string} name Event name.
     * @param {(...args: any[]) => void} fn Callback.
     * @returns {void}
     */
    on(name: string, fn: (...args: any[]) => void): void;
    /**
     * Emit event.
     * @param {string} name Event name.
     * @param {...any} args – Arguments to pass to each listener.
     * @returns {void}
     */
    emit(name: string, ...args: any[]): void;
    /**
     * Remove a specific callback from event
     * or all event subscriptions.
     * @param {string} name Event name.
     * @param {(...args: any[]) => void} fn Callback.
     * @returns {void}
     */
    off(name: string, fn: (...args: any[]) => void): void;
    /**
     * Subscribe to an event that will be called only once.
     * @param {string} name Event name.
     * @param {(...args: any[]) => void} fn Callback.
     * @returns {void}
     */
    once(name: string, fn: (...args: any[]) => void): void;
    /**
     * Remove all registered events and subscriptions.
     */
    removeAllListeners(): void;
    #private;
}
//# sourceMappingURL=EventEmitter.d.ts.map