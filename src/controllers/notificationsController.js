const prisma = require('../config/prisma');
const { sendPushToAll, sendPushToUsers } = require('../services/fcmService');
const socket = require('../services/socketService');

exports.send = async (req, res, next) => {
  try {
    const { title, body, type, priority = 'normal', target, scheduledAt } = req.body;

    const notification = await prisma.notification.create({
      data: {
        title, body, type, priority, target,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        createdBy: req.user.id,
      },
    });

    if (!scheduledAt) await dispatchNotification(notification);

    socket.emitToAdmins('notification:new', { notification });
    res.status(201).json({
      notification,
      message: scheduledAt ? 'Notification scheduled' : 'Notification sent',
    });
  } catch (err) { next(err); }
};

exports.list = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);

    res.json({ notifications, total });
  } catch (err) { next(err); }
};

const dispatchNotification = async (notification) => {
  const { target, title, body, type, priority } = notification;
  const fcmPayload = { title, body, data: { type, priority, notificationId: notification.id } };

  try {
    if (target.type === 'all') {
      await sendPushToAll(fcmPayload);
    } else if (target.type === 'nationality') {
      const users = await prisma.user.findMany({
        where: { nationality: { contains: target.value, mode: 'insensitive' } },
        select: { fcmToken: true },
      });
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      if (tokens.length) await sendPushToUsers(tokens, fcmPayload);
    } else if (target.type === 'specific') {
      const users = await prisma.user.findMany({
        where: { id: { in: Array.isArray(target.value) ? target.value : [target.value] } },
        select: { fcmToken: true },
      });
      const tokens = users.map(u => u.fcmToken).filter(Boolean);
      if (tokens.length) await sendPushToUsers(tokens, fcmPayload);
    }
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  } catch {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'failed' },
    });
  }
};

exports.dispatchNotification = dispatchNotification;

exports.remove = async (req, res, next) => {
  try {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Notification not found' });
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
};

// Public endpoint — any authenticated user can fetch recent sent announcements
exports.listPublic = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { status: 'sent' },
      orderBy: { sentAt: 'desc' },
      take: 50,
      select: { id: true, title: true, body: true, type: true, priority: true, sentAt: true, createdAt: true },
    });
    res.json({ notifications });
  } catch (err) { next(err); }
};
