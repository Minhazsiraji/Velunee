/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    // Resolve workspace packages to their TypeScript sources so tests
    // run without a prior build step.
    '^@velunee/(.*)$': '<rootDir>/../../packages/$1/src/index.ts',
    // Allow ESM-style ".js" imports inside those sources.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!(jose)/)'],
};
