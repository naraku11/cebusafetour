const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM('safety_alert', 'advisory', 'trip_reminder', 'announcement', 'emergency'),
    allowNull: false,
  },
  priority: { type: DataTypes.ENUM('normal', 'high'), defaultValue: 'normal' },
  target: {
    type: DataTypes.JSONB,
    defaultValue: { type: 'all' },
    // { type: 'all'|'location'|'nationality'|'specific', value: ... }
  },
  scheduledAt: { type: DataTypes.DATE },
  sentAt: { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending',
  },
  createdBy: { type: DataTypes.UUID },
  relatedId: { type: DataTypes.UUID }, // advisory or incident ID
  relatedType: { type: DataTypes.STRING }, // 'advisory' | 'incident'
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
