# Agents Toolkit (ATK) - Technical Specification v1.0

> **Status:** APPROVED FOR BUILD
> **Version:** 1.0.0 (The "Ruthless Core")
> **Date:** 2026-02-21
> **Focus:** Determinism, Stability, Unix-Compliance, CI-Readiness

---

## 1. Project Definition
**Agents Toolkit (ATK)** is a local control plane for agentic coding environments. It creates a deterministic runtime for Agents, Skills, Rules, and Tools by managing symlinks and resolving configuration variables across disparate ecosystems (Cursor, Gemini, Claude, etc.).

**Core Philosophy:**
*   **Determinism**: Output is predictable. No "magic" fixes.
*   **Explicit over Implicit**: Changes are reported before execution.
*   **Unix-Native**: Respects standard streams, exit codes, and piping.
*   **CI-Ready**: Fails fast in headless modes.

---

## 2. Directory Structure (The Source of Truth)

```text
/
├── agents/                  # Persona definitions (.md)
├── commands/                # Ready-to-use prompts (.md)
├── rules/                   # Behavioral constraints (.md)
├── skills/                  # Modular capabilities
│   └── <name>/
│       ├── manifest.json    # Metadata + Hook definitions
│       ├── tool.json        # Canonical Tool IR (Intermediate Representation)
│       └── prompt.md        # Usage instructions
├── src/                     # CLI Logic (Bun)
├── bin/                     # Entry point
└── .env.atk                 # Local secrets (Git-ignored)
```

---

## 3. The Canonical Tool Schema (IR)

To prevent "Schema Drift" across agents, ATK defines a strict **Intermediate Representation (IR)** for tools, loosely based on a simplified MCP.

```json
{
  "name": "search_docs",
  "description": "Searches the local documentation.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  },
  "runtime": "bun",
  "executable": "src/index.ts"
}
```
*   **Design Decision**: In v1.0, ATK validates tools against this schema. Transpilation to specific agent formats (OpenAI/Gemini) happens deterministically during `link`.

---

## 4. CLI Command Specification (v1.0 Scope)

### 4.1 `atk link <type> <name>`
The primitive operation. Creates a symlink from the toolkit to the target agent environment.

*   **Flags**:
    *   `--dry-run`: Show exactly what paths will be touched. (Default for complex ops).
    *   `--force`: Overwrite existing files (No interactive wizard in CI).
    *   `--ci` / `--non-interactive`: **Fail** if variables are missing or conflicts exist. Do not prompt.
*   **Behavior**:
    1.  **Resolve**: Locate component in `ATK_ROOT`.
    2.  **Validate**: Check `manifest.json` and Tool IR.
    3.  **Transpile**: If linking a tool, generate the target-specific config (e.g., Gemini JSON) in a temporary buffer.
    4.  **Execute**: Create the symlink (or write the transpiled file).

### 4.2 `atk doctor` (Diagnostic Only)
Performs read-only checks and outputs a structured report. **No auto-healing.**

*   **Checks**:
    *   Broken symlinks.
    *   Missing environment variables referenced in prompts (`{{VAR}}`).
    *   Invalid Tool IR syntax.
    *   Permission issues.
*   **Output**:
    ```text
    [FAIL] Rule 'react-strict': Variable {{PROJECT_LANG}} not defined in context.
    [WARN] Skill 'git-helper': Symlink target unreachable.
    ```

### 4.3 `atk init`
Initializes the environment *explicitly*.
*   Creates `~/.config/atk/config.json`.
*   Adds `bin/` to `$PATH`.
*   Creates local `.env.atk` template (but does not populate it).

---

## 5. Variable & Configuration Resolution (Layered)

Resolution is strict and prioritized.

1.  **Secrets**: `.env.atk` (Local, Git-ignored).
2.  **Global Context**: `~/.config/atk/context.json`.
3.  **Project Context**: `./.atk/context.json`.

**Failure State**: In `--ci` mode, if a prompt contains `{{MISSING_VAR}}`, the operation exits with code `1`.

---

## 6. Architecture & Quality Gates

### 6.1 Performance Goals
*   **Startup**: < 50ms.
*   **Link Operation**: < 100ms per file.
*   **No Scanning**: v1.0 does NOT scan the entire home directory. It only looks at known, registered paths.

### 6.2 Implementation Phases

#### Phase 1: The Core (Week 1)
*   [ ] `atk init`: Setup config and paths.
*   [ ] `atk link`: Basic symlinking for Rules/Commands (No tools yet).
*   [ ] `atk doctor`: Basic connectivity checks.
*   [ ] **Test**: CI-mode failure states.

#### Phase 2: The Deterministic Runtime (Week 2)
*   [ ] Variable Resolution Engine (`{{vars}}`).
*   [ ] Tool IR Validator.
*   [ ] Transpiler (IR -> Gemini/OpenAI).

#### Phase 3: Hooks & Safety (Week 3)
*   [ ] `pre_link` / `post_link` execution.
*   [ ] Hook timeouts (5s default).
*   [ ] Output logging.

---

## 7. Deferred Features (Roadmap v2.0)
*   **Harvesting**: Scanning system for existing configs.
*   **Secret Extraction**: Regex scanning of files.
*   **Auto-Healing**: Attempting to fix broken paths automatically.
*   **Merge Wizard**: Interactive conflict resolution.

