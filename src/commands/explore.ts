import fs from "node:fs/promises";
import path from "node:path";
import { cancel, intro, isCancel, note, outro, select } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import type { ComponentType } from "../core/mapping";
import { UI } from "../utils/ui";

export async function exploreCommand(query?: string) {
	UI.header();
	intro(pc.cyan("Toolkit Explorer"));

	const atkRoot = ATKConfig.get().atkRoot;
	const components = await discoverAllComponents(atkRoot);

	if (components.length === 0) {
		UI.error("No components found in your toolkit repo.", "E404");
		process.exit(1);
	}

	// Filter by query if provided
	const filtered = query
		? components.filter((c) => c.name.includes(query) || c.type.includes(query))
		: components;

	const listText = filtered
		.map((c) => {
			const icon = c.type === "rule" ? "📏" : c.type === "skill" ? "🛠️" : "💬";
			return `${icon} ${pc.bold(c.name)} ${pc.dim(`(${c.type})`)} - ${c.description}`;
		})
		.join("\n");

	note(listText, "Available Components");

	const action = await select({
		message: "Would you like to link a component?",
		options: [
			{ value: "link", label: "Yes, link something" },
			{ value: "cancel", label: "No, just exploring" },
		],
	});

	if (action === "link") {
		// Start linking flow
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

		// Call linkCommand directly or redirect
		// For now, just a tip
		UI.tip(`Run 'atk link ${selected.type} ${selected.name}' to install it.`);
	}

	outro(pc.cyan("Exploration complete."));
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
					// Check for manifest.json
					const manifestPath = path.join(fullDir, entry.name, "manifest.json");
					try {
						const raw = await fs.readFile(manifestPath, "utf-8");
						const manifest = JSON.parse(raw);
						components.push({
							type,
							name: entry.name,
							description: manifest.description || "Modular skill",
						});
					} catch {
						// Not a component directory
					}
				}
			}
		} catch {
			// Dir not found
		}
	}
	return components;
}
