// OpenAI ChatGPT + Google Places integration
// Required env vars: OPENAI_API_KEY, GOOGLE_MAPS_API_KEY

const https = require('node:https');

const CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

// Cebu province bounding box (island + Mactan + nearby islands)
const CEBU_BOUNDS = { latMin: 9.4, latMax: 11.5, lngMin: 123.3, lngMax: 124.1 };

const inCebuBounds = (lat, lng) =>
  lat >= CEBU_BOUNDS.latMin && lat <= CEBU_BOUNDS.latMax &&
  lng >= CEBU_BOUNDS.lngMin && lng <= CEBU_BOUNDS.lngMax;

// ---------- Haversine distance ----------

/** Straight-line distance in metres between two lat/lng points. */
const haversineM = (lat1, lng1, lat2, lng2) => {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ---------- Google Maps helper ----------

/** Generic GET to maps.googleapis.com. Returns parsed JSON or null on any error. */
const googleGet = (path) => new Promise((resolve) => {
  const req = https.request(
    { hostname: 'maps.googleapis.com', path, method: 'GET', timeout: 8_000 },
    (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
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
  ['resort',   ['lodging', 'spa']],
];

/** Map Google place types array to our category string, or null if unknown. */
const mapCategory = (types = []) => {
  for (const [cat, googleTypes] of TYPE_MAP) {
    if (types.some((t) => googleTypes.includes(t))) return cat;
  }
  return null;
};

/** Convert Google price_level (0–4) to a rough PHP entrance fee. */
const PRICE_TO_FEE = { 0: 0, 1: 50, 2: 150, 3: 300, 4: 500 };

// ---------- Address helpers ----------

/** Extract municipality / city from address_components. */
const extractLocality = (components = []) => {
  for (const type of ['locality', 'administrative_area_level_3', 'administrative_area_level_2']) {
    const c = components.find((c) => c.types.includes(type));
    if (c) return c.long_name;
  }
  return '';
};

// ---------- Step 2: Place Details ----------

/**
 * Fetch full structured data for a place_id.
 * Returns { name, formattedAddress, locality, types, editorialSummary, priceLevel, lat, lng } or null.
 */
const placeDetails = async (placeId) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const fields = 'name,formatted_address,address_components,types,editorial_summary,price_level,geometry';
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
    lat:              r.geometry?.location?.lat ?? null,
    lng:              r.geometry?.location?.lng ?? null,
  };
};

// ---------- Step 1: Places Nearby Search (Layer 1) ----------

/**
 * Find the closest prominent tourist POI within 150 m of the pin (300 m fallback).
 * Rejects results more than 300 m away to avoid returning irrelevant nearby places.
 * Returns { placeId, name } or null.
 */
const nearbySearch = async (lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  // Primary: tourist_attraction within 150 m ranked by prominence
  let json = await googleGet(
    `/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=150&rankby=prominence&type=tourist_attraction&key=${apiKey}`
  );
  let result = json?.results?.[0];

  // Fallback: widen to 300 m, any relevant type
  if (!result) {
    json = await googleGet(
      `/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=300&rankby=prominence&key=${apiKey}`
    );
    result = json?.results?.find((r) =>
      r.types?.some((t) =>
        ['tourist_attraction', 'natural_feature', 'park', 'point_of_interest', 'place_of_worship'].includes(t)
      )
    );
  }

  if (!result) return null;

  // Distance gate — skip if result is too far from the pin
  const loc = result.geometry?.location;
  if (loc && haversineM(lat, lng, loc.lat, loc.lng) > 300) return null;

  return { placeId: result.place_id, name: result.name };
};

// ---------- Layer 2: Text Search using reverse-geocoded name ----------

/**
 * Use the reverse-geocoded place name as a text query with location bias.
 * Far more reliable than Nearby Search for correctly-named but mis-tagged POIs.
 * Returns { placeId, name } or null.
 */
const textSearch = async (name, lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !name || name === `${lat}, ${lng}`) return null;

  const json = await googleGet(
    `/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&location=${lat},${lng}&radius=500&key=${apiKey}`
  );
  const result = json?.results?.[0];
  if (!result) return null;

  // Reject if the text-search result is too far from the pin
  const loc = result.geometry?.location;
  if (loc && haversineM(lat, lng, loc.lat, loc.lng) > 500) return null;

  return { placeId: result.place_id, name: result.name };
};

// ---------- Layer 3: Reverse geocode fallback ----------

/**
 * Fallback when both Places APIs find nothing useful near the pin.
 * Returns { placeName, formattedAddress, locality }.
 */
const reverseGeocode = async (lat, lng) => {
  const fallback = { placeName: `${lat}, ${lng}`, formattedAddress: `${lat}, ${lng}`, locality: 'Cebu' };
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return fallback;

  const json = await googleGet(`/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
  const results = json?.results ?? [];
  if (!results.length) return fallback;

  const poi = results.find((r) =>
    r.types?.some((t) =>
      ['point_of_interest', 'establishment', 'natural_feature', 'park', 'tourist_attraction'].includes(t)
    )
  );
  const best = poi ?? results[0];

  return {
    placeName:        best?.name || best?.formatted_address || fallback.placeName,
    formattedAddress: best?.formatted_address || fallback.formattedAddress,
    locality:         extractLocality(results[0]?.address_components) || 'Cebu',
  };
};

// ---------- OpenAI prompts ----------

/**
 * Lean prompt — only asks AI for fields Google couldn't provide.
 * ctx: { name, formattedAddress, locality, category, description, entranceFee }
 */
const COORD_PROMPT = (ctx) => {
  const aiFields = [];
  if (!ctx.category)           aiFields.push(`- "category": one of ${CATEGORIES.join(', ')} — best fit for "${ctx.name}"`);
  if (!ctx.description)        aiFields.push('- "description": 2-3 engaging sentences for tourists about what makes this place special');
  if (ctx.entranceFee === null) aiFields.push('- "entranceFee": estimated entrance fee in Philippine Pesos as a number (0 if free)');
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
    res.on('data', (chunk) => { data += chunk; });
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
 * Three-layer attraction suggestion from map pin coordinates.
 *
 * Layer 1 — Nearby Search  (radius 150 m, tourist_attraction; 300 m fallback + distance gate)
 * Layer 2 — Text Search    (reverse-geocoded name as query, 500 m bias; distance gate)
 * Layer 3 — Reverse Geocode (address fallback)
 * + OpenAI fills only what Google couldn't provide (category, description, entranceFee, safetyTips)
 */
exports.suggestByCoords = async (lat, lng) => {
  if (!inCebuBounds(lat, lng)) {
    const e = new Error(`Coordinates (${lat}, ${lng}) are outside Cebu Province.`);
    e.code = 'OUTSIDE_CEBU';
    throw e;
  }

  // Layer 1 — Nearby Search
  const nearby = await nearbySearch(lat, lng);
  let details = nearby ? await placeDetails(nearby.placeId) : null;

  // Layer 2 — Text Search (if Layer 1 found nothing)
  if (!details) {
    const geo = await reverseGeocode(lat, lng);
    const textResult = await textSearch(geo.placeName, lat, lng);
    if (textResult) {
      details = await placeDetails(textResult.placeId);
    }
    // Layer 3 — Reverse Geocode fallback
    if (!details) {
      details = {
        name:             geo.placeName,
        formattedAddress: geo.formattedAddress,
        locality:         geo.locality,
        types:            [],
        editorialSummary: '',
        priceLevel:       null,
        lat:              null,
        lng:              null,
      };
    }
  }

  const category    = mapCategory(details.types);
  const entranceFee = details.priceLevel !== null ? (PRICE_TO_FEE[details.priceLevel] ?? null) : null;
  const description = details.editorialSummary || '';

  const ctx = {
    name:             details.name,
    formattedAddress: details.formattedAddress,
    locality:         details.locality || 'Cebu',
    category,
    description,
    entranceFee,
  };

  const aiFields = await parseOpenAI(await openaiPost(COORD_PROMPT(ctx)));

  return {
    name:        ctx.name,
    category:    ctx.category    ?? aiFields.category    ?? 'other',
    district:    ctx.locality,
    address:     ctx.formattedAddress,
    description: ctx.description || aiFields.description || '',
    entranceFee: ctx.entranceFee !== null ? ctx.entranceFee : (aiFields.entranceFee ?? 0),
    safetyTips:  aiFields.safetyTips || '',
    latitude:    details.lat ?? lat,
    longitude:   details.lng ?? lng,
  };
};

/**
 * Places Autocomplete — returns up to 5 suggestions for a partial attraction name.
 * Biased toward Cebu Province (50 km radius).
 */
exports.autocompletePlaces = async (input, lat, lng) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !input?.trim()) return [];

  const loc = lat && lng ? `&location=${lat},${lng}&radius=50000` : '';
  const json = await googleGet(
    `/maps/api/place/autocomplete/json?input=${encodeURIComponent(input.trim())}&components=country:ph${loc}&key=${apiKey}`
  );

  return (json?.predictions || []).slice(0, 5).map((p) => ({
    placeId:       p.place_id,
    description:   p.description,
    mainText:      p.structured_formatting?.main_text      || p.description,
    secondaryText: p.structured_formatting?.secondary_text || '',
  }));
};

/**
 * Get full structured attraction info for a known place_id (used after autocomplete selection).
 * Returns a form-ready object or null if the place_id is invalid.
 */
exports.getPlaceInfo = async (placeId) => {
  const details = await placeDetails(placeId);
  if (!details) return null;

  const category    = mapCategory(details.types);
  const entranceFee = details.priceLevel !== null ? (PRICE_TO_FEE[details.priceLevel] ?? null) : null;

  return {
    name:        details.name,
    category:    category ?? 'other',
    district:    details.locality || 'Cebu',
    address:     details.formattedAddress,
    description: details.editorialSummary || '',
    entranceFee: entranceFee ?? 0,
    latitude:    details.lat,
    longitude:   details.lng,
  };
};

/**
 * Generate a safety advisory for a named Cebu attraction / area.
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
