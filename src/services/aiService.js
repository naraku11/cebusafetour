// OpenAI ChatGPT integration
// Get an API key at: https://platform.openai.com/api-keys
// Set OPENAI_API_KEY in .env

const https = require('node:https');

const CATEGORIES = ['beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'];

// Cebu province bounding box (island + Mactan + nearby islands)
const CEBU_BOUNDS = { latMin: 9.4, latMax: 11.5, lngMin: 123.3, lngMax: 124.1 };

const inCebuBounds = (lat, lng) =>
  lat >= CEBU_BOUNDS.latMin && lat <= CEBU_BOUNDS.latMax &&
  lng >= CEBU_BOUNDS.lngMin && lng <= CEBU_BOUNDS.lngMax;

const COORD_PROMPT = (lat, lng, ctx) =>
  `You are a tourism data assistant exclusively for Cebu Province, Philippines.
The GPS coordinates below have been reverse-geocoded and the results are provided.
Use the pre-filled values exactly as given — do NOT alter them. Only generate the fields marked as (AI).

Pre-filled from Google Maps (copy verbatim):
- name: "${ctx.placeName}"
- address: "${ctx.formattedAddress}"
- district: "${ctx.locality}"
- latitude: ${lat}
- longitude: ${lng}

Return a JSON object with these exact fields:
- "name": copy "${ctx.placeName}" exactly
- "category": (AI) one of ${CATEGORIES.join(', ')} — choose the best fit for this attraction
- "district": copy "${ctx.locality}" exactly
- "address": copy "${ctx.formattedAddress}" exactly
- "description": (AI) 2-3 engaging sentences for tourists describing what makes this specific place special
- "entranceFee": (AI) estimated entrance fee in Philippine Pesos as a number (0 if free)
- "safetyTips": (AI) one short sentence of safety advice specific to this type of attraction
- "latitude": ${lat}
- "longitude": ${lng}

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

// POST to OpenAI chat completions endpoint
// promptOrMessages: string prompt OR a pre-built messages array (for vision)
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
      'Content-Type':  'application/json',
      'Content-Length': payload.length,
      'Authorization': `Bearer ${apiKey}`,
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

  req.on('error', (err) => {
    err.code = 'OPENAI_NETWORK';
    reject(err);
  });

  req.write(payload);
  req.end();
});

// Shared response parser for OpenAI chat completions
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

/**
 * Pick the best locality (municipality / city) from address_components.
 * Prefers locality → administrative_area_level_3 → administrative_area_level_2.
 */
const extractLocality = (components = []) => {
  const pick = (...types) => {
    for (const type of types) {
      const c = components.find(c => c.types.includes(type));
      if (c) return c.long_name;
    }
    return '';
  };
  return pick('locality', 'administrative_area_level_3', 'administrative_area_level_2');
};

/**
 * Reverse geocode coordinates using Google Maps Geocoding API.
 * Returns { placeName, formattedAddress, locality } — all three used in the AI prompt.
 * Falls back gracefully when the API key is missing or the call fails.
 */
const reverseGeocode = (lat, lng) => new Promise((resolve) => {
  const fallback = { placeName: `${lat}, ${lng}`, formattedAddress: `${lat}, ${lng}`, locality: 'Cebu' };
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return resolve(fallback);

  const req = https.request({
    hostname: 'maps.googleapis.com',
    path:     `/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
    method:   'GET',
    timeout:  8_000,
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try {
        const json    = JSON.parse(data);
        const results = json.results ?? [];
        if (!results.length) return resolve(fallback);

        // Pick the most specific POI result first; fall back to full address result
        const poi = results.find(r =>
          r.types?.some(t => ['point_of_interest', 'establishment', 'natural_feature', 'park', 'tourist_attraction'].includes(t))
        );
        const best = poi ?? results[0];

        // Place name: prefer explicit POI name; fall back to formatted_address
        const placeName = best?.name || best?.formatted_address || fallback.placeName;

        // Formatted address: from the most detailed result available
        const formattedAddress = best?.formatted_address || fallback.formattedAddress;

        // Locality: extracted from address_components of the full result (index 0 has most components)
        const locality = extractLocality(results[0]?.address_components) || 'Cebu';

        resolve({ placeName, formattedAddress, locality });
      } catch {
        resolve(fallback);
      }
    });
  });
  req.on('timeout', () => { req.destroy(); resolve(fallback); });
  req.on('error', () => resolve(fallback));
  req.end();
});

/**
 * Ask ChatGPT to identify and fill in attraction details from coordinates.
 * Returns { name, category, district, address, description, entranceFee, safetyTips, latitude, longitude }
 */
exports.suggestByCoords = async (lat, lng) => {
  if (!inCebuBounds(lat, lng)) {
    const e = new Error(`Coordinates (${lat}, ${lng}) are outside Cebu Province.`);
    e.code = 'OUTSIDE_CEBU';
    throw e;
  }
  // Reverse geocode first — returns place name, formatted address, and locality
  const ctx = await reverseGeocode(lat, lng);
  return parseOpenAI(await openaiPost(COORD_PROMPT(lat, lng, ctx)));
};

/**
 * Ask ChatGPT to generate a safety advisory for a specific Cebu attraction/area.
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
 * Use OpenAI vision to verify whether a profile picture URL shows a real human face.
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
  return parseOpenAI(await openaiPost(messages));
};
