module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'apps/web/tsconfig.json',
      tsconfigCompilerOptions: { module: 'commonjs' },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/src/$1',
  },
  testMatch: ['**/__tests__/e2e-coach-athlete-lifecycle.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
