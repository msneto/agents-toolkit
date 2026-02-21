import { describe, expect, it } from "bun:test";
import { BundleSchema, ManifestSchema, ToolIRSchema } from "./schema";

describe("Schema Validation", () => {
	describe("ManifestSchema", () => {
		it("should validate a correct rule manifest", () => {
			const valid = {
				name: "clean-code",
				version: "1.2.0",
				type: "rule",
				description: "Standard clean code rules",
			};
			const result = ManifestSchema.parse(valid);
			expect(result.name).toBe("clean-code");
			expect(result.type).toBe("rule");
		});

		it("should fail on invalid kebab-case name", () => {
			const invalid = {
				name: "CleanCode",
				type: "rule",
				description: "desc",
			};
			expect(() => ManifestSchema.parse(invalid)).toThrow();
		});

		it("should support bundle type", () => {
			const valid = {
				name: "my-bundle",
				type: "bundle",
				description: "desc",
			};
			const result = ManifestSchema.parse(valid);
			expect(result.type).toBe("bundle");
		});
	});

	describe("ToolIRSchema", () => {
		it("should validate a simple tool definition", () => {
			const valid = {
				name: "test_tool",
				description: "A tool for testing.",
				version: "1.0.0",
				parameters: {
					type: "object",
					properties: {
						query: { type: "string" },
					},
				},
				runtime: {
					engine: "bun",
					entrypoint: "src/index.ts",
				},
			};
			const result = ToolIRSchema.parse(valid);
			expect(result.name).toBe("test_tool");
		});
	});

	describe("BundleSchema", () => {
		it("should validate a correct bundle with components", () => {
			const valid = {
				name: "web-stack",
				version: "1.0.0",
				type: "bundle",
				description: "Full stack",
				components: [
					{ type: "rule", name: "react-strict" },
					{ type: "skill", name: "git-genius" },
				],
			};
			const result = BundleSchema.parse(valid);
			expect(result.components).toHaveLength(2);
			expect(result.components[0].name).toBe("react-strict");
		});

		it("should fail if type is not bundle", () => {
			const invalid = {
				name: "web-stack",
				type: "rule",
				components: [],
			};
			expect(() => BundleSchema.parse(invalid)).toThrow();
		});

		it("should fail if components are invalid", () => {
			const invalid = {
				name: "web-stack",
				type: "bundle",
				description: "desc",
				components: [{ type: "invalid-type", name: "foo" }],
			};
			expect(() => BundleSchema.parse(invalid)).toThrow();
		});
	});
});
