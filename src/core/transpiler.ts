import type { TargetConfig } from "./mapping";

export interface TranspilationResult {
	content: string;
	filename: string;
}

/**
 * Handles conversion of generic toolkit components into platform-specific formats.
 */
export function transpile(
	content: string,
	name: string,
	config: TargetConfig,
): TranspilationResult {
	let finalContent = content;

	if (config.format === "toml") {
		finalContent = transpileToToml(content, name);
	} else if (config.format === "json") {
		finalContent = transpileToJson(content);
	}

	return {
		content: finalContent,
		filename: `${config.filename}${config.extension}`,
	};
}

/**
 * Converts Markdown prompt content to Gemini CLI TOML format.
 */
function transpileToToml(content: string, name: string): string {
	// Escape triple quotes for TOML multi-line strings
	const escapedContent = content.replace(/"""/g, '"""');

	return `# Gemini CLI Custom Command: ${name}
description = "Custom command linked via Agents Toolkit"

prompt = """
${escapedContent}
"""
`;
}

/**
 * Simple JSON wrapper for content if needed.
 */
function transpileToJson(content: string): string {
	return JSON.stringify({ prompt: content }, null, 2);
}
