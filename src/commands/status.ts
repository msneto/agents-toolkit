import path from "node:path";
import { intro, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { findActiveLinks } from "../core/links";
import { detectProjectPlatforms, SUPPORTED_PLATFORMS } from "../core/mapping";
import { alignColumns, truncatePath } from "../utils/text";
import { UI } from "../utils/ui";

export async function statusCommand() {
	UI.header();
	intro(pc.cyan("Toolkit Dashboard"));

	const config = ATKConfig.get();
	const projectRoot = process.cwd();

	// 1. Detected Environments
	const detectedPlatforms = await detectProjectPlatforms(projectRoot);
	const environments = SUPPORTED_PLATFORMS.filter((p) =>
		detectedPlatforms.includes(p.value),
	);

	const envRows = environments.map((e) => [UI.icons.env, e.label]);
	const envText =
		environments.length > 0
			? alignColumns(envRows, [3, 20])
			: pc.dim("No agent environments detected in this project.");

	note(envText, "Detected Environments");

	// 2. Active Links (Project Scope)
	const links = await findActiveLinks(projectRoot);
	const linkRows = links.map((l) => [
		pc.green(UI.icons.link),
		pc.bold(path.relative(projectRoot, l.fullPath)),
		pc.dim("->"),
		pc.dim(truncatePath(l.target, 50)),
	]);
	const linksText =
		links.length > 0
			? alignColumns(linkRows, [3, 30, 4, 50])
			: pc.dim("No active ATK links found in this project.");

	note(linksText, "Active Links");

	// 3. Toolkit Info
	const configRows = [
		[UI.icons.bullet, "Root", pc.magenta(truncatePath(config.atkRoot, 60))],
		[UI.icons.bullet, "Config", pc.dim(truncatePath(ATKConfig.path(), 60))],
	];
	note(alignColumns(configRows, [3, 10, 60]), "Toolkit Configuration");

	if (links.length === 0) {
		UI.tip("Try linking a component: atk link rule clean-code");
	} else {
		UI.tip("Use 'atk explore' to find more components to link.");
	}

	outro(pc.cyan("Status check complete."));
}
