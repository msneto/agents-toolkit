import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";

mock.module("@clack/prompts", () => ({
	isCancel: (v: unknown) => typeof v === "symbol" || v === "canceled",
	select: mock(() => Promise.resolve("overwrite")),
	spinner: () => ({ start: mock(), stop: mock() }),
	note: mock(),
	cancel: mock(),
	outro: mock(),
	intro: mock(),
	success: mock(),
}));

import fs from "node:fs/promises";
import path from "node:path";
import * as prompts from "@clack/prompts";
import { ATKConfig } from "./config";
import * as links from "./links";

const dirent = (name: string, type: "file" | "dir" | "symlink") => ({
	name,
	isFile: () => type === "file",
	isDirectory: () => type === "dir",
	isSymbolicLink: () => type === "symlink",
});

describe("core/links", () => {
	const atkRoot = "/home/user/toolkit";
	const projectRoot = "/home/user/project";

	beforeEach(() => {
		spyOn(ATKConfig, "get").mockReturnValue({ atkRoot, profiles: {} } as any);
		spyOn(ATKConfig, "path").mockReturnValue(
			"/home/user/.config/atk-nodejs/config.json",
		);
	});

	afterEach(() => {
		mock.restore();
	});

	describe("resolveSourceFile", () => {
		it("returns nested bundle.json when present", async () => {
			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).endsWith("/bundles/web-stack/bundle.json")) return;
				throw new Error("missing");
			});
			const p = await links.resolveSourceFile(atkRoot, "bundle", "web-stack");
			expect(p).toBe(path.join(atkRoot, "bundles", "web-stack", "bundle.json"));
		});

		it("falls back to root bundle json", async () => {
			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).endsWith("/bundles/web-stack.json")) return;
				throw new Error("missing");
			});
			const p = await links.resolveSourceFile(atkRoot, "bundle", "web-stack");
			expect(p).toBe(path.join(atkRoot, "bundles", "web-stack.json"));
		});

		it("throws when bundle paths are missing", async () => {
			spyOn(fs, "access").mockRejectedValue(new Error("missing"));
			await expect(
				links.resolveSourceFile(atkRoot, "bundle", "ghost"),
			).rejects.toThrow(/Bundle file not found/);
		});

		it("falls back to SKILL.md for skills", async () => {
			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).endsWith("/skills/demo/SKILL.md")) return;
				throw new Error("missing");
			});
			const p = await links.resolveSourceFile(atkRoot, "skill", "demo");
			expect(p).toBe(path.join(atkRoot, "skills", "demo", "SKILL.md"));
		});

		it("throws when regular component is missing", async () => {
			spyOn(fs, "access").mockRejectedValue(new Error("missing"));
			await expect(
				links.resolveSourceFile(atkRoot, "rule", "ghost"),
			).rejects.toThrow(/Component file not found/);
		});
	});

	describe("helpers", () => {
		it("writes cached transpiled content", async () => {
			spyOn(fs, "mkdir").mockResolvedValue(undefined);
			const writeSpy = spyOn(fs, "writeFile").mockResolvedValue(undefined);
			const cachePath = await links.writeToCache(
				"demo",
				"gemini",
				"prompt-content",
				".toml",
			);
			expect(cachePath).toContain("/cache/demo.gemini.");
			expect(cachePath).toEndWith(".toml");
			expect(writeSpy).toHaveBeenCalled();
		});

		it("returns null when tool metadata cannot be read", async () => {
			spyOn(fs, "readFile").mockRejectedValue(new Error("missing"));
			const tool = await links.loadToolData("/tmp/skill");
			expect(tool).toBeNull();
		});

		it("uses source file when SKILL.md is missing", async () => {
			const targetConfig = {
				path: ".gemini/commands/",
				filename: "demo",
				extension: ".toml",
				format: "toml",
				scope: "project",
			} as const;

			spyOn(fs as any, "readFile").mockImplementation(async (p: any) => {
				if (String(p).endsWith("SKILL.md")) throw new Error("missing");
				return "# prompt";
			});

			const result = await links.prepareResolvedContent(
				"/tmp/skills/demo/content.md",
				"skill",
				"demo",
				targetConfig,
			);

			expect(result.finalSource).toBe("/tmp/skills/demo/content.md");
			expect(result.needsCache).toBe(true);
		});

		it("throws on conflict in non-interactive mode", async () => {
			spyOn(fs, "access").mockResolvedValue(undefined);
			spyOn(fs, "lstat").mockResolvedValue({
				isSymbolicLink: () => false,
			} as any);
			await expect(
				links.handlePathConflict("/tmp/target.md", { nonInteractive: true }),
			).rejects.toThrow(/Use --force to overwrite/);
		});

		it("backs up file when backup is selected", async () => {
			spyOn(fs, "access").mockResolvedValue(undefined);
			spyOn(fs, "lstat").mockResolvedValue({
				isSymbolicLink: () => false,
			} as any);
			spyOn(prompts, "select").mockResolvedValue("backup" as any);
			const renameSpy = spyOn(fs, "rename").mockResolvedValue(undefined);
			await links.handlePathConflict("/tmp/rule.md", {});
			expect(renameSpy).toHaveBeenCalledWith(
				"/tmp/rule.md",
				"/tmp/rule.md.atk-bak",
			);
		});

		it("unlinks existing file when overwrite is selected", async () => {
			spyOn(fs, "access").mockResolvedValue(undefined);
			spyOn(fs, "lstat").mockResolvedValue({
				isSymbolicLink: () => false,
			} as any);
			spyOn(prompts, "select").mockResolvedValue("overwrite" as any);
			const unlinkSpy = spyOn(fs, "unlink").mockResolvedValue(undefined);
			await links.handlePathConflict("/tmp/rule.md", {});
			expect(unlinkSpy).toHaveBeenCalledWith("/tmp/rule.md");
		});

		it("unlinks existing symlink when force is enabled", async () => {
			spyOn(fs, "access").mockResolvedValue(undefined);
			spyOn(fs, "lstat").mockResolvedValue({
				isSymbolicLink: () => true,
			} as any);
			const unlinkSpy = spyOn(fs, "unlink").mockResolvedValue(undefined);
			await links.handlePathConflict("/tmp/rule.md", { force: true });
			expect(unlinkSpy).toHaveBeenCalledWith("/tmp/rule.md");
		});

		it("exits when conflict action is abort", async () => {
			spyOn(fs, "access").mockResolvedValue(undefined);
			spyOn(fs, "lstat").mockResolvedValue({
				isSymbolicLink: () => false,
			} as any);
			spyOn(prompts, "select").mockResolvedValue("abort" as any);
			const exitSpy = spyOn(process, "exit").mockImplementation(() => {
				throw new Error("exit");
			});

			await expect(
				links.handlePathConflict("/tmp/rule.md", {}),
			).rejects.toThrow("exit");
			expect(exitSpy).toHaveBeenCalledWith(0);
		});

		it("normalizes paths with tilde", () => {
			expect(links.normalizePath("~/file")).toContain("file");
		});
	});

	describe("createLink", () => {
		it("throws when required options are missing", async () => {
			await expect(links.createLink("/tmp/a.md", {})).rejects.toThrow(
				/Missing required options/,
			);
		});

		it("throws when target mapping is missing", async () => {
			await expect(
				links.createLink("/tmp/a.md", {
					type: "rule",
					name: "strict",
					platform: "codex",
				}),
			).rejects.toThrow(/Could not resolve target configuration/);
		});

		it("processes bundle recursively", async () => {
			spyOn(fs as any, "readFile").mockImplementation(async (p: any) => {
				if (String(p).endsWith("bundle.json")) {
					return JSON.stringify({
						name: "starter",
						type: "bundle",
						description: "bundle",
						components: [{ type: "rule", name: "clean" }],
					});
				}
				return "# rule";
			});

			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).endsWith("/rules/clean.md")) return;
				throw new Error("missing");
			});
			const symlinkSpy = spyOn(fs, "symlink").mockResolvedValue(undefined);
			spyOn(fs, "mkdir").mockResolvedValue(undefined);
			await links.createLink("/tmp/bundle.json", {
				type: "bundle",
				name: "starter",
				platform: "gemini",
				nonInteractive: true,
			});
			expect(symlinkSpy).toHaveBeenCalled();
		});

		it("runs hook commands when tool.json includes hooks", async () => {
			spyOn(Bun, "spawn").mockReturnValue({
				exited: Promise.resolve(0),
				stdout: new ReadableStream(),
				stderr: new ReadableStream(),
			} as any);

			spyOn(fs as any, "readFile").mockImplementation(async (p: any) => {
				const file = String(p);
				if (file.endsWith("tool.json")) {
					return JSON.stringify({
						name: "demo_tool",
						description: "A valid demo tool",
						version: "1.0.0",
						parameters: {},
						runtime: { entrypoint: "src/index.ts" },
						hooks: { pre_link: "echo pre", post_link: "echo post" },
					});
				}
				if (file.endsWith("SKILL.md")) return "# skill body";
				return "# fallback";
			});

			spyOn(fs, "access").mockRejectedValue(new Error("missing target"));
			spyOn(fs, "mkdir").mockResolvedValue(undefined);
			spyOn(fs, "symlink").mockResolvedValue(undefined);
			await links.createLink("/tmp/skills/demo/content.md", {
				type: "skill",
				name: "demo",
				platform: "gemini",
				nonInteractive: true,
			});

			expect(Bun.spawn).toHaveBeenCalledTimes(2);
		});

		it("stops spinner and rethrows when symlink fails", async () => {
			spyOn(fs, "readFile").mockResolvedValue("# content");
			spyOn(fs, "access").mockRejectedValue(new Error("not found"));
			spyOn(fs, "mkdir").mockResolvedValue(undefined);
			spyOn(fs, "symlink").mockRejectedValue(new Error("symlink failed"));

			await expect(
				links.createLink("/tmp/rules/clean.md", {
					type: "rule",
					name: "clean",
					platform: "gemini",
				}),
			).rejects.toThrow(/symlink failed/);
		});

		it("uses cache file when target format is not markdown", async () => {
			spyOn(fs, "readFile").mockResolvedValue("# command");
			spyOn(fs, "access").mockRejectedValue(new Error("not found"));
			spyOn(fs, "mkdir").mockResolvedValue(undefined);
			const writeSpy = spyOn(fs, "writeFile").mockResolvedValue(undefined);
			spyOn(fs, "symlink").mockResolvedValue(undefined);

			await links.createLink("/tmp/commands/demo.md", {
				type: "command",
				name: "demo",
				platform: "gemini",
				nonInteractive: true,
			});

			expect(writeSpy).toHaveBeenCalled();
		});
	});

	describe("findActiveLinks", () => {
		it("discovers direct and nested skill symlinks", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				const full = String(p);
				if (full === projectRoot) {
					return [
						dirent("GEMINI.md", "symlink"),
						dirent(".gemini", "dir"),
					] as any;
				}
				if (full === path.join(projectRoot, ".gemini")) {
					return [dirent("skills", "dir")] as any;
				}
				if (full === path.join(projectRoot, ".gemini", "skills")) {
					return [dirent("s1", "dir")] as any;
				}
				if (full.endsWith("/skills/s1")) return [] as any;
				throw new Error("missing dir");
			});

			spyOn(fs, "lstat").mockImplementation(async (p) => {
				if (String(p).endsWith("SKILL.md")) {
					return { isSymbolicLink: () => true } as any;
				}
				return { isSymbolicLink: () => false } as any;
			});

			spyOn(fs as any, "readlink").mockImplementation(async (p: any) => {
				if (String(p).endsWith("GEMINI.md"))
					return path.join(atkRoot, "rules", "strict.md");
				return path.join(atkRoot, "skills", "s1", "SKILL.md");
			});

			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).includes("strict.md")) return;
				if (String(p).includes("skills/s1/SKILL.md")) return;
				throw new Error("missing");
			});

			const found = await links.findActiveLinks(projectRoot);
			expect(found.length).toBeGreaterThanOrEqual(2);
			expect(found.some((l) => l.platform === "gemini")).toBe(true);
		});

		it("returns empty when cache target metadata cannot be deduced", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent("GEMINI.md", "symlink")] as any;
				throw new Error("missing");
			});
			spyOn(fs, "readlink").mockResolvedValue(
				"/home/user/.config/atk-nodejs/cache/unknown.gemini.abc123.md",
			);
			spyOn(fs, "access").mockRejectedValue(new Error("missing"));

			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(0);
		});

		it("deduces metadata from cache target when component exists", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent("cache-link", "symlink")] as any;
				throw new Error("missing");
			});
			spyOn(fs, "readlink").mockResolvedValue(
				"/home/user/.config/atk-nodejs/cache/clean.gemini.abc123.md",
			);
			spyOn(fs, "access").mockImplementation(async (p) => {
				if (String(p).endsWith("/commands/clean.md")) return;
				throw new Error("missing");
			});

			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(1);
			expect(found[0]!.name).toBe("clean");
			expect(found[0]!.type).toBe("command");
		});

		it("handles claude root marker", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent(".clauderules", "file")] as any;
				throw new Error("missing");
			});
			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(0);
		});

		it("handles cursor root marker", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent(".cursorrules", "file")] as any;
				throw new Error("missing");
			});
			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(0);
		});

		it("handles windsurf root marker", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent(".windsurfrules", "file")] as any;
				throw new Error("missing");
			});
			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(0);
		});

		it("deduces platform from .opencode path when root platform is unknown", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent(".opencode-link", "symlink")] as any;
				throw new Error("missing");
			});
			spyOn(fs, "readlink").mockResolvedValue(
				path.join(atkRoot, "rules", "strict.md"),
			);
			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(1);
			expect(found[0]!.platform).toBe("opencode");
		});

		it("deduces platform as unknown when path has no marker", async () => {
			spyOn(fs, "readdir").mockImplementation(async (p) => {
				if (String(p) === projectRoot)
					return [dirent("plain-link", "symlink")] as any;
				throw new Error("missing");
			});
			spyOn(fs, "readlink").mockResolvedValue(
				path.join(atkRoot, "rules", "strict.md"),
			);
			const found = await links.findActiveLinks(projectRoot);
			expect(found).toHaveLength(1);
			expect((found[0] as any).platform).toBe("unknown");
		});
	});
});
