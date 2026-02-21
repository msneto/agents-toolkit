import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cancel, isCancel, text } from "@clack/prompts";
import pc from "picocolors";
import { ATKConfig } from "./config";

const VAR_REGEX = /\{\{([a-zA-Z0-9_]+)\}\}/g;

export interface VariableContext {
	[key: string]: string;
}

/**
 * Scans content for {{VARIABLE_NAME}} patterns.
 */
export function scanVariables(content: string): string[] {
	const matches = content.matchAll(VAR_REGEX);
	const vars = new Set<string>();
	for (const match of matches) {
		vars.add(match[1]);
	}
	return Array.from(vars);
}

/**
 * Resolves a list of variables using the layered hierarchy.
 */
export async function resolveVariables(
	vars: string[],
	options: { projectPath?: string; nonInteractive?: boolean } = {},
): Promise<Record<string, string>> {
	const projectPath = options.projectPath || process.cwd();
	const resolved: Record<string, string> = {};

	// 1. Load Secrets (.env.atk)
	const secrets = await loadEnvAtk();

	// 2. Load Global Context (~/.config/atk/context.json)
	const globalContext = await loadJsonContext(
		path.join(os.homedir(), ".config", "atk", "context.json"),
	);

	// 3. Load Project Context (./.atk/context.json)
	const projectAtkDir = path.join(projectPath, ".atk");
	const projectContextPath = path.join(projectAtkDir, "context.json");
	const projectContext = await loadJsonContext(projectContextPath);

	for (const v of vars) {
		const value = secrets[v] || globalContext[v] || projectContext[v];

		if (value) {
			resolved[v] = value;
		} else {
			// 4. Trigger Wizard Fallback (only if not in CI mode)
			if (options.nonInteractive) {
				throw new Error(
					`Unresolved variable: {{${v}}}. Link failed in non-interactive mode.`,
				);
			}

			const newValue = await triggerVariableWizard(v);
			resolved[v] = newValue;

			// Save to project context by default for safety
			projectContext[v] = newValue;
			await ensureDir(projectAtkDir);
			await fs.writeFile(
				projectContextPath,
				JSON.stringify(projectContext, null, 2),
			);
		}
	}

	return resolved;
}

/**
 * Replaces placeholders with resolved values.
 */
export function replaceVariables(
	content: string,
	values: Record<string, string>,
): string {
	return content.replace(VAR_REGEX, (match, varName) => {
		return values[varName] || match;
	});
}

async function loadEnvAtk(): Promise<Record<string, string>> {
	const atkRoot = ATKConfig.get().atkRoot;
	const envPath = path.join(atkRoot, ".env.atk");
	try {
		const content = await fs.readFile(envPath, "utf-8");
		const env: Record<string, string> = {};
		content.split("\n").forEach((line) => {
			const [key, ...val] = line.split("=");
			if (key && val.length > 0) {
				env[key.trim()] = val.join("=").trim();
			}
		});
		return env;
	} catch {
		return {};
	}
}

export async function loadJsonContext(
	p: string,
): Promise<Record<string, string>> {
	try {
		const content = await fs.readFile(p, "utf-8");
		return JSON.parse(content);
	} catch {
		return {};
	}
}

export async function triggerVariableWizard(varName: string): Promise<string> {
	const result = await text({
		message: `I found a new variable: ${pc.magenta(`{{${varName}}}`)}. What is its value?`,
		placeholder: `Enter value for ${varName}...`,
		validate: (val) => {
			if (!val) return "Value is required.";
			return;
		},
	});

	if (isCancel(result)) {
		cancel("Operation cancelled. Unresolved variables prevent linking.");
		process.exit(1);
	}

	return result as string;
}

async function ensureDir(p: string) {
	try {
		await fs.access(p);
	} catch {
		await fs.mkdir(p, { recursive: true });
	}
}
