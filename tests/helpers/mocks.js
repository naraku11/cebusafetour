const jwt = require('jsonwebtoken');

// ── Mock database ────────────────────────────────────────────────────────────
const mockDb = {
  findOne: jest.fn(),
  findMany: jest.fn(),
  run: jest.fn(),
  execute: jest.fn(),
  getConnection: jest.fn().mockResolvedValue({ release: jest.fn() }),
  end: jest.fn(),
};

// ── Mock Firebase ────────────────────────────────────────────────────────────
const mockFirestore = {
  collection: jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      set: jest.fn().mockResolvedValue({}),
    }),
  }),
};

// ── Setup all jest mocks ─────────────────────────────────────────────────────
function setupMocks() {
  // DB
  jest.mock('../../src/config/db', () => mockDb);

  // Firebase
  jest.mock('../../src/config/firebase', () => ({
    initFirebase: jest.fn(),
    getFirestore: jest.fn(() => mockFirestore),
    getMessaging: jest.fn(),
    getAuth: jest.fn(),
  }));

  // FCM service
  jest.mock('../../src/services/fcmService', () => ({
    sendPushToAll: jest.fn().mockResolvedValue({}),
    sendPushToUsers: jest.fn().mockResolvedValue({}),
    sendPushToAdmins: jest.fn().mockResolvedValue({}),
    sendPushToArea: jest.fn().mockResolvedValue({}),
  }));

  // Email service
  jest.mock('../../src/services/emailService', () => ({
    sendOtpEmail: jest.fn().mockResolvedValue({}),
  }));

  // Socket service
  jest.mock('../../src/services/socketService', () => ({
    init: jest.fn(),
    getIo: jest.fn(),
    emitToAdmins: jest.fn(),
    emitToTourists: jest.fn(),
    emitToAll: jest.fn(),
    emitToUser: jest.fn(),
  }));

  // AI service
  jest.mock('../../src/services/aiService', () => ({
    suggestByCoords: jest.fn(),
    suggestAdvisory: jest.fn(),
    autocompletePlaces: jest.fn(),
    getPlaceInfo: jest.fn(),
    verifyProfilePicture: jest.fn(),
  }));

  // Places service
  jest.mock('../../src/services/placesService', () => ({
    fetchPlacePhotos: jest.fn().mockResolvedValue([]),
  }));

  // Logger — silence output during tests
  jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a valid JWT for testing */
function generateTestToken(payload = {}) {
  const defaults = { id: 'test-user-id', role: 'tourist' };
  return jwt.sign({ ...defaults, ...payload }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/** Create a mock user object */
function mockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: '$2a$12$hashedpassword',
    nationality: 'Filipino',
    contactNumber: '+639123456789',
    role: 'tourist',
    status: 'active',
    isVerified: true,
    fcmToken: null,
    language: 'en',
    profilePicture: null,
    profilePictureVerified: null,
    lastActive: new Date(),
    emergencyContacts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Create a mock admin user */
function mockAdmin(overrides = {}) {
  return mockUser({ id: 'admin-user-id', name: 'Admin User', email: 'admin@example.com', role: 'admin_super', ...overrides });
}

/** Create a mock attraction */
function mockAttraction(overrides = {}) {
  return {
    id: 'attraction-1',
    name: 'Test Beach',
    category: 'beach',
    description: 'A beautiful beach',
    district: 'Cebu City',
    address: '123 Beach Rd',
    latitude: 10.3157,
    longitude: 123.8854,
    photos: ['photo1.jpg'],
    operatingHours: { open: '08:00', close: '17:00' },
    entranceFee: 100,
    contactInfo: { phone: '123-456' },
    safetyStatus: 'safe',
    crowdLevel: 'low',
    accessibilityFeatures: [],
    nearbyFacilities: {},
    averageRating: 4.5,
    totalReviews: 10,
    totalVisits: 100,
    totalSaves: 5,
    status: 'published',
    createdBy: 'admin-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Create a mock advisory */
function mockAdvisory(overrides = {}) {
  return {
    id: 'advisory-1',
    title: 'Test Advisory',
    description: 'Stay safe during the typhoon',
    severity: 'warning',
    source: 'admin',
    affectedArea: { name: 'Cebu City' },
    recommendedActions: 'Stay indoors',
    startDate: new Date(),
    endDate: null,
    status: 'active',
    notificationSent: true,
    acknowledgedBy: [],
    createdBy: 'admin-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Create a mock incident */
function mockIncident(overrides = {}) {
  return {
    id: 'incident-1',
    type: 'medical',
    description: 'Someone needs help',
    latitude: 10.3157,
    longitude: 123.8854,
    nearestLandmark: 'Near the beach',
    reportedBy: 'test-user-id',
    reporterContact: '+639123456789',
    status: 'new',
    assignedTo: null,
    responderNotes: null,
    attachments: [],
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Reset all mock function calls and flush in-memory cache */
function resetMocks() {
  Object.values(mockDb).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
  // Flush the auth-user cache so cached users don't bleed between tests
  const cache = require('../../src/utils/cache');
  cache.flushAll();
}

module.exports = {
  mockDb,
  mockFirestore,
  setupMocks,
  generateTestToken,
  mockUser,
  mockAdmin,
  mockAttraction,
  mockAdvisory,
  mockIncident,
  resetMocks,
};
