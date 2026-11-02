import { describe, it, expect } from 'vitest';
import { parseDotEnv } from '../src/core/parser';
import { buildEnvMatrix } from '../src/core/matrix';
import { generateExampleTemplate, formatDotEnv } from '../src/core/generator';

describe('Template and Format Generator', () => {
  it('should generate a sanitized .env.example template from matrix', () => {
    const awsKey = 'AKIA' + '1234567890ABCDEF';
    const local = parseDotEnv(`
      # App Port
      PORT=8080
      DATABASE_URL=postgres://realuser:RealPass99@db.prod:5432/core
      AWS_ACCESS_KEY_ID=${awsKey}
      STRIPE_SECRET_KEY=sk_mock_production_stripe_key_12345
    `);

    const matrix = buildEnvMatrix([{ id: 'local', name: 'Local', parsed: local }]);
    const template = generateExampleTemplate(matrix.rows);

    expect(template).toContain('PORT=3000');
    expect(template).toContain('AKIAIOSFODNN7EXAMPLE');
    expect(template).toContain('sk_test_your_key_here');
    expect(template).not.toContain('RealPass99');
    expect(template).not.toContain(awsKey);
  });

  it('should format .env entries with alignment and comments', () => {
    const raw = `
      # Database
      DB_HOST=localhost
      SUPER_LONG_API_KEY_IDENTIFIER=secret123 # inline comment
    `;
    const parsed = parseDotEnv(raw);
    const formatted = formatDotEnv(parsed.entries, { alignEquals: true, alphabeticalSort: true });

    expect(formatted).toContain('DB_HOST                      =localhost');
    expect(formatted).toContain('SUPER_LONG_API_KEY_IDENTIFIER=secret123 # inline comment');
  });
});
