const request = require('supertest');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockAdmin, mockUser, mockAdvisory, resetMocks } = require('./helpers/mocks');

describe('Advisories API', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── GET /api/advisories ──────────────────────────────────────────────────

  describe('GET /api/advisories', () => {
    it('should list active advisories', async () => {
      const advisories = [
        mockAdvisory({ severity: 'critical' }),
        mockAdvisory({ id: 'advisory-2', severity: 'advisory' }),
      ];
      mockDb.findMany.mockResolvedValueOnce(advisories);
      mockDb.findOne.mockResolvedValueOnce({ n: 2 });

      const res = await request(app).get('/api/advisories');

      expect(res.status).toBe(200);
      expect(res.body.advisories).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter by severity', async () => {
      mockDb.findMany.mockResolvedValueOnce([mockAdvisory()]);
      mockDb.findOne.mockResolvedValueOnce({ n: 1 });

      const res = await request(app).get('/api/advisories?severity=warning');

      expect(res.status).toBe(200);
    });
  });

  // ── GET /api/advisories/:id ──────────────────────────────────────────────

  describe('GET /api/advisories/:id', () => {
    it('should return advisory by id', async () => {
      mockDb.findOne.mockResolvedValueOnce(mockAdvisory());

      const res = await request(app).get('/api/advisories/advisory-1');

      expect(res.status).toBe(200);
      expect(res.body.advisory.id).toBe('advisory-1');
    });

    it('should return 404 for non-existent advisory', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/advisories/non-existent');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/advisories (admin) ─────────────────────────────────────────

  describe('POST /api/advisories', () => {
    it('should create advisory as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      const advisory = mockAdvisory();
      mockDb.findOne
        .mockResolvedValueOnce(admin)     // authenticate
        .mockResolvedValueOnce(advisory); // re-fetch
      mockDb.run
        .mockResolvedValueOnce({})  // insert
        .mockResolvedValueOnce({}); // update notification_sent

      const res = await request(app)
        .post('/api/advisories')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'New Advisory',
          description: 'Be careful',
          severity: 'warning',
          startDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.advisory).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/advisories')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test', description: 'Test', severity: 'warning', startDate: new Date().toISOString() });

      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/advisories/:id (admin) ──────────────────────────────────────

  describe('PUT /api/advisories/:id', () => {
    it('should update advisory as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)            // authenticate
        .mockResolvedValueOnce({ id: 'adv-1' })  // existing check
        .mockResolvedValueOnce(mockAdvisory({ title: 'Updated' })); // re-fetch
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .put('/api/advisories/adv-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.advisory).toBeDefined();
    });
  });

  // ── PATCH /api/advisories/:id/resolve ────────────────────────────────────

  describe('PATCH /api/advisories/:id/resolve', () => {
    it('should resolve advisory as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'adv-1' }) // existing
        .mockResolvedValueOnce(mockAdvisory({ status: 'resolved' })); // re-fetch
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/advisories/adv-1/resolve')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Advisory resolved');
    });

    it('should return 404 for non-existent advisory', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/advisories/non-existent/resolve')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/advisories/:id/archive ────────────────────────────────────

  describe('PATCH /api/advisories/:id/archive', () => {
    it('should archive advisory as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'adv-1' })
        .mockResolvedValueOnce(mockAdvisory({ status: 'archived' }));
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/advisories/adv-1/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Advisory archived');
    });

    it('should reject admin_content from archiving', async () => {
      const admin = mockAdmin({ role: 'admin_content' });
      const token = generateTestToken({ id: admin.id, role: 'admin_content' });
      mockDb.findOne.mockResolvedValueOnce(admin);

      const res = await request(app)
        .patch('/api/advisories/adv-1/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/advisories/:id/unarchive ──────────────────────────────────

  describe('PATCH /api/advisories/:id/unarchive', () => {
    it('should unarchive advisory as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'adv-1' })
        .mockResolvedValueOnce(mockAdvisory({ status: 'resolved' }));
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/advisories/adv-1/unarchive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Advisory restored to resolved');
    });
  });
});
