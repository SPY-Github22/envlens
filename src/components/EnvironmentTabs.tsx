import React, { useRef } from 'react';
import { Plus, Upload, Trash2, ShieldAlert } from 'lucide-react';
import { ParseResult } from '../core/parser';

export interface EnvironmentState {
  id: string;
  name: string;
  filename: string;
  rawContent: string;
  parsed: ParseResult;
  isTemplate?: boolean;
}

interface EnvironmentTabsProps {
  environments: EnvironmentState[];
  activeEnvId: string;
  onSelectEnv: (id: string) => void;
  onAddEnv: (name: string, content: string, isTemplate?: boolean) => void;
  onRemoveEnv: (id: string) => void;
  onToggleTemplate: (id: string) => void;
  leakCountByEnv: Record<string, number>;
}

export const EnvironmentTabs: React.FC<EnvironmentTabsProps> = ({
  environments,
  activeEnvId,
  onSelectEnv,
  onAddEnv,
  onRemoveEnv,
  onToggleTemplate,
  leakCountByEnv,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const name = file.name;
      const isTemplate = name.includes('example') || name.includes('template') || name.includes('sample');
      onAddEnv(name, content || '', isTemplate);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateEmpty = () => {
    const name = window.prompt('Enter environment name (e.g., Staging, Test, Docker):');
    if (!name || !name.trim()) return;
    onAddEnv(name.trim(), '# New environment variables\n', name.toLowerCase().includes('example'));
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
      {/* Tabs list */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
        {environments.map((env) => {
          const isActive = env.id === activeEnvId;
          const leaks = leakCountByEnv[env.id] || 0;

          return (
            <div
              key={env.id}
              className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition select-none ${
                isActive
                  ? 'bg-neutral-800 border-indigo-500/60 text-white font-medium shadow-sm'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
              }`}
            >
              <button
                onClick={() => onSelectEnv(env.id)}
                className="flex items-center gap-1.5 text-left"
              >
                <span>{env.name}</span>
                <span className="text-[10px] text-neutral-500 font-mono">
                  ({env.parsed.entries.length})
                </span>
              </button>

              {/* Template badge toggle */}
              <button
                onClick={() => onToggleTemplate(env.id)}
                className={`text-[9px] px-1 rounded transition ${
                  env.isTemplate
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-neutral-800/60 text-neutral-500 hover:text-neutral-300'
                }`}
                title={env.isTemplate ? 'Marked as public template (audited for secrets)' : 'Click to mark as template'}
              >
                {env.isTemplate ? 'template' : 'env'}
              </button>

              {/* Secret Leak warning badge */}
              {leaks > 0 && (
                <span
                  className="bg-red-500/20 text-red-300 font-bold px-1.5 py-0.2 rounded-full text-[10px] flex items-center gap-0.5"
                  title={`${leaks} secret leak(s) detected in template file!`}
                >
                  <ShieldAlert className="w-2.5 h-2.5" />
                  {leaks}
                </span>
              )}

              {/* Remove tab button (only if > 1 env) */}
              {environments.length > 1 && (
                <button
                  onClick={() => onRemoveEnv(env.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-red-400 transition"
                  title="Remove this environment"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Upload actions */}
      <div className="flex items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".env,text/plain"
          onChange={handleFileUpload}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
          title="Upload .env file from disk"
        >
          <Upload className="w-3 h-3" />
          <span>Upload File</span>
        </button>

        <button
          onClick={handleCreateEmpty}
          className="flex items-center gap-1 text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
          title="Add a new environment column"
        >
          <Plus className="w-3 h-3" />
          <span>Add Env</span>
        </button>
      </div>
    </div>
  );
};
