const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Attraction = sequelize.define('Attraction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: {
    type: DataTypes.ENUM('beach', 'mountain', 'heritage', 'museum', 'park', 'waterfall', 'market', 'church', 'resort', 'other'),
    allowNull: false,
  },
  description: { type: DataTypes.TEXT },
  district: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  photos: { type: DataTypes.JSONB, defaultValue: [] }, // array of URLs
  operatingHours: { type: DataTypes.JSONB, defaultValue: {} }, // { mon: '8am-5pm', ... }
  entranceFee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  contactInfo: { type: DataTypes.JSONB, defaultValue: {} }, // { phone, email, website }
  safetyStatus: {
    type: DataTypes.ENUM('safe', 'caution', 'restricted'),
    defaultValue: 'safe',
  },
  crowdLevel: {
    type: DataTypes.ENUM('low', 'moderate', 'high'),
    defaultValue: 'low',
  },
  accessibilityFeatures: { type: DataTypes.JSONB, defaultValue: [] },
  nearbyFacilities: {
    type: DataTypes.JSONB,
    defaultValue: {},
    // { hospitals: [], police: [], fire: [] }
  },
  averageRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  totalReviews: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalVisits: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalSaves: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('published', 'draft', 'archived'),
    defaultValue: 'draft',
  },
  createdBy: { type: DataTypes.UUID },
}, {
  tableName: 'attractions',
  timestamps: true,
});

module.exports = Attraction;
