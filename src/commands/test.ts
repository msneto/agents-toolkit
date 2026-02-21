import fs from "node:fs/promises";
import path from "node:path";
import { cancel, intro, isCancel, outro, spinner, text } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { type ToolIR, ToolIRSchema } from "../core/schema";
import { UI } from "../utils/ui";

export async function testCommand(
	name?: string,
	options: { input?: string; nonInteractive?: boolean } = {},
) {
	UI.header();
	intro(pc.cyan("Tool Debugger"));

	const atkRoot = ATKConfig.get().atkRoot;

	// 1. Resolve Tool
	if (!name) {
		UI.error("Tool name is required. Usage: atk test <tool-name>", "E012");
		process.exit(1);
	}

	const skillDir = path.join(atkRoot, "skills", name);
	const toolJsonPath = path.join(skillDir, "tool.json");

	let toolData: ToolIR;
	try {
		const raw = await fs.readFile(toolJsonPath, "utf-8");
		toolData = ToolIRSchema.parse(JSON.parse(raw));
	} catch (_err) {
		UI.error(
			`Tool '${name}' not found or invalid tool.json in ${skillDir}`,
			"E404",
		);
		process.exit(1);
	}

	// 2. Mock Input
	let input = options.input;
	if (!input) {
		input = await text({
			message: `Enter mock input for ${pc.magenta(toolData.name)} (JSON format):`,
			initialValue: JSON.stringify(toolData.examples?.[0]?.input || {}),
			validate: (val) => {
				try {
					JSON.parse(val);
					return;
				} catch {
					return "Invalid JSON format.";
				}
			},
		});
	}

	if (isCancel(input)) {
		cancel("Test cancelled.");
		process.exit(0);
	}

	// 3. Execute Tool
	const s = spinner();
	s.start(`Executing tool ${pc.bold(toolData.name)}...`);

	try {
		const entrypoint = path.join(skillDir, toolData.runtime.entrypoint);
		const proc = Bun.spawn([toolData.runtime.engine, entrypoint], {
			stdin: "pipe",
			stdout: "pipe",
			stderr: "pipe",
		});

		// Write input to stdin
		const writer = proc.stdin.writer();
		writer.write(input as string);
		await writer.end();

		const status = await proc.exited;
		const stdout = await new Response(proc.stdout).text();
		const stderr = await new Response(proc.stderr).text();

		if (status !== 0) {
			s.stop(pc.red("✖ Execution failed."));
			console.log(`\n${pc.red("STDERR:")}\n${stderr}`);
		} else {
			s.stop(pc.green("✔ Execution successful!"));
			console.log(`\n${pc.cyan("STDOUT (Output):")}\n${stdout}`);
		}
	} catch (err) {
		s.stop(pc.red("✖ Runtime error."));
		UI.error(err instanceof Error ? err.message : String(err));
	}

	outro(pc.cyan("Debug session complete."));
}
