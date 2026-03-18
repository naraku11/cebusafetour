const prisma = require('../config/prisma');
const { sendPushToAll } = require('../services/fcmService');
const { suggestAdvisory } = require('../services/aiService');
const socket = require('../services/socketService');

exports.list = async (req, res, next) => {
  try {
    const { status = 'active', severity, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [advisories, total] = await prisma.$transaction([
      prisma.advisory.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.advisory.count({ where }),
    ]);

    // Sort: critical → warning → advisory
    const order = { critical: 0, warning: 1, advisory: 2 };
    advisories.sort((a, b) => order[a.severity] - order[b.severity]);

    res.json({ advisories, total });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const advisory = await prisma.advisory.findUnique({ where: { id: req.params.id } });
    if (!advisory) return res.status(404).json({ error: 'Advisory not found' });
    res.json({ advisory });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, severity, source, affectedArea, recommendedActions, startDate, endDate } = req.body;

    const advisory = await prisma.advisory.create({
      data: {
        title,
        description,
        severity,
        source: source || 'admin',
        affectedArea: affectedArea || {},
        recommendedActions: recommendedActions || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: req.user.id,
      },
    });

    await sendPushToAll({
      title: `[${advisory.severity.toUpperCase()}] ${advisory.title}`,
      body: advisory.description.substring(0, 120),
      data: { type: 'advisory', advisoryId: advisory.id, severity: advisory.severity },
    });

    await prisma.advisory.update({
      where: { id: advisory.id },
      data: { notificationSent: true },
    });

    socket.emitToAll('advisory:new', { advisory });
    res.status(201).json({ advisory });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await prisma.advisory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });

    // Whitelist only updatable fields — never pass id, createdAt, notificationSent, acknowledgedBy
    const { title, description, severity, source, affectedArea, recommendedActions, startDate, endDate, status, reNotify } = req.body;

    const data = {};
    if (title !== undefined)               data.title = title;
    if (description !== undefined)         data.description = description;
    if (severity !== undefined)            data.severity = severity;
    if (source !== undefined)              data.source = source;
    if (affectedArea !== undefined)        data.affectedArea = affectedArea;
    if (recommendedActions !== undefined)  data.recommendedActions = recommendedActions;
    if (startDate !== undefined)           data.startDate = new Date(startDate);
    if (endDate !== undefined)             data.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined)              data.status = status;

    const advisory = await prisma.advisory.update({ where: { id: req.params.id }, data });

    if (reNotify) {
      await sendPushToAll({
        title: `[UPDATED] ${advisory.title}`,
        body: advisory.description.substring(0, 120),
        data: { type: 'advisory', advisoryId: advisory.id },
      });
    }

    socket.emitToAll('advisory:updated', { advisory });
    res.json({ advisory });
  } catch (err) { next(err); }
};

exports.aiSuggest = async (req, res) => {
  try {
    const { area } = req.body;
    if (!area?.trim()) return res.status(400).json({ error: 'Attraction or area name is required' });
    const suggestion = await suggestAdvisory(area.trim());
    res.json({ suggestion });
  } catch (err) {
    if (err.code === 'NO_API_KEY')    return res.status(503).json({ error: 'OpenAI API key not configured.', hint: 'Set OPENAI_API_KEY in .env' });
    if (err.code === 'OPENAI_AUTH')   return res.status(401).json({ error: err.message });
    if (err.code === 'QUOTA_EXCEEDED') return res.status(429).json({ error: err.message, hint: err.isQuota ? 'Add credits at https://platform.openai.com/settings/billing/overview' : 'Wait a few seconds and try again.' });
    if (err.code === 'OPENAI_TIMEOUT') return res.status(504).json({ error: err.message });
    if (err instanceof SyntaxError)      return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
    return res.status(502).json({ error: err.message || 'AI suggestion failed' });
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const existing = await prisma.advisory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });
    const resolved = await prisma.advisory.update({ where: { id: req.params.id }, data: { status: 'resolved' } });
    socket.emitToAll('advisory:updated', { advisory: resolved });
    res.json({ message: 'Advisory resolved' });
  } catch (err) { next(err); }
};

exports.archive = async (req, res, next) => {
  try {
    const existing = await prisma.advisory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });
    const archived = await prisma.advisory.update({ where: { id: req.params.id }, data: { status: 'archived' } });
    socket.emitToAll('advisory:updated', { advisory: archived });
    res.json({ message: 'Advisory archived' });
  } catch (err) { next(err); }
};

exports.unarchive = async (req, res, next) => {
  try {
    const existing = await prisma.advisory.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });
    const restored = await prisma.advisory.update({ where: { id: req.params.id }, data: { status: 'resolved' } });
    socket.emitToAll('advisory:updated', { advisory: restored });
    res.json({ message: 'Advisory restored to resolved' });
  } catch (err) { next(err); }
};
