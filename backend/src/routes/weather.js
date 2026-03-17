const router = require('express').Router();
const { getForecast, getCurrentWeather, getSafetyAssessment } = require('../services/weatherService');

// GET /api/weather/forecast?lat=10.3157&lng=123.8854
router.get('/forecast', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    const forecast = await getForecast(parseFloat(lat), parseFloat(lng));
    res.json({ forecast });
  } catch (err) { next(err); }
});

// GET /api/weather/current?lat=10.3157&lng=123.8854
router.get('/current', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    const weather = await getCurrentWeather(parseFloat(lat), parseFloat(lng));
    res.json({ weather });
  } catch (err) { next(err); }
});

// GET /api/weather/safety?lat=10.3157&lng=123.8854
router.get('/safety', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    const assessment = await getSafetyAssessment(parseFloat(lat), parseFloat(lng));
    res.json({ assessment });
  } catch (err) { next(err); }
});

module.exports = router;
