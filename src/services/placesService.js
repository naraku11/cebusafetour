const https = require('https');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/** Make an HTTPS GET and return { status, location, body } */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Capture redirect without following
      if (res.statusCode >= 300 && res.statusCode < 400) {
        res.resume();
        return resolve({ status: res.statusCode, location: res.headers.location, body: null });
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, location: null, body }));
    }).on('error', reject);
  });
}

/**
 * Fetch up to `maxPhotos` real photo URLs for an attraction by name.
 * Uses Google Places Text Search → Place Details → Photo redirect.
 * Returns an array of permanent lh3.googleusercontent.com CDN URLs (or []).
 */
async function fetchPlacePhotos(name, maxPhotos = 3) {
  if (!API_KEY) {
    const err = new Error('GOOGLE_MAPS_API_KEY is not configured');
    err.code = 'NO_MAPS_KEY';
    throw err;
  }

  // 1. Text Search — find the best matching place in Cebu
  const searchUrl =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(name + ' Cebu Philippines')}` +
    `&key=${API_KEY}`;

  const searchRes = await makeRequest(searchUrl);
  if (!searchRes.body) throw new Error('Places Text Search returned no body');

  const searchData = JSON.parse(searchRes.body);
  if (searchData.status !== 'OK' || !searchData.results?.length) {
    return []; // No place found — not an error, just return empty
  }

  const placeId = searchData.results[0].place_id;

  // 2. Place Details — get photo references
  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${placeId}` +
    `&fields=photos` +
    `&key=${API_KEY}`;

  const detailsRes = await makeRequest(detailsUrl);
  if (!detailsRes.body) throw new Error('Places Details returned no body');

  const detailsData = JSON.parse(detailsRes.body);
  const photoRefs = detailsData.result?.photos?.map(p => p.photo_reference) || [];
  if (!photoRefs.length) return [];

  // 3. Resolve each photo reference → permanent CDN URL via 302 redirect
  const photoUrls = [];
  for (const ref of photoRefs.slice(0, maxPhotos)) {
    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=1200` +
      `&photo_reference=${ref}` +
      `&key=${API_KEY}`;

    try {
      const photoRes = await makeRequest(photoUrl);
      if (photoRes.location) {
        photoUrls.push(photoRes.location);
      }
    } catch {
      // Skip individual photo failures
    }
  }

  return photoUrls;
}

module.exports = { fetchPlacePhotos };
