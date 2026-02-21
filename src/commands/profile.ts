import { intro, outro, select, text } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "../core/config";
import { createLink, findActiveLinks, resolveSourceFile } from "../core/links";
import {
	type ComponentType,
	detectProjectPlatforms,
	SUPPORTED_PLATFORMS,
	type SupportedPlatform,
} from "../core/mapping";
import { UI } from "../utils/ui";

export async function profileCommand(
	action?: "save" | "switch" | "list" | "delete",
	name?: string,
	options: { platform?: string; nonInteractive?: boolean } = {},
) {
	UI.header();
	const config = ATKConfig.get();

	if (!action) {
		const selectedAction = await select({
			message: "What do you want to do with profiles?",
			options: [
				{ value: "list", label: "List Profiles" },
				{ value: "save", label: "Save Current Setup" },
				{ value: "switch", label: "Switch to Profile" },
				{ value: "delete", label: "Delete Profile" },
			],
		});
		if (typeof selectedAction === "symbol") return;
		action = selectedAction as any;
	}

	switch (action) {
		case "list":
			listProfiles(config);
			break;
		case "save":
			await saveProfile(name);
			break;
		case "switch":
			await switchProfile(name, options);
			break;
		case "delete":
			await deleteProfile(name);
			break;
	}
}

function listProfiles(config: any) {
	intro(pc.cyan("Stored Profiles"));
	const profiles = Object.keys(config.profiles);
	if (profiles.length === 0) {
		UI.info("No profiles found.");
	} else {
		for (const p of profiles) {
			const linkCount = config.profiles[p].links.length;
			UI.info(`${pc.bold(p)} (${linkCount} links)`);
		}
	}
	outro(pc.cyan("End of list."));
}

async function saveProfile(name?: string) {
	intro(pc.cyan("Saving Profile"));
	const profileName =
		name ||
		((await text({
			message: "Profile name:",
			placeholder: "e.g. web-stack, cli-dev",
		})) as string);

	if (typeof profileName === "symbol" || !profileName) return;

	const projectRoot = process.cwd();
	const activeLinks = await findActiveLinks(projectRoot);

	if (activeLinks.length === 0) {
		UI.error("No active ATK links found to save in this project.");
		return;
	}

	const profiles = ATKConfig.get().profiles;
	profiles[profileName] = {
		links: activeLinks.map((l) => ({
			type: l.type,
			name: l.name,
			platform: l.platform,
			target: l.target,
		})),
	};
	ATKConfig.set("profiles", profiles);

	UI.success(
		`Profile ${pc.bold(profileName)} saved with ${activeLinks.length} links.`,
	);
	UI.tip(
		`Switch to this profile anytime using: atk profile switch ${profileName}`,
	);
	outro(pc.cyan("Ready to switch anytime."));
}

async function switchProfile(
	name?: string,
	options: { platform?: string; nonInteractive?: boolean } = {},
) {
	intro(pc.cyan("Switching Profile"));
	const config = ATKConfig.get();
	const profiles = config.profiles;
	const profileNames = Object.keys(profiles);

	if (profileNames.length === 0) {
		UI.error("No profiles available to switch to.");
		return;
	}

	const selectedName =
		name ||
		((await select({
			message: "Select profile to apply:",
			options: profileNames.map((p) => ({ value: p, label: p })),
		})) as string);

	if (typeof selectedName === "symbol" || !selectedName) return;

	const profile = profiles[selectedName];
	const atkRoot = config.atkRoot;

	// Determine optional platform override
	const overridePlatform = options.platform as SupportedPlatform;

	for (const link of profile.links) {
		try {
			const targetPlatform = (overridePlatform ||
				link.platform) as SupportedPlatform;
			if (!targetPlatform || targetPlatform === ("unknown" as any)) {
				UI.warn(`Skipping ${link.name}: Unknown platform.`);
				continue;
			}

			const sourceFile = await resolveSourceFile(
				atkRoot,
				link.type as ComponentType,
				link.name,
			);
			await createLink(sourceFile, {
				type: link.type as ComponentType,
				name: link.name,
				platform: targetPlatform,
				force: true,
				nonInteractive: options.nonInteractive,
			});
		} catch (err) {
			UI.warn(
				`Failed to link ${link.name}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	UI.success(`Profile ${pc.bold(selectedName)} applied successfully.`);
	UI.tip("Run 'atk status' to verify your active environment.");
	outro(pc.cyan("Environment synchronized."));
}

async function deleteProfile(name?: string) {
	const config = ATKConfig.get();
	const profiles = config.profiles;
	const selectedName =
		name ||
		((await select({
			message: "Select profile to delete:",
			options: Object.keys(profiles).map((p) => ({ value: p, label: p })),
		})) as string);

	if (typeof selectedName === "symbol" || !selectedName) return;

	delete profiles[selectedName];
	ATKConfig.set("profiles", profiles);
	UI.success(`Profile ${pc.bold(selectedName)} deleted.`);
}
