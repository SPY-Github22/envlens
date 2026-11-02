/**
 * Dotenv Linter & Type Inference Engine for EnvLens
 * 
 * Infers variable types (port, number, boolean, url, email, secret, string)
 * and checks for cross-environment type mismatches and syntax issues.
 */

import { ParseResult } from './parser';
import { MatrixRow } from './matrix';

export type InferredType = 'port' | 'number' | 'boolean' | 'url' | 'email' | 'secret' | 'string';

export interface TypeWarning {
  key: string;
  expectedType: InferredType;
  actualType: InferredType;
  envId: string;
  value: string;
  message: string;
}

export interface SyntaxWarning {
  key: string;
  envId: string;
  lineNumber: number;
  message: string;
  severity: 'warning' | 'info';
}

/**
 * Infer the semantic type of a single environment variable value
 */
export function inferVariableType(key: string, value: string): InferredType {
  const val = value.trim();
  const lowerVal = val.toLowerCase();
  const lowerKey = key.toLowerCase();

  if (!val) {
    return 'string';
  }

  // 1. Secret keywords
  if (
    lowerKey.includes('secret') ||
    lowerKey.includes('password') ||
    lowerKey.includes('passwd') ||
    lowerKey.includes('api_key') ||
    lowerKey.includes('key') ||
    lowerKey.includes('token') ||
    lowerKey.includes('auth_token') ||
    lowerKey.includes('private_key')
  ) {
    return 'secret';
  }

  // 2. Boolean
  if (['true', 'false', '1', '0', 'yes', 'no'].includes(lowerVal)) {
    return 'boolean';
  }

  // 3. Port (integer between 1 and 65535)
  if (lowerKey.endsWith('_port') || lowerKey === 'port') {
    const num = Number(val);
    if (Number.isInteger(num) && num > 0 && num <= 65535) {
      return 'port';
    }
  }

  // 4. URL
  if (/^(?:https?|wss?|postgres|postgresql|mysql|mongodb|redis):\/\/[^\s/$.?#].[^\s]*$/i.test(val)) {
    return 'url';
  }

  // 5. Email
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
    return 'email';
  }

  // 6. Generic Number
  if (!isNaN(Number(val)) && val.trim() !== '') {
    return 'number';
  }

  return 'string';
}

/**
 * Detect cross-environment type mismatches for each matrix row
 */
export function checkCrossEnvTypeMismatches(
  rows: MatrixRow[],
  environments: { id: string; name: string }[]
): TypeWarning[] {
  const warnings: TypeWarning[] = [];

  for (const row of rows) {
    const envTypes: { envId: string; type: InferredType; value: string }[] = [];

    for (const env of environments) {
      const valObj = row.values[env.id];
      if (valObj && valObj.isPresent && valObj.value.trim()) {
        const type = inferVariableType(row.key, valObj.value);
        envTypes.push({ envId: env.id, type, value: valObj.value });
      }
    }

    if (envTypes.length < 2) continue;

    // Determine the majority type
    const typeCounts = new Map<InferredType, number>();
    for (const item of envTypes) {
      typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1);
    }

    let dominantType: InferredType = 'string';
    let maxCount = 0;
    for (const [type, count] of typeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }

    // Flag environments that deviate from dominant type (excluding acceptable compatible types)
    for (const item of envTypes) {
      if (item.type !== dominantType) {
        // e.g. 'port' and 'number' are compatible
        if (
          (dominantType === 'port' && item.type === 'number') ||
          (dominantType === 'number' && item.type === 'port')
        ) {
          continue;
        }

        warnings.push({
          key: row.key,
          expectedType: dominantType,
          actualType: item.type,
          envId: item.envId,
          value: item.value,
          message: `Variable "${row.key}" in environment "${item.envId}" is inferred as ${item.type}, but expected ${dominantType}.`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Check file-level syntax conventions and duplicate keys
 */
export function checkSyntaxAndConventions(
  envId: string,
  parsed: ParseResult
): SyntaxWarning[] {
  const warnings: SyntaxWarning[] = [];
  const seenKeys = new Map<string, number>();

  for (const entry of parsed.entries) {
    // Check duplicates
    if (seenKeys.has(entry.key)) {
      warnings.push({
        key: entry.key,
        envId,
        lineNumber: entry.lineNumber,
        message: `Duplicate key "${entry.key}" defined on lines ${seenKeys.get(entry.key)} and ${entry.lineNumber}. The latter overrides earlier declarations.`,
        severity: 'warning',
      });
    } else {
      seenKeys.set(entry.key, entry.lineNumber);
    }

    // Check casing convention (UPPER_SNAKE_CASE recommended for .env)
    if (!/^[A-Z0-9_.-]+$/.test(entry.key)) {
      warnings.push({
        key: entry.key,
        envId,
        lineNumber: entry.lineNumber,
        message: `Key "${entry.key}" contains lowercase characters. Standard convention is UPPER_SNAKE_CASE.`,
        severity: 'info',
      });
    }

    // Check trailing whitespace in unquoted value
    if (entry.quoteType === null && entry.value.endsWith(' ')) {
      warnings.push({
        key: entry.key,
        envId,
        lineNumber: entry.lineNumber,
        message: `Unquoted value for "${entry.key}" contains trailing whitespace.`,
        severity: 'warning',
      });
    }
  }

  return warnings;
}
