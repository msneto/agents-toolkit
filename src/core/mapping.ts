export type SupportedPlatform =
	| "opencode"
	| "gemini"
	| "codex"
	| "claude"
	| "cursor"
	| "windsurf";
export type ComponentType = "rule" | "command" | "skill" | "agent" | "bundle";

export interface TargetConfig {
	path: string;
	filename: string;
	extension: string;
	format: "md" | "toml" | "json";
	scope: "global" | "project";
}

export const PLATFORM_CONFIGS: Record<
	SupportedPlatform,
	Partial<Record<ComponentType, TargetConfig>>
> = {
	opencode: {
		command: {
			path: ".opencode/commands/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "project",
		},
		skill: {
			path: ".opencode/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "project",
		},
		agent: {
			path: "",
			filename: "AGENTS",
			extension: ".md",
			format: "md",
			scope: "project",
		},
	},
	gemini: {
		command: {
			path: ".gemini/commands/",
			filename: "{{name}}",
			extension: ".toml",
			format: "toml",
			scope: "project",
		},
		skill: {
			path: ".gemini/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "project",
		},
		agent: {
			path: ".gemini/agents/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "project",
		},
		rule: {
			path: "",
			filename: "GEMINI",
			extension: ".md",
			format: "md",
			scope: "project",
		},
	},
	claude: {
		rule: {
			path: "",
			filename: ".clauderules",
			extension: "",
			format: "md",
			scope: "project",
		},
		skill: {
			path: ".claude/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "project",
		},
	},
	cursor: {
		rule: {
			path: "",
			filename: ".cursorrules",
			extension: "",
			format: "md",
			scope: "project",
		},
		command: {
			path: "",
			filename: ".cursorrules",
			extension: "",
			format: "md",
			scope: "project",
		}, // Shared
	},
	codex: {
		// Assuming OpenCode-like structure for now
		command: {
			path: ".codex/commands/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "project",
		},
		skill: {
			path: ".codex/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "project",
		},
	},
	windsurf: {
		rule: {
			path: "",
			filename: ".windsurfrules",
			extension: "",
			format: "md",
			scope: "project",
		},
	},
};

export const GLOBAL_PLATFORM_CONFIGS: Record<
	SupportedPlatform,
	Partial<Record<ComponentType, TargetConfig>>
> = {
	opencode: {
		command: {
			path: "~/.config/opencode/commands/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "global",
		},
		skill: {
			path: "~/.config/opencode/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "global",
		},
	},
	gemini: {
		command: {
			path: "~/.gemini/commands/",
			filename: "{{name}}",
			extension: ".toml",
			format: "toml",
			scope: "global",
		},
		skill: {
			path: "~/.gemini/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "global",
		},
		agent: {
			path: "~/.gemini/agents/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "global",
		},
		rule: {
			path: "~/.gemini/",
			filename: "GEMINI",
			extension: ".md",
			format: "md",
			scope: "global",
		},
	},
	claude: {
		skill: {
			path: "~/.claude/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "global",
		},
	},
	codex: {
		command: {
			path: "~/.codex/commands/",
			filename: "{{name}}",
			extension: ".md",
			format: "md",
			scope: "global",
		},
		skill: {
			path: "~/.codex/skills/{{name}}/",
			filename: "SKILL",
			extension: ".md",
			format: "md",
			scope: "global",
		},
	},
	cursor: {},
	windsurf: {},
};

export function resolveTarget(
	type: ComponentType,
	platform: SupportedPlatform,
	name: string,
	isGlobal = false,
): TargetConfig | null {
	const configs = isGlobal ? GLOBAL_PLATFORM_CONFIGS : PLATFORM_CONFIGS;
	const config = configs[platform]?.[type];
	if (!config) return null;

	return {
		...config,
		path: config.path.replace("{{name}}", name),
		filename: config.filename.replace("{{name}}", name),
	};
}

export const SUPPORTED_PLATFORMS: {
	value: SupportedPlatform;
	label: string;
}[] = [
	{ value: "opencode", label: "OpenCode (.opencode/)" },
	{ value: "gemini", label: "Gemini CLI (.gemini/)" },
	{ value: "codex", label: "Codex (.codex/)" },
	{ value: "claude", label: "Claude Code (.claude/)" },
	{ value: "cursor", label: "Cursor (.cursorrules)" },
	{ value: "windsurf", label: "Windsurf (.windsurfrules)" },
];

import fs from "node:fs/promises";
import path from "node:path";

export async function detectProjectPlatforms(
	projectRoot: string,
): Promise<SupportedPlatform[]> {
	const detected: SupportedPlatform[] = [];
	const markers: Record<string, string[]> = {
		opencode: [".opencode", "AGENTS.md"],
		gemini: [".gemini", "GEMINI.md"],
		claude: [".clauderules"],
		cursor: [".cursorrules", ".cursor/rules"],
		windsurf: [".windsurfrules"],
		codex: [".codex"],
	};

	for (const [platform, platformMarkers] of Object.entries(markers)) {
		for (const marker of platformMarkers) {
			try {
				await fs.access(path.join(projectRoot, marker));
				detected.push(platform as SupportedPlatform);
				break;
			} catch {
				// Marker not found
			}
		}
	}
	return detected;
}
