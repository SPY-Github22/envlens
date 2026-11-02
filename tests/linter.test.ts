import { describe, it, expect } from 'vitest';
import { inferVariableType, checkCrossEnvTypeMismatches, checkSyntaxAndConventions } from '../src/core/linter';
import { parseDotEnv } from '../src/core/parser';
import { buildEnvMatrix } from '../src/core/matrix';

describe('Dotenv Linter & Type Inference', () => {
  it('should infer semantic types accurately', () => {
    expect(inferVariableType('PORT', '8080')).toBe('port');
    expect(inferVariableType('DEBUG', 'true')).toBe('boolean');
    expect(inferVariableType('API_URL', 'https://api.github.com')).toBe('url');
    expect(inferVariableType('ADMIN_EMAIL', 'security@company.com')).toBe('email');
    expect(inferVariableType('AWS_SECRET_KEY', 'my-secret')).toBe('secret');
  });

  it('should flag cross-environment type mismatches', () => {
    const local = parseDotEnv('SERVICE_PORT=3000\nAPI_URL=https://api.local');
    const staging = parseDotEnv('SERVICE_PORT=3000\nAPI_URL=true'); // Mismatch: API_URL boolean vs url

    const matrix = buildEnvMatrix([
      { id: 'local', name: 'Local', parsed: local },
      { id: 'staging', name: 'Staging', parsed: staging },
    ]);

    const warnings = checkCrossEnvTypeMismatches(matrix.rows, [
      { id: 'local', name: 'Local' },
      { id: 'staging', name: 'Staging' },
    ]);

    expect(warnings.length).toBeGreaterThan(0);
    const apiWarning = warnings.find(w => w.key === 'API_URL');
    expect(apiWarning).toBeDefined();
    expect(apiWarning?.actualType).toBe('boolean');
  });

  it('should detect duplicate keys and lowercase key warnings', () => {
    const raw = `
      PORT=3000
      port=4000
      PORT=5000
    `;
    const parsed = parseDotEnv(raw);
    const warnings = checkSyntaxAndConventions('local', parsed);

    expect(warnings.some(w => w.message.includes('Duplicate key "PORT"'))).toBe(true);
    expect(warnings.some(w => w.message.includes('lowercase'))).toBe(true);
  });
});
