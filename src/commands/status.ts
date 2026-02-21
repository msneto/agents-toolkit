import fs from "node:fs/promises";
import path from "node:path";
import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { SUPPORTED_PLATFORMS } from "../core/mapping";
import { UI } from "../utils/ui";

export async function statusCommand() {
	UI.header();
	intro(pc.cyan("Toolkit Dashboard"));

	const config = ATKConfig.get();
	const projectRoot = process.cwd();

	// 1. Detected Environments
	const environments = await detectEnvironments(projectRoot);
	const envText =
		environments.length > 0
			? environments.map((e) => `${pc.magenta("●")} ${e.label}`).join("\n")
			: pc.dim("No agent environments detected in this project.");

	note(envText, "Detected Environments");

	// 2. Active Links (Project Scope)
	const links = await findActiveLinks(projectRoot);
	const linksText =
		links.length > 0
			? links
					.map(
						(l) => `${pc.green("✔")} ${pc.bold(l.name)} -> ${pc.dim(l.target)}`,
					)
					.join("\n")
			: pc.dim("No active ATK links found in this project.");

	note(linksText, "Active Links");

	// 3. Toolkit Info
	note(
		`Root: ${pc.magenta(config.atkRoot)}
Config: ${pc.dim(ATKConfig.path())}`,
		"Toolkit Configuration",
	);

	outro(pc.cyan("Status check complete."));
}

async function detectEnvironments(projectRoot: string) {
	const detected = [];
	for (const platform of SUPPORTED_PLATFORMS) {
		const markers: Record<string, string[]> = {
			opencode: [".opencode", "AGENTS.md"],
			gemini: [".gemini", "GEMINI.md"],
			claude: [".clauderules"],
			cursor: [".cursorrules", ".cursor/rules"],
			windsurf: [".windsurfrules"],
		};

		const platformMarkers = markers[platform.value as string] || [];
		for (const marker of platformMarkers) {
			try {
				await fs.access(path.join(projectRoot, marker));
				detected.push(platform);
				break;
			} catch {
				// Marker not found
			}
		}
	}
	return detected;
}

async function findActiveLinks(projectRoot: string) {
	const activeLinks: { name: string; target: string }[] = [];
	const globalConfigPath = ATKConfig.path();
	const cacheDirName = path.basename(path.dirname(globalConfigPath)); // e.g. atk-nodejs
	const searchPaths = [
		projectRoot,
		path.join(projectRoot, ".opencode"),
		path.join(projectRoot, ".opencode", "commands"),
		path.join(projectRoot, ".gemini"),
		path.join(projectRoot, ".gemini", "commands"),
		path.join(projectRoot, ".claude"),
		path.join(projectRoot, ".cursor"),
	];

	for (const p of searchPaths) {
		try {
			const entries = await fs.readdir(p, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isSymbolicLink()) {
					const fullPath = path.join(p, entry.name);
					const target = await fs.readlink(fullPath);
					if (
						target.includes(cacheDirName) ||
						target.includes(".atk/cache") ||
						target.includes("agents-toolkit")
					) {
						const displayName =
							p === projectRoot
								? entry.name
								: `${path.basename(p)}/${entry.name}`;
						activeLinks.push({ name: displayName, target });
					}
				}
			}
		} catch {
			// Path not found
		}
	}
	return activeLinks;
}
