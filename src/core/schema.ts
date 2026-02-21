import { z } from "zod";

/**
 * JSON Schema subset for tool parameters and outputs.
 */
const JsonSchema = z.lazy(() =>
	z.object({
		type: z.enum([
			"object",
			"string",
			"number",
			"integer",
			"boolean",
			"array",
			"null",
		]),
		description: z.string().optional(),
		properties: z.record(z.any()).optional(),
		required: z.array(z.string()).optional(),
		items: z.any().optional(),
		enum: z.array(z.any()).optional(),
	}),
);

/**
 * Tool Intermediate Representation (IR) Schema.
 * This is the "Rosetta Stone" for all agent tool definitions.
 */
export const ToolIRSchema = z.object({
	name: z
		.string()
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"Tool name must be alphanumeric with underscores or dashes.",
		),
	description: z
		.string()
		.min(10, "Description must be at least 10 characters for agent clarity."),
	version: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/, "Version must follow semver (x.y.z).")
		.default("1.0.0"),

	parameters: JsonSchema.describe(
		"Input parameters for the tool (JSON Schema format).",
	),
	output: JsonSchema.optional().describe(
		"Expected output structure (JSON Schema format).",
	),

	examples: z
		.array(
			z.object({
				input: z.record(z.any()),
				output: z.record(z.any()),
			}),
		)
		.optional()
		.describe("Few-shot examples to improve agent reliability."),

	runtime: z.object({
		engine: z.string().default("bun"),
		entrypoint: z.string(),
		protocol: z.enum(["json-stdio", "args"]).default("json-stdio"),
		timeout: z.number().int().positive().default(5000),
	}),

	auth: z
		.object({
			env: z
				.record(
					z.object({
						description: z.string(),
						required: z.boolean().default(true),
					}),
				)
				.optional(),
		})
		.optional(),

	hooks: z
		.object({
			pre_link: z
				.string()
				.optional()
				.describe("System binary checks or setup."),
			post_link: z.string().optional().describe("Dependency installation."),
		})
		.optional(),
});

export type ToolIR = z.infer<typeof ToolIRSchema>;

/**
 * General Component Manifest Schema.
 */
export const ManifestSchema = z.object({
	name: z.string(),
	version: z.string(),
	type: z.enum(["rule", "skill", "command", "agent"]),
	description: z.string(),
	author: z.string().optional(),
	tags: z.array(z.string()).default([]),
	platforms: z.array(z.string()).default(["all"]),
});

export type Manifest = z.infer<typeof ManifestSchema>;
