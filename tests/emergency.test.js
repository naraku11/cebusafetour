const request = require('supertest');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockUser, mockAdmin, mockIncident, resetMocks } = require('./helpers/mocks');

describe('Emergency API', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── GET /api/emergency/services ──────────────────────────────────────────

  describe('GET /api/emergency/services', () => {
    it('should return all emergency services without location', async () => {
      const res = await request(app).get('/api/emergency/services');

      expect(res.status).toBe(200);
      expect(res.body.services).toBeDefined();
      expect(res.body.services.hospitals).toBeDefined();
      expect(res.body.services.police).toBeDefined();
      expect(res.body.services.fire).toBeDefined();
      expect(res.body.services.redCross).toBeDefined();
      expect(res.body.services.cdrrmo).toBeDefined();
      expect(res.body.services.coastGuard).toBeDefined();
    });

    it('should filter services by location and radius', async () => {
      const res = await request(app)
        .get('/api/emergency/services?lat=10.3157&lng=123.8854&radius=5');

      expect(res.status).toBe(200);
      // All returned services should have distance property
      for (const category of Object.values(res.body.services)) {
        for (const service of category) {
          expect(service.distance).toBeDefined();
          expect(service.distance).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should include distance when lat/lng provided', async () => {
      const res = await request(app)
        .get('/api/emergency/services?lat=10.3157&lng=123.8854');

      expect(res.status).toBe(200);
      const hospitals = res.body.services.hospitals;
      if (hospitals.length > 0) {
        expect(typeof hospitals[0].distance).toBe('number');
      }
    });

    it('should sort by distance when location provided', async () => {
      const res = await request(app)
        .get('/api/emergency/services?lat=10.3157&lng=123.8854');

      expect(res.status).toBe(200);
      const hospitals = res.body.services.hospitals;
      for (let i = 1; i < hospitals.length; i++) {
        expect(hospitals[i].distance).toBeGreaterThanOrEqual(hospitals[i - 1].distance);
      }
    });
  });

  // ── POST /api/emergency/incidents ────────────────────────────────────────

  describe('POST /api/emergency/incidents', () => {
    it('should report incident as authenticated user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      const incident = mockIncident();
      mockDb.findOne
        .mockResolvedValueOnce(user)      // authenticate
        .mockResolvedValueOnce(incident); // re-fetch
      mockDb.run.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await request(app)
        .post('/api/emergency/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'medical',
          description: 'Someone needs help',
          latitude: 10.3157,
          longitude: 123.8854,
          nearestLandmark: 'Near the beach',
        });

      expect(res.status).toBe(201);
      expect(res.body.incident).toBeDefined();
      expect(res.body.message).toMatch(/Help is on the way/);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/emergency/incidents')
        .send({ type: 'medical', latitude: 10.3, longitude: 123.9 });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/emergency/incidents/mine ────────────────────────────────────

  describe('GET /api/emergency/incidents/mine', () => {
    it('should return user\'s incidents', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);
      mockDb.findMany.mockResolvedValueOnce([mockIncident()]);

      const res = await request(app)
        .get('/api/emergency/incidents/mine')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.incidents).toHaveLength(1);
    });
  });

  // ── GET /api/emergency/incidents (admin) ─────────────────────────────────

  describe('GET /api/emergency/incidents', () => {
    it('should list incidents as admin', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ n: 1 });
      mockDb.findMany.mockResolvedValueOnce([mockIncident()]);

      const res = await request(app)
        .get('/api/emergency/incidents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.incidents).toBeDefined();
    });

    it('should reject tourist from admin incident list', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/emergency/incidents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── GET /api/emergency/incidents/:id (admin) ────────────────────────────

  describe('GET /api/emergency/incidents/:id', () => {
    it('should return incident detail as admin', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce(mockIncident());

      const res = await request(app)
        .get('/api/emergency/incidents/incident-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.incident.id).toBe('incident-1');
    });

    it('should return 404 for non-existent incident', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/emergency/incidents/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /api/emergency/incidents/:id (admin) ──────────────────────────

  describe('PATCH /api/emergency/incidents/:id', () => {
    it('should update incident as admin', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'incident-1' })
        .mockResolvedValueOnce(mockIncident({ status: 'in_progress' }));
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/emergency/incidents/incident-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress', assignedTo: 'Officer A' });

      expect(res.status).toBe(200);
      expect(res.body.incident).toBeDefined();
    });
  });

  // ── PATCH /api/emergency/incidents/:id/archive (admin_super) ────────────

  describe('PATCH /api/emergency/incidents/:id/archive', () => {
    it('should archive incident as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'incident-1' })
        .mockResolvedValueOnce(mockIncident({ status: 'archived' }));
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/emergency/incidents/incident-1/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Incident archived');
    });

    it('should reject admin_emergency from archiving', async () => {
      const admin = mockAdmin({ role: 'admin_emergency' });
      const token = generateTestToken({ id: admin.id, role: 'admin_emergency' });
      mockDb.findOne.mockResolvedValueOnce(admin);

      const res = await request(app)
        .patch('/api/emergency/incidents/incident-1/archive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── PATCH /api/emergency/incidents/:id/unarchive (admin_super) ──────────

  describe('PATCH /api/emergency/incidents/:id/unarchive', () => {
    it('should unarchive incident as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'incident-1' })
        .mockResolvedValueOnce(mockIncident({ status: 'resolved' }));
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .patch('/api/emergency/incidents/incident-1/unarchive')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Incident unarchived');
    });
  });
});
