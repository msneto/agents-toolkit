import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	note,
	outro,
	spinner,
	text,
} from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { UI } from "../utils/ui";

export async function initCommand(options: { nonInteractive?: boolean } = {}) {
	UI.header();
	if (options.nonInteractive) {
		UI.info("Initializing ATK in non-interactive mode...");
	} else {
		intro(pc.cyan("Initialization Wizard"));
	}

	const currentDir = process.cwd();
	let projectRoot: string;

	if (options.nonInteractive) {
		projectRoot = currentDir;
		UI.info(`Using current directory as ATK Root: ${pc.magenta(projectRoot)}`);
	} else {
		const result = await text({
			message: "Where is your Agents Toolkit repository?",
			initialValue: currentDir,
			validate: (val) => {
				if (!val) return "Path is required.";
				return;
			},
		});

		if (isCancel(result)) {
			cancel("Setup cancelled.");
			process.exit(0);
		}
		projectRoot = result as string;
	}

	const s = spinner();
	s.start("Configuring global toolkit settings...");

	ATKConfig.set("atkRoot", projectRoot);

	// Create .env.atk template if not exists
	const envPath = path.join(projectRoot, ".env.atk");
	try {
		await fs.access(envPath);
	} catch {
		await fs.writeFile(
			envPath,
			"# ATK Local Secrets (Git-ignored)\n# Add your API keys here, e.g., SECRET_YOUTUBE_KEY=xyz\n",
		);
	}

	s.stop(pc.green("✔ Configuration saved!"));

	if (!options.nonInteractive) {
		note(
			`ATK Root: ${pc.magenta(projectRoot)}\nConfig Path: ${pc.dim(ATKConfig.path())}`,
			"Environment",
		);
	}

	let addToPath = false;
	if (options.nonInteractive) {
		UI.info("Skipping $PATH registration in non-interactive mode.");
	} else {
		addToPath = (await confirm({
			message:
				"Would you like to add ATK to your $PATH? (requires manual shell reload)",
			initialValue: true,
		})) as boolean;
	}

	if (addToPath && !isCancel(addToPath)) {
		const shellProfile = getShellProfile();
		if (shellProfile) {
			const binPath = path.join(projectRoot, "bin");
			const exportCmd = `\n# ATK Binary Path\nexport PATH="$PATH:${binPath}"\n`;

			try {
				const content = await fs.readFile(shellProfile, "utf-8");
				if (!content.includes(binPath)) {
					await fs.appendFile(shellProfile, exportCmd);
					note(
						`Added to ${pc.magenta(shellProfile)}\nPlease run 'source ${shellProfile}' to update your shell.`,
						"Shell Profile Updated",
					);
				} else {
					note(
						`${pc.magenta(binPath)} is already in your profile.`,
						"Already Configured",
					);
				}
			} catch (_err) {
				UI.error(
					"Could not write to shell profile. Please add manually.",
					"E001",
				);
			}
		}
	}

	if (options.nonInteractive) {
		UI.success("Initialization complete!");
	} else {
		outro(pc.cyan("Initialization complete!"));
		UI.tip("Run 'atk explore' to see available components.");
	}
}

function getShellProfile(): string | null {
	const home = os.homedir();
	const shell = process.env.SHELL || "";

	if (shell.includes("zsh")) return path.join(home, ".zshrc");
	if (shell.includes("bash")) return path.join(home, ".bashrc");
	return null;
}
