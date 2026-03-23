module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  // Prevent app.js from auto-starting the server
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  // Increase timeout for integration tests
  testTimeout: 10000,
};
