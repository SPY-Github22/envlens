/**
 * Multi-Environment Parity & Matrix Engine for EnvLens
 * 
 * Aligns environment variables across multiple environments (Local, Staging, Prod, Example)
 * and calculates missing variables, empty values, and overall parity health.
 */

import { ParseResult, EnvEntry } from './parser';

export type KeyParityStatus = 'synced' | 'missing' | 'empty' | 'example_only';

export interface MatrixRow {
  key: string;
  status: KeyParityStatus;
  values: Record<string, { value: string; entry?: EnvEntry; isPresent: boolean }>;
  missingIn: string[];
  emptyIn: string[];
  presentCount: number;
  totalEnvs: number;
  primaryComment?: string;
}

export interface MatrixSummary {
  rows: MatrixRow[];
  totalUniqueKeys: number;
  fullySyncedCount: number;
  missingCount: number;
  emptyCount: number;
  parityScore: number; // 0 - 100%
  environments: string[];
}

/**
 * Builds comparison matrix across all loaded environments
 */
export function buildEnvMatrix(
  environments: { id: string; name: string; parsed: ParseResult; isTemplate?: boolean }[]
): MatrixSummary {
  if (environments.length === 0) {
    return {
      rows: [],
      totalUniqueKeys: 0,
      fullySyncedCount: 0,
      missingCount: 0,
      emptyCount: 0,
      parityScore: 100,
      environments: [],
    };
  }

  const envIds = environments.map(e => e.id);
  const keySet = new Set<string>();
  const commentMap = new Map<string, string>();

  // Gather all keys
  for (const env of environments) {
    for (const entry of env.parsed.entries) {
      keySet.add(entry.key);
      if (!commentMap.has(entry.key) && (entry.comment || entry.precedingComments.length > 0)) {
        const comment = entry.comment ?? entry.precedingComments.join('; ');
        commentMap.set(entry.key, comment);
      }
    }
  }

  // Sort keys alphabetically
  const allKeys = Array.from(keySet).sort();
  const rows: MatrixRow[] = [];

  let fullySyncedCount = 0;
  let missingCount = 0;
  let emptyCount = 0;

  for (const key of allKeys) {
    const values: Record<string, { value: string; entry?: EnvEntry; isPresent: boolean }> = {};
    const missingIn: string[] = [];
    const emptyIn: string[] = [];
    let presentCount = 0;
    let onlyInTemplate = true;

    for (const env of environments) {
      const entry = env.parsed.entriesMap.get(key);
      if (entry !== undefined) {
        presentCount++;
        values[env.id] = {
          value: entry.value,
          entry,
          isPresent: true,
        };
        if (!entry.value.trim()) {
          emptyIn.push(env.id);
        }
        if (!env.isTemplate) {
          onlyInTemplate = false;
        }
      } else {
        missingIn.push(env.id);
        values[env.id] = {
          value: '',
          isPresent: false,
        };
      }
    }

    let status: KeyParityStatus = 'synced';
    if (onlyInTemplate) {
      status = 'example_only';
      missingCount++;
    } else if (missingIn.length > 0) {
      status = 'missing';
      missingCount++;
    } else if (emptyIn.length > 0) {
      status = 'empty';
      emptyCount++;
    } else {
      fullySyncedCount++;
    }

    rows.push({
      key,
      status,
      values,
      missingIn,
      emptyIn,
      presentCount,
      totalEnvs: environments.length,
      primaryComment: commentMap.get(key),
    });
  }

  const totalKeys = allKeys.length;
  const parityScore = totalKeys === 0 ? 100 : Math.round((fullySyncedCount / totalKeys) * 100);

  return {
    rows,
    totalUniqueKeys: totalKeys,
    fullySyncedCount,
    missingCount,
    emptyCount,
    parityScore,
    environments: envIds,
  };
}
