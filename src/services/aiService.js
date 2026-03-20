// OpenAI ChatGPT + Google Places integration
// Required env vars: OPENAI_API_KEY, GOOGLE_MAPS_API_KEY

const https = require('node:https');

const CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

// Cebu province bounding box (island + Mactan + nearby islands)
const CEBU_BOUNDS = { latMin: 9.4, latMax: 11.5, lngMin: 123.3, lngMax: 124.1 };

const inCebuBounds = (lat, lng) =>
  lat >= CEBU_BOUNDS.latMin && lat <= CEBU_BOUNDS.latMax &&
  lng >= CEBU_BOUNDS.lngMin && lng <= CEBU_BOUNDS.lngMax;

// ---------- Google Maps helper ----------

/** Generic GET to maps.googleapis.com. Returns parsed JSON or null on any error. */
const googleGet = (path) => new Promise((resolve) => {
  const req = https.request(
    { hostname: 'maps.googleapis.com', path, method: 'GET', timeout: 8_000 },
    (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(null); } });
    }
  );
  req.on('timeout', () => { req.destroy(); resolve(null); });
  req.on('error', () => resolve(null));
  req.end();
});

// ---------- Google type → our category ----------

const TYPE_MAP = [
  ['beach',    ['beach']],
  ['mountain', ['mountain_pass', 'natural_feature']],
  ['heritage', ['cemetery', 'historic_site', 'ruins']],
  ['museum',   ['museum', 'art_gallery']],
  ['park',     ['park', 'campground', 'national_park', 'zoo', 'amusement_park', 'aquarium']],
  ['market',   ['shopping_mall', 'market', 'store']],
  ['church',   ['church', 'place_of_worship']],
  ['resort',   ['lodging', 'spa', 'campground']],
];

/** Map Google place types array to our category string, or null if unknown. */
const mapCategory = (types = []) => {
  for (const [cat, googleTypes] of TYPE_MAP) {
    if (types.some(t => googleTypes.includes(t))) return cat;
  }
  return null;
};

/** Convert Google price_level (0–4) to a rough PHP entrance fee. */
const PRICE_TO_FEE = { 0: 0, 1: 50, 2: 150, 3: 300, 4: 500 };

// ---------- Address helpers ----------

/** Extract municipality / city from address_components. */
const extractLocality = (components = []) => {
  for (const type of ['locality', 'administrative_area_level_3', 'administrative_area_level_2']) {
    const c = components.find(c => c.types.includes(type));
    if (c) return c.long_name;
  }
  return '';
};

// ---------- Step 1: Places Nearby Search ----------

/**
 * Find the closest tourist attraction POI to the pin.
 * Returns { placeId, name } or null if nothing found / no API key.
 */
const nearbySearch = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  // Primary: tourist_attraction type, ranked by distance
  let json = await googleGet(
    `/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=tourist_attraction&key=${apiKey}`
  );
  let result = json?.results?.[0];

  // Fallback: broaden to point_of_interest if nothing found
  if (!result) {
    json = await googleGet(
      `/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&type=point_of_interest&key=${apiKey}`
    );
    result = json?.results?.[0];
  }

  if (!result) return null;
  return { placeId: result.place_id, name: result.name };
};

// ---------- Step 2: Place Details ----------

/**
 * Fetch full structured data for a place_id.
 * Returns { name, formattedAddress, locality, types, editorialSummary, priceLevel } or null.
 */
const placeDetails = async (placeId) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const fields = 'name,formatted_address,address_components,types,editorial_summary,price_level';
  const json = await googleGet(
    `/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`
  );
  const r = json?.result;
  if (!r) return null;

  return {
    name:             r.name || '',
    formattedAddress: r.formatted_address || '',
    locality:         extractLocality(r.address_components),
    types:            r.types || [],
    editorialSummary: r.editorial_summary?.overview || '',
    priceLevel:       r.price_level ?? null,
  };
};

// ---------- Reverse geocode fallback ----------

/**
 * Fallback when Places API finds nothing.
 * Returns { placeName, formattedAddress, locality }.
 */
const reverseGeocode = async (lat, lng) => {
  const fallback = { placeName: `${lat}, ${lng}`, formattedAddress: `${lat}, ${lng}`, locality: 'Cebu' };
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fallback;

  const json = await googleGet(`/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
  const results = json?.results ?? [];
  if (!results.length) return fallback;

  const poi = results.find(r =>
    r.types?.some(t => ['point_of_interest', 'establishment', 'natural_feature', 'park', 'tourist_attraction'].includes(t))
  );
  const best = poi ?? results[0];

  return {
    placeName:        best?.name || best?.formatted_address || fallback.placeName,
    formattedAddress: best?.formatted_address || fallback.formattedAddress,
    locality:         extractLocality(results[0]?.address_components) || 'Cebu',
  };
};

// ---------- Step 3: OpenAI (gap-fill only) ----------

/**
 * Build a lean prompt asking AI only for the fields Google couldn't provide.
 * ctx: { name, formattedAddress, locality, category, description, entranceFee }
 */
const COORD_PROMPT = (ctx) => {
  const aiFields = [];
  if (!ctx.category)            aiFields.push(`- "category": one of ${CATEGORIES.join(', ')} — best fit for "${ctx.name}"`);
  if (!ctx.description)         aiFields.push('- "description": 2-3 engaging sentences for tourists about what makes this place special');
  if (ctx.entranceFee === null)  aiFields.push('- "entranceFee": estimated entrance fee in Philippine Pesos as a number (0 if free)');
  aiFields.push('- "safetyTips": one short safety tip specific to this type of attraction');

  return `You are a tourism data assistant for Cebu Province, Philippines.
Fill in ONLY the following fields for the attraction "${ctx.name}" in ${ctx.locality}, Cebu.

Return a JSON object with exactly these fields:
${aiFields.join('\n')}

Respond with only valid JSON. No markdown, no explanation, no code fences.`;
};

const ADVISORY_PROMPT = (area) =>
  `You are a safety advisory writer for CebuSafeTour, a tourism safety app for Cebu Province, Philippines.
Generate a realistic and relevant safety advisory for the following attraction or area in Cebu.
The advisory should warn tourists about a plausible current hazard or safety concern specific to this location (e.g. flash floods, strong currents, slippery trails, jellyfish, crowd surges, heat advisory, restricted access).

Return a JSON object with these exact fields:
- "title": short, clear advisory title (max 80 characters, e.g. "Flash Flood Risk at Kawasan Falls Trail")
- "description": 2-3 sentences explaining the hazard and current situation at this specific location
- "severity": one of "critical", "warning", or "advisory"
- "recommendedActions": specific actions tourists should take, as a single string with each action on a new line starting with "• "

Respond with only valid JSON. No markdown, no explanation, no code fences.

Attraction or area in Cebu: "${area}"`;

// ---------- OpenAI HTTP ----------

/** POST to OpenAI chat completions. promptOrMessages: string | messages array. */
const openaiPost = (promptOrMessages) => new Promise((resolve, reject) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const e = new Error('OPENAI_API_KEY is not set in .env');
    e.code = 'NO_API_KEY';
    return reject(e);
  }

  const model    = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user', content: promptOrMessages }]
    : promptOrMessages;

  const payload = Buffer.from(JSON.stringify({
    model,
    messages,
    response_format: { type: 'json_object' },
  }));

  const req = https.request({
    hostname: 'api.openai.com',
    path:     '/v1/chat/completions',
    method:   'POST',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': payload.length,
      'Authorization':  `Bearer ${apiKey}`,
    },
    timeout: 30_000,
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: data }));
  });

  req.on('timeout', () => {
    req.destroy();
    const e = new Error('ChatGPT request timed out — please try again.');
    e.code = 'OPENAI_TIMEOUT';
    reject(e);
  });

  req.on('error', (err) => { err.code = 'OPENAI_NETWORK'; reject(err); });
  req.write(payload);
  req.end();
});

/** Parse and error-check an OpenAI response. */
const parseOpenAI = ({ status, body }) => {
  if (status === 401) {
    const e = new Error('Invalid OpenAI API key — check OPENAI_API_KEY in .env');
    e.code = 'OPENAI_AUTH';
    throw e;
  }
  if (status === 429) {
    let errCode = '';
    try { errCode = JSON.parse(body).error?.code || ''; } catch {}
    const isQuota = errCode === 'insufficient_quota';
    const e = new Error(isQuota
      ? 'OpenAI billing quota exceeded — add credits at https://platform.openai.com/settings/billing/overview'
      : 'OpenAI rate limit hit — please wait a moment and try again');
    e.code = 'QUOTA_EXCEEDED';
    e.isQuota = isQuota;
    throw e;
  }
  if (status !== 200) {
    let msg = '';
    try { msg = JSON.parse(body).error?.message || ''; } catch {}
    const e = new Error(msg || `OpenAI returned status ${status}`);
    e.code = 'OPENAI_ERROR';
    throw e;
  }
  const json    = JSON.parse(body);
  const content = json.choices?.[0]?.message?.content ?? '';
  return JSON.parse(content);
};

// ---------- Public exports ----------

/**
 * Three-step attraction suggestion from map pin coordinates.
 *
 * 1. Places Nearby Search  → exact POI name + place_id
 * 2. Place Details          → address, locality, types, editorial_summary, price_level
 * 3. OpenAI (gap-fill only) → category (if unmapped), description (if no editorial), entranceFee (if no price_level), safetyTips
 *
 * Returns { name, category, district, address, description, entranceFee, safetyTips, latitude, longitude }
 */
exports.suggestByCoords = async (lat, lng) => {
  if (!inCebuBounds(lat, lng)) {
    const e = new Error(`Coordinates (${lat}, ${lng}) are outside Cebu Province.`);
    e.code = 'OUTSIDE_CEBU';
    throw e;
  }

  // Step 1 — nearest POI
  const nearby = await nearbySearch(lat, lng);

  // Step 2 — full details (falls back to reverse geocode if Places API returns nothing)
  let details;
  if (nearby) {
    details = await placeDetails(nearby.placeId);
  }
  if (!details) {
    const geo = await reverseGeocode(lat, lng);
    details = {
      name:             geo.placeName,
      formattedAddress: geo.formattedAddress,
      locality:         geo.locality,
      types:            [],
      editorialSummary: '',
      priceLevel:       null,
    };
  }

  // Derive what we can from Google data
  const category    = mapCategory(details.types);                                  // null → AI fills
  const entranceFee = details.priceLevel !== null ? (PRICE_TO_FEE[details.priceLevel] ?? null) : null; // null → AI fills
  const description = details.editorialSummary || '';                              // '' → AI fills

  // Step 3 — AI fills only the gaps
  const ctx = {
    name:            details.name,
    formattedAddress: details.formattedAddress,
    locality:        details.locality || 'Cebu',
    category,
    description,
    entranceFee,
  };

  const aiFields = await parseOpenAI(await openaiPost(COORD_PROMPT(ctx)));

  // Merge: Google data is authoritative; AI fills remaining gaps
  return {
    name:        ctx.name,
    category:    ctx.category    ?? aiFields.category    ?? 'other',
    district:    ctx.locality,
    address:     ctx.formattedAddress,
    description: ctx.description || aiFields.description || '',
    entranceFee: ctx.entranceFee !== null ? ctx.entranceFee : (aiFields.entranceFee ?? 0),
    safetyTips:  aiFields.safetyTips || '',
    latitude:    lat,
    longitude:   lng,
  };
};

/**
 * Generate a safety advisory for a named Cebu attraction / area.
 * Returns { title, description, severity, recommendedActions }
 */
exports.suggestAdvisory = async (area) => {
  if (!area?.trim()) {
    const e = new Error('Attraction or area name is required');
    e.code = 'BAD_INPUT';
    throw e;
  }
  return parseOpenAI(await openaiPost(ADVISORY_PROMPT(area.trim())));
};

/**
 * Verify a profile picture URL using OpenAI vision.
 * Returns { isReal: boolean, reason: string }
 */
exports.verifyProfilePicture = async (url) => {
  if (!url?.trim()) {
    const e = new Error('Profile picture URL is required');
    e.code = 'BAD_INPUT';
    throw e;
  }
  const messages = [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: url.trim(), detail: 'low' } },
      {
        type: 'text',
        text: 'Examine this image and determine if it is a real photograph of a human face suitable as a profile picture (not a cartoon, logo, landscape, or inappropriate content). Respond with a JSON object with exactly two fields: "isReal" (boolean — true only if it clearly shows a real human face) and "reason" (one short sentence explaining your decision).',
      },
    ],
  }];
  return parseOpenAI(await openaiPost(messages));
};
