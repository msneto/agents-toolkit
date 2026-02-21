import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spinner } from "@clack/prompts";
import pc from "picocolors";
import { UI } from "../utils/ui";
import { ATKConfig } from "./config";
import { executeHook } from "./hooks";
import {
	type ComponentType,
	resolveTarget,
	type SupportedPlatform,
} from "./mapping";
import { type ToolIR, ToolIRSchema } from "./schema";
import { transpile } from "./transpiler";
import { replaceVariables, resolveVariables, scanVariables } from "./variables";

export interface LinkOptions {
	force?: boolean;
	platform?: SupportedPlatform;
	type?: ComponentType;
	name?: string;
	isGlobal?: boolean;
	nonInteractive?: boolean;
}

/**
 * Checks if a path exists.
 */
async function exists(p: string): Promise<boolean> {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

/**
 * Normalizes a path, resolving ~ to home directory.
 */
function normalizePath(p: string): string {
	if (p.startsWith("~")) {
		return path.join(os.homedir(), p.slice(1));
	}
	return path.resolve(p);
}

/**
 * Links a source file to a target destination.
 * Handles variable resolution, transpilation, caching, tool validation, and hooks.
 */
export async function createLink(
	sourcePath: string,
	options: LinkOptions = {},
) {
	const { type, name, platform, isGlobal, force, nonInteractive } = options;
	if (!type || !name || !platform) {
		throw new Error(
			"Missing required options for createLink: type, name, platform",
		);
	}

	const s = spinner();
	const componentDir = path.dirname(sourcePath);
	const isSkill = type === "skill";
	let toolData: ToolIR | null = null;

	// 1. Tool IR Validation (Skills Only)
	if (isSkill) {
		const toolJsonPath = path.join(componentDir, "tool.json");
		try {
			const rawTool = await fs.readFile(toolJsonPath, "utf-8");
			toolData = ToolIRSchema.parse(JSON.parse(rawTool));
			UI.info(
				`${pc.cyan("Tool Validated")}: ${pc.bold(toolData.name)} (v${toolData.version})`,
			);
		} catch {
			// Not all skills need tools
		}
	}

	// 2. Pre-Link Hook
	if (toolData?.hooks?.pre_link) {
		await executeHook("pre_link", toolData.hooks.pre_link, {
			cwd: componentDir,
			nonInteractive,
		});
	}

	// 3. Resolve Target Path
	const targetConfig = resolveTarget(type, platform, name, isGlobal);
	if (!targetConfig) {
		throw new Error(
			`Could not resolve target configuration for ${type} on ${platform}`,
		);
	}

	const baseTargetPath = normalizePath(targetConfig.path);
	await fs.mkdir(baseTargetPath, { recursive: true });
	const targetPath = path.join(
		baseTargetPath,
		`${targetConfig.filename}${targetConfig.extension}`,
	);

	s.start(`Linking ${UI.path(sourcePath)} to ${UI.path(targetPath)}`);

	try {
		const content = await fs.readFile(sourcePath, "utf-8");
		const vars = scanVariables(content);

		let finalSource = sourcePath;
		let finalContent = content;

		// 4. Resolve Variables
		const resolvedValues =
			vars.length > 0 ? await resolveVariables(vars, { nonInteractive }) : {};

		finalContent = replaceVariables(content, resolvedValues);

		// 5. Transpile
		const transpilation = transpile(finalContent, name, targetConfig);
		finalContent = transpilation.content;

		// 6. Cache if changed or transpiled
		const needsCache = vars.length > 0 || targetConfig.format !== "md";
		if (needsCache) {
			const globalConfigPath = ATKConfig.path();
			const cacheDir = path.join(path.dirname(globalConfigPath), "cache");
			await fs.mkdir(cacheDir, { recursive: true });

			const contentHash = crypto
				.createHash("md5")
				.update(finalContent)
				.digest("hex");
			const cacheFileName = `${name}.${platform}.${contentHash}${targetConfig.extension}`;
			const cachePath = path.join(cacheDir, cacheFileName);

			await fs.writeFile(cachePath, finalContent);
			finalSource = cachePath;
		}

		// 7. Handle Conflict
		if (await exists(targetPath)) {
			if (force) {
				await fs.unlink(targetPath);
			} else {
				s.stop(pc.yellow("⚠ Conflict detected."));
				throw new Error(
					`File already exists at ${targetPath}. Use --force to overwrite.`,
				);
			}
		}

		// 8. Create Symlink
		const relativeSource = path.relative(path.dirname(targetPath), finalSource);
		await fs.symlink(relativeSource, targetPath);

		s.stop(pc.green(`✔ Linked to ${targetPath}`));

		// 9. Post-Link Hook
		if (toolData?.hooks?.post_link) {
			await executeHook("post_link", toolData.hooks.post_link, {
				cwd: componentDir,
				nonInteractive,
			});
		}
	} catch (err) {
		s.stop(pc.red("✖ Link failed."));
		throw err;
	}
}
