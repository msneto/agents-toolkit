# ATK User Experience (UX) Manifest v1.1

> **Goal:** High-fidelity, deterministic, and educational terminal interface.

---

## 1. Visual Identity

### 1.1 Professional Iconography
We use minimalist, high-contrast symbols to establish visual weight:
- `◈` **Rule**: Behavioral constraints and standards.
- `⬢` **Skill**: Modular executable capabilities.
- `☇` **Command**: Ready-to-use prompts and shortcuts.
- `◎` **Agent**: Persona and identity definitions.
- `⬡` **Environment**: Detected agentic ecosystems (Cursor, Gemini).
- `✔` / `✖` / `⚠` **Status**: Affirmative, negative, and warning signals.

### 1.2 The "Mentor" Pattern
The CLI must proactively guide the user:
- **Explanations**: Use `clack.note()` to explain *why* an environment was auto-selected.
- **Next Steps**: Every command output must end with a dim `tip()` suggesting the next logical action.
- **Safe Collisions**: Never overwrite data without offering a `[Backup]` option first.

---

## 2. Layout Standards

### 2.1 Invisible Grids (Alignment)
We avoid ragged text. All listings MUST be aligned using the `alignColumns` utility:
- **Gutter 1 (Icon)**: 3 characters.
- **Gutter 2 (Name)**: 20 characters (Bold).
- **Gutter 3 (Type)**: 12 characters (Dim).
- **Gutter 4 (Description)**: Variable.

### 2.2 Path Truncation
Paths longer than 40 characters MUST be middle-truncated:
`~/config/atk-nodejs/cache/re...strict.md`

---

## 3. Interaction Model

### 3.1 Zero-Friction Flow
- **Direct Execution**: If args are provided (e.g., `atk link rule react`), skip the selection prompt.
- **Smart Detection**: If only 1 environment is detected, auto-select it and skip the platform prompt.
- **Fuzzy Short-circuit**: If `explore` query matches exactly 1 item, offer to link it immediately.

### 3.2 CI & Headless Safety
If `isTTY` is false or `--ci` flag is used:
- **Fail Fast**: Exit with code `1` if a variable is missing or a conflict exists.
- **Silence**: Only output machine-readable logs or raw data.
