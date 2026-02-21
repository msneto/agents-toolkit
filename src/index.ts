import { Command } from "commander";
import { createCommand } from "./commands/create";
import { exploreCommand } from "./commands/explore";
import { initCommand } from "./commands/init";
import { linkCommand } from "./commands/link";
import { mcpCommand } from "./commands/mcp";
import { profileCommand } from "./commands/profile";
import { statusCommand } from "./commands/status";
import { testCommand } from "./commands/test";
import { UI } from "./utils/ui";

const program = new Command();

program
	.name("atk")
	.description("Agents Toolkit (ATK) - Local Agent Control Plane")
	.version("1.0.0")
	.option("--non-interactive", "Disable interactive wizards and prompts", false)
	.option("--ci", "Alias for --non-interactive", false);

program
	.command("profile")
	.description("Manage and apply link snapshots (profiles)")
	.argument("[action]", "Action to perform (save, switch, list, delete)")
	.argument("[name]", "Profile name")
	.option("-p, --platform <platform>", "Target platform for profile switch")
	.action(async (action, name, cmdOptions) => {
		const globalOptions = program.opts();
		const options = {
			...cmdOptions,
			nonInteractive: globalOptions.nonInteractive || globalOptions.ci,
		};
		try {
			await profileCommand(action, name, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E008");
			process.exit(1);
		}
	});

program
	.command("init")
	.description("Initialize the ATK environment and global configuration")
	.action(async () => {
		const options = program.opts();
		try {
			await initCommand({
				nonInteractive: options.nonInteractive || options.ci,
			});
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E001");
			process.exit(1);
		}
	});

program
	.command("link")
	.description(
		"Link a component (Rule, Skill, Command, Agent, Bundle) to your environment",
	)
	.argument("[type]", "Component type (rule, skill, command, agent, bundle)")
	.argument("[name]", "Component name")
	.option("-f, --force", "Force overwrite of existing files")
	.option(
		"-g, --global",
		"Link to global agent configuration (e.g. ~/.gemini/)",
	)
	.option(
		"-p, --platform <platform>",
		"Target agent platform (e.g. gemini, cursor)",
	)
	.option("--all", "Broadcast to all detected agent environments")
	.action(async (type, name, cmdOptions) => {
		const globalOptions = program.opts();
		const options = {
			...cmdOptions,
			nonInteractive: globalOptions.nonInteractive || globalOptions.ci,
		};
		try {
			await linkCommand(type, name, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E002");
			process.exit(1);
		}
	});

program
	.command("test")
	.description("Debug and test a tool locally with mock input")
	.argument("<name>", "Tool/Skill name")
	.option("-i, --input <json>", "Mock JSON input for the tool")
	.action(async (name, cmdOptions) => {
		const globalOptions = program.opts();
		const options = {
			...cmdOptions,
			nonInteractive: globalOptions.nonInteractive || globalOptions.ci,
		};
		try {
			await testCommand(name, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E003");
			process.exit(1);
		}
	});

program
	.command("mcp")
	.description("Manage and run the ATK MCP Server")
	.argument("[action]", "Action to perform (run, install)")
	.action(async (action, options) => {
		try {
			await mcpCommand(action, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E004");
			process.exit(1);
		}
	});

program
	.command("create")
	.description("Scaffold a new component (Rule, Skill, Command)")
	.argument("[type]", "Component type (rule, skill, command)")
	.argument("[name]", "Component name (kebab-case)")
	.action(async (type, name, options) => {
		try {
			await createCommand(type, name, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E005");
			process.exit(1);
		}
	});

program
	.command("status", { isDefault: true })
	.description("Show current toolkit status and active links")
	.action(async () => {
		try {
			await statusCommand();
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E006");
			process.exit(1);
		}
	});

program
	.command("explore")
	.description("Browse and search for available components in your toolkit")
	.argument("[query]", "Search query")
	.action(async (query) => {
		const globalOptions = program.opts();
		const options = {
			nonInteractive: globalOptions.nonInteractive || globalOptions.ci,
		};
		try {
			await exploreCommand(query, options);
		} catch (err) {
			UI.error(err instanceof Error ? err.message : String(err), "E007");
			process.exit(1);
		}
	});

program.parse(process.argv);
