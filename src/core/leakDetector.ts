/**
 * Accidental Secret Leak Detector for EnvLens
 * 
 * Scans .env files (specifically .env.example / template files) to detect
 * real secrets, credentials, and API keys committed in place of dummy placeholders.
 */

import { EnvEntry } from './parser';

export interface SecretLeakAlert {
  key: string;
  value: string;
  category: string;
  severity: 'critical' | 'high' | 'warning';
  reason: string;
  suggestedPlaceholder: string;
}

const SAFE_PLACEHOLDERS = new Set([
  'your_api_key',
  'your_api_key_here',
  'your_key_here',
  'your_token_here',
  'your_secret_here',
  'your_password_here',
  'changeme',
  'change_me',
  'replace_me',
  'insert_here',
  'test',
  'dummy',
  'example',
  'localhost',
  'none',
  'null',
  'undefined',
  'default',
  'development',
  'sandbox',
  'xxx',
  'xxxx',
  '123456',
  'secret',
  'password',
]);

/**
 * Calculates Shannon entropy of a string (bits per symbol)
 */
export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const frequencies = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    frequencies.set(ch, (frequencies.get(ch) ?? 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Checks if a string is a standard safe placeholder
 */
export function isSafePlaceholder(val: string): boolean {
  const normalized = val.trim().toLowerCase().replace(/^["']|["']$/g, '');
  if (!normalized) return true;

  if (SAFE_PLACEHOLDERS.has(normalized)) return true;

  // Specifically AWS official dummy key
  if (normalized === 'akiaiosfodnn7example') return true;

  // Patterns like your_xxx, <xxx>, [xxx], ${xxx}
  if (/^<.*>$/.test(normalized) || /^\[.*\]$/.test(normalized) || /^\${.*}$/.test(normalized)) {
    return true;
  }
  if (normalized.startsWith('your_') || normalized.startsWith('your-')) {
    return true;
  }
  if (normalized === 'placeholder' || normalized === 'example' || normalized.startsWith('example_')) {
    return true;
  }

  return false;
}

/**
 * Inspect an entry for high-risk leaks
 */
export function scanEntryForSecretLeaks(entry: EnvEntry): SecretLeakAlert | null {
  const val = entry.value.trim();
  if (!val || isSafePlaceholder(val)) {
    return null;
  }

  // 1. Private keys
  if (val.includes('-----BEGIN') && val.includes('PRIVATE KEY-----')) {
    return {
      key: entry.key,
      value: val,
      category: 'Private Key',
      severity: 'critical',
      reason: 'Contains unencrypted RSA/EC/SSH private key block',
      suggestedPlaceholder: '"-----BEGIN RSA PRIVATE KEY-----\\n...\\n-----END RSA PRIVATE KEY-----"',
    };
  }

  // 2. AWS Access Key ID
  if (/\bAKIA[0-9A-Z]{16}\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'AWS Credentials',
      severity: 'critical',
      reason: 'Live AWS Access Key ID pattern (AKIA...) detected',
      suggestedPlaceholder: 'AKIAIOSFODNN7EXAMPLE',
    };
  }

  // 3. Stripe Secret Keys
  if (/\b[sr]k_live_[0-9a-zA-Z]{24,}\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'Payment Credentials',
      severity: 'critical',
      reason: 'Live production Stripe secret/restricted key (sk_live_...) detected',
      suggestedPlaceholder: 'sk_test_your_test_key_here',
    };
  }

  // 4. GitHub Tokens
  if (/\b(?:gh[pousr]_[A-Za-z0-9_]{36,255}|github_pat_[A-Za-z0-9_]{82})\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'GitHub Token',
      severity: 'critical',
      reason: 'Live GitHub Personal Access Token detected',
      suggestedPlaceholder: 'ghp_your_github_token_here',
    };
  }

  // 5. AI API Keys
  if (/\bsk-(?:ant-)?[a-zA-Z0-9_-]{20,}\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'AI API Key',
      severity: 'high',
      reason: 'Live OpenAI / Anthropic API key format detected',
      suggestedPlaceholder: 'sk-your_api_key_here',
    };
  }

  // 6. Google Cloud API Keys
  if (/\bAIza[0-9A-Za-z-_]{35}\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'Google Cloud Key',
      severity: 'high',
      reason: 'Live Google Cloud / Firebase API key format detected',
      suggestedPlaceholder: 'AIzaSyYourGoogleApiKeyHere',
    };
  }

  // 7. JWT Tokens
  if (/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(val)) {
    return {
      key: entry.key,
      value: val,
      category: 'JWT Token',
      severity: 'high',
      reason: 'Raw signed JWT token payload detected',
      suggestedPlaceholder: 'your_jwt_token_here',
    };
  }

  // 8. Database Connection Strings with Passwords
  const dbMatch = val.match(/(?:postgres|postgresql|mysql|mongodb|redis|mssql):\/\/[^:@\s]+:([^@\s]+)@/i);
  if (dbMatch && dbMatch[1]) {
    const pass = dbMatch[1];
    if (!isSafePlaceholder(pass)) {
      return {
        key: entry.key,
        value: val,
        category: 'Database Password',
        severity: 'critical',
        reason: 'Database URI contains plaintext password',
        suggestedPlaceholder: val.replace(`:${pass}@`, ':your_db_password_here@'),
      };
    }
  }

  // 9. High-Entropy Secret Check for keys explicitly indicating secrets
  const keyLower = entry.key.toLowerCase();
  const isSecretKeyName =
    keyLower.includes('secret') ||
    keyLower.includes('token') ||
    keyLower.includes('key') ||
    keyLower.includes('passwd') ||
    keyLower.includes('password');

  if (isSecretKeyName && val.length >= 24) {
    const entropy = calculateShannonEntropy(val);
    if (entropy >= 3.8) {
      return {
        key: entry.key,
        value: val,
        category: 'High-Entropy Secret',
        severity: 'warning',
        reason: `High Shannon entropy (${entropy.toFixed(2)} bits/char) indicates potential real secret value`,
        suggestedPlaceholder: `your_${keyLower}_here`,
      };
    }
  }

  return null;
}

/**
 * Scan an entire environment for leaks
 */
export function scanEnvironmentForLeaks(entries: EnvEntry[]): SecretLeakAlert[] {
  const alerts: SecretLeakAlert[] = [];
  for (const entry of entries) {
    const alert = scanEntryForSecretLeaks(entry);
    if (alert) {
      alerts.push(alert);
    }
  }
  return alerts;
}
