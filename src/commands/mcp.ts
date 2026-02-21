import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { ATKMCPServer } from "../core/mcp-server";
import { UI } from "../utils/ui";

/**
 * Orchestrates MCP server management and execution.
 */
export async function mcpCommand(
	action?: string,
	_options: { nonInteractive?: boolean } = {},
) {
	if (action === "run") {
		const server = new ATKMCPServer();
		return server.run();
	}

	UI.header();

	if (action === "install") {
		return installMcpServer();
	}

	UI.error("Invalid MCP action. Use 'run' or 'install'.", "E013");
}

interface MCPConfig {
	mcpServers: Record<string, { command: string; args: string[] }>;
}

/**
 * Installs the ATK MCP Server into the Claude Desktop configuration.
 */
async function installMcpServer() {
	intro(pc.cyan("MCP Installation Wizard"));
	const s = spinner();
	s.start("Detecting Claude configuration...");

	const atkBin = path.join(ATKConfig.get().atkRoot, "bin", "atk");
	const configPath = path.join(
		os.homedir(),
		".library/Application Support/Claude/claude_desktop_config.json",
	);

	try {
		let config: MCPConfig = { mcpServers: {} };
		try {
			const raw = await fs.readFile(configPath, "utf-8");
			config = JSON.parse(raw);
		} catch {
			// Config doesn't exist, start fresh
		}

		config.mcpServers = config.mcpServers || {};
		config.mcpServers.atk = {
			command: "bun",
			args: ["run", atkBin, "mcp", "run"],
		};

		await fs.mkdir(path.dirname(configPath), { recursive: true });
		await fs.writeFile(configPath, JSON.stringify(config, null, 2));

		s.stop(pc.green("✔ ATK MCP Server registered in Claude Desktop!"));
		outro(pc.cyan("Installation complete."));
		UI.tip("Restart Claude Desktop to see your ATK tools.");
	} catch (err) {
		s.stop(pc.red("✖ Installation failed."));
		UI.error(err instanceof Error ? err.message : String(err), "E014");
	}
}

/**
 * Main execution loop for the MCP Server.
 * Exposes ATK skills as MCP tools over stdio.
 */
async function _runMcpServer() {
	// Logic for MCP Server implementation goes here.
	// This will use the @modelcontextprotocol/sdk or a custom lightweight implementation.
	console.error("MCP Server 'run' logic not yet fully implemented.");
}
