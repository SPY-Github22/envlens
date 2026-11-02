import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  PlusCircle
} from 'lucide-react';
import { MatrixRow } from '../core/matrix';
import { inferVariableType, InferredType } from '../core/linter';

interface MatrixViewProps {
  rows: MatrixRow[];
  environments: { id: string; name: string; isTemplate?: boolean }[];
  onUpdateValue: (envId: string, key: string, newValue: string) => void;
  onCopyFromOtherEnv: (targetEnvId: string, sourceEnvId: string, key: string) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  rows,
  environments,
  onUpdateValue,
  onCopyFromOtherEnv,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'missing' | 'synced' | 'secrets'>('all');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const toggleReveal = (cellKey: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [cellKey]: !prev[cellKey],
    }));
  };

  const handleCopy = (cellKey: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedCell(cellKey);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = row.key.toLowerCase().includes(q);
        const matchesComment = row.primaryComment?.toLowerCase().includes(q) ?? false;
        if (!matchesKey && !matchesComment) return false;
      }

      // Status filter
      if (filterType === 'missing') {
        return row.status === 'missing' || row.status === 'example_only';
      }
      if (filterType === 'synced') {
        return row.status === 'synced';
      }
      if (filterType === 'secrets') {
        const isSec = inferVariableType(row.key, '') === 'secret';
        return isSec;
      }

      return true;
    });
  }, [rows, searchQuery, filterType]);

  const getTypeBadgeClass = (type: InferredType) => {
    switch (type) {
      case 'port':
        return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
      case 'boolean':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
      case 'url':
        return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
      case 'secret':
        return 'bg-red-950/60 text-red-300 border-red-800/60';
      case 'number':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
      {/* Search and Filters Bar */}
      <div className="border-b border-neutral-800 bg-neutral-900/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables by name or comment..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-md pl-9 pr-3 py-1.5 text-neutral-200 outline-none focus:border-indigo-500 placeholder-neutral-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'all'
                ? 'bg-neutral-800 text-white border-neutral-700 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilterType('missing')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'missing'
                ? 'bg-amber-950/50 text-amber-300 border-amber-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-amber-300'
            }`}
          >
            Missing ({rows.filter(r => r.status === 'missing' || r.status === 'example_only').length})
          </button>
          <button
            onClick={() => setFilterType('synced')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'synced'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-emerald-300'
            }`}
          >
            Synced ({rows.filter(r => r.status === 'synced').length})
          </button>
          <button
            onClick={() => setFilterType('secrets')}
            className={`px-2.5 py-1 rounded-md border transition ${
              filterType === 'secrets'
                ? 'bg-red-950/50 text-red-300 border-red-800 font-medium'
                : 'bg-transparent text-neutral-400 border-transparent hover:text-red-300'
            }`}
          >
            Secrets ({rows.filter(r => inferVariableType(r.key, '') === 'secret').length})
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-20 select-none">
            <tr>
              <th className="py-2.5 px-4 font-semibold text-neutral-300 w-72">Variable Key</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-400 w-28">Type</th>
              <th className="py-2.5 px-3 font-semibold text-neutral-400 w-32">Parity Status</th>
              {environments.map((env) => (
                <th key={env.id} className="py-2.5 px-3 font-semibold text-neutral-300 min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <span>{env.name}</span>
                    {env.isTemplate && (
                      <span className="text-[10px] text-amber-400 font-mono font-normal">
                        [template]
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-850">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + environments.length}
                  className="py-12 text-center text-neutral-500 font-medium"
                >
                  No variables match your current search/filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const inferredType = inferVariableType(row.key, '');
                const isSecret = inferredType === 'secret';

                return (
                  <tr
                    key={row.key}
                    className="hover:bg-neutral-900/40 transition group"
                  >
                    {/* Key Name & Comment */}
                    <td className="py-2.5 px-4 font-mono font-medium text-neutral-200">
                      <div className="flex flex-col">
                        <span className="truncate max-w-xs">{row.key}</span>
                        {row.primaryComment && (
                          <span className="text-[10px] text-neutral-500 font-sans italic truncate max-w-xs">
                            # {row.primaryComment}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Inferred Type Badge */}
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getTypeBadgeClass(inferredType)}`}>
                        {inferredType}
                      </span>
                    </td>

                    {/* Parity Status Badge */}
                    <td className="py-2.5 px-3">
                      {row.status === 'synced' ? (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                          Synced
                        </span>
                      ) : row.status === 'example_only' ? (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">
                          Example Only
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-medium">
                          Missing in {row.missingIn.length}
                        </span>
                      )}
                    </td>

                    {/* Environment Value Columns */}
                    {environments.map((env) => {
                      const valObj = row.values[env.id];
                      const cellId = `${row.key}-${env.id}`;
                      const isRevealed = Boolean(revealedSecrets[cellId]);
                      const isCopied = copiedCell === cellId;

                      if (!valObj || !valObj.isPresent) {
                        // Missing in this environment!
                        return (
                          <td key={env.id} className="py-2.5 px-3 bg-red-950/10">
                            <div className="flex items-center justify-between gap-1 bg-red-950/30 border border-red-900/40 rounded px-2 py-1 text-red-400 text-[11px]">
                              <span>Missing</span>
                              {environments.length > 1 && (
                                <button
                                  onClick={() => {
                                    // Find first env where this key IS present
                                    const sourceEnv = environments.find(e => row.values[e.id]?.isPresent);
                                    if (sourceEnv) {
                                      onCopyFromOtherEnv(env.id, sourceEnv.id, row.key);
                                    }
                                  }}
                                  className="text-red-300 hover:text-white flex items-center gap-0.5 hover:underline"
                                  title="Sync from another environment"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>Sync</span>
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const rawVal = valObj.value;
                      const displayVal = isSecret && !isRevealed ? '••••••••••••' : rawVal;

                      return (
                        <td key={env.id} className="py-2.5 px-3 font-mono text-[11px]">
                          <div className="flex items-center justify-between gap-1 group/cell bg-neutral-900/60 border border-neutral-800/80 rounded px-2 py-1 hover:border-neutral-700">
                            <input
                              type="text"
                              value={displayVal}
                              onChange={(e) => onUpdateValue(env.id, row.key, e.target.value)}
                              className="bg-transparent border-none outline-none flex-1 text-neutral-300 font-mono text-[11px] truncate selection:bg-indigo-500/30"
                              title={rawVal}
                            />

                            <div className="flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 transition">
                              {isSecret && (
                                <button
                                  onClick={() => toggleReveal(cellId)}
                                  className="text-neutral-500 hover:text-neutral-300 p-0.5"
                                  title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleCopy(cellId, rawVal)}
                                className="text-neutral-500 hover:text-neutral-300 p-0.5"
                                title="Copy value"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
