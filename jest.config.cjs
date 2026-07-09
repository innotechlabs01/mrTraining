module.exports = {
  displayName: '@mrtraining/web',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/features/progress/services/(.*)$': '<rootDir>/apps/web/src/features/progress/services/$1',
    '^~/(.*)$': '<rootDir>/apps/web/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'apps/web/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
