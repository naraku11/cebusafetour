const request = require('supertest');
const app = require('./helpers/app');
const { mockDb, generateTestToken, mockUser, mockAdmin, mockAttraction, resetMocks } = require('./helpers/mocks');

describe('Reviews API', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ── GET /api/attractions/:id/reviews ─────────────────────────────────────

  describe('GET /api/attractions/:id/reviews', () => {
    it('should list reviews for an attraction', async () => {
      const reviewRows = [
        {
          id: 'review-1', attractionId: 'attraction-1', userId: 'user-1',
          rating: 5, comment: 'Great!', createdAt: new Date(), updatedAt: new Date(),
          uId: 'user-1', uName: 'John', uProfilePicture: null,
        },
      ];
      mockDb.findMany.mockResolvedValueOnce(reviewRows);

      const res = await request(app).get('/api/attractions/attraction-1/reviews');

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(1);
      expect(res.body.reviews[0].user).toBeDefined();
      expect(res.body.reviews[0].user.name).toBe('John');
    });

    it('should return empty array for attraction with no reviews', async () => {
      mockDb.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/attractions/attraction-1/reviews');

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(0);
    });
  });

  // ── POST /api/attractions/:id/reviews (auth) ────────────────────────────

  describe('POST /api/attractions/:id/reviews', () => {
    it('should create a review as authenticated user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne
        .mockResolvedValueOnce(user)                    // authenticate
        .mockResolvedValueOnce({ id: 'attraction-1' })  // attraction exists
        .mockResolvedValueOnce({                         // re-fetch review
          id: 'review-1', attractionId: 'attraction-1', userId: user.id,
          rating: 4, comment: 'Nice place', createdAt: new Date(), updatedAt: new Date(),
          uId: user.id, uName: user.name, uProfilePicture: null,
        })
        .mockResolvedValueOnce({ avgRating: 4.0, totalReviews: 1 }); // recalc stats
      mockDb.run
        .mockResolvedValueOnce({})  // upsert
        .mockResolvedValueOnce({}); // update attraction stats

      const res = await request(app)
        .post('/api/attractions/attraction-1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 4, comment: 'Nice place' });

      expect(res.status).toBe(200);
      expect(res.body.review).toBeDefined();
      expect(res.body.review.rating).toBe(4);
    });

    it('should reject rating outside 1-5 range', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/attractions/attraction-1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 6, comment: 'Too high' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Rating must be between 1 and 5/);
    });

    it('should reject rating of 0', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/attractions/attraction-1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 0 });

      expect(res.status).toBe(400);
    });

    it('should reject missing rating', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .post('/api/attractions/attraction-1/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ comment: 'No rating' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent attraction', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null); // attraction not found

      const res = await request(app)
        .post('/api/attractions/non-existent/reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({ rating: 4 });

      expect(res.status).toBe(404);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/attractions/attraction-1/reviews')
        .send({ rating: 4 });

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/attractions/:id/reviews/me (auth) ────────────────────────

  describe('DELETE /api/attractions/:id/reviews/me', () => {
    it('should delete own review', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne
        .mockResolvedValueOnce(user)              // authenticate
        .mockResolvedValueOnce({ id: 'review-1' }) // existing review
        .mockResolvedValueOnce({ avgRating: 0, totalReviews: 0 }); // recalc
      mockDb.run
        .mockResolvedValueOnce({})  // delete
        .mockResolvedValueOnce({}); // update stats

      const res = await request(app)
        .delete('/api/attractions/attraction-1/reviews/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Review deleted');
    });

    it('should return 404 if no review exists', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id });
      mockDb.findOne
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null); // no review

      const res = await request(app)
        .delete('/api/attractions/attraction-1/reviews/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/reviews (admin) ─────────────────────────────────────────────

  describe('GET /api/reviews', () => {
    it('should list all reviews as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      const reviewRows = [{
        id: 'review-1', attractionId: 'a1', userId: 'u1',
        rating: 5, comment: 'Great', createdAt: new Date(), updatedAt: new Date(),
        uId: 'u1', uName: 'John', uEmail: 'john@test.com', uProfilePicture: null,
        aId: 'a1', aName: 'Beach',
      }];
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ n: 1 });
      mockDb.findMany.mockResolvedValueOnce(reviewRows);

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(1);
      expect(res.body.reviews[0].user).toBeDefined();
      expect(res.body.reviews[0].attraction).toBeDefined();
    });

    it('should reject non-admin user', async () => {
      const user = mockUser();
      const token = generateTestToken({ id: user.id, role: 'tourist' });
      mockDb.findOne.mockResolvedValueOnce(user);

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/reviews/:id (admin) ──────────────────────────────────────

  describe('DELETE /api/reviews/:id', () => {
    it('should delete any review as admin', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce({ id: 'review-1', attractionId: 'attraction-1' })
        .mockResolvedValueOnce({ avgRating: 4.0, totalReviews: 5 }); // recalc
      mockDb.run
        .mockResolvedValueOnce({})  // delete
        .mockResolvedValueOnce({}); // update stats

      const res = await request(app)
        .delete('/api/reviews/review-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Review deleted');
    });

    it('should return 404 for non-existent review', async () => {
      const admin = mockAdmin();
      const token = generateTestToken({ id: admin.id, role: 'admin_super' });
      mockDb.findOne
        .mockResolvedValueOnce(admin)
        .mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/reviews/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
