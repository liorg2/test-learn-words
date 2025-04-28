// jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
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