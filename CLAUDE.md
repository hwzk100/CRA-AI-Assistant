# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run start          # Dev: build + serve renderer on :3000 + launch Electron
npm run build          # Production build both processes
npm run build:main     # Dev build main process only
npm run build:renderer # Dev build renderer only (starts dev server on :3000)
npm run dev            # Watch mode for both (no Electron launch)
npm run electron       # Launch Electron (run build:main first)
npm run clean          # Delete dist/
```

No test runner or linter is configured.

## Architecture

Electron + React + TypeScript desktop app for Clinical Research Assistants. Four layers:

**Main Process** (`src/main/`) — Node.js/Electron runtime
- `index.ts` creates BrowserWindow, registers IPC handlers
- `config.ts` manages settings via `electron-store` with `electron.safeStorage` encryption. Loads from `.env` → encrypted store → `DEFAULT_CONFIG`
- `ipc-handlers.ts` registers all `ipcMain.handle()` channels. Holds uploaded file info as module-level in-memory state (`protocolFileInfo`, `subjectFileInfo`)
- Three agents under `src/main/agents/`:
  - **gateway/** — AI API calls via `SmartRouter` + adapter pattern (`ZhipuAdapter`, `OpenAIAdapter`). Both use axios with OpenAI-compatible chat completions format. `invokeGateway()` is the public entry point; `resetRouter()` clears the singleton so config changes take effect
  - **document/** — PDF/image parsing and data extraction. `pdf-parse` (CJS `require()`) for text extraction, `pdf-to-img` (ESM dynamic `import()`) for scanned PDFs. Three strategies: text-PDF (chunk + AI), scanned-PDF (to-image + AI), image (direct AI)
  - **eligibility/** — Sends criteria + subject data to AI, parses structured pass/fail JSON response

**Renderer** (`src/renderer/`) — Browser/React runtime, `target: 'web'`
- Single Zustand store (`src/renderer/hooks/useStore.ts`) with `persist` middleware on localStorage key `cra-ai-assistant-storage`. Persists data arrays and settings, not transient UI state
- Three-panel layout: Sidebar (w-60) | File Panel (w-80) | Worksheet Panel (flex-1)
- Tailwind CSS with custom `primary` color palette (blue-based)
- All UI strings are in Chinese

**Shared** (`src/shared/`)
- `types/` — Two parallel type systems: extraction types (`protocol.ts`, `subject.ts`, `eligibility.ts`) for raw AI output, and worksheet types (`worksheet.ts`) for richer UI representation. `worksheet.ts` is NOT re-exported from `types/index.ts` to avoid name conflicts — import it directly
- `constants/` — `ipc-channels.ts` (channel names), `app.ts` (version, file constraints, worksheet config), `models.ts` (model definitions)

**Preload** (`src/preload/index.ts`) — `contextBridge` exposes 9 methods as `window.electronAPI`. Note: preload uses hardcoded channel strings instead of importing from shared constants.

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `GET_SETTINGS` / `SAVE_SETTINGS` | R→M | Config read/write (save also resets gateway router) |
| `TEST_CONNECTION` | R→M | Sends "请回复连接成功" to AI, returns latency |
| `UPLOAD_PROTOCOL_FILE` / `UPLOAD_SUBJECT_FILE` | R→M | Validate file + detect type (text-pdf/scanned-pdf/image) |
| `EXTRACT_CRITERIA` / `EXTRACT_SUBJECT_DATA` | R→M | AI extraction from previously uploaded file |
| `VERIFY_ELIGIBILITY` | R→M | AI eligibility verification (criteria + subject data) |
| `PROCESSING_PROGRESS` | M→R | Push progress updates via `webContents.send()` |

## Key Conventions

- **Webpack path aliases**: Main/preload use `@main` and `@shared`; renderer uses `@shared` and `@renderer`
- **Two separate tsconfigs**: `tsconfig.json` (main, CommonJS) and `tsconfig.renderer.json` (renderer, ESNext with DOM)
- **Type imports from deep paths**: Gateway adapters are 4 levels deep (`src/main/agents/gateway/adapters/`), requiring `../../../../shared/` relative imports
- **Module compatibility**: `pdf-parse` must use `require()`, `pdf-to-img` must use dynamic `import()`
- **API key handling**: Keys encrypted with `electron.safeStorage`, stored in `electron-store` with additional `encryptionKey`. `.env` file (gitignored) is the primary key source for dev
- **File processing flow in renderer**: Protocol: upload → extractCriteria → splits into inclusion/exclusion. Subject: upload → extractSubjectData → stores demographics/medications → if criteria exist, runs verifyEligibility
