import fs from "node:fs/promises";
import path from "node:path";
import { cancel, intro, isCancel, note, outro, select } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import {
	createLink,
	LinkAbortError,
	LinkSkipError,
	resolveSourceFile,
} from "../core/links";
import {
	type ComponentType,
	detectProjectPlatforms,
	SUPPORTED_PLATFORMS,
	type SupportedPlatform,
} from "../core/mapping";
import { UI } from "../utils/ui";

export async function linkCommand(
	type?: string,
	name?: string,
	options: {
		force?: boolean;
		nonInteractive?: boolean;
		global?: boolean;
		platform?: string;
		all?: boolean;
	} = {},
) {
	const interactive = UI.isInteractive(options);
	if (interactive) {
		UI.header();
		intro(pc.cyan("Linking Wizard"));
	}

	const atkRoot = ATKConfig.get().atkRoot;

	// 1. Resolve Type
	let selectedType = type as ComponentType;
	if (!selectedType) {
		selectedType = (await select({
			message: "What do you want to link?",
			options: [
				{ value: "rule", label: "Rule (Behavioral Constraints)" },
				{ value: "command", label: "Command (Ready-to-use Prompt)" },
				{ value: "skill", label: "Skill (Executable Capability)" },
				{ value: "agent", label: "Agent (Persona Definition)" },
				{ value: "bundle", label: "Bundle (Group of components)" },
			],
		})) as ComponentType;
	}

	if (isCancel(selectedType)) {
		cancel("Linking cancelled.");
		process.exit(0);
	}

	// 2. Resolve Name
	let selectedName = name;
	if (!selectedName) {
		let dirName = "";
		switch (selectedType) {
			case "command":
				dirName = "commands";
				break;
			case "bundle":
				dirName = "bundles";
				break;
			default:
				dirName = `${selectedType}s`;
		}
		const componentDir = path.join(atkRoot, dirName);
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

	// 3. Resolve Platform (Smart Discovery or --all)
	let targetPlatforms: SupportedPlatform[] = [];
	if (options.all) {
		if (options.platform) {
			throw new Error("Cannot combine --all with --platform.");
		}
		if (options.global) {
			throw new Error("Cannot combine --all with --global.");
		}

		targetPlatforms = await detectProjectPlatforms(process.cwd());
		if (targetPlatforms.length === 0) {
			throw new Error(
				"No environment detected. Use --platform for a single target.",
			);
		}
		if (interactive) {
			UI.info(
				`Broadcasting to ${pc.magenta(String(targetPlatforms.length))} environments: ${targetPlatforms.join(", ")}`,
			);
		}
	} else {
		let targetPlatform = options.platform as SupportedPlatform;
		if (!targetPlatform) {
			const detected = await detectProjectPlatforms(process.cwd());

			if (detected.length === 1 && !options.global) {
				targetPlatform = detected[0]!;
				if (interactive)
					UI.info(`Auto-detected environment: ${pc.magenta(targetPlatform)}`);
			} else if (interactive) {
				targetPlatform = (await select({
					message: "Target environment:",
					options: SUPPORTED_PLATFORMS,
				})) as SupportedPlatform;
			} else if (detected.length > 1) {
				throw new Error(
					`Multiple environments detected (${detected.join(", ")}). Please specify --platform.`,
				);
			} else {
				throw new Error(
					"No environment detected. Please specify --platform or run in interactive mode.",
				);
			}
		}

		if (isCancel(targetPlatform)) {
			cancel("Linking cancelled.");
			process.exit(0);
		}

		targetPlatforms = [targetPlatform];
	}

	// 4. Resolve Source Path
	const sourceFile = await resolveSourceFile(
		atkRoot,
		selectedType,
		selectedName,
	);

	// 5. Execute Link
	try {
		const failures: Array<{ platform: SupportedPlatform; message: string }> =
			[];
		const skipped: SupportedPlatform[] = [];
		const successes: SupportedPlatform[] = [];
		let abortedBroadcast = false;

		for (const platform of targetPlatforms) {
			try {
				await createLink(sourceFile, {
					type: selectedType,
					name: selectedName,
					platform,
					isGlobal: options.global,
					force: options.force,
					nonInteractive: options.nonInteractive,
					broadcast: options.all,
				});
				successes.push(platform);
			} catch (err) {
				if (err instanceof LinkSkipError && options.all) {
					skipped.push(platform);
					continue;
				}

				if (err instanceof LinkAbortError) {
					if (options.all) {
						abortedBroadcast = true;
						break;
					}
					cancel("Linking cancelled.");
					return;
				}

				const message = err instanceof Error ? err.message : String(err);
				failures.push({ platform, message });
				if (!options.all) {
					throw err;
				}
			}
		}

		if (abortedBroadcast) {
			note(
				`Broadcast stopped by user after ${successes.length} linked, ${skipped.length} skipped.`,
				"Broadcast Aborted",
			);
			UI.tip("Run 'atk status' to verify what is currently active.");
			return;
		}

		if (failures.length > 0) {
			if (failures.length === targetPlatforms.length) {
				throw new Error(
					`Failed to link ${selectedName} to all environments: ${failures.map((f) => `${f.platform} (${f.message})`).join(", ")}`,
				);
			}
			const skipSuffix =
				skipped.length > 0 ? ` Skipped: ${skipped.join(", ")}.` : "";
			throw new Error(
				`Linked ${selectedName} to ${successes.length}/${targetPlatforms.length} environments. Failed: ${failures.map((f) => `${f.platform} (${f.message})`).join(", ")}.${skipSuffix}`,
			);
		}

		if (interactive) {
			if (options.all) {
				outro(
					pc.cyan(
						`Broadcast successful to ${targetPlatforms.length} environments!`,
					),
				);
				UI.tip(
					`Your agent now has the '${selectedName}' ${selectedType} active across detected environments.`,
				);
			} else {
				outro(pc.cyan("Link successful!"));
				UI.tip(
					`Your agent now has the '${selectedName}' ${selectedType} active.`,
				);
			}
		} else if (options.all) {
			if (skipped.length > 0) {
				note(
					`Linked ${selectedName} to ${successes.length}/${targetPlatforms.length} environments. Skipped: ${skipped.join(", ")}.`,
					"Broadcast Summary",
				);
			}
			UI.success(
				`Linked ${selectedName} (${selectedType}) to ${successes.length} environments: ${successes.join(", ")}`,
			);
		} else {
			UI.success(
				`Linked ${selectedName} (${selectedType}) to ${targetPlatforms[0]}`,
			);
		}
	} catch (err) {
		UI.error(err instanceof Error ? err.message : String(err), "E002");
		process.exit(1);
	}
}

async function getComponentFiles(dir: string): Promise<string[]> {
	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		return entries
			.filter(
				(e) =>
					(e.isFile() &&
						(e.name.endsWith(".md") || e.name.endsWith(".json"))) ||
					e.isDirectory(),
			)
			.map((e) => e.name.replace(".md", "").replace(".json", ""));
	} catch {
		return [];
	}
}
