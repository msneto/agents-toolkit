import { afterEach, describe, expect, it, spyOn } from "bun:test";
import * as prompts from "@clack/prompts";
import { executeHook } from "./hooks";

describe("Hooks Engine", () => {
	afterEach(() => {
		spyOn(Bun, "spawn").mockRestore();
		spyOn(prompts, "select").mockRestore();
		spyOn(prompts, "confirm").mockRestore();
	});

	it("should execute a safe hook successfully", async () => {
		spyOn(Bun, "spawn").mockReturnValue({
			exited: Promise.resolve(0),
			stdout: new ReadableStream(),
			stderr: new ReadableStream(),
		} as any);

		const result = await executeHook("pre_link", "echo 'hello'", {
			nonInteractive: true,
		});
		expect(result).toBeUndefined();
	});

	it("should handle WARN level command in interactive mode (confirm yes)", async () => {
		spyOn(prompts, "confirm").mockResolvedValue(true);
		spyOn(Bun, "spawn").mockReturnValue({
			exited: Promise.resolve(0),
			stdout: new ReadableStream(),
			stderr: new ReadableStream(),
		} as any);

		// cat /etc/passwd is usually a WARN level
		await executeHook("pre_link", "cat /etc/passwd", { nonInteractive: false });
		expect(prompts.confirm).toHaveBeenCalled();
	});

	it("should handle WARN level command in interactive mode (confirm no)", async () => {
		spyOn(prompts, "confirm").mockResolvedValue(false);

		expect(
			executeHook("pre_link", "cat /etc/passwd", { nonInteractive: false }),
		).rejects.toThrow(/User refused/);
	});

	it("should fail if command is blocked by security", async () => {
		expect(
			executeHook("pre_link", "sudo something", { nonInteractive: true }),
		).rejects.toThrow(/Security policy blocked/);
	});

	it("should fail if process exits with non-zero code", async () => {
		spyOn(Bun, "spawn").mockReturnValue({
			exited: Promise.resolve(1),
			stdout: new ReadableStream(),
			stderr: new ReadableStream({
				start(controller) {
					controller.enqueue(new TextEncoder().encode("error message"));
					controller.close();
				},
			}),
		} as any);

		expect(
			executeHook("pre_link", "exit 1", { nonInteractive: true }),
		).rejects.toThrow(/failed with code 1/);
	});
});
