# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm run start          # Dev: build + serve renderer on :3000 + launch Electron
npm run build          # Production build both processes
npm run build:main     # Dev build main process only
npm run build:renderer # Dev build renderer only (starts dev server on :3000)
npm run dev            # Watch mode for both (no Electron launch)
npm run electron       # Launch Electron with 4096MB heap (run build:main first)
npm run clean          # Delete dist/
```

No test runner or linter is configured.

## Architecture

Electron + React + TypeScript desktop app for Clinical Research Assistants. Four layers:

**Main Process** (`src/main/`) — Node.js/Electron runtime
- `index.ts` creates BrowserWindow (1400x900, min 1024x700), registers IPC handlers
- `config.ts` manages settings via `electron-store` with `electron.safeStorage` encryption. Loads from `.env` → encrypted store → `DEFAULT_CONFIG`
- `ipc-handlers.ts` registers all `ipcMain.handle()` channels. Holds uploaded file info as module-level in-memory state (`protocolFileInfo`, `subjectFileInfo`)
- Three agents under `src/main/agents/`:
  - **gateway/** — AI API calls via `SmartRouter` + adapter pattern (`ZhipuAdapter`, `OpenAIAdapter`). Both use axios with OpenAI-compatible chat completions format. `invokeGateway()` is the public entry point; `resetRouter()` clears the singleton so config changes take effect. Rate-limited to 5 RPM sliding window with 1500ms minimum gap between calls. Only successful calls count toward the sliding window. Retries up to 5 times: 429 uses 3s base/30s cap backoff, timeout/network errors use 10s exponential backoff. Chunk sizing: 60% of model context window, capped at 6000 tokens. API call logs written to `api-calls-YYYY-MM-DD.log` in Electron userData directory
  - **document/** — PDF/image parsing and data extraction. `pdf-parse` (CJS `require()`) for text extraction, `pdf-to-img` (ESM dynamic `import()`) for scanned PDFs, `file-handler.ts` for type detection (image by extension, text-PDF vs scanned-PDF by 50-char text threshold). Three strategies: text-PDF (chunk + AI), scanned-PDF (to-image + AI), image (direct AI). For text-PDFs, a `section-locator` module first detects headings — numbered patterns (`3.2 入选标准`), Chinese chapter patterns (`第三章 纳入标准`), and bare keyword titles (`入排标准`, `排除标准：`) — and extracts only relevant sections before chunking, falling back to full-text chunking if no headings are found. Criteria extraction uses a combined prompt (inclusion + exclusion + visit schedule in one API call per chunk). Subject extraction adds a **document classification step** — AI first classifies the document into `medical-record`, `lab-report`, or `drug-inventory`, then uses category-specific prompt templates (`subject-prompts-medical.ts`, `subject-prompts-lab.ts`, `subject-prompts-drug.ts`) for extraction
  - **eligibility/** — Sends criteria + subject data to AI, parses structured pass/fail JSON response

**Renderer** (`src/renderer/`) — Browser/React runtime, `target: 'web'`
- Single Zustand store (`src/renderer/hooks/useStore.ts`) with `persist` middleware on localStorage key `cra-ai-assistant-storage`. Persists: settings, inclusionCriteria, exclusionCriteria, visitSchedule, subjectVisits, medications, subjectDemographics. Does NOT persist: files, processing state, errors, UI state
- Three-panel layout: Header (h-14) | Sidebar (w-60) | File Panel (w-80) | Worksheet Panel (flex-1)
- Tailwind CSS with custom `primary` color palette (blue-based)
- All UI strings are in Chinese

**Shared** (`src/shared/`)
- `types/` — Two parallel type systems: extraction types (`protocol.ts`, `subject.ts`, `eligibility.ts`) for raw AI output, and worksheet types (`worksheet.ts`) for richer UI representation. Also `config.ts` (AppConfig, ConnectionTestResult, DEFAULT_CONFIG) and `gateway.ts` (GatewayRequest/Response). `worksheet.ts` is NOT re-exported from `types/index.ts` to avoid name conflicts — import it directly
- `constants/` — `ipc-channels.ts` (channel names), `app.ts` (version, file constraints, worksheet config), `models.ts` (model definitions, context windows, max images per call)

**Preload** (`src/preload/index.ts`) — `contextBridge` exposes 10 methods as `window.electronAPI`. Note: preload uses hardcoded channel strings instead of importing from shared constants.

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `GET_SETTINGS` / `SAVE_SETTINGS` | R→M | Config read/write (save also resets gateway router) |
| `TEST_CONNECTION` | R→M | Sends "请回复连接成功" to AI, returns latency |
| `OPEN_FILE_DIALOG` | R→M | Opens native file dialog, returns selected file paths |
| `UPLOAD_PROTOCOL_FILE` / `UPLOAD_SUBJECT_FILE` | R→M | Validate file + detect type (text-pdf/scanned-pdf/image) |
| `EXTRACT_CRITERIA` / `EXTRACT_SUBJECT_DATA` | R→M | AI extraction from previously uploaded file |
| `VERIFY_ELIGIBILITY` | R→M | AI eligibility verification (criteria + subject data) |
| `PROCESSING_PROGRESS` | M→R | Push progress updates via `webContents.send()` |

## Key Conventions

- **Webpack path aliases**: Main/preload use `@main` and `@shared`; renderer uses `@shared` and `@renderer`
- **Webpack multi-config**: `webpack.main.config.js` exports an array of two configs (main process + preload). `webpack.renderer.config.js` is a single config with dev server on port 3000
- **Two separate tsconfigs**: `tsconfig.json` (main, CommonJS) and `tsconfig.renderer.json` (renderer, ESNext with DOM)
- **Type imports from deep paths**: Gateway adapters are 4 levels deep (`src/main/agents/gateway/adapters/`), requiring `../../../../shared/` relative imports
- **Multi-image support**: `GatewayRequest` supports both single image (`imageBase64`) and batch (`images[]` array) modes. `SmartRouter.getMaxImagesPerCall()` returns per-model limit from `MODEL_SPECS`
- **Prompt templates**: Each agent stores AI prompt templates in `src/main/agents/<agent>/prompts/` directories. Document agent has `criteria-prompts.ts` (protocol extraction), `classification-prompts.ts` (subject doc type classification), and category-specific subject prompts (`subject-prompts-medical.ts`, `subject-prompts-lab.ts`, `subject-prompts-drug.ts`)
- **Utility modules**: `src/main/utils/file-validator.ts` (path validation, base64 encoding) and `src/main/utils/logger.ts` (prefixed console logger used across all agents)

## Environment Variables

`.env` file (gitignored) is the primary config source for development. Supported variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ZHIPU_API_KEY` | Zhipu AI API key (required) | — |
| `ZHIPU_API_ENDPOINT` | Zhipu API endpoint | `https://open.bigmodel.cn/api/paas/v4/chat/completions` |
| `OPENAI_API_KEY` | OpenAI-compatible API key | — |
| `OPENAI_API_ENDPOINT` | OpenAI-compatible endpoint | `https://api.openai.com/v1/chat/completions` |
| `DEFAULT_TEXT_MODEL` | Default text model | `glm-4.7-flash` |
| `DEFAULT_VISION_MODEL` | Default vision model | `glm-4.6v-flash` |

Config priority chain: `.env` environment variables → encrypted `electron-store` values → `DEFAULT_CONFIG` defaults.

## Workflow

用户操作流程分为四个阶段：配置 → 上传方案 → 上传受试者 → 资格核验。

### 阶段 1：初始配置

SettingsDialog → `SAVE_SETTINGS` IPC → `saveConfig()` 加密存储 API key + `resetRouter()` 重启网关

### 阶段 2：方案文件处理

```
FileZone 选文件 → OPEN_FILE_DIALOG IPC
  → UPLOAD_PROTOCOL_FILE IPC → 文件校验 + 类型检测 (text-pdf/scanned-pdf/image)
  → EXTRACT_CRITERIA IPC → Document Agent 按类型选择策略 (分块/转图/直传)
  → AI 返回 ProtocolData → 拆分为 inclusionCriteria + exclusionCriteria
  → 存入 Zustand store → Worksheet Panel 渲染
```

### 阶段 3：受试者文件处理

```
FileZone 选文件 → OPEN_FILE_DIALOG IPC
  → UPLOAD_SUBJECT_FILE IPC → 文件校验 + 类型检测
  → EXTRACT_SUBJECT_DATA IPC → Document Agent 按类型选择策略
  → AI 先分类文档 (病历/化验单/药物表) → 使用对应分类的 prompt 模板提取数据
  → AI 返回 SubjectData → 拆分为 subjectDemographics + medications + subjectVisits
  → 存入 Zustand store → Worksheet Panel 渲染
```

### 阶段 4：资格核验（自动触发）

```
受试者数据提取完成 → 检查是否已有入排标准
  → 是 → VERIFY_ELIGIBILITY IPC
  → Eligibility Agent 逐条比对 (标准 + 受试者数据 → Gateway → AI)
  → 返回每条标准的 eligible (bool) + reason (判定依据)
  → 更新 Zustand store → UI 显示核验矩阵
```

### 数据持久化

Zustand `persist` 中间件自动保存到 `localStorage`（key: `cra-ai-assistant-storage`）：
- **持久化**：settings、inclusionCriteria、exclusionCriteria、visitSchedule、subjectVisits、medications、subjectDemographics
- **不持久化**：files、processing state、errors、UI state
- **启动时**：`onRehydrateStorage` 还原 Date 对象，清除过期的资格核验结果

## Key Implementation Details

- **Module compatibility**: `pdf-parse` must use `require()`, `pdf-to-img` must use dynamic `import()`
- **Section-based extraction**: `section-locator.ts` detects Chinese clinical trial headings via three paths: numbered patterns (`3.2 入选标准`), Chinese chapter patterns (`第三章 纳入标准`), and bare keyword titles (`入排标准`, `排除标准：`) using `isBareKeywordTitle()` heuristics (short line ≤15 chars, no sentence-ending punctuation, keyword within first 4 chars). Extracts only sections matching target types before chunking. Falls back to full-text chunking when no headings detected, no target type matches, or matched text < 50 chars. This reduces API calls from ~18 to 1-2 for typical 100+ page protocols
- **API key handling**: Keys encrypted with `electron.safeStorage`, stored in `electron-store` with additional `encryptionKey`. `.env` file (gitignored) is the primary key source for dev
- **Store rehydration**: Zustand `onRehydrateStorage` revives serialized Date strings back to Date objects and auto-clears stale eligibility results on startup
