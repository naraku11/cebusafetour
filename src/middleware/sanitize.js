/**
 * Recursively strips HTML tags and trims strings from req.body / req.query / req.params.
 * Runs before route handlers to prevent stored XSS.
 */

const STRIP_HTML = /<[^>]*>/g;

const clean = (val) => {
  if (typeof val === 'string') return val.replace(STRIP_HTML, '').trim();
  if (Array.isArray(val))     return val.map(clean);
  if (val && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = clean(val[k]);
    return out;
  }
  return val;
};

module.exports = (req, _res, next) => {
  if (req.body)   req.body   = clean(req.body);
  if (req.query)  req.query  = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};
