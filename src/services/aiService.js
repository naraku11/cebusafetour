// AI service — Groq (text + vision)
// Get a free key at https://console.groq.com  →  set GROQ_API_KEY in .env

const https = require('node:https');

const CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

// Cebu province bounding box (island + Mactan + nearby islands)
const CEBU_BOUNDS = { latMin: 9.4, latMax: 11.5, lngMin: 123.3, lngMax: 124.1 };

const inCebuBounds = (lat, lng) =>
  lat >= CEBU_BOUNDS.latMin && lat <= CEBU_BOUNDS.latMax &&
  lng >= CEBU_BOUNDS.lngMin && lng <= CEBU_BOUNDS.lngMax;

const COORD_PROMPT = (lat, lng, placeName) =>
  `You are a tourism data assistant exclusively for Cebu Province, Philippines.
The GPS coordinates below point to the following location: "${placeName}".
Use this place name as the primary reference to accurately fill in the attraction details.

Return a JSON object with these exact fields:
- "name": the full official name of the attraction (use "${placeName}" as the basis)
- "category": one of ${CATEGORIES.join(', ')}
- "district": municipality or city in Cebu Province (e.g. "Moalboal", "Cebu City", "Oslob", "Lapu-Lapu City")
- "address": full street address or nearest landmark in Cebu
- "description": 2-3 engaging sentences for tourists describing what makes this specific place special
- "entranceFee": estimated entrance fee in Philippine Pesos as a number (0 if free)
- "safetyTips": one short sentence of safety advice specific to this attraction
- "latitude": ${lat}
- "longitude": ${lng}

Respond with only valid JSON. No markdown, no explanation, no code fences.

Coordinates: latitude ${lat}, longitude ${lng}
Place name from reverse geocoding: "${placeName}"`;

const NAME_PROMPT = (name) =>
  `You are a tourism data assistant exclusively for Cebu Province, Philippines.
Fill in the details for the following attraction in Cebu: "${name}".

Return a JSON object with these exact fields:
- "name": the full official name of the attraction
- "category": one of ${CATEGORIES.join(', ')}
- "district": municipality or city in Cebu Province (e.g. "Moalboal", "Cebu City", "Oslob", "Lapu-Lapu City")
- "address": full street address or nearest landmark in Cebu
- "description": 2-3 engaging sentences for tourists describing what makes this specific place special
- "entranceFee": estimated entrance fee in Philippine Pesos as a number (0 if free)
- "safetyStatus": one of "safe", "caution", "restricted" — based on typical conditions at this attraction
- "safetyTips": one short sentence of safety advice specific to this attraction
- "latitude": approximate latitude (must be within Cebu Province bounds: 9.4 to 11.5)
- "longitude": approximate longitude (must be within Cebu Province bounds: 123.3 to 124.1)

Respond with only valid JSON. No markdown, no explanation, no code fences.`;

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

// ── Groq — fast LLM for text completions ──────────────────────────────────────

const groqPost = (promptOrMessages, { model: modelOverride } = {}) => new Promise((resolve, reject) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const e = new Error('GROQ_API_KEY is not set in .env');
    e.code = 'NO_API_KEY';
    return reject(e);
  }

  const model    = modelOverride || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: 'user', content: promptOrMessages }]
    : promptOrMessages;

  const payload = Buffer.from(JSON.stringify({
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.3,
  }));

  const req = https.request({
    hostname: 'api.groq.com',
    path:     '/openai/v1/chat/completions',
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
    const e = new Error('Groq request timed out — please try again.');
    e.code = 'OPENAI_TIMEOUT';
    reject(e);
  });

  req.on('error', (err) => {
    err.code = 'OPENAI_NETWORK';
    reject(err);
  });

  req.write(payload);
  req.end();
});

const parseGroq = ({ status, body }) => {
  if (status === 401) {
    const e = new Error('Invalid Groq API key — check GROQ_API_KEY in .env');
    e.code = 'OPENAI_AUTH';
    throw e;
  }
  if (status === 429) {
    const e = new Error('Groq rate limit hit — please wait a moment and try again');
    e.code = 'QUOTA_EXCEEDED';
    e.isQuota = false;
    throw e;
  }
  if (status !== 200) {
    let msg = '';
    try { msg = JSON.parse(body).error?.message || ''; } catch {}
    const e = new Error(msg || `Groq returned status ${status}`);
    e.code = 'OPENAI_ERROR';
    throw e;
  }
  const json    = JSON.parse(body);
  const content = json.choices?.[0]?.message?.content ?? '';
  return JSON.parse(content);
};

// ── Reverse geocoding ──────────────────────────────────────────────────────────

/**
 * Reverse geocode coordinates using Google Maps Geocoding API.
 * Returns the most relevant place name (POI > establishment > route > locality).
 * Falls back to "lat, lng" string if the API key is missing or the call fails.
 */
const reverseGeocode = (lat, lng) => new Promise((resolve) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return resolve(`${lat}, ${lng}`);

  const req = https.request({
    hostname: 'maps.googleapis.com',
    path:     `/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&result_type=point_of_interest|establishment|natural_feature|park`,
    method:   'GET',
    timeout:  8_000,
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json    = JSON.parse(data);
        const results = json.results ?? [];
        const poi = results.find(r =>
          r.types?.some(t => ['point_of_interest', 'establishment', 'natural_feature', 'park', 'tourist_attraction'].includes(t))
        );
        const best = poi ?? results[0];
        resolve(best?.name || best?.formatted_address || `${lat}, ${lng}`);
      } catch {
        resolve(`${lat}, ${lng}`);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); resolve(`${lat}, ${lng}`); });
  req.on('error', () => resolve(`${lat}, ${lng}`));
  req.end();
});

// ── Exports ────────────────────────────────────────────────────────────────────

/**
 * Ask Groq to identify and fill in attraction details from coordinates.
 * Returns { name, category, district, address, description, entranceFee, safetyTips, latitude, longitude }
 */
exports.suggestByCoords = async (lat, lng) => {
  if (!inCebuBounds(lat, lng)) {
    const e = new Error(`Coordinates (${lat}, ${lng}) are outside Cebu Province.`);
    e.code = 'OUTSIDE_CEBU';
    throw e;
  }
  const placeName = await reverseGeocode(lat, lng);
  return parseGroq(await groqPost(COORD_PROMPT(lat, lng, placeName)));
};

/**
 * Ask Groq to fill in attraction details from a name alone.
 * Returns { name, category, district, address, description, entranceFee, safetyStatus, safetyTips, latitude, longitude }
 */
exports.suggestByName = async (name) => {
  if (!name?.trim()) {
    const e = new Error('Attraction name is required');
    e.code = 'BAD_INPUT';
    throw e;
  }
  return parseGroq(await groqPost(NAME_PROMPT(name.trim())));
};

/**
 * Ask Groq to generate a safety advisory for a specific Cebu attraction/area.
 * Returns { title, description, severity, recommendedActions }
 */
exports.suggestAdvisory = async (area) => {
  if (!area?.trim()) {
    const e = new Error('Attraction or area name is required');
    e.code = 'BAD_INPUT';
    throw e;
  }
  return parseGroq(await groqPost(ADVISORY_PROMPT(area.trim())));
};

/**
 * Use Groq vision to verify whether a profile picture URL shows a real human face.
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
      {
        type: 'image_url',
        image_url: { url: url.trim(), detail: 'low' },
      },
      {
        type: 'text',
        text: 'Examine this image and determine if it is a real photograph of a human face suitable as a profile picture (not a cartoon, logo, landscape, or inappropriate content). Respond with a JSON object with exactly two fields: "isReal" (boolean — true only if it clearly shows a real human face) and "reason" (one short sentence explaining your decision).',
      },
    ],
  }];
  const visionModel = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';
  return parseGroq(await groqPost(messages, { model: visionModel }));
};
