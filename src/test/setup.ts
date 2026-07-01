import "@testing-library/jest-dom";

// jsdom in this environment ships a non-functional localStorage; provide a
// simple in-memory implementation so localStorage-backed stores (demo stores,
// the supabase client) work in tests.
class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(key: string) {
    return this.m.has(key) ? (this.m.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.m.set(key, String(value));
  }
  removeItem(key: string) {
    this.m.delete(key);
  }
  key(index: number) {
    return Array.from(this.m.keys())[index] ?? null;
  }
}
const memStorage = new MemStorage();
Object.defineProperty(window, "localStorage", { value: memStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: memStorage, writable: true, configurable: true });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
