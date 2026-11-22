# Security Policy

## Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 1.0.x   | :white_check_mark: |

---

## Security & Privacy Architecture Guarantees

**Export to PDF for ChatGPT** operates under strict client-side constraints:

1. **Zero Remote Transmission:** The extension never initiates remote network calls (`fetch`, `XMLHttpRequest`, WebSockets, or beacons). All operations occur inside ephemeral browser memory.
2. **Minimal Manifest V3 Scoping:**
   - Permissions are restricted strictly to `activeTab`, `scripting`, and `storage`.
   - Host permissions are limited solely to `https://chatgpt.com/*`.
3. **DOM Sanitization:**
   - Script elements (`<script>`), inline style blocks (`<style>`), and untrusted external resource links (`javascript:` URLs, external SVG references) are stripped during document cloning.
4. **No Telemetry or Tracking:** No analytics, error trackers, or third-party SDKs are embedded in the code.

---

## Reporting a Vulnerability

If you discover a potential security issue or vulnerability within this extension, please do **not** open a public issue.

Instead, please send a responsible disclosure report directly to:

- **Email:** [gdalvi20dec@gmail.com](mailto:gdalvi20dec@gmail.com)
- **Subject:** `[SECURITY] Export to PDF for ChatGPT — Vulnerability Report`

Please include:

- A description of the issue and potential impact.
- Steps to reproduce or proof-of-concept code.
- The browser version and environment details.

You will receive an initial response within 48 hours, followed by a remediation timeline.
