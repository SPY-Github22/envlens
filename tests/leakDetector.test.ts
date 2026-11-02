import { describe, it, expect } from 'vitest';
import { parseDotEnv } from '../src/core/parser';
import { scanEnvironmentForLeaks, isSafePlaceholder } from '../src/core/leakDetector';

describe('Accidental Secret Leak Detector', () => {
  it('should ignore safe placeholders in .env.example', () => {
    const raw = `
      STRIPE_SECRET_KEY=your_api_key_here
      DATABASE_PASSWORD=changeme
      AWS_KEY=your_key_here
      PORT=3000
    `;
    const parsed = parseDotEnv(raw);
    const leaks = scanEnvironmentForLeaks(parsed.entries);
    expect(leaks).toHaveLength(0);
  });

  it('should flag live AWS Access Key IDs', () => {
    const awsKey = 'AKIA' + '23B8CD45EF67GH89';
    const raw = `AWS_ACCESS_KEY_ID=${awsKey}`;
    const parsed = parseDotEnv(raw);
    const leaks = scanEnvironmentForLeaks(parsed.entries);

    expect(leaks).toHaveLength(1);
    expect(leaks[0].category).toBe('AWS Credentials');
    expect(leaks[0].severity).toBe('critical');
  });

  it('should flag live Stripe production secret keys', () => {
    // Construct pattern to test detection without triggering GitHub static push protection
    const stripePrefix = 'sk_' + 'live_';
    const raw = `STRIPE_SECRET=${stripePrefix}51Mz0123456789ABCDEF0123456789`;
    const parsed = parseDotEnv(raw);
    const leaks = scanEnvironmentForLeaks(parsed.entries);

    expect(leaks).toHaveLength(1);
    expect(leaks[0].category).toBe('Payment Credentials');
    expect(leaks[0].suggestedPlaceholder).toContain('sk_test_');
  });

  it('should flag database URLs with embedded real passwords', () => {
    const raw = 'DATABASE_URL=postgres://master_admin:SuperProdSecurePassword999@db.prod.internal:5432/core';
    const parsed = parseDotEnv(raw);
    const leaks = scanEnvironmentForLeaks(parsed.entries);

    expect(leaks).toHaveLength(1);
    expect(leaks[0].category).toBe('Database Password');
    expect(leaks[0].suggestedPlaceholder).toContain(':your_db_password_here@');
  });

  it('should flag high-entropy secret tokens', () => {
    const raw = 'JWT_SECRET_SIGNING_KEY=4f9b2d8a7c1e5f038b29c4d1e7a5b3c8f1';
    const parsed = parseDotEnv(raw);
    const leaks = scanEnvironmentForLeaks(parsed.entries);

    expect(leaks).toHaveLength(1);
    expect(leaks[0].category).toBe('High-Entropy Secret');
  });

  it('should recognize various safe placeholder styles', () => {
    expect(isSafePlaceholder('your_api_key')).toBe(true);
    expect(isSafePlaceholder('<your_token>')).toBe(true);
    expect(isSafePlaceholder('${DATABASE_URL}')).toBe(true);
    expect(isSafePlaceholder('replace_me')).toBe(true);
    const liveKey = ['sk', 'live', '1234567890abcdef1234567890'].join('_');
    expect(isSafePlaceholder(liveKey)).toBe(false);
  });
});
