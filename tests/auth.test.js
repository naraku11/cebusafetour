const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockUser, resetMocks } = require('./helpers/mocks');

describe('Auth API', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── POST /api/auth/register ──────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      mockDb.findOne.mockResolvedValueOnce(null); // no existing user
      mockDb.run.mockResolvedValueOnce({ affectedRows: 1 }); // insert user

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'john@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Account created/);
      expect(res.body.userId).toBeDefined();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it('should reject duplicate email', async () => {
      mockDb.findOne.mockResolvedValueOnce({ id: 'existing-id' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'john@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'john@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'John', email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/login ─────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const hashed = await bcrypt.hash('password123', 12);
      const user = mockUser({ password: hashed, isVerified: true });
      mockDb.findOne.mockResolvedValueOnce(user);
      mockDb.run.mockResolvedValueOnce({}); // update last_active

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject wrong password', async () => {
      const hashed = await bcrypt.hash('password123', 12);
      mockDb.findOne.mockResolvedValueOnce(mockUser({ password: hashed }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should reject non-existent user', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
    });

    it('should reject unverified user', async () => {
      const hashed = await bcrypt.hash('password123', 12);
      mockDb.findOne.mockResolvedValueOnce(mockUser({ password: hashed, isVerified: false }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/verify your email/);
    });

    it('should reject suspended user', async () => {
      const hashed = await bcrypt.hash('password123', 12);
      mockDb.findOne.mockResolvedValueOnce(mockUser({ password: hashed, isVerified: true, status: 'suspended' }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/suspended/i);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/verify-otp ────────────────────────────────────────────

  describe('POST /api/auth/verify-otp', () => {
    it('should reject invalid OTP format', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '12' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/auth/forgot-password ───────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('should send reset OTP for existing user', async () => {
      mockDb.findOne.mockResolvedValueOnce({ id: 'user-1', name: 'Test' });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/OTP sent/i);
    });

    it('should return 404 for non-existent user', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/auth/me ─────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return authenticated user profile', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.fcmToken).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/auth/fcm-token ────────────────────────────────────────────

  describe('PATCH /api/auth/fcm-token', () => {
    it('should update FCM token', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/auth/fcm-token')
        .set('Authorization', `Bearer ${token}`)
        .send({ fcmToken: 'new-fcm-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('FCM token updated');
    });
  });

  // ── POST /api/auth/resend-otp ────────────────────────────────────────────

  describe('POST /api/auth/resend-otp', () => {
    it('should reject already verified user', async () => {
      mockDb.findOne.mockResolvedValueOnce(mockUser({ isVerified: true }));

      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already verified/i);
    });

    it('should return 404 for non-existent email', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'nobody@example.com' });

      expect(res.status).toBe(404);
    });
  });
});
