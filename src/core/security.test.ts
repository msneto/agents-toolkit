import { describe, expect, it, spyOn } from "bun:test";
import { UI } from "../utils/ui";
import { auditCommand } from "./security";

describe("Security Shield", () => {
	it("should detect and block sudo usage", async () => {
		const result = auditCommand("sudo apt-get install");
		expect(result.level).toBe("BLOCKED");
		expect(result.reasons).toContain(
			"Escalated privileges (sudo) are strictly forbidden",
		);
	});

	it("should detect sensitive path access (SSH)", async () => {
		const result = auditCommand("cat ~/.ssh/id_rsa");
		expect(result.level).toBe("BLOCKED");
		expect(result.reasons[0]).toContain("SSH");
	});

	it("should allow safe commands", async () => {
		const result = auditCommand("ls -la");
		expect(result.level).toBe("SAFE");
	});

	it("should block direct file modifications of system dirs", async () => {
		const result = auditCommand("rm -rf /etc/");
		expect(result.level).toBe("DANGER"); // It is DANGER for /etc/
	});
});
