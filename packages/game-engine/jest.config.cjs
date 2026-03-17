/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2022",
          module: "CommonJS",
          moduleResolution: "Node",
          strict: true,
          esModuleInterop: true,
          noUncheckedIndexedAccess: true,
          exactOptionalPropertyTypes: true
        }
      }
    ]
  },
  collectCoverageFrom: ["<rootDir>/src/**/*.ts", "!<rootDir>/src/**/*.test.ts", "!<rootDir>/src/index.ts"]
};
