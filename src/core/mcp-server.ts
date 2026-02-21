import fs from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { ATKConfig } from "./config";
import { type ToolIR, ToolIRSchema } from "./schema";

export class ATKMCPServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: "agents-toolkit",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
				},
			},
		);

		this.setupHandlers();
	}

	private async getSkillsDir() {
		return path.join(ATKConfig.get().atkRoot, "skills");
	}

	private async discoverTools(): Promise<Map<string, ToolIR>> {
		const skillsDir = await this.getSkillsDir();
		const tools = new Map<string, ToolIR>();

		try {
			const entries = await fs.readdir(skillsDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isDirectory()) {
					const toolJsonPath = path.join(skillsDir, entry.name, "tool.json");
					try {
						const raw = await fs.readFile(toolJsonPath, "utf-8");
						const tool = ToolIRSchema.parse(JSON.parse(raw));
						tools.set(tool.name, tool);
					} catch {
						// Skill has no tool or invalid tool.json
					}
				}
			}
		} catch (err) {
			console.error("Error discovering tools:", err);
		}

		return tools;
	}

	private setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			const tools = await this.discoverTools();
			return {
				tools: Array.from(tools.values()).map((t) => ({
					name: t.name,
					description: t.description,
					inputSchema: t.parameters,
				})),
			};
		});

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const tools = await this.discoverTools();
			const tool = tools.get(request.params.name);

			if (!tool) {
				throw new McpError(
					ErrorCode.MethodNotFound,
					`Tool not found: ${request.params.name}`,
				);
			}

			try {
				const skillsDir = await this.getSkillsDir();
				const skillDir = path.join(
					skillsDir,
					request.params.name.replace(/^get_/, ""),
				); // Simple mapping for now
				// Note: Real mapping should be based on tool name to skill folder association

				const entrypoint = path.join(skillDir, tool.runtime.entrypoint);
				const proc = Bun.spawn([tool.runtime.engine, entrypoint], {
					stdin: "pipe",
					stdout: "pipe",
					stderr: "pipe",
				});

				// Write input to stdin
				const writer = proc.stdin.writer();
				writer.write(JSON.stringify(request.params.arguments));
				await writer.end();

				const status = await proc.exited;
				const stdout = await new Response(proc.stdout).text();
				const stderr = await new Response(proc.stderr).text();

				if (status !== 0) {
					return {
						content: [{ type: "text", text: `Error: ${stderr}` }],
						isError: true,
					};
				}

				return {
					content: [{ type: "text", text: stdout }],
				};
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `Runtime Error: ${err instanceof Error ? err.message : String(err)}`,
						},
					],
					isError: true,
				};
			}
		});
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error("ATK MCP Server running on stdio");
	}
}
