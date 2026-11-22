# Contributing to Export to PDF for ChatGPT

Thank you for your interest in contributing! This project is dedicated to providing a clean, privacy-first, and highly reliable conversation export tool for ChatGPT.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js:** v20.x or newer (v22+ recommended)
- **npm:** v10.x or newer
- **Google Chrome** (or any modern Chromium browser like Brave, Edge, Arc)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/gauravdalvi2012/export-to-pdf-for-chatgpt.git
cd export-to-pdf-for-chatgpt

# Install exact dependencies
npm ci

# Compile TypeScript bundles
npm run build
```

---

## 🧪 Testing & Quality Commands

Every contribution must pass formatting, type checking, unit tests, and build packaging:

```bash
# Verify code formatting (Prettier)
npm run format:check

# Format files with Prettier
npm run format

# Run strict TypeScript compiler verification
npm run typecheck

# Run automated Vitest test suite
npm test

# Run Vitest in watch mode for test-driven development
npm run test:watch

# Build and package the extension zip for Chrome Web Store testing
npm run package
```

---

## 🌐 Testing the Extension Locally in Chrome

1. Build the extension:
   ```bash
   npm run package
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the upper right corner.
4. Click **Load unpacked** and select the `dist/` directory.
5. Open any conversation on `https://chatgpt.com/` and click the extension icon in your Chrome toolbar.
6. Verify Chrome's **Save as PDF** preview dialog renders accurately.

---

## 📂 Code Organization

- `src/`: Modular TypeScript source files.
  - `src/index.ts`: Content script entry point and orchestration loop.
  - `src/background.ts`: Service worker for `activeTab` screenshot capture.
  - `src/options.ts`: Options UI logic and sync storage management.
  - `src/dom/`: DOM cleaner, code indentation normalization, citations, and attachment badge logic.
  - `src/scanner/`: Virtualization scroll scanner and DOM settling detectors.
  - `src/capture/`: Bounding-box visual widget cropper.
  - `src/print/`: Print media CSS generation and document assembler.
- `test/`: Vitest test suites using DOM fixtures.
- `scripts/`: Packaging and distribution scripts.

---

## 🚀 Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages.
3. Ensure all tests and checks pass:
   ```bash
   npm run format:check && npm run typecheck && npm test && npm run package
   ```
4. Push your branch and open a Pull Request against `main`.
