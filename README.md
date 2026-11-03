# EnvLens 🔍⚡

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-cyan?style=for-the-badge&logo=github)](https://spy-github22.github.io/envlens/)
[![CI & Deployment](https://github.com/SPY-Github22/envlens/actions/workflows/ci.yml/badge.svg)](https://github.com/SPY-Github22/envlens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **The Multi-Environment Matrix & Secret Leak Doctor**  
> *Visual .env parity checker, accidental secret leak detector, type inference linter, and 1-click sanitized `.env.example` generator.*

🌐 **Live Web App**: [https://spy-github22.github.io/envlens/](https://spy-github22.github.io/envlens/)

---

## 🚀 The Daily Friction It Solves

Every developer works with multiple `.env` files across stages: `.env`, `.env.example`, `.env.local`, `.env.staging`, and `.env.production`.
1. **Missing Variable Bugs**: A missing environment variable crashes app boot or causes silent runtime errors during staging/production deployments.
2. **Accidental Leaks in `.env.example`**: Teammates copy their real `.env` to create an example file, accidentally committing real AWS keys, Stripe secret keys, database credentials, or tokens directly into git history.
3. **Multi-Environment Drift**: Comparing 4 different `.env` files with `grep` or `diff` is painful because keys are declared in different order, with different quotes, and different comments.

**EnvLens** provides an instant, interactive, 100% offline visual matrix that eliminates environment drift and secret leaks before code is committed.

---

## 🔒 Security Architecture: Zero-Leak Guarantee

- **Browser Content Security Policy (CSP)**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self' data:; object-src 'none'; base-uri 'self';
  ```
  `connect-src 'none'` cryptographically blocks the browser engine from making any outbound network requests. Your real production keys, database strings, and `.env` values never leave your machine.
- **Zero Third-Party Telemetry**:
  No trackers, analytics, or external API calls.

---

## ✨ Features

- **📊 Multi-Environment Visual Matrix**:
  Aligns keys across unlimited environments (`Local`, `Staging`, `Prod`, `Example`) in a synchronized grid.
- **🚨 Parity & Missing Key Detection**:
  Instantly highlights keys missing in specific environments (`Missing in Staging`, `Extra in Local`). Includes 1-click **"Sync from Local"** to populate missing values instantly.
- **🛡️ Accidental Secret Leak Auditor**:
  Scans `.env.example` and public template files for real high-entropy credentials (AWS keys `AKIA...`, Stripe `sk_live_...`, GitHub tokens, private keys, database passwords) and offers 1-click **Auto-Sanitize**.
- **🔎 Type & Syntax Linter**:
  Infers semantic types (`port`, `boolean`, `url`, `email`, `secret`, `number`) and flags cross-environment type mismatches (e.g. `PORT` is `8080` in local but a URL in staging).
- **📋 1-Click Sanitized `.env.example` Generator**:
  Generates a clean, sanitized `.env.example` template with smart dummy placeholders (`your_key_here`, `3000`, `postgres://...`) and comments preserved.
- **🪄 Dotenv Formatter & Aligner**:
  Aligns `=` operators and sorts keys alphabetically or preserves section comments.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Vitest](https://vitest.dev/) (100% passing test coverage for parser, matrix, linter, leak detector, and template generator)

---

## 🚀 Quickstart

```bash
# Clone the repository
git clone https://github.com/SPY-Github22/envlens.git
cd envlens

# Install dependencies
npm install

# Run unit tests
npm test

# Launch local app
npm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

---

## 🧪 Automated Tests

Run the test suite:
```bash
npm test
```

Includes 19 automated tests covering:
- Dotenv syntax parser (quotes, multiline, inline/preceding comments, `export` prefixes)
- Multi-environment parity and status calculation
- Accidental secret leak detection and entropy analysis
- Cross-environment type inference and syntax linting
- Sanitized template generation and alignment formatting

---

## 📄 License

MIT © 2026 EnvLens Contributors
