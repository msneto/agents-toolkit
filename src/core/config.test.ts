import { describe, expect, it } from "bun:test";
import os from "node:os";
import path from "node:path";
import { ATKConfig, resolveHome } from "./config";

describe("Config Core", () => {
	it("should resolve home directory correctly", () => {
		const result = resolveHome("~/test");
		expect(result).toBe(path.join(os.homedir(), "test"));
	});

	it("should return absolute path if not starting with ~", () => {
		const result = resolveHome("/tmp/test");
		expect(result).toBe("/tmp/test");
	});

	it("should store and retrieve config", () => {
		const original = ATKConfig.get().atkRoot;
		ATKConfig.set("atkRoot", "/tmp/atk-test");
		expect(ATKConfig.get().atkRoot).toBe("/tmp/atk-test");
		// Restore
		ATKConfig.set("atkRoot", original);
	});
});
