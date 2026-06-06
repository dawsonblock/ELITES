type Listener = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<string, Listener[]> = new Map();

  on(event: string, fn: Listener): () => void {
    const list = this.listeners.get(event) || [];
    list.push(fn);
    this.listeners.set(event, list);
    return () => {
      const updated = (this.listeners.get(event) || []).filter((l) => l !== fn);
      this.listeners.set(event, updated);
    };
  }

  emit(event: string, ...args: unknown[]): void {
    (this.listeners.get(event) || []).forEach((fn) => fn(...args));
  }

  once(event: string, fn: Listener): void {
    const wrapper = (...args: unknown[]) => {
      fn(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  off(event: string, fn: Listener): void {
    const updated = (this.listeners.get(event) || []).filter((l) => l !== fn);
    this.listeners.set(event, updated);
  }
}

export const eventBus = new EventBus();
