const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING, allowNull: false },
  nationality: { type: DataTypes.STRING },
  contactNumber: { type: DataTypes.STRING },
  role: {
    type: DataTypes.ENUM('tourist', 'admin_super', 'admin_content', 'admin_emergency'),
    defaultValue: 'tourist',
  },
  status: { type: DataTypes.ENUM('active', 'suspended', 'banned'), defaultValue: 'active' },
  fcmToken: { type: DataTypes.STRING },
  language: {
    type: DataTypes.ENUM('en', 'fil', 'zh', 'ko', 'ja'),
    defaultValue: 'en',
  },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastActive: { type: DataTypes.DATE },
  emergencyContacts: {
    type: DataTypes.JSONB,
    defaultValue: [],
    // [{ name, relationship, phone }]
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
