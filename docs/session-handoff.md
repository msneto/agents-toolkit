# Session Handoff: Agents Toolkit (ATK)

## 1. State of the World
- **Version**: 1.0.0 (Core) is approved, built, and pushed to GitHub.
- **Critical Path**: All core commands (`init`, `link`, `create`, `status`, `explore`) are working and Biome-clean.
- **Standards**: Strictly following `agentskills.io` and a custom Zod-based Tool IR.

## 2. Technical Debt / Points of Attention
- **MCP Server**: The `atk mcp run` command is a foundation using `@modelcontextprotocol/sdk`. The `callTool` handler currently uses a simple string replacement to map tool names to folders. This should be refined to use a proper registry.
- **Claude Config Path**: Currently hardcoded to Mac/Linux library path. Should be dynamic based on OS in `src/commands/mcp.ts`.
- **Variable Resolution**: The `VariableResolver` stores missed vars in the *project* context by default. We should add a choice: "Save globally or for this project?".
- **Transpilation**: Only Gemini TOML is implemented. OpenCode and Claude use Markdown (passthrough), but we might need more formats as we add agents.

## 3. Immediate Next Steps (Tomorrow)
1.  **Profile UX hardening**: Add richer validation and conflict visibility during `profile switch`.
2.  **Refine `atk status`**: Add an "Unresolved Variables" section to the dashboard.
3.  **MCP registry**: Replace ad-hoc tool path mapping with a typed registry.

## 4. Environment Notes
- **ATK_ROOT**: Managed via `conf` in `~/.config/atk-nodejs/`.
- **Cache**: Resolved prompts are at `~/.config/atk-nodejs/cache/`.
- **Testing**: Use `atk test git-genius` to verify the STDIN/STDOUT JSON bridge.
