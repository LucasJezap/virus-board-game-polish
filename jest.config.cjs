/** @type {import('jest').Config} */
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  roots: ["<rootDir>/apps", "<rootDir>/packages"],
  testMatch: [
    "<rootDir>/apps/**/*.test.ts",
    "<rootDir>/apps/**/*.test.tsx",
    "<rootDir>/packages/**/*.test.ts",
    "<rootDir>/packages/**/*.test.tsx"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2022",
          module: "CommonJS",
          moduleResolution: "Node",
          jsx: "react-jsx",
          baseUrl: ".",
          paths: {
            "@wirus/game-engine": ["packages/game-engine/src/index.ts"],
            "@wirus/shared-types": ["packages/shared-types/src/index.ts"],
            "@wirus/shared-utils": ["packages/shared-utils/src/index.ts"]
          },
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true
        }
      }
    ]
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@wirus/game-engine$": "<rootDir>/packages/game-engine/src/index.ts",
    "^@wirus/shared-types$": "<rootDir>/packages/shared-types/src/index.ts",
    "^@wirus/shared-utils$": "<rootDir>/packages/shared-utils/src/index.ts"
  },
  collectCoverageFrom: [
    "<rootDir>/apps/backend/src/**/*.ts",
    "<rootDir>/apps/frontend/src/**/*.{ts,tsx}",
    "<rootDir>/packages/game-engine/src/**/*.ts",
    "<rootDir>/packages/shared-types/src/**/*.ts",
    "<rootDir>/packages/shared-utils/src/**/*.ts",
    "!<rootDir>/apps/backend/src/main.ts",
    "!<rootDir>/apps/backend/src/app.module.ts",
    "!<rootDir>/apps/backend/src/**/index.ts",
    "!<rootDir>/apps/backend/src/**/*.module.ts",
    "!<rootDir>/apps/frontend/src/app/layout.tsx",
    "!<rootDir>/apps/frontend/src/app/page.tsx",
    "!<rootDir>/packages/game-engine/src/index.ts"
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/\\.next/", "/coverage/"],
  coverageThreshold: {
    global: {
      statements: 95,
      branches: 95,
      functions: 95,
      lines: 95
    }
  }
};
