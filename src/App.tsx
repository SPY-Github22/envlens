import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { EnvironmentTabs, EnvironmentState } from './components/EnvironmentTabs';
import { HealthAuditPanel } from './components/HealthAuditPanel';
import { MatrixView } from './components/MatrixView';
import { TemplateExporterModal } from './components/TemplateExporterModal';
import { RawEditorModal } from './components/RawEditorModal';
import { parseDotEnv } from './core/parser';
import { buildEnvMatrix } from './core/matrix';
import { scanEnvironmentForLeaks } from './core/leakDetector';
import { checkCrossEnvTypeMismatches, checkSyntaxAndConventions } from './core/linter';

// Realistic sample datasets
const PRESET_DRIFT = [
  {
    id: 'local',
    name: 'Local (.env)',
    filename: '.env',
    isTemplate: false,
    rawContent: `# Application Port
PORT=3000
NODE_ENV=development
APP_URL="http://localhost:3000"

# Database Configuration
DATABASE_URL="postgres://postgres:localpass@localhost:5432/core_dev"
DATABASE_POOL_SIZE=10

# Caching & Sessions
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

# Payment Gateway
STRIPE_PUBLIC_KEY="pk_test_sample_public_key_demo"
STRIPE_SECRET_KEY="sk_test_sample_secret_key_demo"
STRIPE_WEBHOOK_SECRET="whsec_test_secret_123"

# Feature Flags (NEW)
FEATURE_NEW_BILLING=true
FEATURE_AI_SEARCH=true
SEARCH_API_ENDPOINT="http://localhost:8000/v1"
`,
  },
  {
    id: 'staging',
    name: 'Staging (.env.staging)',
    filename: '.env.staging',
    isTemplate: false,
    rawContent: `# Application Port
PORT=8080
NODE_ENV=staging
APP_URL="https://staging.internal.app"

# Database Configuration
DATABASE_URL="postgres://staging_user:StagingDbSecret123@db.staging.internal:5432/core_staging"
DATABASE_POOL_SIZE=25

# Caching & Sessions
REDIS_URL="redis://redis.staging.internal:6379"
REDIS_PASSWORD="staging_redis_pass_999"

# Payment Gateway
STRIPE_PUBLIC_KEY="pk_test_sample_public_key_demo"
STRIPE_SECRET_KEY="sk_test_sample_secret_key_demo"
# Note: STRIPE_WEBHOOK_SECRET is missing!
# Note: FEATURE_NEW_BILLING and FEATURE_AI_SEARCH are missing!
`,
  },
  {
    id: 'prod',
    name: 'Production (.env.prod)',
    filename: '.env.prod',
    isTemplate: false,
    rawContent: `# Application Port
PORT=80
NODE_ENV=production
APP_URL="https://app.megacorp.com"

# Database Configuration
DATABASE_URL="postgres://master_admin:ProdSuperSecretPassword@db.prod.aws:5432/core_prod"
DATABASE_POOL_SIZE=50

# Caching & Sessions
REDIS_URL="redis://redis.prod.aws:6379"
REDIS_PASSWORD="super_secure_redis_cluster_key"

# Payment Gateway
STRIPE_PUBLIC_KEY="pk_sample_gateway_public_key"
STRIPE_SECRET_KEY="sk_sample_gateway_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_prod_live_webhook_signature"

# Missing FEATURE_AI_SEARCH and SEARCH_API_ENDPOINT!
FEATURE_NEW_BILLING=false
`,
  },
  {
    id: 'example',
    name: 'Template (.env.example)',
    filename: '.env.example',
    isTemplate: true,
    rawContent: `# App Port
PORT=3000
NODE_ENV=development
APP_URL="http://localhost:3000"

DATABASE_URL="postgres://user:password@localhost:5432/dbname"
DATABASE_POOL_SIZE=10
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""

STRIPE_PUBLIC_KEY="pk_test_your_key_here"
STRIPE_SECRET_KEY="sk_test_your_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_key_here"

FEATURE_NEW_BILLING=false
FEATURE_AI_SEARCH=false
SEARCH_API_ENDPOINT="http://localhost:8000"
`,
  },
];

const PRESET_SECRET_LEAK = [
  {
    id: 'local',
    name: 'Local (.env)',
    filename: '.env',
    isTemplate: false,
    rawContent: `PORT=3000\nDATABASE_URL="postgres://postgres:pass@localhost:5432/db"\nAWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nSTRIPE_SECRET_KEY=sk_test_dummy\n`,
  },
  {
    id: 'example',
    name: 'Template (.env.example)',
    filename: '.env.example',
    isTemplate: true,
    // DANGEROUS: Someone committed real production credentials into .env.example!
    rawContent: `# Dangerous real secrets committed accidentally to template
PORT=3000
DATABASE_URL="postgres://prod_admin:SuperSecretProdMasterPassword99@db.prod.internal:5432/core"
AWS_ACCESS_KEY_ID=${'AKIA' + '23B8CD45EF67GH89'}
API_SIGNING_SECRET=9f8e7d6c5b4a3210fedcba9876543210
GITHUB_TOKEN=${'ghp_' + '0123456789abcdefghijklmnopqrstuvwxyz'}
`,
  },
];

const PRESET_CLEAN = [
  {
    id: 'local',
    name: 'Local',
    filename: '.env',
    isTemplate: false,
    rawContent: `PORT=3000\nDATABASE_URL="postgres://localhost/dev"\nSECRET_KEY="local_secret"\n`,
  },
  {
    id: 'staging',
    name: 'Staging',
    filename: '.env.staging',
    isTemplate: false,
    rawContent: `PORT=3000\nDATABASE_URL="postgres://staging/db"\nSECRET_KEY="staging_secret"\n`,
  },
  {
    id: 'prod',
    name: 'Prod',
    filename: '.env.prod',
    isTemplate: false,
    rawContent: `PORT=80\nDATABASE_URL="postgres://prod/db"\nSECRET_KEY="prod_secret"\n`,
  },
];

export function App() {
  const [environments, setEnvironments] = useState<EnvironmentState[]>(() => {
    return PRESET_DRIFT.map(item => ({
      ...item,
      parsed: parseDotEnv(item.rawContent),
    }));
  });

  const [activeEnvId, setActiveEnvId] = useState<string>('local');
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [isRawEditorOpen, setIsRawEditorOpen] = useState(false);

  // Parity matrix
  const matrixSummary = useMemo(() => {
    return buildEnvMatrix(environments);
  }, [environments]);

  // Leak alerts
  const secretLeaksByEnv = useMemo(() => {
    const list: { envId: string; envName: string; leaks: ReturnType<typeof scanEnvironmentForLeaks> }[] = [];
    for (const env of environments) {
      // Prioritize scanning template files, but scan all envs
      if (env.isTemplate) {
        const leaks = scanEnvironmentForLeaks(env.parsed.entries);
        if (leaks.length > 0) {
          list.push({ envId: env.id, envName: env.name, leaks });
        }
      }
    }
    return list;
  }, [environments]);

  const leakCountByEnv = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of secretLeaksByEnv) {
      counts[item.envId] = item.leaks.length;
    }
    return counts;
  }, [secretLeaksByEnv]);

  // Type warnings
  const typeWarnings = useMemo(() => {
    return checkCrossEnvTypeMismatches(matrixSummary.rows, environments);
  }, [matrixSummary.rows, environments]);

  // Syntax warnings
  const syntaxWarnings = useMemo(() => {
    return environments.flatMap(env => checkSyntaxAndConventions(env.id, env.parsed));
  }, [environments]);

  const totalAlerts = secretLeaksByEnv.reduce((sum, item) => sum + item.leaks.length, 0) + typeWarnings.length;

  // Handlers
  const handleLoadSample = (sampleKey: 'saas' | 'drift' | 'clean') => {
    let preset = PRESET_DRIFT;
    if (sampleKey === 'saas') preset = PRESET_SECRET_LEAK;
    if (sampleKey === 'clean') preset = PRESET_CLEAN;

    setEnvironments(preset.map(item => ({
      ...item,
      parsed: parseDotEnv(item.rawContent),
    })));
    setActiveEnvId(preset[0].id);
  };

  const handleUpdateValue = (envId: string, key: string, newValue: string) => {
    setEnvironments(prev =>
      prev.map(env => {
        if (env.id !== envId) return env;

        // Check if key already exists
        const entry = env.parsed.entriesMap.get(key);
        let newContent = env.rawContent;

        if (entry) {
          // Replace line
          const lines = newContent.split('\n');
          const idx = entry.lineNumber - 1;
          if (idx >= 0 && idx < lines.length) {
            lines[idx] = `${key}=${newValue}`;
            newContent = lines.join('\n');
          }
        } else {
          // Append
          newContent = newContent.trimEnd() + `\n${key}=${newValue}\n`;
        }

        return {
          ...env,
          rawContent: newContent,
          parsed: parseDotEnv(newContent),
        };
      })
    );
  };

  const handleCopyFromOtherEnv = (targetEnvId: string, sourceEnvId: string, key: string) => {
    const sourceEnv = environments.find(e => e.id === sourceEnvId);
    if (!sourceEnv) return;
    const entry = sourceEnv.parsed.entriesMap.get(key);
    if (!entry) return;

    handleUpdateValue(targetEnvId, key, entry.value);
  };

  const handleAutoFixLeak = (envId: string, key: string, placeholder: string) => {
    handleUpdateValue(envId, key, placeholder);
  };

  const handleAddEnv = (name: string, content: string, isTemplate: boolean = false) => {
    const id = `env_${Date.now()}`;
    const newEnv: EnvironmentState = {
      id,
      name,
      filename: name.toLowerCase().includes('.env') ? name : `.env.${name.toLowerCase()}`,
      rawContent: content,
      parsed: parseDotEnv(content),
      isTemplate,
    };
    setEnvironments(prev => [...prev, newEnv]);
    setActiveEnvId(id);
  };

  const handleRemoveEnv = (id: string) => {
    if (environments.length <= 1) return;
    setEnvironments(prev => prev.filter(e => e.id !== id));
    if (activeEnvId === id) {
      const remaining = environments.filter(e => e.id !== id);
      if (remaining.length > 0) setActiveEnvId(remaining[0].id);
    }
  };

  const handleToggleTemplate = (id: string) => {
    setEnvironments(prev =>
      prev.map(env => (env.id === id ? { ...env, isTemplate: !env.isTemplate } : env))
    );
  };

  const handleSaveRawContent = (newContent: string) => {
    setEnvironments(prev =>
      prev.map(env => {
        if (env.id !== activeEnvId) return env;
        return {
          ...env,
          rawContent: newContent,
          parsed: parseDotEnv(newContent),
        };
      })
    );
  };

  const activeEnv = environments.find(e => e.id === activeEnvId) ?? environments[0];

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <Header
        onLoadSample={handleLoadSample}
        onOpenExporter={() => setIsExporterOpen(true)}
        onOpenRawEditor={() => setIsRawEditorOpen(true)}
        parityScore={matrixSummary.parityScore}
        totalAlerts={totalAlerts}
      />

      <EnvironmentTabs
        environments={environments}
        activeEnvId={activeEnvId}
        onSelectEnv={setActiveEnvId}
        onAddEnv={handleAddEnv}
        onRemoveEnv={handleRemoveEnv}
        onToggleTemplate={handleToggleTemplate}
        leakCountByEnv={leakCountByEnv}
      />

      <HealthAuditPanel
        parityScore={matrixSummary.parityScore}
        totalUniqueKeys={matrixSummary.totalUniqueKeys}
        missingCount={matrixSummary.missingCount}
        secretLeaks={secretLeaksByEnv}
        typeWarnings={typeWarnings}
        syntaxWarnings={syntaxWarnings}
        onAutoFixLeak={handleAutoFixLeak}
      />

      <MatrixView
        rows={matrixSummary.rows}
        environments={environments}
        onUpdateValue={handleUpdateValue}
        onCopyFromOtherEnv={handleCopyFromOtherEnv}
      />

      {/* Modals */}
      <TemplateExporterModal
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
        rows={matrixSummary.rows}
      />

      {activeEnv && (
        <RawEditorModal
          isOpen={isRawEditorOpen}
          onClose={() => setIsRawEditorOpen(false)}
          envName={activeEnv.name}
          initialContent={activeEnv.rawContent}
          onSaveContent={handleSaveRawContent}
        />
      )}
    </div>
  );
}
