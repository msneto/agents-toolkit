import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

mock.module("@clack/prompts", () => ({
	cancel: mock(),
	confirm: mock(() => Promise.resolve(false)),
	intro: mock(),
	isCancel: (v: unknown) => typeof v === "symbol" || v === "canceled",
	outro: mock(),
	select: mock(() => Promise.resolve("rule")),
	spinner: mock(() => ({ start: mock(), stop: mock() })),
	text: mock(() => Promise.resolve("demo")),
}));

import * as childProcess from "node:child_process";
import * as prompts from "@clack/prompts";
import { ATKConfig, type ATKConfigSchema } from "../core/config";
import { UI } from "../utils/ui";
import { createCommand } from "./create";

describe("commands/create", () => {
	let atkRoot: string;
	const originalEditor = process.env.EDITOR;
	const originalVisual = process.env.VISUAL;

	beforeEach(async () => {
		atkRoot = await fs.mkdtemp(path.join(os.tmpdir(), "atk-create-"));
		const config: ATKConfigSchema = { atkRoot, profiles: {} };
		spyOn(ATKConfig, "get").mockReturnValue(config);
		spyOn(UI, "isInteractive").mockReturnValue(false);
		process.env.EDITOR = undefined;
		process.env.VISUAL = undefined;
	});

	afterEach(async () => {
		mock.restore();
		process.env.EDITOR = originalEditor;
		process.env.VISUAL = originalVisual;
		await fs.rm(atkRoot, { recursive: true, force: true });
	});

	it("scaffolds an agent markdown file", async () => {
		await createCommand("agent", "senior-dev", { nonInteractive: true });

		const agentPath = path.join(atkRoot, "agents", "senior-dev.md");
		const content = await fs.readFile(agentPath, "utf-8");

		expect(content).toContain("name: senior-dev");
		expect(content).toContain("# Senior-dev Persona");
	});

	it("opens SKILL.md when --edit is passed for skill", async () => {
		process.env.EDITOR = "vi";
		const spawnSpy = spyOn(childProcess, "spawnSync").mockReturnValue({
			status: 0,
		} as unknown as ReturnType<typeof childProcess.spawnSync>);

		await createCommand("skill", "demo", {
			nonInteractive: true,
			edit: true,
		});

		expect(spawnSpy).toHaveBeenCalled();
		expect(spawnSpy.mock.calls[0]?.[0]).toContain("vi");
		expect(spawnSpy.mock.calls[0]?.[0]).toContain(
			path.join(atkRoot, "skills", "demo", "SKILL.md"),
		);
	});

	it("prompts to open editor in interactive mode and launches when confirmed", async () => {
		spyOn(UI, "isInteractive").mockReturnValue(true);
		spyOn(prompts, "confirm").mockResolvedValue(true);
		process.env.EDITOR = "vi";
		const spawnSpy = spyOn(childProcess, "spawnSync").mockReturnValue({
			status: 0,
		} as unknown as ReturnType<typeof childProcess.spawnSync>);

		await createCommand("command", "new-cmd", {});

		expect(prompts.confirm).toHaveBeenCalled();
		expect(spawnSpy).toHaveBeenCalled();
	});

	it("fails when --edit is requested and no editor can be launched", async () => {
		const spawnSpy = spyOn(childProcess, "spawnSync").mockReturnValue({
			status: 1,
			error: new Error("spawn fail"),
		} as unknown as ReturnType<typeof childProcess.spawnSync>);

		await expect(
			createCommand("command", "broken", {
				nonInteractive: true,
				edit: true,
			}),
		).rejects.toThrow(/Failed to open editor/);
		expect(spawnSpy).toHaveBeenCalled();
	});

	it("scaffolds command with name and description frontmatter", async () => {
		await createCommand("command", "test-cmd", { nonInteractive: true });

		const commandPath = path.join(atkRoot, "commands", "test-cmd.md");
		const content = await fs.readFile(commandPath, "utf-8");

		expect(content).toContain("---");
		expect(content).toContain("name: test-cmd");
		expect(content).toContain("description: ");
		expect(content).toContain("# test-cmd Command");
	});
});
