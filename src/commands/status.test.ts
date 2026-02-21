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
	intro: mock(),
	note: mock(),
	outro: mock(),
	isCancel: (v: any) => typeof v === "symbol",
}));

import * as prompts from "@clack/prompts";
import { ATKConfig } from "../core/config";
import * as links from "../core/links";
import * as mapping from "../core/mapping";
import { statusCommand } from "./status";

describe("Status Command", () => {
	beforeEach(() => {
		spyOn(ATKConfig, "get").mockReturnValue({
			atkRoot: "/mock/atk",
			profiles: {},
		});
		spyOn(ATKConfig, "path").mockReturnValue("/mock/config.json");
	});

	afterEach(() => {
		spyOn(ATKConfig, "get").mockRestore();
		spyOn(ATKConfig, "path").mockRestore();
		spyOn(links, "findActiveLinks").mockRestore();
		spyOn(mapping, "detectProjectPlatforms").mockRestore();
	});

	it("should display the dashboard with detected environments and links", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue(["gemini"]);
		spyOn(links, "findActiveLinks").mockResolvedValue([
			{
				type: "rule",
				name: "test",
				platform: "gemini",
				target: "GEMINI.md",
				fullPath: "/mock/project/GEMINI.md",
			},
		] as any);

		await statusCommand();

		expect(prompts.intro).toHaveBeenCalled();
		expect(prompts.note).toHaveBeenCalled();
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should handle no links found", async () => {
		spyOn(mapping, "detectProjectPlatforms").mockResolvedValue([]);
		spyOn(links, "findActiveLinks").mockResolvedValue([]);

		await statusCommand();

		expect(prompts.note).toHaveBeenCalled();
	});
});
