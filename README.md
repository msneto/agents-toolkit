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
*   **Variable Resolution Engine**: Use `{{vars}}` in Markdown rules. ATK resolves them from secrets (`.env.atk`), global context, or project-specific JSON.
*   **Dynamic Cache Strategy**: Generic rules stay in the repo; resolved prompts are cached locally and symlinked for agent access.
*   **Security Shield**: Automated auditing of `pre_link` and `post_link` hooks to prevent malicious code execution.
*   **Multi-Agent Mapping**: Link one rule and ATK automatically knows to name it `.cursorrules`, `GEMINI.md`, or `.clauderules`.
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

### 3. Check Status
```bash
atk status
```
*See exactly which symlinks are active and which variables are resolved.*

---

## 4. Development Roadmap
- [x] Phase 1-3: Foundation & Security Guard
- [ ] Phase 4: Tool Runtime & MCP Bridge (Current)
- [ ] Phase 5: Advanced Orchestration (Bundles & Profiles)
- [ ] Phase 6: Ingestion & Scale (Harvesting)

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
