import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";

// Mock prompts BEFORE importing variables
mock.module("@clack/prompts", () => ({
	text: mock(() => Promise.resolve("wizard-value")),
	isCancel: (v: any) => typeof v === "symbol",
	cancel: mock(),
	note: mock(),
	intro: mock(),
	outro: mock(),
	select: mock(),
	spinner: () => ({ start: mock(), stop: mock() }),
}));

import fs from "node:fs/promises";
import * as prompts from "@clack/prompts";
import { ATKConfig } from "./config";
import {
	loadJsonContext,
	replaceVariables,
	resolveVariables,
	scanVariables,
	triggerVariableWizard,
} from "./variables";

describe("Variables Engine", () => {
	const mockAtkRoot = "/mock/atk";
	const mockProjectRoot = "/mock/project";

	beforeEach(() => {
		spyOn(ATKConfig, "get").mockReturnValue({
			atkRoot: mockAtkRoot,
			profiles: {},
		});
	});

	afterEach(() => {
		spyOn(ATKConfig, "get").mockRestore();
		spyOn(fs, "readFile").mockRestore();
		spyOn(fs, "writeFile").mockRestore();
		spyOn(fs, "mkdir").mockRestore();
		spyOn(fs, "access").mockRestore();
	});

	it("should resolve variables from .env.atk (Secrets)", async () => {
		spyOn(fs as any, "readFile").mockImplementation(async (p: any) => {
			if (p.endsWith(".env.atk")) return "API_KEY=secret-key";
			return "{}";
		});

		const result = await resolveVariables(["API_KEY"], {
			projectPath: mockProjectRoot,
		});
		expect(result.API_KEY).toBe("secret-key");
	});

	it("should throw in non-interactive mode if variable is missing", async () => {
		spyOn(fs, "readFile").mockResolvedValue("");
		expect(
			resolveVariables(["MISSING"], {
				projectPath: mockProjectRoot,
				nonInteractive: true,
			}),
		).rejects.toThrow(/Unresolved variable/);
	});

	it("should trigger wizard if variable is missing in interactive mode", async () => {
		spyOn(fs, "readFile").mockResolvedValue("");
		spyOn(fs, "mkdir").mockResolvedValue(undefined);
		spyOn(fs, "writeFile").mockResolvedValue(undefined);

		const result = await resolveVariables(["NEW_VAR"], {
			projectPath: mockProjectRoot,
		});
		expect(result.NEW_VAR).toBe("wizard-value");
	});

	it("should leave unresolved placeholders untouched", () => {
		const out = replaceVariables("Hello {{A}} {{B}}", { A: "World" });
		expect(out).toBe("Hello World {{B}}");
	});

	it("should scan unique variable placeholders", () => {
		const vars = scanVariables("{{X}} and {{Y}} and {{X}}");
		expect(vars).toEqual(["X", "Y"]);
	});

	it("should return empty object for malformed json context", async () => {
		spyOn(fs, "readFile").mockResolvedValue("not-json");
		const ctx = await loadJsonContext("/tmp/context.json");
		expect(ctx).toEqual({});
	});

	it("should invoke prompt validation callback", async () => {
		spyOn(prompts, "text").mockImplementation(async (options: any) => {
			expect(options.validate("")).toBe("Value is required.");
			return "ok";
		});
		const value = await triggerVariableWizard("TOKEN");
		expect(value).toBe("ok");
	});

	it("should continue when .env.atk is missing", async () => {
		spyOn(fs as any, "readFile").mockImplementation(async (p: any) => {
			if (String(p).endsWith(".env.atk")) throw new Error("missing");
			return "{}";
		});
		const result = await resolveVariables(["X"], {
			projectPath: mockProjectRoot,
			nonInteractive: true,
		}).catch((e) => e);
		expect(String(result)).toContain("Unresolved variable");
	});

	it("should cancel if wizard is cancelled", async () => {
		spyOn(prompts, "text").mockResolvedValue(Symbol("cancel") as any);
		const exitSpy = spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit");
		});

		try {
			await triggerVariableWizard("NEW_VAR");
		} catch (e) {}
		expect(exitSpy).toHaveBeenCalledWith(1);
		exitSpy.mockRestore();
	});
});
