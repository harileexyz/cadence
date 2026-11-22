const memoryCache = new Map<string, { data: unknown; ts: number }>();

export function readClientCache<T>(key: string, maxAgeMs = 10 * 60 * 1000): T | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts <= maxAgeMs) {
    return mem.data as T;
  }

  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`cadence_cache:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - parsed.ts <= maxAgeMs) {
      memoryCache.set(key, parsed);
      return parsed.data;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function isClientCacheFresh(key: string, freshMs = 90_000): boolean {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.ts <= freshMs) {
    return true;
  }
  if (typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(`cadence_cache:${key}`);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { ts: number };
    return Date.now() - parsed.ts <= freshMs;
  } catch {
    return false;
  }
}

export function writeClientCache<T>(key: string, data: T): void {
  const entry = { data, ts: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`cadence_cache:${key}`, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function clearClientCache(): void {
  memoryCache.clear();
  if (typeof window === "undefined") return;
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("cadence_cache:")) {
        window.sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
}

export function isCapacitorNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}
