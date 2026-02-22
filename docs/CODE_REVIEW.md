# Code Review Report

## Assumptions

- Scope is the current frontend codebase in this repository (static HTML/CSS/JS + Web Components).
- The goal is review-only (no production behavior changes in this pass).
- Risk rating uses **High / Medium / Low** based on exploitability + impact in a browser context.

## How to run

- Install dependencies: `pnpm install`
- Lint: `pnpm lint`
- Typecheck placeholder: `pnpm typecheck`
- Tests placeholder: `pnpm test`

## Scope

- Reviewed key runtime surfaces: `index.html`, `deals.js`, `collection.js`, and security-sensitive services in `components/`.
- Focus areas: XSS, credential handling, third-party script trust boundary, and link hardening.

## File tree

- `docs/CODE_REVIEW.md` (this report)

---

## Findings

### 1) Potential DOM XSS via unsanitized `innerHTML` sinks (**High**)

**Why this matters:** User/AI/CSV-derived strings are inserted into `innerHTML` without explicit escaping/sanitization. If attacker-controlled content reaches these paths, arbitrary script injection is possible.

**Evidence:**

- Chat rendering writes dynamic content to `innerHTML` and appends metadata HTML.
- CSV preview interpolates artist/title directly into table HTML.

**Remediation direction:**

- Prefer `textContent` and DOM node construction APIs.
- If rich text is required, sanitize using a robust allow-list sanitizer (e.g., DOMPurify with strict config).
- Add regression tests covering malicious payloads like `<img src=x onerror=alert(1)>` and `<svg/onload=...>`.

---

### 2) API secrets stored in `localStorage` (**High**)

**Why this matters:** `localStorage` is readable by any script executing in origin context. With any XSS or third-party compromise, long-lived API keys can be exfiltrated.

**Evidence:**

- OpenAI API key and model loaded from `localStorage`.
- Discogs credentials loaded from `localStorage`.

**Remediation direction:**

- Move secret handling server-side (BFF/proxy pattern).
- Replace persistent browser storage with ephemeral session exchange where possible.
- Rotate exposed keys and define explicit TTL/expiry workflows.

---

### 3) External links opened with `target="_blank"` missing `rel` hardening (**Medium**)

**Why this matters:** Without `rel="noopener noreferrer"`, opened pages can use `window.opener` for tabnabbing/phishing.

**Evidence:**

- Discogs link in deal modal opens in a new tab but lacks `rel` attributes.

**Remediation direction:**

- Add `rel="noopener noreferrer"` to all `_blank` anchors.
- Consider a lint rule/check to enforce this globally.

---

### 4) Third-party CDN scripts loaded without SRI and strict CSP boundary (**Medium**)

**Why this matters:** Unpinned/unverified third-party scripts increase supply-chain risk. Missing CSP constraints make script injection impact larger.

**Evidence:**

- Multiple external scripts loaded from CDNs directly in `index.html`.

**Remediation direction:**

- Pin exact versions and add `integrity` + `crossorigin` where supported.
- Define a strict CSP with nonces/hashes and minimal `script-src` allow-list.

---

## Quick wins (priority order)

1. Replace unsafe `innerHTML` sinks in high-risk render paths (chat + CSV preview) with safe DOM APIs.
2. Remove client-side storage of API secrets; route calls through a server-side proxy.
3. Add `rel="noopener noreferrer"` for every `_blank` link.
4. Introduce CSP + SRI for external script dependencies.

## Suggested commit message

- `docs(security): add code review report with prioritized findings and remediation plan`
