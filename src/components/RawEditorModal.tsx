import React, { useState } from 'react';
import { X, Save, Wand2, FileText, Check } from 'lucide-react';
import { parseDotEnv } from '../core/parser';
import { formatDotEnv } from '../core/generator';

interface RawEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  envName: string;
  initialContent: string;
  onSaveContent: (newContent: string) => void;
}

export const RawEditorModal: React.FC<RawEditorModalProps> = ({
  isOpen,
  onClose,
  envName,
  initialContent,
  onSaveContent,
}) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);

  // Sync if initialContent changes when opened
  React.useEffect(() => {
    setContent(initialContent);
  }, [initialContent, isOpen]);

  if (!isOpen) return null;

  const parsed = parseDotEnv(content);

  const handleFormat = () => {
    const formatted = formatDotEnv(parsed.entries, {
      alignEquals: true,
      alphabeticalSort: false,
      includeComments: true,
    });
    setContent(formatted);
  };

  const handleSave = () => {
    onSaveContent(content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Raw Editor: <span className="text-indigo-400 font-mono">{envName}</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Directly edit or paste your .env file content. Parity matrix updates automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-2.5 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-400 font-mono">
            <span>{content.split('\n').length} lines</span>
            <span>•</span>
            <span className="text-emerald-400">{parsed.entries.length} valid entries</span>
            {parsed.errorLines.length > 0 && (
              <>
                <span>•</span>
                <span className="text-red-400">{parsed.errorLines.length} syntax issues</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFormat}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium transition"
              title="Align '=' characters and format"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Format & Align</span>
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{copied ? 'Saved!' : 'Save & Update'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="flex-1 bg-neutral-950 p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full p-4 font-mono text-xs bg-transparent text-neutral-200 resize-none outline-none focus:ring-1 focus:ring-indigo-500/40 border-none selection:bg-indigo-500/30 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
