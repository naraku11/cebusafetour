// Set test environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_USER = 'test@test.com';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
