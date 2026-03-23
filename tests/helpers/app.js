/**
 * Load the Express app for supertest without starting the HTTP server.
 * All external dependencies (DB, Firebase, etc.) are mocked before require.
 */
const { setupMocks } = require('./mocks');
setupMocks();

// Now require the app — all its dependencies are already mocked
const app = require('../../src/app');

module.exports = app;
