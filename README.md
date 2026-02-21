# Agents Toolkit (ATK) 

> **A deterministic local agent control plane for cross-platform prompt and skill orchestration.**

---

## 1. Vision
**Agents Toolkit (ATK)** is a unified repository and CLI utility for managing agentic coding environments. It bridges the gap between a generic toolkit repo and the specific configuration requirements of tools like **Gemini CLI**, **Claude Code**, **Cursor**, **Windsurf**, and **OpenCode**.

### Philosophy:
*   **Guided Minimalism**: The CLI acts as a mentor, taking you by the hand through every setup step.
*   **Determinism**: Your repo is the single source of truth; all agent configs are symlinked and version-controlled.
*   **Security-First**: Built-in heuristic auditing for skill execution and secret masking.
*   **Beautiful UX**: High-fidelity terminal interface using vertical flows and invisible grids for alignment.

---

## 2. Key Features (The "Ruthless Core")
*   **Variable Resolution Engine**: Use `{{vars}}` in Markdown assets. ATK resolves them from secrets (`.env.atk`), global context, or project-specific JSON.
*   **Dynamic Cache Strategy**: Generic source files stay in the repo; resolved/transpiled content is cached locally and symlinked for agent access.
*   **Security Shield**: Automated auditing of `pre_link` and `post_link` hooks to prevent malicious code execution.
*   **Bundles**: Group multiple components in `bundle.json` and link them recursively with one command.
*   **Profiles**: Save and re-apply active link snapshots per project with `atk profile`.
*   **Multi-Agent Mapping**: Link once and map to platform-specific targets across OpenCode, Gemini, Claude, Cursor, Windsurf, and Codex.
*   **Local Tool Debugger**: Use `atk test <tool>` to dry-run tool logic with mock JSON input.

---

## 3. Getting Started

### Prerequisites:
- **Bun** (for the high-speed runtime)
- **Git** (to manage your toolkit repo)

### 1. Initialize your Toolkit
```bash
git clone https://github.com/msneto/agents-toolkit.git
cd agents-toolkit
bun install
./bin/atk init
```

### 2. Link your first Rule
```bash
atk link rule clean-code
```
*ATK will guide you through choosing a rule and a target platform.*

### Create a new component
```bash
atk create command release-notes --edit
atk create skill api-audit
atk create agent senior-dev
```
*Create scaffolds for commands, skills, rules, and agents. Use `--edit` to open the generated file (`SKILL.md` for skills) immediately.*

To link to every detected environment in the current project:
```bash
atk link rule clean-code --all
```
When a target already has content, ATK uses a per-target conflict wizard with safe defaults (`Backup & Link` first). In CI/headless mode, conflicts fail fast.

### 3. Check Status
```bash
atk status
```
*See detected environments and active ATK links in the current project.*

### 4. Save and switch profiles
```bash
atk profile save my-setup
atk profile switch my-setup
```
*Capture active links and re-apply them later.*

---

## 4. Development Roadmap
- [x] Phase 1-3: Foundation & Security Guard
- [x] Phase 4: Tool Runtime & MCP Bridge
- [x] Phase 5: Advanced Orchestration (Bundles & Profiles)
- [ ] Phase 6: Ingestion & Scale (Harvesting) (Current)

---

## 5. Security Guard
ATK audits every command before execution. If a hook attempts to access sensitive paths or use `sudo`, it will be blocked or require explicit consent.

```text
┌  Security Audit
│
🚫  Blocked: Attempted access to sensitive SSH directory
│
└  ATK has blocked this command for your safety.
```

---

## 6. License & Contributing
MIT License. Contributions are welcome for new Rules, Skills, and Agents.
