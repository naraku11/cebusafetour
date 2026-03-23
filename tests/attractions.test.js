const request = require('supertest');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockUser, mockAdmin, mockAttraction, resetMocks } = require('./helpers/mocks');

describe('Attractions API', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── GET /api/attractions ─────────────────────────────────────────────────

  describe('GET /api/attractions', () => {
    it('should list attractions with pagination', async () => {
      const attractions = [mockAttraction(), mockAttraction({ id: 'attraction-2', name: 'Test Mountain' })];
      mockDb.findMany.mockResolvedValueOnce(attractions);
      mockDb.findOne.mockResolvedValueOnce({ n: 2 });

      const res = await request(app).get('/api/attractions');

      expect(res.status).toBe(200);
      expect(res.body.attractions).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
    });

    it('should filter by category', async () => {
      mockDb.findMany.mockResolvedValueOnce([mockAttraction()]);
      mockDb.findOne.mockResolvedValueOnce({ n: 1 });

      const res = await request(app).get('/api/attractions?category=beach');

      expect(res.status).toBe(200);
      expect(mockDb.findMany).toHaveBeenCalled();
    });

    it('should filter by search term', async () => {
      mockDb.findMany.mockResolvedValueOnce([]);
      mockDb.findOne.mockResolvedValueOnce({ n: 0 });

      const res = await request(app).get('/api/attractions?search=beach');

      expect(res.status).toBe(200);
      expect(res.body.attractions).toHaveLength(0);
    });
  });

  // ── GET /api/attractions/:id ─────────────────────────────────────────────

  describe('GET /api/attractions/:id', () => {
    it('should return attraction by id', async () => {
      const attraction = mockAttraction();
      mockDb.findOne.mockResolvedValueOnce(attraction);
      mockDb.run.mockResolvedValueOnce({}); // visit increment

      const res = await request(app).get('/api/attractions/attraction-1');

      expect(res.status).toBe(200);
      expect(res.body.attraction.id).toBe('attraction-1');
    });

    it('should return 404 for non-existent attraction', async () => {
      mockDb.findOne.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/attractions/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Attraction not found');
    });
  });

  // ── GET /api/attractions/nearby ──────────────────────────────────────────

  describe('GET /api/attractions/nearby', () => {
    it('should return nearby attractions', async () => {
      mockDb.findMany.mockResolvedValueOnce([mockAttraction({ distance: 2.5 })]);

      const res = await request(app).get('/api/attractions/nearby?lat=10.3157&lng=123.8854&radius=10');

      expect(res.status).toBe(200);
      expect(res.body.attractions).toBeDefined();
    });
  });

  // ── POST /api/attractions (admin) ────────────────────────────────────────

  describe('POST /api/attractions', () => {
    it('should create attraction as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)           // authenticate
        .mockResolvedValueOnce(mockAttraction()); // re-fetch created
      mockDb.run.mockResolvedValueOnce({ affectedRows: 1 });

      const res = await request(app)
        .post('/api/attractions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Beach',
          category: 'beach',
          latitude: 10.3,
          longitude: 123.9,
        });

      expect(res.status).toBe(201);
      expect(res.body.attraction).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/attractions')
        .send({ name: 'New Beach', category: 'beach' });

      expect(res.status).toBe(401);
    });

    it('should reject non-admin user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/attractions')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'New Beach', category: 'beach' });

      expect(res.status).toBe(403);
    });
  });

  // ── PUT /api/attractions/:id (admin) ─────────────────────────────────────

  describe('PUT /api/attractions/:id', () => {
    it('should update attraction as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      const attraction = mockAttraction();
      mockDb.findOne
        .mockResolvedValueOnce(admin)       // authenticate
        .mockResolvedValueOnce(attraction)  // existing check
        .mockResolvedValueOnce({ ...attraction, name: 'Updated Beach' }); // re-fetch
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .put('/api/attractions/attraction-1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Beach' });

      expect(res.status).toBe(200);
      expect(res.body.attraction).toBeDefined();
    });

    it('should return 404 for non-existent attraction', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)  // authenticate
        .mockResolvedValueOnce(null);  // not found

      const res = await request(app)
        .put('/api/attractions/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/attractions/:id (archive) ────────────────────────────────

  describe('DELETE /api/attractions/:id', () => {
    it('should archive attraction as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'attraction-1' });
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/attractions/attraction-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Attraction archived');
    });

    it('should reject tourist user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .delete('/api/attractions/attraction-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/attractions/:id/permanent (admin_super only) ─────────────

  describe('DELETE /api/attractions/:id/permanent', () => {
    it('should permanently delete as admin_super', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'attraction-1' });
      mockDb.run.mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/attractions/attraction-1/permanent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Attraction permanently deleted');
    });

    it('should reject admin_content from permanent delete', async () => {
      const admin = mockAdmin({ role: 'admin_content' });
      const token = generateTestToken({ id: admin.id, role: 'admin_content' });
      mockDb.findOne.mockResolvedValueOnce(admin);

      const res = await request(app)
        .delete('/api/attractions/attraction-1/permanent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
