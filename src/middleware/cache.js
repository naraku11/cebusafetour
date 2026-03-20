const cache = require('../utils/cache');

/**
 * Express middleware that serves and stores successful JSON responses in memory.
 *
 * - Cache HIT  → responds immediately, sets X-Cache: HIT
 * - Cache MISS → lets the handler run, intercepts res.json(), stores the body,
 *                sets X-Cache: MISS
 * - Also sets Cache-Control: public, max-age=<ttl> so Dio's HTTP-level cache on
 *   the mobile client honours the same TTL automatically.
 *
 * @param {number}            ttl   Time-to-live in seconds
 * @param {(req) => string}  [keyFn] Custom cache-key function.
 *                                   Defaults to `<path>:<JSON query>`.
 */
function cacheResponse(ttl, keyFn) {
  return (req, res, next) => {
    const key = keyFn
      ? keyFn(req)
      : `${req.path}:${JSON.stringify(req.query)}`;

    const hit = cache.get(key);
    if (hit !== undefined) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttl}`);
      return res.json(hit);
    }

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `public, max-age=${ttl}`);

    // Intercept res.json so we can store the body before it's sent
    const _json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      return _json(body);
    };

    next();
  };
}

module.exports = { cacheResponse };
