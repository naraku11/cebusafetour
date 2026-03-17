const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Incident = sequelize.define('Incident', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: {
    type: DataTypes.ENUM('medical', 'fire', 'crime', 'natural_disaster', 'lost_person'),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  nearestLandmark: { type: DataTypes.STRING },
  reportedBy: { type: DataTypes.UUID }, // user ID
  reporterContact: { type: DataTypes.STRING },
  status: {
    type: DataTypes.ENUM('new', 'in_progress', 'resolved'),
    defaultValue: 'new',
  },
  assignedTo: { type: DataTypes.STRING }, // agency / responder
  responderNotes: { type: DataTypes.TEXT },
  resolvedAt: { type: DataTypes.DATE },
  attachments: { type: DataTypes.JSONB, defaultValue: [] }, // photo URLs
}, {
  tableName: 'incidents',
  timestamps: true,
});

module.exports = Incident;
