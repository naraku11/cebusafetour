const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Advisory = sequelize.define('Advisory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  severity: {
    type: DataTypes.ENUM('critical', 'warning', 'advisory'),
    allowNull: false,
  },
  source: {
    type: DataTypes.ENUM('pagasa', 'ndrrmc', 'lgu', 'cdrrmo', 'admin'),
    defaultValue: 'admin',
  },
  affectedArea: {
    type: DataTypes.JSONB,
    defaultValue: {},
    // { type: 'polygon'|'attractions', coordinates: [], attractionIds: [] }
  },
  recommendedActions: { type: DataTypes.TEXT },
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE },
  status: {
    type: DataTypes.ENUM('active', 'resolved', 'archived'),
    defaultValue: 'active',
  },
  notificationSent: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdBy: { type: DataTypes.UUID },
  acknowledgedBy: { type: DataTypes.JSONB, defaultValue: [] }, // array of user IDs
}, {
  tableName: 'advisories',
  timestamps: true,
});

module.exports = Advisory;
