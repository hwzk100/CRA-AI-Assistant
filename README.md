# CRA AI Assistant

> AI 驱动的临床研究助理桌面工具

CRA AI Assistant 是一款基于 Electron 的桌面应用，帮助临床研究助理（CRA）从临床试验方案文档和受试者资料中自动提取入排标准、访视计划、受试者数据，并通过 AI 进行受试者资格核验。

## 功能特性

- **AI 自动提取** — 从 PDF/图片中提取入选标准、排除标准、访视计划、受试者数据
- **智能资格核验** — AI 逐条比对入排标准与受试者数据，给出判定和证据引用
- **多格式支持** — 文本型 PDF、扫描型 PDF、PNG、JPG
- **多服务商** — 支持智谱 AI (GLM) 和 OpenAI 兼容端点
- **数据持久化** — 所有提取数据自动保存，重启应用后恢复

## 技术栈

Electron · React · TypeScript · Zustand · Tailwind CSS · Webpack

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 配置 API 密钥
cp .env.example .env
# 编辑 .env 填入 ZHIPU_API_KEY

# 一键启动
npm run start
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run start` | 开发模式：构建 + 启动渲染服务 + 启动 Electron |
| `npm run build` | 生产构建 |
| `npm run build:main` | 仅构建主进程 |
| `npm run build:renderer` | 仅构建渲染进程 |
| `npm run dev` | Watch 模式（不启动 Electron） |

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Gateway   │  │ Document  │  │ Eligibility  │  │
│  │ Agent     │  │ Agent     │  │ Agent        │  │
│  │ (AI路由)  │  │ (文档提取) │  │ (资格核验)   │  │
│  └──────────┘  └───────────┘  └──────────────┘  │
├─────────────────────────────────────────────────┤
│              Preload (安全桥接)                   │
├─────────────────────────────────────────────────┤
│              Renderer (React UI)                 │
│  Sidebar │ File Upload │ Worksheet Panel         │
└─────────────────────────────────────────────────┘
```

**三大 AI Agent**：

| Agent | 职责 |
|-------|------|
| Gateway | AI API 统一网关，路由到智谱/OpenAI 适配器 |
| Document | 识别文件类型，分块/转图片，AI 提取结构化数据 |
| Eligibility | 将入排标准与受试者数据逐条比对，输出核验报告 |

## 项目文档

- [开发者手册](docs/开发者手册.md) — 开发环境搭建、架构详解、开发指南
- [产品需求文档](docs/产品需求文档.md) — 功能需求、UI 设计、数据规格
- [系统架构文档](docs/系统架构.md) — 进程架构、IPC 通信、数据流、安全设计
- [接口规范文档](docs/接口规范.md) — IPC 通道、Preload API、AI 提示词模板

## 许可证

MIT License
