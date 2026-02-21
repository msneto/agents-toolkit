import { Command } from "commander";
import { initCommand } from "./commands/init";
import { linkCommand } from "./commands/link";
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
		"Link a component (Rule, Skill, Command, Agent) to your environment",
	)
	.argument("[type]", "Component type (rule, skill, command, agent)")
	.argument("[name]", "Component name")
	.option("-f, --force", "Force overwrite of existing files")
	.option("-g, --global", "Link to global agent configuration (e.g. ~/.gemini/)")
	.option("-p, --platform <platform>", "Target agent platform (e.g. gemini, cursor)")
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

program.parse(process.argv);
