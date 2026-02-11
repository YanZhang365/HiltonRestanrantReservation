// 项目根目录/jest.config.js
export default {
  testEnvironment: 'node',
  transform: {}, // 禁用CommonJS转换
  moduleFileExtensions: ['js'],
  testMatch: ['**/src/test.js'],
  verbose: true,
  // 关键：允许mock ESM模块
  esModuleInterop: true,
  forceExit: true
};