import { describe, expect, it } from "bun:test";
import type { TargetConfig } from "./mapping";
import { transpile } from "./transpiler";

describe("Transpiler Engine", () => {
	it("should transpile Markdown to TOML for Gemini CLI", () => {
		const markdown = `---
name: clean-code
description: Enforce standards.
---
# Rules
1. No console logs.
2. Use functional components.
`;
		const config: TargetConfig = {
			path: ".gemini/commands/",
			filename: "clean-code",
			extension: ".toml",
			format: "toml",
			scope: "project",
		};

		const result = transpile(markdown, "clean-code", config);

		expect(result.content).toContain("description: Enforce standards.");
		expect(result.content).toContain('prompt = """');
		expect(result.content).toContain("No console logs.");
	});

	it("should preserve original format if target is Markdown", () => {
		const markdown = "# Test content";
		const config: TargetConfig = {
			path: "",
			filename: ".cursorrules",
			extension: "",
			format: "md",
			scope: "project",
		};

		const result = transpile(markdown, "test", config);
		expect(result.content).toBe(markdown);
	});
});
