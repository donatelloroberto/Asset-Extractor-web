import NodeCache from "node-cache";

const catalogCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const metaCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const streamCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });

let hits = 0;
let misses = 0;

export function getCached<T>(type: "catalog" | "meta" | "stream", key: string): T | undefined {
  const cache = type === "catalog" ? catalogCache : type === "meta" ? metaCache : streamCache;
  const val = cache.get<T>(key);
  if (val !== undefined) {
    hits++;
    return val;
  }
  misses++;
  return undefined;
}

export function setCached<T>(type: "catalog" | "meta" | "stream", key: string, value: T): void {
  const cache = type === "catalog" ? catalogCache : type === "meta" ? metaCache : streamCache;
  cache.set(key, value);
}

export function getCacheStats() {
  return {
    hits,
    misses,
    keys: catalogCache.keys().length + metaCache.keys().length + streamCache.keys().length,
  };
}

export function clearAllCaches() {
  catalogCache.flushAll();
  metaCache.flushAll();
  streamCache.flushAll();
  hits = 0;
  misses = 0;
}
