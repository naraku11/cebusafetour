const { v4: uuidv4 } = require('uuid');
const db     = require('../config/db');
const logger = require('../utils/logger');
const { sendPushToTopic } = require('../services/fcmService');
const { suggestAdvisory } = require('../services/aiService');
const socket = require('../services/socketService');

// Insert a mirrored row in the notifications table so the advisory appears
// in the mobile notifications screen via GET /notifications/public.
const _insertAdvisoryNotification = async (advisory, createdBy) => {
  const notifId = uuidv4();
  const now     = new Date();
  const priority = advisory.severity === 'critical' ? 'high' : 'normal';
  await db.run(
    `INSERT INTO notifications
       (id, title, body, type, priority, target, scheduled_at, sent_at, status,
        related_id, related_type, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'advisory', ?, '{"type":"all"}', NULL, ?, 'sent', ?, 'advisory', ?, ?, ?)`,
    [
      notifId,
      `[${advisory.severity.toUpperCase()}] ${advisory.title}`,
      advisory.description.substring(0, 200),
      priority,
      now,
      advisory.id,
      createdBy,
      now, now,
    ]
  );
  return notifId;
};

// Parse JSON string fields on rows coming out of the DB (stored as TEXT)
const _parseAdvisory = (a) => {
  if (!a) return a;
  if (typeof a.acknowledgedBy === 'string') {
    try { a.acknowledgedBy = JSON.parse(a.acknowledgedBy); } catch { a.acknowledgedBy = []; }
  }
  if (!Array.isArray(a.acknowledgedBy)) a.acknowledgedBy = [];
  if (typeof a.affectedArea === 'string') {
    try { a.affectedArea = JSON.parse(a.affectedArea); } catch { a.affectedArea = {}; }
  }
  return a;
};

// Columns for advisory list — all columns are small, keep full set
const ADVISORY_LIST_COLS = `id, title, description, severity, source, affected_area,
  recommended_actions, start_date, end_date, status, notification_sent,
  acknowledged_by, created_by, created_at, updated_at`;

exports.list = async (req, res, next) => {
  try {
    const { status = 'active', severity, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const conditions = [];
    const params     = [];

    if (status)   { conditions.push('status = ?');   params.push(status); }
    if (severity) { conditions.push('severity = ?'); params.push(severity); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [advisories, countRow] = await Promise.all([
      db.findMany(
        `SELECT ${ADVISORY_LIST_COLS} FROM advisories ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, take, skip]
      ),
      db.findOne(`SELECT COUNT(*) as n FROM advisories ${where}`, params),
    ]);

    // Sort: critical → warning → advisory
    const order = { critical: 0, warning: 1, advisory: 2 };
    advisories.sort((a, b) => order[a.severity] - order[b.severity]);

    res.json({ advisories: advisories.map(_parseAdvisory), total: countRow.n });
  } catch (err) { next(err); }
};

exports.get = async (req, res, next) => {
  try {
    const advisory = await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [req.params.id]);
    if (!advisory) return res.status(404).json({ error: 'Advisory not found' });
    res.json({ advisory: _parseAdvisory(advisory) });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, severity, source, affectedArea, recommendedActions, startDate, endDate } = req.body;

    const id  = uuidv4();
    const now = new Date();
    await db.run(
      `INSERT INTO advisories
         (id, title, description, severity, source, affected_area, recommended_actions,
          start_date, end_date, status, notification_sent, acknowledged_by, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0, '[]', ?, ?, ?)`,
      [
        id, title, description, severity,
        source || 'admin',
        JSON.stringify(affectedArea || {}),
        recommendedActions || null,
        new Date(startDate),
        endDate ? new Date(endDate) : null,
        req.user.id,
        now, now,
      ]
    );

    const advisory = _parseAdvisory(await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [id]));

    socket.emitToAll('advisory:new', { advisory });
    res.status(201).json({ advisory });

    // Fire-and-forget: mirror into notifications table, send push to ALL installs via topic
    _insertAdvisoryNotification(advisory, req.user.id)
      .then(notifId => sendPushToTopic('cebu_safety_advisories', {
        title: `[${advisory.severity.toUpperCase()}] ${advisory.title}`,
        body:  advisory.description.substring(0, 120),
        data:  { type: 'advisory', advisoryId: advisory.id, severity: advisory.severity, notificationId: notifId },
      }))
      .then(() => db.run('UPDATE advisories SET notification_sent = 1 WHERE id = ?', [id]))
      .catch(err => logger.warn('Advisory push failed:', err.message));
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM advisories WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });

    const { title, description, severity, source, affectedArea, recommendedActions, startDate, endDate, status, reNotify } = req.body;

    const sets   = [];
    const params = [];

    if (title              !== undefined) { sets.push('title = ?');               params.push(title); }
    if (description        !== undefined) { sets.push('description = ?');         params.push(description); }
    if (severity           !== undefined) { sets.push('severity = ?');            params.push(severity); }
    if (source             !== undefined) { sets.push('source = ?');              params.push(source); }
    if (affectedArea       !== undefined) { sets.push('affected_area = ?');       params.push(JSON.stringify(affectedArea)); }
    if (recommendedActions !== undefined) { sets.push('recommended_actions = ?'); params.push(recommendedActions); }
    if (startDate          !== undefined) { sets.push('start_date = ?');          params.push(new Date(startDate)); }
    if (endDate            !== undefined) { sets.push('end_date = ?');            params.push(endDate ? new Date(endDate) : null); }
    if (status             !== undefined) { sets.push('status = ?');              params.push(status); }

    if (sets.length) {
      sets.push('updated_at = ?');
      params.push(new Date(), req.params.id);
      await db.run(`UPDATE advisories SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const advisory = _parseAdvisory(await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [req.params.id]));

    if (reNotify) {
      await sendPushToTopic('cebu_safety_advisories', {
        title: `[UPDATED] ${advisory.title}`,
        body:  advisory.description.substring(0, 120),
        data:  { type: 'advisory', advisoryId: advisory.id },
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
    if (err.code === 'NO_API_KEY')     return res.status(503).json({ error: 'OpenAI API key not configured.', hint: 'Set OPENAI_API_KEY in .env' });
    if (err.code === 'OPENAI_AUTH')    return res.status(401).json({ error: err.message });
    if (err.code === 'QUOTA_EXCEEDED') return res.status(429).json({ error: err.message, hint: err.isQuota ? 'Add credits at https://platform.openai.com/settings/billing/overview' : 'Wait a few seconds and try again.' });
    if (err.code === 'OPENAI_TIMEOUT') return res.status(504).json({ error: err.message });
    if (err instanceof SyntaxError)    return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
    return res.status(502).json({ error: err.message || 'AI suggestion failed' });
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const result = await db.run("UPDATE advisories SET status = 'resolved', updated_at = ? WHERE id = ?", [new Date(), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Advisory not found' });
    const resolved = _parseAdvisory(await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [req.params.id]));
    socket.emitToAll('advisory:updated', { advisory: resolved });
    res.json({ message: 'Advisory resolved' });
  } catch (err) { next(err); }
};

exports.archive = async (req, res, next) => {
  try {
    const result = await db.run("UPDATE advisories SET status = 'archived', updated_at = ? WHERE id = ?", [new Date(), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Advisory not found' });
    const archived = _parseAdvisory(await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [req.params.id]));
    socket.emitToAll('advisory:updated', { advisory: archived });
    res.json({ message: 'Advisory archived' });
  } catch (err) { next(err); }
};

exports.unarchive = async (req, res, next) => {
  try {
    const result = await db.run("UPDATE advisories SET status = 'resolved', updated_at = ? WHERE id = ?", [new Date(), req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Advisory not found' });
    const restored = _parseAdvisory(await db.findOne('SELECT * FROM advisories WHERE id = ? LIMIT 1', [req.params.id]));
    socket.emitToAll('advisory:updated', { advisory: restored });
    res.json({ message: 'Advisory restored to resolved' });
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const existing = await db.findOne('SELECT id FROM advisories WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Advisory not found' });

    // Also remove the mirrored notification record (created when advisory was published)
    await Promise.all([
      db.run('DELETE FROM advisories WHERE id = ?', [req.params.id]),
      db.run("DELETE FROM notifications WHERE related_id = ? AND related_type = 'advisory'", [req.params.id]),
    ]);

    socket.emitToAll('advisory:deleted', { advisoryId: req.params.id });
    res.json({ message: 'Advisory deleted' });
  } catch (err) { next(err); }
};

exports.acknowledge = async (req, res, next) => {
  try {
    const advisory = _parseAdvisory(await db.findOne(
      'SELECT id, acknowledged_by FROM advisories WHERE id = ? LIMIT 1',
      [req.params.id]
    ));
    if (!advisory) return res.status(404).json({ error: 'Advisory not found' });

    const list = Array.isArray(advisory.acknowledgedBy) ? advisory.acknowledgedBy : [];
    const userId = req.user.id;
    const already = list.includes(userId);

    if (!already) {
      list.push(userId);
      await db.run(
        'UPDATE advisories SET acknowledged_by = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(list), new Date(), req.params.id]
      );
      // Emit real-time count update to admin panel
      socket.emitToAdmins('advisory:acknowledged', { advisoryId: req.params.id, count: list.length });
    }

    res.json({ acknowledged: true, count: list.length });
  } catch (err) { next(err); }
};
