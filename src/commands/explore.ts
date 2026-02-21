import fs from "node:fs/promises";
import path from "node:path";
import { cancel, intro, isCancel, note, outro, select } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import type { ComponentType } from "../core/mapping";
import { alignColumns } from "../utils/text";
import { UI } from "../utils/ui";
import { linkCommand } from "./link";

export async function exploreCommand(
	query?: string,
	options: { nonInteractive?: boolean } = {},
) {
	const interactive = UI.isInteractive(options);
	if (interactive) {
		UI.header();
		intro(pc.cyan("Toolkit Explorer"));
	}

	const atkRoot = ATKConfig.get().atkRoot;
	const components = await discoverAllComponents(atkRoot);

	if (components.length === 0) {
		UI.error("No components found in your toolkit repo.", "E404");
		process.exit(1);
	}

	// 1. Filter by query
	const filtered = query
		? components.filter((c) => c.name.includes(query) || c.type.includes(query))
		: components;

	if (filtered.length === 0) {
		UI.error(`No components matching '${query}' found.`, "E404");
		process.exit(1);
	}

	// 2. Single Result Short-circuit
	if (filtered.length === 1 && interactive) {
		const item = filtered[0];
		UI.info(
			`Found ${pc.magenta(item.type)}: ${pc.bold(item.name)} - ${item.description}`,
		);
		const proceed = await select({
			message: `Would you like to link this ${item.type} now?`,
			options: [
				{ value: "yes", label: "Yes, start linking" },
				{ value: "no", label: "No, just exploring" },
			],
		});

		if (proceed === "yes") {
			return linkCommand(item.type, item.name, options);
		}
	}

	// 3. Display Results
	if (interactive) {
		const rows = filtered.map((c) => {
			const icon = UI.icons[c.type as keyof typeof UI.icons] || UI.icons.bullet;
			return [icon, pc.bold(c.name), pc.dim(`(${c.type})`), c.description];
		});

		note(alignColumns(rows, [3, 20, 12, 50]), "Available Components");

		const action = await select({
			message: "Would you like to link a component?",
			options: [
				{ value: "link", label: "Yes, link something" },
				{ value: "cancel", label: "No, just exploring" },
			],
		});

		if (action === "link") {
			const selected = (await select({
				message: "Select component to link:",
				options: filtered.map((c) => ({
					value: c,
					label: `${c.name} (${c.type})`,
				})),
			})) as { type: ComponentType; name: string };

			if (isCancel(selected)) {
				cancel("Exploration ended.");
				process.exit(0);
			}

			return linkCommand(selected.type, selected.name, options);
		}

		outro(pc.cyan("Exploration complete."));
	} else {
		// Machine readable output
		for (const c of filtered) {
			console.log(`${c.type}\t${c.name}\t${c.description}`);
		}
	}
}

async function discoverAllComponents(atkRoot: string) {
	const components: {
		type: ComponentType;
		name: string;
		description: string;
	}[] = [];
	const types: ComponentType[] = ["rule", "skill", "command", "agent"];

	for (const type of types) {
		const dir = type === "command" ? "commands" : `${type}s`;
		const fullDir = path.join(atkRoot, dir);

		try {
			const entries = await fs.readdir(fullDir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isFile() && entry.name.endsWith(".md")) {
					const name = entry.name.replace(".md", "");
					components.push({
						type,
						name,
						description: "Prompt-based capability",
					});
				} else if (entry.isDirectory()) {
					// Check for SKILL.md (Standard) or manifest.json (Internal)
					const skillMdPath = path.join(fullDir, entry.name, "SKILL.md");
					const manifestPath = path.join(fullDir, entry.name, "manifest.json");

					let description = "Modular capability";
					try {
						const content = await fs.readFile(skillMdPath, "utf-8");
						const match = content.match(/description:\s*(.*)/);
						if (match) description = match[1].trim();
					} catch {
						try {
							const raw = await fs.readFile(manifestPath, "utf-8");
							const manifest = JSON.parse(raw);
							description = manifest.description || description;
						} catch {
							/* Skip */
						}
					}

					components.push({ type, name: entry.name, description });
				}
			}
		} catch {
			// Dir not found
		}
	}
	return components;
}
