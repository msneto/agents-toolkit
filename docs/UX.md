# ATK User Experience (UX) & Interface (UI) Manifest

> **Goal:** Create a "Premium Installer" feel. Professional, minimalist, and deterministic.

---

## 1. Visual Identity & Aesthetic

### 1.1 The "Vertical Flow"
We adopt the **Clack** aesthetic: thin vertical lines (`│`) connect related steps in a wizard. This creates a sense of "continuity" and "progress."
*   **Active Step**: `◇` (Thin diamond)
*   **Completed Step**: `✔` (Checkmark)
*   **Pending/Path**: `│` (Thin pipe)

### 1.2 The Header (Branding)
Every entry point (like `atk init` or `atk` status) starts with a clean, **gradient-colored** header to signify the tool's premium nature.
*   **Gradient Palette**: `cyan` to `magenta` (modern, agentic feel).

### 1.3 Color Hierarchy (Picocolors)
*   **Cyan**: Primary actions, link targets, and successful creations.
*   **Magenta**: Agent-specific identifiers (e.g., `[Gemini]`, `[Cursor]`).
*   **Amber**: Non-fatal warnings or "Conflict" states.
*   **Red**: Fatal errors (E-code registry).
*   **Dim (Gray)**: Secondary info, paths, or "Next step" suggestions.

---

## 2. Interaction Model

### 2.1 The "Wizard Fallback" Pattern
*   **If arguments are provided**: Execute the command silently (Unix style).
*   **If arguments are missing**: Launch the interactive `Clack` wizard immediately.
*   **Result**: High-speed for power users, zero friction for beginners.

### 2.2 Grid & Alignment (The "Invisible Table" Strategy)
To ensure the UI feels balanced, we avoid "ragged" text.
*   **Label Gutter**: All labels in a list or status report use a fixed-width gutter (e.g., 12 characters).
*   **Invisible Tables**: Use `cli-table3` with `chars: { 'top': '', 'top-mid': '', ... }` to create perfectly aligned columns without visible borders.
*   **Visual Balance**: Use `string-width` to ensure Unicode/Emoji characters don't break the alignment.

### 2.3 The Semantic Palette
Colors are never used "for fun." They convey meaning.
*   **Primary (Link/Action)**: `pc.cyan` (Clean, modern).
*   **Secondary (Agent/Context)**: `pc.magenta` (Agentic/AI feel).
*   **Success**: `pc.green` (Task complete).
*   **Warning (Conflict)**: `pc.yellow` (Requires attention).
*   **Error (Fatal)**: `pc.red` (Operation failed).
*   **Muted (Secondary Info)**: `pc.dim` (Paths, hints, meta-data).

### 2.4 Path & Content Handling
*   **Truncation**: If a path or description is too long for the terminal, truncate with `...` in the middle: `~/agents.../react.md`.
*   **Emphasis**: Use **Bold** only for critical nouns (File names, Command names). Use *Dim* for the rest of the sentence.

### 2.5 The "Confirmation" Safety Net
Destructive or system-modifying actions (like `link --force` or `init`) must use the **Clack Note** or **Confirm** components.
*   *UI:* A framed box explaining the impact *before* the user presses Enter.

### 2.6 Spinners & Feedback
Long-running tasks (like `bun install` hooks) MUST use a smooth spinner.
*   **Rule**: Never let the terminal "hang" without visual feedback for more than 200ms.

### 2.7 Guidance & Hand-holding (The "Mentor" Pattern)
The CLI should proactively explain its logic to reduce user anxiety.
*   **Contextual Notes**: Use `clack.note()` to explain *why* a step is being taken (e.g., "Linking your rules allows all your agents to share the same coding standards instantly").
*   **Impact Summaries**: Before a broadcast (`--all`), show a summary: "This will affect 3 environments: Cursor, Gemini, and Claude."
*   **Success Guidance**: Every successful action should end with a "Next Step" hint in `pc.dim`.
    *   *Example:* `✔ Linked react-strict. (Next: run 'atk status' to verify)`
*   **Educational Errors**: If a command fails, don't just show the error; explain how to fix it in plain English.

---

## 3. Core UI Components (The "Clack" Implementation)

To achieve the "Premium Installer" feel, we map every user action to a specific high-quality component:

### 3.1 The Single Selector (`clack.select`)
Used for choosing a specific category (Rule, Skill, Agent) or a single target environment.
*   **UI**: Vertical list with a distinct "Active" indicator.
*   **Safety**: Includes a `Cancel` option at the bottom to allow a "Fearless Exit."

### 3.2 The Checkbox List (`clack.multiselect`)
Used for "Broadcasting" or "Bundling."
*   **UX**: Allows the user to toggle multiple agent environments (Cursor [x], Gemini [ ], Claude [x]) before confirming.
*   **Hand-holding**: Displays a "Space to select, Enter to confirm" hint at the bottom.

### 3.3 The Verification Step (`clack.confirm`)
Used for destructive actions or "Conflict resolution."
*   **Design**: Always paired with a `clack.note()` explaining the consequences.
*   **Default**: Defaults to `No` for maximum safety.

### 3.4 The "Next Step" Outro (`clack.outro`)
The most important part of the "Mentor" pattern. Every session ends with a clear call-to-action.
*   **Format**:
    ```text
    └  Installation complete!
       Next steps:
       1. Run 'atk status' to verify links.
       2. Use 'atk link skill youtube' to add capabilities.
       3. Type 'atk --help' for the full manual.
    ```

---

## 4. The Security Guard (Automated Auditing)

To protect the user from malicious skills, ATK performs an automated **Security Audit** before any hook execution.

### 4.1 Visual Alerting
We use a **Double-Bordered Box** (`boxen`) to make security alerts feel like "first-class" interruptions.
*   **WARN (Yellow)**: For commands that use `curl` or `eval`. Mentors the user: "This skill uses the network; ensure you trust the source."
*   **DANGER (Red)**: For commands that touch `/etc/` or `rm -rf`. Boldly warns: "This command is destructive."
*   **BLOCKED (Bright Red)**: For `sudo` or `.ssh` access. Informs: "ATK has blocked this command for your safety."

### 4.2 Spacing & Icons
*   **The 1-Space Rule**: Every icon (✔, ✖, ⚠, ℹ) MUST be followed by at least **one space** to ensure the text doesn't feel "crowded."
*   **Bullet Points**: Use `dim` bullets (`•`) in security reports for vertical alignment and clean scanning.

### 4.3 The "Hand-holding" Audit
If a command is flagged:
1.  **Analyze**: ATK runs the static analysis pass.
2.  **Explain**: "I found 2 potential risks: Networking and Hidden-file access."
3.  **Confirm**: "Do you still want to execute this hook? [No/Yes]"
4.  **Action**: Only runs the command if the user provides explicit, informed consent.

---

## 3. Library Stack (Bun/JS)

| Library | Role | Why? |
| :--- | :--- | :--- |
| **@clack/prompts** | Core UI | Best-in-class vertical wizards and spinners. |
| **picocolors** | Coloring | Faster and smaller than `chalk`. |
| **gradient-string** | Branding | Premium visual header on startup. |
| **boxen** | Framing | Important summaries and "Success" states. |
| **cli-table3** | Data Layout | Clean, borderless tabular data (for `atk list`). |

---

## 4. Example Layout: `atk link` (Missing Args)

```text
┌  Agents Toolkit
│
◇  What do you want to link?
│  ● Rule
│  ○ Skill
│  ○ Command
│
◇  Select a Rule:
│  ● react-strict
│  ○ python-black
│
◇  Target Environment:
│  ● Cursor (.cursorrules)
│  ○ Gemini CLI (GEMINI.md)
│
◐  Creating symbolic link...
│
✔  Linked react-strict to .cursorrules
│
└  Next: run 'atk status' to verify.
```

---

## 5. Accessibility & Shell Respect
*   **Standard Streams**: Prompts and wizards go to `stderr` to keep `stdout` clean for pipes.
*   **Exit Codes**: Every command must return `0` on success or the appropriate `E-code` (1+) on failure.
*   **CI Detection**: If `isTTY` is false, **never** show a wizard; fail fast with a clear error message.
