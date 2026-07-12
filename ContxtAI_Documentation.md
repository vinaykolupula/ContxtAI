# ContxtAI — Portable Context Layer for AI Applications
**Version:** 0.1.0-draft  
**Status:** Pre-build · Architecture locked  
**License:** Apache 2.0  
**Author:** Vinay  

---

## Table of Contents

1. [Vision and Problem](#1-vision-and-problem)
2. [Core Concepts](#2-core-concepts)
3. [System Architecture](#3-system-architecture)
4. [Component Specifications](#4-component-specifications)
   - 4.1 [Browser Extension](#41-browser-extension)
   - 4.2 [Context Engine](#42-context-engine)
   - 4.3 [Template Engine](#43-template-engine)
   - 4.4 [Bundle Store](#44-bundle-store)
   - 4.5 [Context Capture Engine](#45-context-capture-engine)
5. [ContextBundle Schema](#5-contextbundle-schema)
6. [ContextBridge Interface](#6-contextbridge-interface)
7. [Storage Layer Decision](#7-storage-layer-decision)
8. [Injection Strategy](#8-injection-strategy)
9. [API Reference](#9-api-reference)
10. [Privacy Model](#10-privacy-model)
11. [Roadmap](#11-roadmap)
12. [Folder Structure](#12-folder-structure)
13. [Tech Stack](#13-tech-stack)
14. [Open Source Strategy](#14-open-source-strategy)
15. [Build Instructions for AI Agents](#15-build-instructions-for-ai-agents)

---

## 1. Vision and Problem

### Vision

ContxtAI is a free, open-source framework that gives users **ownership of their AI context**. Instead of every AI tool maintaining isolated, vendor-locked memory, users maintain a single portable context layer that travels with them across every AI application they use.

The user's memory belongs to the user.

### The Problem

Every AI conversation starts from zero. Users repeatedly explain:

- Who they are and their role
- What projects they are working on
- Their coding style and architecture preferences
- Their writing tone and audience
- Their business context and constraints
- Their design aesthetic and tooling

This causes:

- Wasted tokens and time on every session
- Inconsistent AI outputs across tools
- Deep vendor lock-in (ChatGPT's memory doesn't transfer to Claude, which doesn't transfer to Cursor)
- No user ownership or auditability of what the AI "knows"

### The Solution

A browser extension and local framework that provides a single command:

> **"Activate."** → generates and injects the right context into whichever AI tool is open.

ContxtAI does not replace AI memory features. It sits above them as a user-controlled, portable, inspectable layer that any AI tool can consume.

---

## 2. Core Concepts

### ContextBundle

A versioned, structured collection of context. A bundle contains everything relevant to a specific persona, project, or workflow. Bundles are portable — they can be exported, imported, shared, and version-controlled like code.

Example bundles: `personal`, `startup`, `coding`, `design`, `writing`, `research`

### Context Profile

A mapping of which parts of a bundle to surface for a specific AI tool. The same bundle produces different outputs depending on the target tool.

| Tool | What it receives |
|---|---|
| Cursor | Code conventions, architecture rules, stack details |
| ChatGPT | Project context, role, goals |
| Claude | Writing preferences, audience, tone |
| Midjourney | Design style, palette, visual references |
| Gemini | Research context, domain knowledge |

### Context Injection

The act of composing context from a bundle, formatting it for a target tool, and inserting it into the tool's input. Can be triggered manually (copy-paste) or automatically (DOM injection).

### ContextBridge

A per-platform adapter that handles the specifics of detecting the target AI tool and injecting context into it. Each AI platform has its own bridge implementation.

---

## 3. System Architecture

```
User
  │
  ▼
Browser Extension (Plasmo)
  │   detects active AI site
  │   shows activation UI
  │   triggers bundle selection
  │
  ├──────────────────┐
  ▼                  ▼
Context Engine    Context Capture Engine
  │   loads bundle   │   Macro-Capture (Extract Context from Chat)
  │   ranks context  │   Micro-Capture (Highlight-to-Save Pin)
  │   composes       │   writes to Bundle Store
  │                  │
  ├─────────────────────────────────────┐
  ▼                                     ▼
Template Engine                      Bundle Store
format output                        IndexedDB / 
per AI tool                          SQLite
  │
  ▼
ContextBridge (per platform)
  │   chatgpt.ts / claude.ts / cursor.ts / ...
  │
  ▼
AI Tool
(ChatGPT · Claude · Gemini · Cursor · Midjourney · Local LLMs)
```

### Data Flow

1. User opens an AI tool in the browser
2. The extension detects the domain and matches it to a known `ContextBridge`
3. The extension UI shows the active bundle name and an "Activate" button
4. On activation, the Context Engine loads and composes the bundle
5. The Template Engine formats the output for the target platform
6. The ContextBridge injects the formatted context into the tool's input
7. The user continues the conversation with context already loaded

---

## 4. Component Specifications

### 4.1 Browser Extension

**Technology:** Plasmo + React + TypeScript

**Responsibilities:**

- Detect the current AI website by matching `window.location.hostname` against a registry of known platforms
- Display the activation popup with the current bundle name, a bundle switcher, and an inject button
- On activation, call into the Context Engine and pass the result to the appropriate ContextBridge
- Handle copy-to-clipboard as a fallback for platforms without a ContextBridge

**Key files:**

```
extension/
  popup/
    Popup.tsx          # Main UI — bundle switcher, activate button, status
    BundleCard.tsx     # Individual bundle display
  content/
    index.ts           # Injected into page, communicates with popup via messages
    bridges/
      chatgpt.ts
      claude.ts
      gemini.ts
      cursor.ts
  background/
    index.ts           # Service worker — site detection, storage access
  manifest.config.ts   # Plasmo manifest — permissions, matches
```

**Permissions required:**

```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://cursor.com/*"
  ]
}
```

**Important note on MV3:** Background service workers in Manifest V3 do not persist state between events. All persistent data must go through `chrome.storage.local` or IndexedDB. Never store active bundle state in a JavaScript variable inside the service worker.

---

### 4.2 Context Engine

**Technology:** TypeScript, optional MiniLM embeddings (V2+)

**Responsibilities:**

- Load a bundle from the Bundle Store by ID
- Accept a `CompositionConfig` (target platform, token budget, active tags)
- Rank context fields by `weight` and tag relevance
- Compose the final context string within the token budget
- In V2+, use local embeddings to semantically retrieve relevant fields based on the current conversation topic

**Core function:**

```typescript
async function composeContext(
  bundleId: string,
  config: CompositionConfig
): Promise<ComposedContext>
```

**CompositionConfig:**

```typescript
interface CompositionConfig {
  platform: AIPlatform;          // "chatgpt" | "claude" | "cursor" | "gemini" | "midjourney"
  tokenBudget: number;           // Max tokens to use (platform-specific defaults below)
  activeTags?: string[];         // Filter to context items matching these tags
  query?: string;                // Optional: current user query for semantic retrieval (V2+)
}
```

**Platform token budgets (defaults):**

| Platform | Default budget | Notes |
|---|---|---|
| ChatGPT | 4000 | GPT-4o optimized |
| Claude | 8000 | Claude 3.5 Sonnet/Opus optimal recall |
| Gemini | 10000 | Gemini 1.5 Pro massive context |
| Cursor | 4000 | Codebase dense injection limit |
| Midjourney | 300 | Embedded in `/imagine` prompt — hard limit |

---

### 4.3 Template Engine

**Technology:** TypeScript

**Responsibilities:**

- Accept a `ComposedContext` object
- Transform it into a string formatted for the target platform
- Apply platform-specific conventions (e.g., Cursor uses markdown rules syntax, Midjourney uses comma-separated style tokens)

**Templates are plain TypeScript functions, not template files.** This makes them testable, type-safe, and easy to contribute.

```typescript
interface PlatformTemplate {
  platform: AIPlatform;
  format(context: ComposedContext): string;
  maxTokens: number;
}
```

**Example — Claude template:**

```typescript
const claudeTemplate: PlatformTemplate = {
  platform: "claude",
  maxTokens: 4000,
  format(context) {
    return [
      `You are assisting ${context.identity.name}, ${context.identity.role}.`,
      "",
      context.fields
        .filter(f => f.tags?.includes("writing") || f.tags?.includes("general"))
        .map(f => `${f.label}: ${f.content}`)
        .join("\n"),
    ].join("\n");
  }
};
```

**Example — Midjourney template:**

```typescript
const midjourneyTemplate: PlatformTemplate = {
  platform: "midjourney",
  maxTokens: 300,
  format(context) {
    const styleFields = context.fields.filter(f => f.tags?.includes("design"));
    return styleFields.map(f => f.content).join(", ");
  }
};
```

---

### 4.4 Bundle Store

**Technology:** IndexedDB (MVP), SQLite via WASM (V2+)

**Responsibilities:**

- Persist bundles locally with full schema validation
- Support CRUD operations on bundles and individual context fields
- Handle schema migration when the bundle format version changes
- Export bundles to JSON for sharing and backup

**Store schema (IndexedDB object stores):**

```
bundles         { id, name, version, createdAt, updatedAt, fields[] }
bundle_versions { bundleId, version, snapshot, createdAt }           // V2+
settings        { key, value }
```



---

### 4.5 Context Capture Engine

**Technology:** Content Scripts + Background Workers + IndexedDB

**Responsibilities:**
- Capture raw context naturally from user workflows and feed it into the Bundle Store.
- Provides an alternative to the user manually typing JSON/YAML context fields.

**Surfaces:**
1. **Macro-Capture (Extract Context from Chat):** Injects a prompt into the current conversation asking the AI to distill the chat into a strictly typed JSON array of ContextFields. The user can then paste this JSON into the Options page to instantly populate a bundle.
2. **Micro-Capture (Highlight-to-Save Pin):** A content script that detects text selection on AI platforms. When text is highlighted, a small "Save to Profile" tooltip appears. Clicking it sends the highlighted text to the background worker, which safely appends it to the active bundle in IndexedDB.

---

## 5. ContextBundle Schema

This is the canonical schema for a bundle. All tools, agents, and storage layers must validate against this.

```yaml
# ContextBundle v1.0
version: "1.0"
id: "uuid-v4"
name: "ContxtAI"
description: "Working context for the ContxtAI project"
createdAt: "2025-06-01T00:00:00Z"
updatedAt: "2025-06-26T00:00:00Z"

identity:
  name: "Vinay"
  role: "Founder"
  company: "ContxtAI"

fields:
  - id: "ctx_001"
    label: "Tech stack"
    content: "React, Plasmo, TypeScript, TailwindCSS"
    weight: 9
    tags: ["coding", "technical"]

  - id: "ctx_002"
    label: "Architecture style"
    content: "Clean architecture. Separate domain logic from infra. No fat controllers."
    weight: 8
    tags: ["coding"]

  - id: "ctx_003"
    label: "Response style"
    content: "Concise and technical. Skip preamble. Use code over prose when possible."
    weight: 7
    tags: ["general", "writing"]

  - id: "ctx_004"
    label: "Current focus"
    content: "Building the Highlight-to-Save capture feature and options UI"
    weight: 6
    tags: ["general", "project"]

  - id: "ctx_005"
    label: "Design aesthetic"
    content: "Minimal, dark UI. Inter font. Neutral palette with a single accent color."
    weight: 5
    tags: ["design"]
```

### Field Schema

```typescript
interface ContextField {
  id: string;           // Stable UUID for this field
  label: string;        // Human-readable name shown in the editor
  content: string;      // The actual context text
  weight: number;       // 1–10, higher = higher priority when trimming for token budget
  tags: string[];       // Used for per-platform filtering
  conditional?: {
    platform?: AIPlatform[];   // Only include for these platforms
    bundleTag?: string;        // Only include when bundle has this active tag
  };
}
```

### Valid tags (reserved)

| Tag | Included by |
|---|---|
| `general` | All platforms |
| `coding` | Cursor, ChatGPT, Claude |
| `technical` | Cursor, ChatGPT |
| `writing` | Claude, ChatGPT |
| `design` | Midjourney, Claude |
| `project` | ChatGPT, Claude, Gemini |
| `research` | Gemini, Perplexity |

Custom tags are allowed. Any tag not in this list passes through to all platforms unless a `conditional.platform` filter is set.

---

## 6. ContextBridge Interface

Every AI platform gets a `ContextBridge` implementation. This is the only place that touches the DOM of the target tool.

```typescript
interface ContextBridge {
  platform: AIPlatform;

  /**
   * Returns true if the current page is this platform.
   * Called on every page load by the extension background.
   */
  detect(): boolean;

  /**
   * Returns the DOM element where context should be injected
   * (typically the chat input textarea). Returns null if not found.
   */
  getInjectionPoint(): Element | null;

  /**
   * Injects composed context into the platform.
   * Implementations must handle React synthetic events correctly.
   */
  inject(context: string): Promise<void>;

  /**
   * Returns true if this bridge can read conversation history
   * from the DOM (used for V3 conversation recall).
   */
  canReadConversation(): boolean;

  /**
   * Scrapes visible conversation messages. Only called if
   * canReadConversation() returns true.
   */
  readConversation?(): ConversationMessage[];
}
```

### Implementation note: React synthetic events

Most AI tools use React. Setting `textarea.value = "..."` directly does not trigger React's internal state update and the inject will appear to fail. The correct pattern:

```typescript
async inject(context: string): Promise<void> {
  const el = this.getInjectionPoint() as HTMLTextAreaElement;
  if (!el) return;

  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype, "value"
  )?.set;

  nativeSetter?.call(el, context);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
```

Each bridge must be tested independently as platforms update their DOM structure frequently.

### Bridge status

| Platform | Bridge file | Injection method | Status |
|---|---|---|---|
| ChatGPT | `chatgpt.ts` | Textarea + React events | Planned (MVP) |
| Claude | `claude.ts` | Textarea + React events | Planned (MVP) |
| Gemini | `gemini.ts` | Textarea + React events | Planned (MVP) |
| Cursor | `cursor.ts` | `.cursorrules` prepend | Planned (V2) |
| Midjourney | `midjourney.ts` | Discord input + `/imagine` prefix | Planned (V2) |
| Perplexity | `perplexity.ts` | Textarea | Planned (V2) |
| Local LLMs (Ollama) | `ollama.ts` | System prompt API | Planned (V2) |

---

## 7. Storage Layer Decision

| Option | Use when | Notes |
|---|---|---|
| `IndexedDB` | MVP and default | Native in all browsers, works in Plasmo content scripts, ~50 MB per origin, no install required |
| `SQLite (WASM)` | V2+, large bundles, FTS search | ~1 MB bundle overhead, better for full-text search across many bundles |
| `Local filesystem` | Desktop companion app only | Requires File System Access API or Electron — not available in a plain browser extension |

**Status: IndexedDB implemented and validated for MVP.** A custom singleton pattern handles connections from the service worker safely. Migrate to SQLite WASM at V2 when bundle count and search requirements grow.

### Why not `localStorage`?

`localStorage` is synchronous, has a 5 MB limit, is not accessible from service workers (background scripts), and serializes poorly for structured data. Do not use it.

---

## 8. Injection Strategy

ContxtAI supports three injection strategies. MVP ships with copy-paste only. Auto-inject is V2.

### Strategy 1: Copy-to-clipboard (MVP)

User clicks "Copy context" in the popup. The formatted context is placed in the clipboard. The user pastes it into the AI tool manually.

- Works on every platform with zero DOM risk
- Adds one step of user friction
- Does not require `host_permissions` in the manifest (only `clipboardWrite`)

### Strategy 2: DOM auto-inject (V2)

The ContextBridge finds the input element and injects the context programmatically on activation.

- Seamless UX — one click and context is loaded
- Fragile: each bridge needs maintenance as platforms update
- Requires `host_permissions` and `scripting` in the manifest
- Must handle React synthetic events correctly (see Section 6)

### Strategy 3: System prompt / rules file inject (V2, platform-specific)

For tools that expose a persistent system prompt or configuration file (Claude Projects, Cursor `.cursorrules`, OpenAI Custom Instructions), inject there rather than in the chat input. This is more durable and semantically correct.

- Claude: use the Project system prompt field
- Cursor: write to `.cursorrules` in the workspace root
- OpenAI: use the Custom Instructions API if accessible

**Recommendation:** MVP ships strategy 1. Strategy 2 has been successfully launched for ChatGPT, Claude, and Gemini using `document.execCommand("insertText")`. Strategy 3 is the long-term target for tools that support it.

---

## 9. API Reference

All public functions exported from `@ContxtAI/core`.

### loadBundle

```typescript
function loadBundle(id: string): Promise<ContextBundle>
```

Loads a bundle from the local Bundle Store by ID. Throws if the bundle is not found.

### activateBundle

```typescript
function activateBundle(id: string): Promise<void>
```

Sets the bundle as the currently active one. Persists the selection across sessions.

### generateContext

```typescript
function generateContext(
  bundleId: string,
  config: CompositionConfig
): Promise<ComposedContext>
```

Composes context from a bundle according to the provided config. See Section 4.2 for `CompositionConfig` definition.

### rankContext

```typescript
function rankContext(
  fields: ContextField[],
  config: RankConfig
): ContextField[]
```

Ranks and filters fields for a given composition config. Used internally by `generateContext` but exported for testing and custom pipelines.

```typescript
interface RankConfig {
  platform: AIPlatform;
  tokenBudget: number;
  activeTags?: string[];
  query?: string;   // V2+: used for semantic ranking
}
```

### exportBundle

```typescript
function exportBundle(id: string): Promise<string>
```

Serializes a bundle to a JSON string. Safe to write to disk, share, or version control.

### importBundle

```typescript
function importBundle(json: string): Promise<ContextBundle>
```

Parses and validates a JSON string as a bundle. Assigns a new local ID if the imported bundle's ID conflicts with an existing one. Throws on schema validation failure.

### createBundle

```typescript
function createBundle(partial: Partial<ContextBundle>): Promise<ContextBundle>
```

Creates a new bundle with defaults filled in (UUID, timestamps, empty fields array).

### updateField

```typescript
function updateField(
  bundleId: string,
  fieldId: string,
  update: Partial<ContextField>
): Promise<ContextBundle>
```

Updates a single field inside a bundle and saves. Returns the updated bundle.

---

## 10. Privacy Model

### Default: fully local

- All bundles stored in the browser's IndexedDB — never leaves the device
- No telemetry, analytics, or usage tracking
- No network requests from the core library
- No dependency on external servers for core functionality

### Local Privacy Scrubber

A built-in security engine (`core/src/engine/scrubber.ts`) that protects users from accidentally leaking secrets into cloud AI platforms.
- **Active Scanning:** Automatically intercepts text before it is injected via the DOM or saved via micro-capture.
- **Pattern Matching:** Detects OpenAI/Anthropic/AWS/GCP keys, GitHub/Slack tokens, Stripe keys, Credit Cards, SSNs, Private Keys, and explicitly declared Passwords.
- **Proactive Warning:** Displays a custom, branded browser overlay modal (`ContxtAI says`) if a user highlights and attempts to save sensitive data, explicitly detailing what was found.
- **Zero-Data Leak:** Safely masks values (e.g., `[MASKED_OPENAI_KEY]`) *before* injection, while keeping the local profile intact.
- **Zero-Latency:** Because the regex engine runs entirely in the local browser extension, there is zero latency and no server pinging.

### What ContxtAI will never do

- Train on user context data
- Share bundle contents with Anthropic, OpenAI, Google, or any third party
- Log queries, prompts, or AI responses
- Use third-party analytics SDKs

---

## 11. Roadmap

### MVP (V1) — Weeks 1–6

Goal: prove the core value loop with minimal surface area.

| Feature | Details |
|---|---|
| Bundle editor | Create, edit, delete bundles with the YAML-style schema |
| Bundle switcher | Switch active bundle from the extension popup |
| Context generation | Template engine for ChatGPT, Claude, Gemini |
| Copy-to-clipboard injection | User copies generated prompt and pastes manually |
| Local storage | IndexedDB, no sync |
| Export / import | JSON-based bundle portability |

Target platforms: ChatGPT, Claude, Gemini

### V2 — Weeks 7–14

Goal: remove friction from the injection step, add durability.

| Feature | Details |
|---|---|
| Auto DOM injection | ContextBridge for ChatGPT, Claude, Gemini |
| Tool-specific templates | Cursor, Midjourney, Perplexity bridges |
| Bundle versioning | Git-like diff — see what changed between bundle versions |
| Context diff view | Visual "what will be injected" preview before activation |
| SQLite WASM storage | Better search, larger capacity |
| Token budget UI | Show how much of the budget each field consumes |

### V3 — Weeks 15–24

Goal: conversation memory and context continuity.

| Feature | Details |
|---|---|
| Conversation capture | Scrape and index conversation messages as they happen (opt-in) |
| Session recall | "Use context from last week's architecture discussion" |
| Local embeddings | MiniLM for semantic search across indexed conversations |
| Context search | Search across all bundles and past sessions |

Note: conversation capture requires DOM scraping, which is fragile. Scope to ContxtAI-tagged sessions initially.

### V4 — TBD

Goal: analytics and context intelligence.

| Feature | Details |
|---|---|
| Context analytics | Track which fields were active, which were never surfaced |
| Unused context detection | Flag fields that haven't been relevant in 30+ days |
| Usage heatmaps | Which projects / tools use which context most |

### V5 — TBD

Goal: AI-assisted context management.

| Feature | Details |
|---|---|
| AI-generated summaries | Auto-generate a bundle from a conversation history |
| Auto-update bundles | Detect outdated fields and suggest updates |
| RAG-based selection | Use embeddings to auto-select relevant fields per query |
| MCP integration | Expose bundles as MCP servers for programmatic access |
| Team bundles | Shared org-level context with role-based access |
| Context marketplace | Community-contributed templates and domain bundles |

---

## 12. Folder Structure

```
ContxtAI/
├── extension/                  # Plasmo browser extension
│   ├── popup/                  # React popup UI
│   │   ├── Popup.tsx
│   │   └── components/
│   ├── content/                # Page-injected scripts
│   │   ├── index.ts
│   │   └── bridges/            # Per-platform ContextBridge implementations
│   │       ├── chatgpt.ts
│   │       ├── claude.ts
│   │       ├── gemini.ts
│   │       └── cursor.ts
│   ├── background/             # MV3 service worker
│   │   └── index.ts
│   └── manifest.config.ts
│
├── core/                       # @ContxtAI/core — platform-agnostic logic
│   ├── engine/
│   │   ├── compose.ts          # Context composition
│   │   ├── rank.ts             # Field ranking and filtering
│   │   └── tokenCount.ts       # Rough token estimation
│   ├── templates/
│   │   ├── index.ts            # Template registry
│   │   ├── chatgpt.ts
│   │   ├── claude.ts
│   │   ├── gemini.ts
│   │   ├── cursor.ts
│   │   └── midjourney.ts
│   ├── store/
│   │   ├── indexeddb.ts        # IndexedDB adapter (MVP)
│   │   └── sqlite.ts           # SQLite WASM adapter (V2)
│   ├── types.ts                # All TypeScript interfaces
│   └── index.ts                # Public API exports
│

├── bundles/                    # Example and starter bundles
│   ├── starter-developer.json
│   ├── starter-writer.json
│   └── starter-researcher.json
│
├── docs/                       # Documentation (this file lives here)
│   ├── ContxtAI_Documentation.md
│   └── architecture/
│
└── packages.json
```

---

## 13. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Extension framework | Plasmo | Best DX for Manifest V3, built-in React support, handles Firefox/Chrome differences |
| UI | React + TypeScript | Component reuse between popup and potential web editor |
| Core logic | TypeScript | Type safety across engine, templates, and storage |
| Storage (MVP) | IndexedDB | Native browser API, no install, works in extension context |
| Storage (V2) | SQLite WASM (`@vlcn.io/crsqlite-wasm`) | Full-text search, larger capacity, CRDT sync support |
| Embeddings (V2) | `transformers.js` (MiniLM) | Runs entirely in browser, no server, small model |
| Encryption | WebCrypto API (AES-256-GCM) | Native browser, no library dependency |
| Build | Vite (via Plasmo) | Fast HMR, tree-shaking for small extension bundles |
| Testing | Vitest + Playwright | Unit tests for engine/templates, E2E for injection bridges |
| CI | GitHub Actions | Lint, test, build on every PR |

---

## 14. Open Source Strategy

**License:** Apache 2.0

### Goals

- 5,000+ GitHub stars in first year
- Adoption by AI developer community as the standard portable context format
- Active ecosystem of community-contributed templates and bridges

### Contribution surfaces designed for community

The most important contribution surfaces are designed to be approachable:

- **New ContextBridge:** add a single TypeScript file in `extension/content/bridges/`. Low barrier, high value.
- **New Template:** add a single TypeScript file in `core/templates/`. No knowledge of extension internals required.
- **Starter bundles:** add a JSON file to `bundles/`. No code required.

### Non-goals

- A hosted SaaS version of ContxtAI (this would contradict the privacy model)
- Selling user data or context analytics
- Monetizing the browser extension (keep it free forever)

Optional sustainable revenue paths: hosted team sync infrastructure, enterprise bundle management, optional ContxtAI Cloud for non-technical users.

---

## 15. Build Instructions for AI Agents

This section is written specifically for AI coding agents (Cursor, Claude Code, Copilot Workspace) building ContxtAI. Follow these instructions in order.

### Phase 1: Scaffold the monorepo

1. Initialize a pnpm workspace with two packages: `extension` (Plasmo) and `core` (plain TypeScript library)
2. Create `core/src/types.ts` and define all interfaces from Section 4 and Section 5 of this document
3. Create `core/src/store/indexeddb.ts` implementing CRUD for bundles using the IndexedDB schema in Section 4.4
4. Export all public API functions from `core/src/index.ts` as specified in Section 9

### Phase 2: Core engine

5. Implement `core/src/engine/rank.ts` — accepts a `ContextField[]` and `RankConfig`, returns fields sorted by weight descending, filtered by `activeTags` if provided, trimmed to `tokenBudget`
6. Implement `core/src/engine/tokenCount.ts` — rough estimate: `Math.ceil(text.length / 4)`. This is intentionally approximate.
7. Implement `core/src/engine/compose.ts` calling `rank` then `tokenCount` to build the final `ComposedContext`

### Phase 3: Templates

8. For each platform template in Section 4.3, create the corresponding file in `core/src/templates/`
9. Create a template registry in `core/src/templates/index.ts` that maps `AIPlatform` to a `PlatformTemplate`

### Phase 4: Extension popup

10. Scaffold the Plasmo extension with `npm create plasmo`
11. Build `extension/popup/Popup.tsx` — shows active bundle name, a dropdown to switch bundles, and an "Activate" button
12. On activate: call `generateContext` from `@ContxtAI/core` and write the result to `navigator.clipboard`
13. Wire up bundle switching to `activateBundle` from core

### Phase 5: ContextBridge (V2)

14. Implement `chatgpt.ts` bridge using the React synthetic event pattern from Section 6
15. Test against a live ChatGPT session — verify that the text appears in the input and can be submitted
16. Repeat for `claude.ts` and `gemini.ts`

### Phase 6: Testing

17. Unit test `rank.ts` with bundles that exceed token budget — verify correct trimming
18. Unit test each template with a fixture bundle — verify output format
19. Integration test `indexeddb.ts` using Vitest's browser mode or a fake IndexedDB

### Constraints for agents building this project

- Do not use `localStorage` anywhere. Use IndexedDB via the store adapter.
- Do not store state in the Plasmo service worker background script (MV3 constraint). All persistent state goes through `chrome.storage.local` or the IndexedDB store.
- Template functions must be pure — no side effects, no async, no DOM access.
- ContextBridge implementations are the only code allowed to touch the DOM of the target AI page.
- All user-facing strings must be in English for MVP. Do not hardcode language-specific assumptions in engine logic.
- The sync layer must never be called unless the user has explicitly opted in. Check `settings.syncEnabled === true` before any network call.

---

*End of ContxtAI v0.1.0 documentation.*  
*This document is the source of truth for the MVP build. Update it before changing architecture, not after.*
