/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  clearMocks: true,
  setupFiles: ["./test/setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};
