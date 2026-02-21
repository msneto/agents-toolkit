import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as prompts from "@clack/prompts";
import { ATKConfig } from "../core/config";
import * as links from "../core/links";
import { profileCommand } from "./profile";

describe("Profile Command", () => {
	const mockProfile = {
		name: "test-profile",
		links: [
			{
				type: "rule",
				name: "react-strict",
				platform: "gemini",
				target: "GEMINI.md",
			},
		],
	};

	beforeEach(() => {
		spyOn(ATKConfig, "get").mockReturnValue({
			atkRoot: "/mock/atk",
			profiles: {
				[mockProfile.name]: { links: mockProfile.links },
			},
		});
		spyOn(ATKConfig, "set").mockReturnValue(undefined);
	});

	afterEach(() => {
		spyOn(ATKConfig, "get").mockRestore();
		spyOn(ATKConfig, "set").mockRestore();
		spyOn(links, "findActiveLinks").mockRestore();
		spyOn(links, "resolveSourceFile").mockRestore();
		spyOn(links, "createLink").mockRestore();
		spyOn(prompts, "select").mockRestore();
		spyOn(prompts, "text").mockRestore();
	});

	describe("saveProfile", () => {
		it("should cancel if name is cancelled", async () => {
			spyOn(prompts, "text").mockResolvedValue(Symbol("cancel") as any);
			const setSpy = spyOn(ATKConfig, "set");
			await profileCommand("save");
			expect(setSpy).not.toHaveBeenCalled();
		});

		it("should save current project links to a profile", async () => {
			const activeLinks = [
				{
					type: "rule",
					name: "react-strict",
					platform: "gemini",
					target: "GEMINI.md",
					fullPath: "/mock/project/GEMINI.md",
				},
			];
			const findSpy = spyOn(links, "findActiveLinks").mockResolvedValue(
				activeLinks as any,
			);
			const setSpy = spyOn(ATKConfig, "set");

			await profileCommand("save", "new-profile", { nonInteractive: true });

			expect(setSpy).toHaveBeenCalled();
			const savedProfiles = setSpy.mock.calls[0][1] as any;
			expect(savedProfiles["new-profile"]).toBeDefined();
			expect(savedProfiles["new-profile"].links).toHaveLength(1);
			expect(savedProfiles["new-profile"].links[0].name).toBe("react-strict");
		});

		it("should error if no links found", async () => {
			spyOn(links, "findActiveLinks").mockResolvedValue([]);
			const setSpy = spyOn(ATKConfig, "set");
			await profileCommand("save", "empty", { nonInteractive: true });
			expect(setSpy).not.toHaveBeenCalled();
		});
	});

	describe("switchProfile", () => {
		it("should cancel if selection is cancelled", async () => {
			spyOn(prompts, "select").mockResolvedValue(Symbol("cancel") as any);
			const createSpy = spyOn(links, "createLink");
			await profileCommand("switch");
			expect(createSpy).not.toHaveBeenCalled();
		});

		it("should recreate links from a profile", async () => {
			const resolveSpy = spyOn(links, "resolveSourceFile").mockResolvedValue(
				"/mock/source.md",
			);
			const createSpy = spyOn(links, "createLink").mockResolvedValue(
				undefined as any,
			);

			await profileCommand("switch", mockProfile.name, {
				nonInteractive: true,
			});

			expect(resolveSpy).toHaveBeenCalledWith(
				"/mock/atk",
				"rule",
				"react-strict",
			);
			expect(createSpy).toHaveBeenCalledWith(
				"/mock/source.md",
				expect.objectContaining({
					name: "react-strict",
					platform: "gemini",
					force: true,
				}),
			);
		});

		it("should respect platform override", async () => {
			spyOn(links, "resolveSourceFile").mockResolvedValue("/mock/source.md");
			const createSpy = spyOn(links, "createLink").mockResolvedValue(
				undefined as any,
			);

			await profileCommand("switch", mockProfile.name, {
				platform: "opencode",
				nonInteractive: true,
			});

			expect(createSpy).toHaveBeenCalledWith(
				"/mock/source.md",
				expect.objectContaining({
					platform: "opencode",
				}),
			);
		});
	});

	describe("profileCommand base", () => {
		it("should prompt for action if none provided", async () => {
			spyOn(prompts, "select").mockResolvedValue("list" as any);
			await profileCommand();
			expect(prompts.select).toHaveBeenCalled();
		});

		it("should handle cancel in action prompt", async () => {
			spyOn(prompts, "select").mockResolvedValue(Symbol("cancel") as any);
			await profileCommand();
			// should just return
		});
	});

	describe("listProfiles", () => {
		it("should list saved profiles", async () => {
			const infoSpy = spyOn(console, "log");
			await profileCommand("list");
			expect(infoSpy).toHaveBeenCalled();
		});

		it("should handle empty profiles list", async () => {
			spyOn(ATKConfig, "get").mockReturnValue({ atkRoot: "", profiles: {} });
			const infoSpy = spyOn(console, "log");
			await profileCommand("list");
			expect(infoSpy).toHaveBeenCalled();
		});
	});

	describe("deleteProfile", () => {
		it("should cancel if selection is cancelled", async () => {
			spyOn(prompts, "select").mockResolvedValue(Symbol("cancel") as any);
			const setSpy = spyOn(ATKConfig, "set");
			await profileCommand("delete");
			expect(setSpy).not.toHaveBeenCalled();
		});

		it("should remove a profile from config", async () => {
			const setSpy = spyOn(ATKConfig, "set");
			await profileCommand("delete", mockProfile.name);
			expect(setSpy).toHaveBeenCalled();
			const result = setSpy.mock.calls[0][1] as any;
			expect(result[mockProfile.name]).toBeUndefined();
		});

		it("should handle deleting non-existent profile gracefully", async () => {
			const setSpy = spyOn(ATKConfig, "set");
			await profileCommand("delete", "ghost");
			expect(setSpy).toHaveBeenCalled(); // deletes undefined which is still a set of the same object
		});
	});
});
