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
	cancel: mock(),
	intro: mock(),
	outro: mock(),
	isCancel: (v: unknown) => typeof v === "symbol" || v === "canceled",
	select: mock(() => Promise.resolve("rule")),
}));

import fs from "node:fs/promises";
import path from "node:path";
import * as prompts from "@clack/prompts";
import { ATKConfig } from "../core/config";
import * as links from "../core/links";
import * as mapping from "../core/mapping";
import { UI } from "../utils/ui";
import { linkCommand } from "./link";

describe("commands/link", () => {
	const atkRoot = "/mock/atk";

	beforeEach(() => {
		spyOn(ATKConfig, "get").mockReturnValue({ atkRoot, profiles: {} } as any);
		spyOn(UI, "isInteractive").mockReturnValue(false);
	});

	afterEach(() => {
		mock.restore();
	});

	it("links bundle components from .json selection", async () => {
		spyOn(fs, "readdir").mockResolvedValue([
			{ name: "starter.json", isFile: () => true, isDirectory: () => false },
		] as any);
		spyOn(prompts, "select")
			.mockResolvedValueOnce("bundle" as any)
			.mockResolvedValueOnce("starter" as any);
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue(["gemini"]);
		const sourceSpy = spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/bundles/starter.json",
		);
		const createSpy = spyOn(links, "createLink").mockResolvedValue(undefined);

		await linkCommand(undefined, undefined, { nonInteractive: true });

		expect(sourceSpy).toHaveBeenCalledWith(atkRoot, "bundle", "starter");
		expect(createSpy).toHaveBeenCalledWith(
			"/mock/atk/bundles/starter.json",
			expect.objectContaining({
				type: "bundle",
				name: "starter",
				platform: "gemini",
			}),
		);
	});

	it("handles interactive command flow with platform selection", async () => {
		spyOn(UI, "isInteractive").mockReturnValue(true);
		const tipSpy = spyOn(UI, "tip").mockImplementation(() => undefined);
		spyOn(fs, "readdir").mockResolvedValue([
			{ name: "cleanup.md", isFile: () => true, isDirectory: () => false },
		] as any);
		spyOn(prompts, "select")
			.mockResolvedValueOnce("command" as any)
			.mockResolvedValueOnce("cleanup" as any)
			.mockResolvedValueOnce("gemini" as any);
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/commands/cleanup.md",
		);
		spyOn(links, "createLink").mockResolvedValue(undefined);

		await linkCommand(undefined, undefined, {});

		expect(prompts.intro).toHaveBeenCalled();
		expect(prompts.outro).toHaveBeenCalled();
		expect(tipSpy).toHaveBeenCalled();
	});

	it("throws when multiple platforms are detected non-interactively", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		await expect(
			linkCommand("rule", "clean-code", { nonInteractive: true }),
		).rejects.toThrow(/Multiple environments detected/);
	});

	it("throws when no platform is detected non-interactively", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([]);
		await expect(
			linkCommand("rule", "clean-code", { nonInteractive: true }),
		).rejects.toThrow(/No environment detected/);
	});

	it("exits when type prompt is canceled", async () => {
		spyOn(prompts, "select").mockResolvedValue(Symbol("cancel") as any);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(linkCommand(undefined, "name", {})).rejects.toThrow("exit");
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it("exits when name selection is canceled", async () => {
		spyOn(UI, "isInteractive").mockReturnValue(true);
		spyOn(fs, "readdir").mockResolvedValue([
			{ name: "demo.md", isFile: () => true, isDirectory: () => false },
		] as any);
		spyOn(prompts, "select")
			.mockResolvedValueOnce("rule" as any)
			.mockResolvedValueOnce(Symbol("cancel") as any);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(linkCommand(undefined, undefined, {})).rejects.toThrow("exit");
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it("exits when platform selection is canceled", async () => {
		spyOn(UI, "isInteractive").mockReturnValue(true);
		spyOn(fs, "readdir").mockResolvedValue([
			{ name: "demo.md", isFile: () => true, isDirectory: () => false },
		] as any);
		spyOn(prompts, "select")
			.mockResolvedValueOnce("rule" as any)
			.mockResolvedValueOnce("demo" as any)
			.mockResolvedValueOnce(Symbol("cancel") as any);
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(linkCommand(undefined, undefined, {})).rejects.toThrow("exit");
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it("errors when no components are available", async () => {
		spyOn(prompts, "select").mockResolvedValue("bundle" as any);
		spyOn(fs, "readdir").mockRejectedValue(new Error("missing"));
		const errorSpy = spyOn(UI, "error").mockImplementation(() => undefined);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(linkCommand(undefined, undefined, {})).rejects.toThrow("exit");
		expect(errorSpy).toHaveBeenCalledWith(
			`No bundles found in ${path.join(atkRoot, "bundles")}`,
			"E404",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("reports createLink failure and exits with code 1", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue(["gemini"]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink").mockRejectedValue(new Error("boom"));
		const errorSpy = spyOn(UI, "error").mockImplementation(() => undefined);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(
			linkCommand("rule", "clean", { nonInteractive: true }),
		).rejects.toThrow("exit");
		expect(errorSpy).toHaveBeenCalledWith("boom", "E002");
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("passes claude command link options for global scope", async () => {
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/commands/test.md",
		);
		const createSpy = spyOn(links, "createLink").mockResolvedValue(undefined);

		await linkCommand("command", "test", {
			platform: "claude",
			global: true,
			nonInteractive: true,
		});

		expect(createSpy).toHaveBeenCalledWith(
			"/mock/atk/commands/test.md",
			expect.objectContaining({
				type: "command",
				name: "test",
				platform: "claude",
				isGlobal: true,
			}),
		);
	});

	it("broadcasts to all detected platforms", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		const createSpy = spyOn(links, "createLink").mockResolvedValue(undefined);

		await linkCommand("rule", "clean", { all: true, nonInteractive: true });

		expect(createSpy).toHaveBeenCalledTimes(2);
		expect(createSpy).toHaveBeenCalledWith(
			"/mock/atk/rules/clean.md",
			expect.objectContaining({ platform: "gemini" }),
		);
		expect(createSpy).toHaveBeenCalledWith(
			"/mock/atk/rules/clean.md",
			expect.objectContaining({ platform: "opencode" }),
		);
	});

	it("throws when all is combined with platform", async () => {
		await expect(
			linkCommand("rule", "clean", {
				all: true,
				platform: "gemini",
				nonInteractive: true,
			}),
		).rejects.toThrow(/Cannot combine --all with --platform/);
	});

	it("throws when all is combined with global", async () => {
		await expect(
			linkCommand("rule", "clean", {
				all: true,
				global: true,
				nonInteractive: true,
			}),
		).rejects.toThrow(/Cannot combine --all with --global/);
	});

	it("throws when all is used with no detected environments", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([]);
		await expect(
			linkCommand("rule", "clean", { all: true, nonInteractive: true }),
		).rejects.toThrow(/No environment detected/);
	});

	it("fails with summary when one all-target fails", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink")
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("boom-opencode"));
		const errorSpy = spyOn(UI, "error").mockImplementation(() => undefined);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(
			linkCommand("rule", "clean", { all: true, nonInteractive: true }),
		).rejects.toThrow("exit");
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Linked clean to 1\/2 environments/),
			"E002",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("fails with all-target summary when every broadcast target fails", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink").mockRejectedValue(new Error("boom-all"));
		const errorSpy = spyOn(UI, "error").mockImplementation(() => undefined);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		await expect(
			linkCommand("rule", "clean", { all: true, nonInteractive: true }),
		).rejects.toThrow("exit");
		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Failed to link clean to all environments/),
			"E002",
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it("shows interactive broadcast info and success outro", async () => {
		spyOn(UI, "isInteractive").mockReturnValue(true);
		const infoSpy = spyOn(UI, "info").mockImplementation(() => undefined);
		const tipSpy = spyOn(UI, "tip").mockImplementation(() => undefined);
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue(["gemini"]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink").mockResolvedValue(undefined);

		await linkCommand("rule", "clean", { all: true });

		expect(infoSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Broadcasting to 1 environments/),
		);
		expect(prompts.outro).toHaveBeenCalled();
		expect(tipSpy).toHaveBeenCalledWith(
			expect.stringMatching(/active across detected environments/),
		);
	});

	it("continues broadcast when one target is skipped", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink")
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(
				new links.LinkSkipError("Skipped current target."),
			);
		const successSpy = spyOn(UI, "success").mockImplementation(() => undefined);

		await linkCommand("rule", "clean", { all: true, nonInteractive: true });

		expect(successSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Linked clean \(rule\) to 1 environments: gemini/),
		);
	});

	it("stops broadcast gracefully when user aborts", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([
			"gemini",
			"opencode",
		]);
		spyOn(links, "resolveSourceFile").mockResolvedValue(
			"/mock/atk/rules/clean.md",
		);
		spyOn(links, "createLink")
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(
				new links.LinkAbortError("Broadcast linking aborted."),
			);
		const tipSpy = spyOn(UI, "tip").mockImplementation(() => undefined);

		await linkCommand("rule", "clean", { all: true, nonInteractive: true });
		expect(tipSpy).toHaveBeenCalledWith(
			expect.stringMatching(/Run 'atk status'/),
		);
	});
});
