import { confirm, isCancel, spinner } from "@clack/prompts";
import pc from "picocolors";
import { UI } from "../utils/ui";
import { auditCommand } from "./security";

export interface HookOptions {
	cwd?: string;
	nonInteractive?: boolean;
	timeout?: number;
}

/**
 * Executes a hook command with security auditing and user consent.
 */
export async function executeHook(
	name: "pre_link" | "post_link",
	cmd: string,
	options: HookOptions = {},
) {
	if (!cmd) return;

	// 1. Audit the command
	const audit = auditCommand(cmd);

	if (audit.level === "BLOCKED") {
		UI.securityAlert(`Command Blocked: ${name}`, audit.reasons, "DANGER");
		throw new Error(`Security policy blocked execution of ${name} hook.`);
	}

	if (audit.level === "DANGER" || audit.level === "WARN") {
		UI.securityAlert(
			`Risky Hook Detected: ${name}`,
			audit.reasons,
			audit.level === "DANGER" ? "DANGER" : "WARN",
		);
	}

	// 2. Explanatory Note (Mentor Pattern)
	const description =
		name === "pre_link"
			? "This hook checks for system requirements before linking."
			: "This hook installs dependencies after linking.";

	UI.info(`${pc.bold(name.toUpperCase())}: ${cmd}\n   ${pc.dim(description)}`);

	// 3. User Consent (skip if SAFE and nonInteractive or confirmed)
	if (!options.nonInteractive) {
		const ok = await confirm({
			message: `Allow ${pc.magenta(name)} hook execution?`,
			initialValue: audit.level === "SAFE",
		});

		if (isCancel(ok) || !ok) {
			throw new Error(`User refused to execute ${name} hook.`);
		}
	}

	// 4. Execute with Spinner
	const s = spinner();
	s.start(`Running ${name} hook...`);

	try {
		const proc = Bun.spawn(["bash", "-c", cmd], {
			cwd: options.cwd,
			stdout: "pipe",
			stderr: "pipe",
		});

		const timeout = options.timeout || 10000; // 10s default
		const timer = setTimeout(() => {
			proc.kill();
			throw new Error(`Hook ${name} timed out after ${timeout}ms.`);
		}, timeout);

		const status = await proc.exited;
		clearTimeout(timer);

		if (status !== 0) {
			const stderr = await new Response(proc.stderr).text();
			throw new Error(`Hook ${name} failed with code ${status}: ${stderr}`);
		}

		s.stop(pc.green(`✔ ${name} hook completed successfully!`));
	} catch (err) {
		s.stop(pc.red(`✖ ${name} hook failed.`));
		throw err;
	}
}
