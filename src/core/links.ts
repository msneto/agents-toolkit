import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spinner } from "@clack/prompts";
import pc from "picocolors";
import { UI } from "../utils/ui";
import { ATKConfig } from "./config";
import { executeHook } from "./hooks";
import { type ToolIR, ToolIRSchema } from "./schema";
import { replaceVariables, resolveVariables, scanVariables } from "./variables";

export interface LinkOptions {
	force?: boolean;
	platform?: string;
	scope?: "global" | "project";
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
 * Links a source file to a target destination.
 * Handles variable resolution, caching, tool validation, and hooks.
 */
export async function createLink(
	sourcePath: string,
	targetPath: string,
	options: LinkOptions = {},
) {
	const s = spinner();
	const componentDir = path.dirname(sourcePath);
	const isSkill = sourcePath.includes("/skills/");
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
			// Not all skills need tools, but if tool.json exists, it must be valid.
		}
	}

	// 2. Pre-Link Hook
	if (toolData?.hooks?.pre_link) {
		await executeHook("pre_link", toolData.hooks.pre_link, {
			cwd: componentDir,
			nonInteractive: options.nonInteractive,
		});
	}

	s.start(`Linking ${UI.path(sourcePath)} to ${UI.path(targetPath)}`);

	try {
		const content = await fs.readFile(sourcePath, "utf-8");
		const vars = scanVariables(content);

		let finalSource = sourcePath;

		if (vars.length > 0) {
			// 3. Resolve Variables
			const resolvedValues = await resolveVariables(vars, {
				nonInteractive: options.nonInteractive,
			});
			const resolvedContent = replaceVariables(content, resolvedValues);

			// 4. Cache Resolved Content (Centralized)
			const cacheDir = path.join(path.dirname(ATKConfig.path()), "cache");
			await fs.mkdir(cacheDir, { recursive: true });

			const contentHash = crypto
				.createHash("md5")
				.update(resolvedContent)
				.digest("hex");
			const cacheFileName = `${path.basename(sourcePath)}.${contentHash}.md`;
			const cachePath = path.join(cacheDir, cacheFileName);

			await fs.writeFile(cachePath, resolvedContent);
			finalSource = cachePath;
		}

		// 5. Handle Conflict
		if (await exists(targetPath)) {
			if (options.force) {
				await fs.unlink(targetPath);
			} else {
				s.stop(pc.yellow("⚠ Conflict detected."));
				throw new Error(
					`File already exists at ${targetPath}. Use --force to overwrite.`,
				);
			}
		}

		// 6. Create Symlink
		const relativeSource = path.relative(path.dirname(targetPath), finalSource);
		await fs.symlink(relativeSource, targetPath);

		s.stop(pc.green(`✔ Linked to ${targetPath}`));

		// 7. Post-Link Hook
		if (toolData?.hooks?.post_link) {
			await executeHook("post_link", toolData.hooks.post_link, {
				cwd: componentDir,
				nonInteractive: options.nonInteractive,
			});
		}
	} catch (err) {
		s.stop(pc.red("✖ Link failed."));
		throw err;
	}
}
