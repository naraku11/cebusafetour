const https = require('https');
const logger = require('../utils/logger');

const BASE_URL = process.env.WEATHER_BASE_URL || 'https://api.open-meteo.com/v1';
const TIMEZONE = process.env.WEATHER_TIMEZONE || 'Asia/Manila';

// WMO Weather Codes → human-readable labels
const WMO_CODES = {
  0: { label: 'Clear sky', icon: '☀️', safe: true },
  1: { label: 'Mainly clear', icon: '🌤', safe: true },
  2: { label: 'Partly cloudy', icon: '⛅', safe: true },
  3: { label: 'Overcast', icon: '☁️', safe: true },
  45: { label: 'Foggy', icon: '🌫', safe: true },
  48: { label: 'Icy fog', icon: '🌫', safe: true },
  51: { label: 'Light drizzle', icon: '🌦', safe: true },
  53: { label: 'Moderate drizzle', icon: '🌦', safe: true },
  55: { label: 'Heavy drizzle', icon: '🌧', safe: true },
  61: { label: 'Slight rain', icon: '🌧', safe: true },
  63: { label: 'Moderate rain', icon: '🌧', safe: false },
  65: { label: 'Heavy rain', icon: '🌧', safe: false },
  71: { label: 'Slight snowfall', icon: '🌨', safe: true },
  73: { label: 'Moderate snowfall', icon: '🌨', safe: false },
  75: { label: 'Heavy snowfall', icon: '❄️', safe: false },
  77: { label: 'Snow grains', icon: '🌨', safe: true },
  80: { label: 'Slight showers', icon: '🌦', safe: true },
  81: { label: 'Moderate showers', icon: '🌧', safe: false },
  82: { label: 'Violent showers', icon: '⛈', safe: false },
  85: { label: 'Slight snow showers', icon: '🌨', safe: true },
  86: { label: 'Heavy snow showers', icon: '❄️', safe: false },
  95: { label: 'Thunderstorm', icon: '⛈', safe: false },
  96: { label: 'Thunderstorm with hail', icon: '⛈', safe: false },
  99: { label: 'Thunderstorm with heavy hail', icon: '⛈', safe: false },
};

const fetchJson = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

/**
 * Get current weather + 7-day forecast for a location.
 * @param {number} lat
 * @param {number} lng
 */
exports.getForecast = async (lat, lng) => {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    timezone: TIMEZONE,
    current_weather: true,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'weathercode',
      'windspeed_10m_max',
      'precipitation_probability_max',
    ].join(','),
    forecast_days: 7,
  });

  const url = `${BASE_URL}/forecast?${params}`;
  try {
    const data = await fetchJson(url);
    return formatForecast(data);
  } catch (err) {
    logger.error('Weather fetch error:', err);
    throw new Error('Failed to fetch weather data');
  }
};

/**
 * Get current weather only (lightweight, for attraction detail pages).
 */
exports.getCurrentWeather = async (lat, lng) => {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    timezone: TIMEZONE,
    current_weather: true,
  });

  const url = `${BASE_URL}/forecast?${params}`;
  const data = await fetchJson(url);
  const cw = data.current_weather;
  const wmo = WMO_CODES[cw.weathercode] || { label: 'Unknown', icon: '🌡', safe: true };

  return {
    temperature: cw.temperature,        // °C
    windspeed: cw.windspeed,            // km/h
    weathercode: cw.weathercode,
    ...wmo,
    isDay: cw.is_day === 1,
    time: cw.time,
  };
};

/**
 * Check if weather is safe for visiting an attraction.
 * Returns { safe: boolean, warnings: string[] }
 */
exports.getSafetyAssessment = async (lat, lng) => {
  const forecast = await exports.getForecast(lat, lng);
  const today = forecast.daily[0];
  const warnings = [];

  if (!today.isSafe) warnings.push(`${today.weatherIcon} ${today.weatherLabel} expected today`);
  if (today.precipitationProbability >= 70) warnings.push(`🌧 ${today.precipitationProbability}% chance of rain`);
  if (today.windspeedMax >= 50) warnings.push(`💨 Strong winds up to ${today.windspeedMax} km/h`);
  if (today.precipitationSum >= 20) warnings.push(`⚠️ Heavy rainfall expected (${today.precipitationSum}mm)`);

  return {
    safe: warnings.length === 0,
    warnings,
    current: forecast.current,
    todayForecast: today,
  };
};

const formatForecast = (data) => {
  const cw = data.current_weather;
  const currentWmo = WMO_CODES[cw.weathercode] || { label: 'Unknown', icon: '🌡', safe: true };

  const daily = data.daily.time.map((date, i) => {
    const code = data.daily.weathercode[i];
    const wmo = WMO_CODES[code] || { label: 'Unknown', icon: '🌡', safe: true };
    return {
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      windspeedMax: data.daily.windspeed_10m_max[i],
      weathercode: code,
      weatherLabel: wmo.label,
      weatherIcon: wmo.icon,
      isSafe: wmo.safe,
    };
  });

  return {
    current: {
      temperature: cw.temperature,
      windspeed: cw.windspeed,
      weathercode: cw.weathercode,
      weatherLabel: currentWmo.label,
      weatherIcon: currentWmo.icon,
      isSafe: currentWmo.safe,
      isDay: cw.is_day === 1,
      time: cw.time,
    },
    daily,
  };
};
