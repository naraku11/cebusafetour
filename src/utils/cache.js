const NodeCache = require('node-cache');

/**
 * Shared in-memory response cache.
 *
 * stdTTL = 0  → keys live until explicitly set with a TTL via cache.set(key, val, ttl)
 * checkperiod → expired keys are pruned every 120 s
 * useClones   → false avoids deep-clone overhead on every get/set
 */
const cache = new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false });

/**
 * Delete all cache keys whose names start with `prefix`.
 * Returns the number of keys removed.
 *
 * @param {string} prefix
 * @returns {number}
 */
cache.invalidatePrefix = (prefix) => {
  const keys = cache.keys().filter((k) => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
  return keys.length;
};

module.exports = cache;
