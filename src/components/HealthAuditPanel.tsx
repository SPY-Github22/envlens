import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wand2,
  CheckCircle
} from 'lucide-react';
import { SecretLeakAlert } from '../core/leakDetector';
import { TypeWarning, SyntaxWarning } from '../core/linter';

interface HealthAuditPanelProps {
  parityScore: number;
  totalUniqueKeys: number;
  missingCount: number;
  secretLeaks: { envId: string; envName: string; leaks: SecretLeakAlert[] }[];
  typeWarnings: TypeWarning[];
  syntaxWarnings: SyntaxWarning[];
  onAutoFixLeak: (envId: string, key: string, placeholder: string) => void;
}

export const HealthAuditPanel: React.FC<HealthAuditPanelProps> = ({
  parityScore,
  totalUniqueKeys,
  missingCount,
  secretLeaks,
  typeWarnings,
  syntaxWarnings,
  onAutoFixLeak,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalLeakCount = secretLeaks.reduce((sum, item) => sum + item.leaks.length, 0);
  const totalWarnings = totalLeakCount + typeWarnings.length + syntaxWarnings.length;

  if (totalWarnings === 0 && missingCount === 0) {
    return (
      <div className="bg-emerald-950/20 border-b border-emerald-900/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold">Perfect Parity & Clean Security:</span>
          <span>All {totalUniqueKeys} variables are synced across all environments with zero leaks.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/80 border-b border-neutral-800 text-xs">
      {/* Summary Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition select-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {totalLeakCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
            <span className="font-bold text-white">Environment Health Audit:</span>
          </div>

          <div className="flex items-center gap-2">
            {totalLeakCount > 0 && (
              <span className="bg-red-500/20 text-red-300 font-semibold px-2 py-0.5 rounded-full border border-red-500/30">
                {totalLeakCount} Secret Leak{totalLeakCount === 1 ? '' : 's'} in Template!
              </span>
            )}
            {missingCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                {missingCount} Missing Key{missingCount === 1 ? '' : 's'}
              </span>
            )}
            {typeWarnings.length > 0 && (
              <span className="bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                {typeWarnings.length} Type Mismatch{typeWarnings.length === 1 ? '' : 'es'}
              </span>
            )}
            <span className="text-neutral-500 font-mono">
              Parity: {parityScore}%
            </span>
          </div>
        </div>

        <button className="text-neutral-400 hover:text-white p-1">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-neutral-800/60 bg-neutral-950/40 max-h-60 overflow-y-auto">
          {/* Secret Leaks */}
          {secretLeaks.map((envGroup) =>
            envGroup.leaks.map((leak, idx) => (
              <div
                key={`leak-${envGroup.envId}-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-neutral-300"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-400 font-mono">{leak.key}</span>
                    <span className="text-[10px] bg-red-900/50 text-red-200 px-1.5 py-0.2 rounded border border-red-700/50">
                      {leak.category} ({envGroup.envName})
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">{leak.reason}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onAutoFixLeak(envGroup.envId, leak.key, leak.suggestedPlaceholder)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-700/60 transition text-[11px] font-medium"
                    title="Replace real credential with safe dummy placeholder"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Auto-Sanitize</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Type Mismatches */}
          {typeWarnings.map((warn, idx) => (
            <div
              key={`type-${idx}`}
              className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-neutral-300"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 font-mono">{warn.key}</span>
                  <span className="text-[10px] bg-amber-900/40 text-amber-200 px-1.5 py-0.2 rounded border border-amber-700/40">
                    Type Mismatch in {warn.envId}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">{warn.message}</div>
              </div>
            </div>
          ))}

          {/* Syntax / Casing Warnings */}
          {syntaxWarnings.slice(0, 5).map((syntax, idx) => (
            <div
              key={`syntax-${idx}`}
              className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px]"
            >
              <span className="font-mono text-neutral-300">{syntax.key}:</span>
              <span>{syntax.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
