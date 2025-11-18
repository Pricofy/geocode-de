/**
 * Jest configuration for pricofy-geocode-es tests
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test', '<rootDir>/src'],
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 85,
      lines: 80,
      statements: 80,
    },
    './src/handlers/geocode.ts': {
      branches: 77,
      functions: 100,
      lines: 89,
      statements: 89,
    },
    './src/operations/**/*.ts': {
      branches: 65,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    './src/services/**/*.ts': {
      branches: 75,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    './src/providers/**/*.ts': {
      branches: 74,
      functions: 75,
      lines: 89,
      statements: 89,
    },
    './src/types/errors.ts': {
      branches: 62,
      functions: 30,
      lines: 67,
      statements: 69,
    },
    './src/types/constants.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/utils/logger.ts': {
      branches: 62,
      functions: 87,
      lines: 78,
      statements: 79,
    },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: false,
    }],
  },
};

