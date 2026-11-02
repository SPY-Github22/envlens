import { describe, it, expect } from 'vitest';
import { parseDotEnv } from '../src/core/parser';

describe('Dotenv Parser', () => {
  it('should parse basic KEY=value pairs', () => {
    const raw = `
      PORT=8080
      HOST=localhost
      NODE_ENV=production
    `;
    const res = parseDotEnv(raw);
    expect(res.entries).toHaveLength(3);
    expect(res.entriesMap.get('PORT')?.value).toBe('8080');
    expect(res.entriesMap.get('HOST')?.value).toBe('localhost');
  });

  it('should handle export prefixes and quotes', () => {
    const raw = `
      export API_URL="https://api.example.com/v1"
      export SECRET_KEY='my-secret-key-123'
    `;
    const res = parseDotEnv(raw);
    expect(res.entriesMap.get('API_URL')?.value).toBe('https://api.example.com/v1');
    expect(res.entriesMap.get('SECRET_KEY')?.value).toBe('my-secret-key-123');
  });

  it('should associate preceding and inline comments', () => {
    const raw = `
      # Database Configuration Settings
      # Used by Prisma ORM
      DATABASE_URL=postgres://localhost:5432/main # Primary master db
    `;
    const res = parseDotEnv(raw);
    const entry = res.entriesMap.get('DATABASE_URL');
    expect(entry).toBeDefined();
    expect(entry?.comment).toBe('Primary master db');
    expect(entry?.precedingComments).toContain('Database Configuration Settings');
    expect(entry?.precedingComments).toContain('Used by Prisma ORM');
  });

  it('should parse multiline strings correctly', () => {
    const raw = `
      PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Yt09
-----END RSA PRIVATE KEY-----"
      APP_NAME=MyApp
    `;
    const res = parseDotEnv(raw);
    const keyEntry = res.entriesMap.get('PRIVATE_KEY');
    expect(keyEntry?.value).toContain('-----BEGIN RSA PRIVATE KEY-----');
    expect(keyEntry?.value).toContain('-----END RSA PRIVATE KEY-----');
    expect(res.entriesMap.get('APP_NAME')?.value).toBe('MyApp');
  });

  it('should track syntax errors for malformed lines', () => {
    const raw = `
      VALID=123
      THIS_LINE_HAS_NO_EQUALS
      123_INVALID_KEY_NAME=456
    `;
    const res = parseDotEnv(raw);
    expect(res.entries).toHaveLength(1);
    expect(res.errorLines).toHaveLength(2);
  });
});
