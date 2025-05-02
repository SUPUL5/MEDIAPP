module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  testPathIgnorePatterns: ['/node_modules/']
};