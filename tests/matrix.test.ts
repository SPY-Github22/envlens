import { describe, it, expect } from 'vitest';
import { parseDotEnv } from '../src/core/parser';
import { buildEnvMatrix } from '../src/core/matrix';

describe('Multi-Environment Matrix Engine', () => {
  it('should compute full parity when all environments have identical keys', () => {
    const envLocal = parseDotEnv('PORT=3000\nDATABASE_URL=postgres://localhost\nSECRET=123');
    const envProd = parseDotEnv('PORT=80\nDATABASE_URL=postgres://prod\nSECRET=999');

    const matrix = buildEnvMatrix([
      { id: 'local', name: 'Local', parsed: envLocal },
      { id: 'prod', name: 'Production', parsed: envProd },
    ]);

    expect(matrix.totalUniqueKeys).toBe(3);
    expect(matrix.fullySyncedCount).toBe(3);
    expect(matrix.missingCount).toBe(0);
    expect(matrix.parityScore).toBe(100);
  });

  it('should flag keys missing in specific environments', () => {
    const envLocal = parseDotEnv('PORT=3000\nLOCAL_DEV_FLAG=true\nAPI_KEY=abc');
    const envStaging = parseDotEnv('PORT=3000\nAPI_KEY=xyz'); // Missing LOCAL_DEV_FLAG
    const envProd = parseDotEnv('PORT=80\nPROD_METRICS_KEY=m123'); // Missing LOCAL_DEV_FLAG and API_KEY

    const matrix = buildEnvMatrix([
      { id: 'local', name: 'Local', parsed: envLocal },
      { id: 'staging', name: 'Staging', parsed: envStaging },
      { id: 'prod', name: 'Production', parsed: envProd },
    ]);

    expect(matrix.totalUniqueKeys).toBe(4);
    const localDevRow = matrix.rows.find(r => r.key === 'LOCAL_DEV_FLAG');
    expect(localDevRow?.status).toBe('missing');
    expect(localDevRow?.missingIn).toEqual(['staging', 'prod']);

    const prodMetricsRow = matrix.rows.find(r => r.key === 'PROD_METRICS_KEY');
    expect(prodMetricsRow?.missingIn).toEqual(['local', 'staging']);

    expect(matrix.parityScore).toBeLessThan(100);
  });

  it('should identify example_only keys', () => {
    const envExample = parseDotEnv('PORT=3000\nNEW_FEATURE_FLAG=false');
    const envLocal = parseDotEnv('PORT=3000');

    const matrix = buildEnvMatrix([
      { id: 'example', name: 'Example', parsed: envExample, isTemplate: true },
      { id: 'local', name: 'Local', parsed: envLocal },
    ]);

    const featureRow = matrix.rows.find(r => r.key === 'NEW_FEATURE_FLAG');
    expect(featureRow?.status).toBe('example_only');
    expect(featureRow?.missingIn).toContain('local');
  });
});
