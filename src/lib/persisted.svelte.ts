/** A reactive value mirrored to localStorage (device only, never a cookie). Keys are prefixed `imgtools:`. */
export function persisted<T>(key: string, initial: T, valid: (v: unknown) => v is T) {
  let value = $state(initial);
  let loaded = false;

  function load() {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
      const raw = localStorage.getItem('imgtools:' + key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (valid(parsed)) value = parsed;
      }
    } catch {
      // storage unavailable or corrupt: keep the default
    }
  }

  return {
    get value() {
      load();
      return value;
    },
    set value(v: T) {
      load();
      value = v;
      try {
        localStorage.setItem('imgtools:' + key, JSON.stringify(v));
      } catch {
        // private mode etc.
      }
    },
  };
}

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
export const isRecordOfBool = (v: unknown): v is Record<string, boolean> =>
  typeof v === 'object' && v !== null && Object.values(v).every((x) => typeof x === 'boolean');
