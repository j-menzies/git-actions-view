const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

describe('basicAuth', () => {
  const testFilePath = path.join(__dirname, 'test-htpasswd');
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns false for unknown username', () => {
    const hash = bcrypt.hashSync('password', 10);
    fs.writeFileSync(testFilePath, `admin:${hash}\n`);
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = testFilePath;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('unknown', 'password')).toBe(false);
  });

  test('returns false for wrong password', () => {
    const hash = bcrypt.hashSync('correct', 10);
    fs.writeFileSync(testFilePath, `admin:${hash}\n`);
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = testFilePath;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('admin', 'wrong')).toBe(false);
  });

  test('returns true for correct credentials', () => {
    const hash = bcrypt.hashSync('mypassword', 10);
    fs.writeFileSync(testFilePath, `admin:${hash}\n`);
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = testFilePath;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('admin', 'mypassword')).toBe(true);
  });

  test('skips empty lines and comments', () => {
    const hash = bcrypt.hashSync('pass', 10);
    fs.writeFileSync(testFilePath, `# this is a comment\n\nadmin:${hash}\n\n`);
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = testFilePath;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('admin', 'pass')).toBe(true);
  });

  test('handles multiple users', () => {
    const hash1 = bcrypt.hashSync('pass1', 10);
    const hash2 = bcrypt.hashSync('pass2', 10);
    fs.writeFileSync(testFilePath, `user1:${hash1}\nuser2:${hash2}\n`);
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = testFilePath;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('user1', 'pass1')).toBe(true);
    expect(validateBasicAuth('user2', 'pass2')).toBe(true);
    expect(validateBasicAuth('user1', 'pass2')).toBe(false);
  });

  test('returns false when no file path configured', () => {
    delete process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH;
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('admin', 'pass')).toBe(false);
  });

  test('handles missing file gracefully', () => {
    process.env.BASIC_AUTH_USER_DETAILS_FILE_PATH = '/nonexistent/path/htpasswd';
    const { validateBasicAuth } = require('../src/auth/basicAuth');
    expect(validateBasicAuth('admin', 'pass')).toBe(false);
  });
});
