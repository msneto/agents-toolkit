import os from "node:os";
import path from "node:path";
import Conf from "conf";

export interface ATKConfigSchema {
	atkRoot: string;
	defaultAgent?: string;
	profiles: {
		[name: string]: {
			links: Array<{ type: string; name: string; target: string }>;
		};
	};
}

const config = new Conf<ATKConfigSchema>({
	projectName: "atk",
	defaults: {
		atkRoot: process.cwd(),
		profiles: {},
	},
});

export const ATKConfig = {
	get: () => config.store,
	set: <K extends keyof ATKConfigSchema>(key: K, value: ATKConfigSchema[K]) =>
		config.set(key, value),
	reset: () => config.clear(),
	path: () => config.path,
};
export const resolveHome = (p: string) => {
	if (p.startsWith("~")) {
		return path.join(os.homedir(), p.slice(1));
	}
	return path.resolve(p);
};
