const request = require('supertest');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockUser, mockAdmin, resetMocks } = require('./helpers/mocks');

describe('Middleware', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── Authentication Middleware ────────────────────────────────────────────

  describe('authenticate', () => {
    it('should reject request without Authorization header', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'NotBearer token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });

    it('should reject expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 'test', role: 'tourist' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    it('should reject token for non-existent user', async () => {
      const token = generateTestToken({ id: 'deleted-user' });
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should reject suspended user', async () => {
      const user = mockUser({ status: 'suspended' });
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should reject banned user', async () => {
      const user = mockUser({ status: 'banned' });
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Role-based Access Control ────────────────────────────────────────────

  describe('requireRole', () => {
    it('should allow admin_super to access admin routes', async () => {
      const admin = mockAdmin({ role: 'admin_super' });
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ n: 0 });
      mockDb.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow admin_content to access admin routes', async () => {
      const admin = mockAdmin({ role: 'admin_content' });
      const token = generateTestToken({ id: admin.id, role: 'admin_content' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ n: 0 });
      mockDb.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should allow admin_emergency to access emergency admin routes', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ n: 0 });
      mockDb.findMany.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/emergency/incidents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should block tourist from admin-only routes', async () => {
      const user = mockUser({ role: 'tourist' });
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Insufficient permissions');
    });

    it('should block admin_content from super-admin routes', async () => {
      const admin = mockAdmin({ role: 'admin_content' });
      const token = generateTestToken({ id: admin.id, role: 'admin_content' });
      mockDb.findOne.mockResolvedValueOnce(admin);

      const res = await request(app)
        .patch('/api/advisories/adv-1/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── Health Check ─────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return health status', async () => {
      mockDb.execute.mockResolvedValueOnce([[{ 1: 1 }]]);

      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.checks).toBeDefined();
      expect(res.body.checks.database).toBeDefined();
      expect(res.body.checks.jwt).toBeDefined();
      expect(res.body.checks.cache).toBeDefined();
    });

    it('should return 503 when database is down', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection refused'));

      const res = await request(app).get('/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.checks.database.status).toBe('error');
    });
  });
});
