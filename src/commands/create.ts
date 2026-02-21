import fs from "node:fs/promises";
import path from "node:path";
import {
	cancel,
	intro,
	isCancel,
	note,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { UI } from "../utils/ui";

export async function createCommand(
	type?: string,
	name?: string,
	options: any = {},
) {
	UI.header();
	intro(pc.cyan("Scaffolding Wizard"));

	const atkRoot = ATKConfig.get().atkRoot;

	// 1. Choose Type
	let selectedType = type;
	if (!selectedType) {
		selectedType = (await select({
			message: "What do you want to create?",
			options: [
				{ value: "rule", label: "Rule (Behavioral Constraints)" },
				{ value: "command", label: "Command (Ready-to-use Prompt)" },
				{ value: "skill", label: "Skill (Executable Capability)" },
			],
		})) as string;
	}

	if (isCancel(selectedType)) {
		cancel("Creation cancelled.");
		process.exit(0);
	}

	// 2. Choose Name
	let selectedName = name;
	if (!selectedName) {
		selectedName = (await text({
			message: `Enter name for the new ${selectedType}:`,
			placeholder: "e.g. react-strict, git-helper",
			validate: (val) => {
				if (!val) return "Name is required.";
				if (!/^[a-z0-9-]+$/.test(val))
					return "Name must be kebab-case (lowercase, numbers, hyphens).";
				return;
			},
		})) as string;
	}

	if (isCancel(selectedName)) {
		cancel("Creation cancelled.");
		process.exit(0);
	}

	// 3. Execution
	const s = spinner();
	s.start(`Generating ${selectedType} '${selectedName}'...`);

	try {
		const targetDir = path.join(
			atkRoot,
			selectedType === "command" ? "commands" : `${selectedType}s`,
		);

		if (selectedType === "skill") {
			await scaffoldSkill(targetDir, selectedName);
		} else if (selectedType === "rule") {
			await scaffoldRule(targetDir, selectedName);
		} else if (selectedType === "command") {
			await scaffoldPromptCommand(targetDir, selectedName);
		}

		s.stop(pc.green(`✔ Successfully created ${selectedType}!`));
		outro(pc.cyan("Scaffolding complete."));
		UI.tip(
			`Edit the files in ${pc.magenta(path.join(targetDir, selectedName))} to customize your capability.`,
		);
	} catch (err) {
		s.stop(pc.red("✖ Creation failed."));
		UI.error(err instanceof Error ? err.message : String(err), "E015");
	}
}

async function scaffoldSkill(baseDir: string, name: string) {
	const skillDir = path.join(baseDir, name);
	const srcDir = path.join(skillDir, "src");
	await fs.mkdir(srcDir, { recursive: true });

	const manifest = {
		name,
		version: "1.0.0",
		type: "skill",
		description: `A new skill called ${name}`,
		author: "Your Name",
		tags: [],
		platforms: ["all"],
	};

	const tool = {
		name: `get_${name.replace(/-/g, "_")}`,
		description: `Detailed description of what ${name} does for the agent.`,
		version: "1.0.0",
		parameters: {
			type: "object",
			properties: {
				query: { type: "string", description: "Search query or input" },
			},
			required: ["query"],
		},
		runtime: {
			engine: "bun",
			entrypoint: "src/index.ts",
			timeout: 5000,
		},
	};

	const prompt = `# ${name} Skill

## Description
Detailed instructions for the agent on how to use this skill.

## Usage Examples
- "Use ${name} to..."`;

	const indexTs = `/**
 * Logic for ${name} skill.
 * Input is received via STDIN as JSON.
 */

const input = await Bun.stdin.json();
console.log(JSON.stringify({ result: "Hello from ${name}!", input }));
`;

	await fs.writeFile(
		path.join(skillDir, "manifest.json"),
		JSON.stringify(manifest, null, 2),
	);
	await fs.writeFile(
		path.join(skillDir, "tool.json"),
		JSON.stringify(tool, null, 2),
	);
	await fs.writeFile(path.join(skillDir, "prompt.md"), prompt);
	await fs.writeFile(path.join(srcDir, "index.ts"), indexTs);
}

async function scaffoldRule(baseDir: string, name: string) {
	const content = `# ${name} Rules

## Behavioral Constraints
- Always...
- Never...

## Context
Use these rules when working on...
`;
	await fs.mkdir(baseDir, { recursive: true });
	await fs.writeFile(path.join(baseDir, `${name}.md`), content);
}

async function scaffoldPromptCommand(baseDir: string, name: string) {
	const content = `# ${name} Command

## Goal
Describe the objective of this command.

## Instructions
1. First...
2. Then...

## Context
Inject {{args}} here to handle user input.
`;
	await fs.mkdir(baseDir, { recursive: true });
	await fs.writeFile(path.join(baseDir, `${name}.md`), content);
}
