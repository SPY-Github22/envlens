import React, { useState, useMemo } from 'react';
import { X, Download, Copy, Check, FileCode, CheckSquare, Square, Box, ShieldCheck } from 'lucide-react';
import { MatrixRow } from '../core/matrix';
import { generateExampleTemplate, generateDockerComposeEnv, generateKubernetesSecret } from '../core/generator';
import { EnvEntry } from '../core/parser';

interface TemplateExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: MatrixRow[];
}

type ExportFormat = 'dotenv' | 'docker' | 'k8s';

export const TemplateExporterModal: React.FC<TemplateExporterModalProps> = ({
  isOpen,
  onClose,
  rows,
}) => {
  const [format, setFormat] = useState<ExportFormat>('dotenv');
  const [alignEquals, setAlignEquals] = useState(false);
  const [alphabeticalSort, setAlphabeticalSort] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [copied, setCopied] = useState(false);

  const entries: EnvEntry[] = useMemo(() => {
    return rows.map((r, i) => {
      let sampleVal = '';
      for (const valObj of Object.values(r.values)) {
        if (valObj.isPresent && valObj.value.trim()) {
          sampleVal = valObj.value;
          break;
        }
      }
      return {
        key: r.key,
        value: sampleVal,
        rawLine: `${r.key}=${sampleVal}`,
        lineNumber: i + 1,
        comment: r.primaryComment,
        precedingComments: [],
      };
    });
  }, [rows]);

  const templateContent = useMemo(() => {
    if (!isOpen) return '';
    if (format === 'docker') {
      return generateDockerComposeEnv(entries);
    }
    if (format === 'k8s') {
      return generateKubernetesSecret(entries);
    }
    return generateExampleTemplate(rows, {
      alignEquals,
      alphabeticalSort,
      includeComments,
    });
  }, [isOpen, rows, entries, format, alignEquals, alphabeticalSort, includeComments]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(templateContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDownloadFilename = () => {
    switch (format) {
      case 'docker':
        return 'docker-compose.env.yml';
      case 'k8s':
        return 'k8s-secret.yaml';
      default:
        return '.env.example';
    }
  };

  const handleDownload = () => {
    const blob = new Blob([templateContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getDownloadFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Multi-Format Environment Exporter
              </h2>
              <p className="text-xs text-neutral-400">
                Export sanitized .env.example templates, Docker Compose environment blocks, or Kubernetes Secret manifests
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

        {/* Format Selector Tabs */}
        <div className="px-6 py-2.5 bg-neutral-950/80 border-b border-neutral-800 flex items-center gap-2 text-xs">
          <button
            onClick={() => setFormat('dotenv')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              format === 'dotenv'
                ? 'bg-indigo-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>.env.example Template</span>
          </button>

          <button
            onClick={() => setFormat('docker')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              format === 'docker'
                ? 'bg-indigo-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Docker Compose YAML</span>
          </button>

          <button
            onClick={() => setFormat('k8s')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
              format === 'k8s'
                ? 'bg-indigo-600 text-white'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kubernetes Secret (YAML)</span>
          </button>
        </div>

        {/* Options Toolbar */}
        <div className="px-6 py-2.5 bg-neutral-950/60 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {format === 'dotenv' ? (
            <div className="flex items-center gap-4 text-neutral-300">
              <button
                onClick={() => setAlphabeticalSort(!alphabeticalSort)}
                className="flex items-center gap-1.5 hover:text-white transition"
              >
                {alphabeticalSort ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span>Sort Alphabetically</span>
              </button>

              <button
                onClick={() => setAlignEquals(!alignEquals)}
                className="flex items-center gap-1.5 hover:text-white transition"
              >
                {alignEquals ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span>Align Equals ('=')</span>
              </button>

              <button
                onClick={() => setIncludeComments(!includeComments)}
                className="flex items-center gap-1.5 hover:text-white transition"
              >
                {includeComments ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-neutral-500" />
                )}
                <span>Preserve Comments</span>
              </button>
            </div>
          ) : (
            <div className="text-neutral-400">
              Formatted according to standard cloud-native deployment specifications
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium transition"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {getDownloadFilename()}</span>
            </button>
          </div>
        </div>

        {/* Template Code Preview */}
        <div className="flex-1 overflow-auto bg-neutral-950 p-6 font-mono text-xs leading-relaxed">
          <pre className="text-neutral-200 whitespace-pre-wrap selection:bg-indigo-500/30">
            {templateContent}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900 flex justify-between items-center text-xs text-neutral-400">
          <span>{rows.length} total environment variables included</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
