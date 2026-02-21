import { afterEach, describe, expect, it, spyOn } from "bun:test";
import fs from "node:fs/promises";
import { detectProjectPlatforms, resolveTarget } from "./mapping";

describe("Mapping Discovery", () => {
	afterEach(() => {
		spyOn(fs, "access").mockRestore();
	});

	it("should detect gemini from GEMINI.md", async () => {
		spyOn(fs, "access").mockImplementation(async (p: any) => {
			if (p.endsWith("GEMINI.md")) return undefined;
			throw new Error();
		});
		const result = await detectProjectPlatforms("/mock/project");
		expect(result).toContain("gemini");
	});

	it("should detect multiple platforms", async () => {
		spyOn(fs, "access").mockImplementation(async (p: any) => {
			if (p.endsWith(".gemini") || p.endsWith(".clauderules")) return undefined;
			throw new Error();
		});
		const result = await detectProjectPlatforms("/mock/project");
		expect(result).toContain("gemini");
		expect(result).toContain("claude");
	});

	it("should resolve project target correctly", () => {
		const result = resolveTarget("rule", "gemini", "my-rule");
		expect(result?.filename).toBe("GEMINI");
		expect(result?.path).toBe("");
	});

	it("should resolve global target correctly", () => {
		const result = resolveTarget("command", "gemini", "my-cmd", true);
		expect(result?.path).toBe("~/.gemini/commands/");
		expect(result?.filename).toBe("my-cmd");
	});

	it("should resolve claude command targets for project and global scope", () => {
		const projectResult = resolveTarget("command", "claude", "my-cmd");
		expect(projectResult?.path).toBe(".claude/commands/");
		expect(projectResult?.filename).toBe("my-cmd");

		const globalResult = resolveTarget("command", "claude", "my-cmd", true);
		expect(globalResult?.path).toBe("~/.claude/commands/");
		expect(globalResult?.filename).toBe("my-cmd");
	});

	it("should return null for invalid mapping", () => {
		const result = resolveTarget("rule", "codex", "test");
		expect(result).toBeNull();
	});
});
