import fs from "node:fs/promises";
import path from "node:path";
import { cancel, intro, isCancel, outro, select } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { createLink } from "../core/links";
import {
	type ComponentType,
	SUPPORTED_PLATFORMS,
	type SupportedPlatform,
} from "../core/mapping";
import { UI } from "../utils/ui";

export async function linkCommand(
	type?: string,
	name?: string,
	options: { force?: boolean; nonInteractive?: boolean; global?: boolean } = {},
) {
	UI.header();
	intro(pc.cyan("Linking Wizard"));

	const atkRoot = ATKConfig.get().atkRoot;

	// 1. Choose Type if not provided
	let selectedType = type as ComponentType;
	if (!selectedType) {
		selectedType = (await select({
			message: "What do you want to link?",
			options: [
				{ value: "rule", label: "Rule (Behavioral Constraints)" },
				{ value: "command", label: "Command (Ready-to-use Prompt)" },
				{ value: "skill", label: "Skill (Executable Capability)" },
				{ value: "agent", label: "Agent (Persona Definition)" },
			],
		})) as ComponentType;
	}

	if (isCancel(selectedType)) {
		cancel("Linking cancelled.");
		process.exit(0);
	}

	// 2. Choose Name if not provided
	let selectedName = name;
	if (!selectedName) {
		const componentDir = path.join(
			atkRoot,
			selectedType === "command" ? "commands" : `${selectedType}s`,
		);
		const files = await getComponentFiles(componentDir);

		if (files.length === 0) {
			UI.error(`No ${selectedType}s found in ${componentDir}`, "E404");
			process.exit(1);
		}

		selectedName = (await select({
			message: `Select a ${selectedType}:`,
			options: files.map((f) => ({ value: f, label: f })),
		})) as string;
	}

	if (isCancel(selectedName)) {
		cancel("Linking cancelled.");
		process.exit(0);
	}

	// 3. Choose Platform
	const targetPlatform = (await select({
		message: "Target environment:",
		options: SUPPORTED_PLATFORMS,
	})) as SupportedPlatform;

	if (isCancel(targetPlatform)) {
		cancel("Linking cancelled.");
		process.exit(0);
	}

	// 4. Resolve Source Path
	const sourceFile = await resolveSourceFile(
		atkRoot,
		selectedType,
		selectedName,
	);

	// 5. Execute Link
	try {
		await createLink(sourceFile, {
			type: selectedType,
			name: selectedName,
			platform: targetPlatform,
			isGlobal: options.global,
			force: options.force,
			nonInteractive: options.nonInteractive,
		});
		outro(pc.cyan("Link successful!"));
		UI.tip(`Your agent now has the '${selectedName}' ${selectedType} active.`);
	} catch (err) {
		UI.error(err instanceof Error ? err.message : String(err), "E002");
		process.exit(1);
	}
}

async function getComponentFiles(dir: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return entries
			.filter((e) => (e.isFile() && e.name.endsWith(".md")) || e.isDirectory())
			.map((e) => e.name.replace(".md", ""));
	} catch {
		return [];
	}
}

async function resolveSourceFile(
	root: string,
	type: ComponentType,
	name: string,
): Promise<string> {
	const dir = type === "command" ? "commands" : `${type}s`;
	const p = path.join(root, dir, `${name}.md`);
	const dirPath = path.join(root, dir, name);

	try {
		await fs.access(p);
		return p;
	} catch {
		try {
			const skillMdPath = path.join(dirPath, "SKILL.md");
			await fs.access(skillMdPath);
			return skillMdPath;
		} catch {
			throw new Error(`Component file not found: ${p} or ${dirPath}/SKILL.md`);
		}
	}
}
