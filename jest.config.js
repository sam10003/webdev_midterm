/**
 * ESM: run tests with `NODE_OPTIONS=--experimental-vm-modules` (see `package.json` test script).
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 120000,
  coverageProvider: "v8",
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/socket.js",
    "!src/services/logger.service.js",
  ],
  coverageThreshold: {
    global: {
      branches: 52,
      functions: 68,
      lines: 70,
      statements: 70,
    },
  },
};
