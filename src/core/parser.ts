/**
 * Robust Dotenv Parser for EnvLens
 * 
 * Accurately parses standard .env syntax:
 * - KEY=value pairs
 * - export KEY=value
 * - Double and single quotes (with escaped characters)
 * - Multiline values
 * - Preceding and inline comments (# comment)
 * - Preserves line numbers and comment metadata
 */

export interface EnvEntry {
  key: string;
  value: string;
  rawLine: string;
  lineNumber: number;
  comment?: string;
  precedingComments: string[];
  quoteType?: '"' | "'" | null;
}

export interface ParseResult {
  entries: EnvEntry[];
  entriesMap: Map<string, EnvEntry>;
  rawText: string;
  errorLines: { lineNumber: number; line: string; reason: string }[];
}

/**
 * Parses raw .env string into structured entries
 */
export function parseDotEnv(content: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const entries: EnvEntry[] = [];
  const entriesMap = new Map<string, EnvEntry>();
  const errorLines: { lineNumber: number; line: string; reason: string }[] = [];

  let pendingComments: string[] = [];
  let inMultiline = false;
  let multilineKey = '';
  let multilineQuote: '"' | "'" = '"';
  let multilineValue = '';
  let multilineStartLine = 0;
  let multilinePrecedingComments: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Handling multiline string accumulation
    if (inMultiline) {
      const quoteIndex = line.indexOf(multilineQuote);
      if (quoteIndex !== -1 && (quoteIndex === 0 || line[quoteIndex - 1] !== '\\')) {
        // Multiline closing quote found
        multilineValue += '\n' + line.slice(0, quoteIndex);
        const remainder = line.slice(quoteIndex + 1).trim();
        let inlineComment: string | undefined = undefined;
        if (remainder.startsWith('#')) {
          inlineComment = remainder.slice(1).trim();
        }

        const entry: EnvEntry = {
          key: multilineKey,
          value: multilineValue,
          rawLine: line,
          lineNumber: multilineStartLine,
          comment: inlineComment,
          precedingComments: multilinePrecedingComments,
          quoteType: multilineQuote,
        };
        entries.push(entry);
        entriesMap.set(multilineKey, entry);

        inMultiline = false;
        multilineKey = '';
        multilineValue = '';
        continue;
      } else {
        multilineValue += '\n' + line;
        continue;
      }
    }

    // Empty lines
    if (!trimmed) {
      continue;
    }

    // Comment lines
    if (trimmed.startsWith('#')) {
      pendingComments.push(trimmed.slice(1).trim());
      continue;
    }

    // Strip leading "export " if present
    let cleanLine = trimmed;
    if (cleanLine.startsWith('export ') && cleanLine.length > 7) {
      cleanLine = cleanLine.slice(7).trimStart();
    }

    // Look for first '=' separator
    const eqIdx = cleanLine.indexOf('=');
    if (eqIdx === -1) {
      errorLines.push({
        lineNumber,
        line,
        reason: 'Missing "=" assignment operator',
      });
      continue;
    }

    const key = cleanLine.slice(0, eqIdx).trim();
    if (!key || !/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(key)) {
      errorLines.push({
        lineNumber,
        line,
        reason: `Invalid environment variable key name: "${key}"`,
      });
      continue;
    }

    let rest = cleanLine.slice(eqIdx + 1).trim();
    let val = '';
    let quoteType: '"' | "'" | null = null;
    let inlineComment: string | undefined = undefined;

    // Quoted values
    if (rest.startsWith('"') || rest.startsWith("'")) {
      quoteType = rest[0] as '"' | "'";
      const endQuoteIdx = rest.indexOf(quoteType, 1);

      if (endQuoteIdx !== -1) {
        // Single-line quoted value
        val = rest.slice(1, endQuoteIdx);
        const trailing = rest.slice(endQuoteIdx + 1).trim();
        if (trailing.startsWith('#')) {
          inlineComment = trailing.slice(1).trim();
        }
      } else {
        // Begins a multiline string
        inMultiline = true;
        multilineKey = key;
        multilineQuote = quoteType;
        multilineValue = rest.slice(1);
        multilineStartLine = lineNumber;
        multilinePrecedingComments = [...pendingComments];
        pendingComments = [];
        continue;
      }
    } else {
      // Unquoted value: check for inline comment
      const commentIdx = rest.indexOf(' #');
      if (commentIdx !== -1) {
        val = rest.slice(0, commentIdx).trim();
        inlineComment = rest.slice(commentIdx + 2).trim();
      } else {
        val = rest;
      }
    }

    // Process escapes if double-quoted
    if (quoteType === '"') {
      val = val.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
    }

    const entry: EnvEntry = {
      key,
      value: val,
      rawLine: line,
      lineNumber,
      comment: inlineComment,
      precedingComments: [...pendingComments],
      quoteType,
    };

    entries.push(entry);
    entriesMap.set(key, entry);
    pendingComments = [];
  }

  return {
    entries,
    entriesMap,
    rawText: content,
    errorLines,
  };
}
