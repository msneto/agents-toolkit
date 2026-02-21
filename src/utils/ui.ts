import { intro, note, outro } from "@clack/prompts";
import boxen from "boxen";
import gradient from "gradient-string";
import pc from "picocolors";

export const UI = {
	header: () => {
		const title = gradient(["#06b6d4", "#d946ef"])("  Agents Toolkit (ATK)  ");
		console.log(
			"\n" +
				boxen(title, {
					padding: 1,
					margin: 1,
					borderStyle: "round",
					borderColor: "cyan",
					dimBorder: true,
				}) +
				"\n",
		);
	},

	intro: (msg: string) => intro(pc.cyan(msg)),
	outro: (msg: string) => outro(pc.cyan(msg)),

	error: (msg: string, code?: string) => {
		const errorMsg = code ? `${pc.red(code)}: ${msg}` : msg;
		// Enforce 1 space after icon
		console.error(`\n${pc.red("✖")} ${errorMsg}\n`);
	},

	success: (msg: string) => {
		// Enforce 1 space after icon
		console.log(`\n${pc.green("✔")} ${msg}\n`);
	},

	warn: (msg: string) => {
		// Enforce 1 space after icon
		console.log(`\n${pc.yellow("⚠")} ${pc.yellow(msg)}\n`);
	},

	info: (msg: string) => {
		// Enforce 1 space after icon
		console.log(`\n${pc.cyan("ℹ")} ${msg}\n`);
	},

	tip: (msg: string) => {
		note(pc.dim(msg), "Next Step");
	},

	securityAlert: (
		title: string,
		details: string[],
		level: "WARN" | "DANGER",
	) => {
		const color = level === "DANGER" ? "red" : "yellow";
		const icon = level === "DANGER" ? "🚫" : "⚠️";
		const content = details.map((d) => `${pc.dim("•")} ${d}`).join("\n");

		console.log(
			"\n" +
				boxen(`${pc.bold(title)}\n\n${content}`, {
					padding: 1,
					borderColor: color,
					title: `${icon} Security Audit`,
					titleAlignment: "left",
					borderStyle: "double",
				}) +
				"\n",
		);
	},

	path: (p: string) => pc.dim(p),
	highlight: (text: string) => pc.bold(pc.magenta(text)),
};
