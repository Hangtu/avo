# 0008. AGENTS.md + docs/ as the single contract for AI agents

- **Status:** Accepted
- **Date:** 2026-11-03

## Context

The team uses several coding agents: Claude Code, OpenAI Codex/GPT, and DeepSeek models through agent harnesses. Each tool has its own instruction file format, and duplicated rule files drift apart.

As of 2026, `AGENTS.md` is an open standard (stewarded by the Agentic AI Foundation, part of the Linux Foundation). It is read natively by:
- Codex
- Cursor
- GitHub Copilot
- Claude Code (v2.1.277+; used when no `CLAUDE.md` exists)
- OpenCode, Cline, Kilo, Amp, Devin/Windsurf, Jules, Antigravity

## Decision

- `AGENTS.md` at the repo root is the **only** always-loaded instruction file. It stays short (under ~200 lines): commands, golden rules, a structure map, boundaries, and a routing table into `docs/`.
- Detailed rules live in `docs/` and are loaded on demand. Step-by-step procedures live in `docs/playbooks/`.
- The `nextjs-agent-rules` block that `next dev` maintains inside `AGENTS.md` is kept. It points agents to version-matched Next.js docs in `node_modules/next/dist/docs/`.
- We don't keep tool-specific copies of rules. If a tool needs its own file, it contains only a pointer:
  - Claude Code: a `CLAUDE.md` containing `@AGENTS.md`, only if Claude-specific rules are ever needed.
  - Gemini CLI: `{"context":{"fileName":"AGENTS.md"}}` in its settings.
  - Aider: `read: AGENTS.md` in its config.
- Guardrails that must hold regardless of which agent is used are enforced by tooling, not prose: TypeScript, ESLint boundaries, lefthook git hooks, and CI.

## Consequences

- **Positive:**
  - One source of truth; works with any agent.
  - Docs double as onboarding for humans.
- **Negative:**
  - Agents must follow links to load detail. The routing table must stay accurate.

## Enforcement

- Doc ownership rules (AGENT-1…3).
- PR checklist item "docs updated".
