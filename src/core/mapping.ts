export type SupportedPlatform = "cursor" | "gemini" | "claude" | "windsurf";
export type ComponentType = "rule" | "command" | "skill" | "agent";

export const PLATFORM_MAPPING: Record<
	ComponentType,
	Partial<Record<SupportedPlatform, string>>
> = {
	rule: {
		cursor: ".cursorrules",
		gemini: "GEMINI.md",
		claude: ".clauderules",
		windsurf: ".windsurfrules",
	},
	command: {
		cursor: ".cursorrules", // Cursor uses one file for rules and commands
		gemini: "GEMINI.md", // Gemini CLI also bundles
		claude: ".clauderules",
		windsurf: ".windsurfrules",
	},
	skill: {
		gemini: "~/.agents/skills/",
		claude: "~/.claude/skills/",
	},
	agent: {
		gemini: "prompt.md",
		claude: "prompt.md",
	},
};

export function getTargetFilename(
	type: ComponentType,
	platform: SupportedPlatform,
): string {
	const mapping = PLATFORM_MAPPING[type]?.[platform];
	if (!mapping) {
		return `${type}-${platform}.md`;
	}
	return mapping;
}

export const SUPPORTED_PLATFORMS: {
	value: SupportedPlatform;
	label: string;
}[] = [
	{ value: "cursor", label: "Cursor (.cursorrules)" },
	{ value: "gemini", label: "Gemini CLI (GEMINI.md)" },
	{ value: "claude", label: "Claude Code (.clauderules)" },
	{ value: "windsurf", label: "Windsurf (.windsurfrules)" },
];
