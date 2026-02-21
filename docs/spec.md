# Agents Toolkit (ATK) - Technical Specification v1.1

> **Status:** APPROVED & IMPLEMENTED (Core)
> **Version:** 1.1.0
> **Date:** 2026-02-21
> **Focus:** Determinism, Multi-Agent Mapping, standard-compliance

---

## 1. Internal Architecture (Functional)

ATK is built as a series of stateless core functions to ensure high-speed execution and testability.

### 1.1 Key Modules
- **`links.ts`**: The primary engine for `createLink`. Handles variable resolution, transpilation, and symlink creation.
- **`variables.ts`**: Layered resolution engine (Secret > Global > Project) with CI-safe failure modes.
- **`mapping.ts`**: Central registry of agentic environments and their specific file/path requirements.
- **`transpiler.ts`**: Logic for converting toolkit components (Markdown) into agent formats (TOML, JSON).
- **`mcp-server.ts`**: A standard Model Context Protocol server exposing toolkit skills.

---

## 2. Platform Mapping Registry

| Platform | Root Marker | Command Path | Format |
| :--- | :--- | :--- | :--- |
| **OpenCode** | `.opencode` | `.opencode/commands/` | Markdown |
| **Gemini CLI** | `.gemini` | `.gemini/commands/` | TOML (Transpiled) |
| **Claude Code** | `.clauderules` | `.clauderules` | Markdown |
| **Cursor** | `.cursorrules` | `.cursorrules` | Markdown |
| **Windsurf** | `.windsurfrules` | `.windsurfrules` | Markdown |
| **Codex** | `.codex` | `.codex/commands/` | Markdown |

---

## 3. Skill Standard (agentskills.io)

All skills MUST follow this structure to be discovered:
```text
skills/<name>/
├── SKILL.md         # Instructions + YAML Frontmatter
├── manifest.json    # Metadata (Author, Version)
├── tool.json        # Technical Tool IR (JSON Schema)
└── src/index.ts     # Bun logic (expects JSON via STDIN)
```

---

## 4. Safety & Conflict Protocol

When a target file exists and is NOT a managed symlink:
1.  **Detect**: Compare target path against `fs.lstat`.
2.  **Backup**: If user approves, move original to `[filename].atk-bak`.
3.  **Link**: Create relative symlink to centralized cache in `~/.config/atk-nodejs/cache/`.

---

## 5. CLI Command Reference (As Built)

- `atk status`: Dashboard of detected environments and active ATK links.
- `atk explore [query]`: Fuzzy search for components with instant "Found! Link now?" logic.
- `atk link [type] [name]`: Guided or direct linking with auto-platform discovery. Types include `rule`, `skill`, `command`, `agent`, `bundle`. Use `--all` to broadcast to all detected project environments.
  - In interactive `--all`, conflicts are handled per target with a wizard: `Backup & Link`, `Overwrite`, `Skip Target`, or `Abort Broadcast`.
  - In non-interactive/CI mode, conflicts fail fast.
- `atk profile [save|switch|list|delete] [name]`: Save and apply link snapshots (optional `--platform` override on switch).
- `atk create [type] [name] [--edit]`: Scaffolds standard-compliant capabilities for `rule`, `skill`, `command`, and `agent`. In interactive mode, prompts to open the created file in your editor.
- `atk test <name> [-i json]`: Local dry-run debugger for tool logic.
- `atk mcp [install|run]`: Management for the cross-platform MCP bridge.
