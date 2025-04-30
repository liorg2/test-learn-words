// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  testMatch: ['<rootDir>/tests/**/*.test.[jt]s?(x)', '<rootDir>/tests/**/*.spec.[jt]s?(x)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.cjs'
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
}; 