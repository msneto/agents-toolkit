import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isCancel, note, select, spinner } from "@clack/prompts";
import pc from "picocolors";
import { UI } from "../utils/ui";
import { ATKConfig } from "./config";
import { executeHook } from "./hooks";
import {
	type ComponentType,
	resolveTarget,
	type SupportedPlatform,
	type TargetConfig,
} from "./mapping";
import { BundleSchema, type ToolIR, ToolIRSchema } from "./schema";
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

export interface ActiveLink {
	type: ComponentType;
	name: string;
	platform: SupportedPlatform;
	target: string;
	fullPath: string;
}

/**
 * Resolves the source file path for a component.
 */
export async function resolveSourceFile(
	root: string,
	type: ComponentType,
	name: string,
): Promise<string> {
	if (type === "bundle") {
		const bundlePath = path.join(root, "bundles", name, "bundle.json");
		const rootBundlePath = path.join(root, "bundles", `${name}.json`);

		try {
			await fs.access(bundlePath);
			return bundlePath;
		} catch {
			try {
				await fs.access(rootBundlePath);
				return rootBundlePath;
			} catch {
				throw new Error(
					`Bundle file not found: ${bundlePath} or ${rootBundlePath}`,
				);
			}
		}
	}

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

/**
 * Checks if a path exists.
 */
export async function exists(p: string): Promise<boolean> {
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
export function normalizePath(p: string): string {
	if (p.startsWith("~")) {
		return path.join(os.homedir(), p.slice(1));
	}
	return path.resolve(p);
}

/**
 * Loads tool metadata for skills.
 */
export async function loadToolData(
	componentDir: string,
): Promise<ToolIR | null> {
	const toolJsonPath = path.join(componentDir, "tool.json");
	try {
		const rawTool = await fs.readFile(toolJsonPath, "utf-8");
		const toolData = ToolIRSchema.parse(JSON.parse(rawTool));
		UI.info(
			`${pc.cyan("Tool Validated")}: ${pc.bold(toolData.name)} (v${toolData.version})`,
		);
		return toolData;
	} catch {
		return null;
	}
}

/**
 * Prepares the final content by resolving variables and transpiling.
 */
export async function prepareResolvedContent(
	sourcePath: string,
	type: ComponentType,
	name: string,
	targetConfig: TargetConfig,
	options: { nonInteractive?: boolean } = {},
) {
	let content = "";
	let finalSource = sourcePath;
	const componentDir = path.dirname(sourcePath);

	if (type === "skill") {
		const skillMdPath = path.join(componentDir, "SKILL.md");
		try {
			content = await fs.readFile(skillMdPath, "utf-8");
			finalSource = skillMdPath;
		} catch {
			content = await fs.readFile(sourcePath, "utf-8");
		}
	} else {
		content = await fs.readFile(sourcePath, "utf-8");
	}

	const vars = scanVariables(content);
	const resolvedValues =
		vars.length > 0
			? await resolveVariables(vars, { nonInteractive: options.nonInteractive })
			: {};

	content = replaceVariables(content, resolvedValues);
	const transpilation = transpile(content, name, targetConfig);

	return {
		content: transpilation.content,
		needsCache: vars.length > 0 || targetConfig.format !== "md",
		finalSource,
	};
}

/**
 * Manages caching of resolved/transpiled content.
 */
export async function writeToCache(
	name: string,
	platform: string,
	content: string,
	extension: string,
) {
	const globalConfigPath = ATKConfig.path();
	const cacheDir = path.join(path.dirname(globalConfigPath), "cache");
	await fs.mkdir(cacheDir, { recursive: true });

	const contentHash = crypto.createHash("md5").update(content).digest("hex");
	const cacheFileName = `${name}.${platform}.${contentHash}${extension}`;
	const cachePath = path.join(cacheDir, cacheFileName);

	await fs.writeFile(cachePath, content);
	return cachePath;
}

/**
 * Handles conflicts at the target path.
 */
export async function handlePathConflict(
	targetPath: string,
	options: { force?: boolean; nonInteractive?: boolean },
) {
	if (!(await exists(targetPath))) return true;

	const isSymlink = (await fs.lstat(targetPath)).isSymbolicLink();
	if (options.force || isSymlink) {
		await fs.unlink(targetPath);
		return true;
	}

	if (options.nonInteractive) {
		throw new Error(
			`File already exists at ${targetPath}. Use --force to overwrite.`,
		);
	}

	UI.warn(
		`The file ${pc.bold(path.basename(targetPath))} already contains content.`,
	);

	const action = await select({
		message: "How would you like to proceed?",
		options: [
			{
				value: "backup",
				label: "Backup & Link (Recommended)",
				hint: "Moves original to .atk-bak",
			},
			{ value: "overwrite", label: "Overwrite", hint: "Deletes original file" },
			{ value: "abort", label: "Abort", hint: "I will handle this manually" },
		],
	});

	if (isCancel(action) || action === "abort") {
		note(`Linking aborted.`, "Manual Action Required");
		process.exit(0);
	}

	if (action === "backup") {
		const bakPath = `${targetPath}.atk-bak`;
		await fs.rename(targetPath, bakPath);
		UI.info(`Original backed up to ${pc.magenta(path.basename(bakPath))}`);
	} else {
		await fs.unlink(targetPath);
	}

	return true;
}

/**
 * Links a source file to a target destination.
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

	// Recursive Bundle Handling
	if (type === "bundle") {
		const rawBundle = await fs.readFile(sourcePath, "utf-8");
		const bundle = BundleSchema.parse(JSON.parse(rawBundle));
		UI.info(`${pc.cyan("◈ Processing Bundle")}: ${pc.bold(bundle.name)}`);

		for (const component of bundle.components) {
			const componentSource = await resolveSourceFile(
				ATKConfig.get().atkRoot,
				component.type,
				component.name,
			);
			await createLink(componentSource, {
				...options,
				type: component.type,
				name: component.name,
			});
		}
		UI.success(`Bundle ${pc.bold(bundle.name)} processed.`);
		return;
	}

	const s = spinner();
	const componentDir = path.dirname(sourcePath);
	const toolData = type === "skill" ? await loadToolData(componentDir) : null;

	if (toolData?.hooks?.pre_link) {
		await executeHook("pre_link", toolData.hooks.pre_link, {
			cwd: componentDir,
			nonInteractive,
		});
	}

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
		const {
			content,
			needsCache,
			finalSource: source,
		} = await prepareResolvedContent(sourcePath, type, name, targetConfig, {
			nonInteractive,
		});

		let sourceToLink = source;
		if (needsCache) {
			sourceToLink = await writeToCache(
				name,
				platform,
				content,
				targetConfig.extension,
			);
		}

		await handlePathConflict(targetPath, { force, nonInteractive });

		const relativeSource = path.relative(
			path.dirname(targetPath),
			sourceToLink,
		);
		await fs.symlink(relativeSource, targetPath);

		s.stop(pc.green(`✔ Linked to ${targetPath}`));

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

/**
 * Discovers all ATK-managed links in a project.
 */
export async function findActiveLinks(
	projectRoot: string,
): Promise<ActiveLink[]> {
	const activeLinks: ActiveLink[] = [];
	const atkRoot = ATKConfig.get().atkRoot;
	const globalConfigPath = ATKConfig.path();
	const cacheDirName = path.basename(path.dirname(globalConfigPath));

	const platforms: Record<string, SupportedPlatform> = {
		".opencode": "opencode",
		".gemini": "gemini",
		".claude": "claude",
		".cursor": "cursor",
		".windsurfrules": "windsurf",
		".codex": "codex",
	};

	const searchPaths = [
		projectRoot,
		path.join(projectRoot, ".opencode"),
		path.join(projectRoot, ".opencode", "commands"),
		path.join(projectRoot, ".opencode", "skills"),
		path.join(projectRoot, ".gemini"),
		path.join(projectRoot, ".gemini", "commands"),
		path.join(projectRoot, ".gemini", "skills"),
		path.join(projectRoot, ".claude"),
		path.join(projectRoot, ".cursor"),
	];

	for (const p of searchPaths) {
		try {
			const entries = await fs.readdir(p, { withFileTypes: true });
			const relPath = path.relative(projectRoot, p);
			const basePlatform =
				relPath === ""
					? await detectPlatformFromLink(p, entries)
					: platforms[`.${relPath.split(path.sep)[0]}`] ||
						(Object.values(platforms).includes(relPath as any)
							? (relPath as any)
							: null);

			for (const entry of entries) {
				const fullPath = path.join(p, entry.name);

				// Recursive check for skills
				if (
					entry.isDirectory() &&
					(p.endsWith("skills") || entry.name === "skills")
				) {
					const subEntries = await fs.readdir(fullPath, {
						withFileTypes: true,
					});
					for (const sub of subEntries) {
						const skillPath = path.join(fullPath, sub.name, "SKILL.md");
						try {
							const stat = await fs.lstat(skillPath);
							if (stat.isSymbolicLink()) {
								const target = await fs.readlink(skillPath);
								const absTarget = path.resolve(path.dirname(skillPath), target);
								if (isAtkManaged(absTarget, cacheDirName, atkRoot)) {
									const metadata = await deduceMetadata(
										absTarget,
										sub.name,
										atkRoot,
									);
									if (metadata) {
										activeLinks.push({
											...metadata,
											platform:
												basePlatform ||
												(await deducePlatformFromPath(skillPath)),
											target,
											fullPath: skillPath,
										});
									}
								}
							}
						} catch {}
					}
				}

				if (entry.isSymbolicLink()) {
					const target = await fs.readlink(fullPath);
					const absTarget = path.resolve(p, target);

					if (isAtkManaged(absTarget, cacheDirName, atkRoot)) {
						const metadata = await deduceMetadata(
							absTarget,
							entry.name,
							atkRoot,
						);
						if (metadata) {
							activeLinks.push({
								...metadata,
								platform:
									basePlatform || (await deducePlatformFromPath(fullPath)),
								target,
								fullPath,
							});
						}
					}
				}
			}
		} catch {
			// Path not found
		}
	}
	return activeLinks;
}

function isAtkManaged(target: string, cacheDirName: string, atkRoot: string) {
	return (
		target.includes(cacheDirName) ||
		target.includes(".atk/cache") ||
		target.includes(atkRoot)
	);
}

async function deduceMetadata(
	target: string,
	linkName: string,
	atkRoot: string,
) {
	const absoluteTarget = path.resolve(target);
	const globalConfigPath = ATKConfig.path();
	const cacheDir = path.join(path.dirname(globalConfigPath), "cache");

	let name = "";
	let type: ComponentType | null = null;

	if (absoluteTarget.includes(cacheDir)) {
		const fileName = path.basename(absoluteTarget);
		name = fileName.split(".")[0];
		type = await findType(name, atkRoot);
	} else if (absoluteTarget.includes(atkRoot)) {
		const relativeToRoot = path.relative(atkRoot, absoluteTarget);
		const parts = relativeToRoot.split(path.sep);

		if (parts.length >= 2) {
			const typeMap: Record<string, ComponentType> = {
				rules: "rule",
				skills: "skill",
				commands: "command",
				agents: "agent",
				bundles: "bundle",
			};

			type = typeMap[parts[0]];
			if (type === "skill") {
				name = parts[1];
			} else {
				name = parts[parts.length - 1].split(".")[0];
			}
		}
	}

	if (name && type) return { type, name };
	return null;
}

async function findType(
	name: string,
	atkRoot: string,
): Promise<ComponentType | null> {
	const types: ComponentType[] = [
		"rule",
		"skill",
		"command",
		"agent",
		"bundle",
	];
	for (const t of types) {
		try {
			await resolveSourceFile(atkRoot, t, name);
			return t;
		} catch {
			// skip
		}
	}
	return null;
}

async function detectPlatformFromLink(
	p: string,
	entries: any[],
): Promise<SupportedPlatform | null> {
	for (const entry of entries) {
		if (entry.name === "GEMINI.md") return "gemini";
		if (entry.name === ".clauderules") return "claude";
		if (entry.name === ".cursorrules") return "cursor";
		if (entry.name === ".windsurfrules") return "windsurf";
	}
	return null;
}

async function deducePlatformFromPath(p: string): Promise<SupportedPlatform> {
	if (p.includes(".gemini")) return "gemini";
	if (p.includes(".opencode")) return "opencode";
	if (p.includes(".claude")) return "claude";
	if (p.includes(".cursor")) return "cursor";
	if (p.includes("GEMINI.md")) return "gemini";
	return "unknown" as any;
}
