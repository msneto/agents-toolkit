export type RiskLevel = "SAFE" | "WARN" | "DANGER" | "BLOCKED";

export interface AuditResult {
	level: RiskLevel;
	reasons: string[];
}

interface Pattern {
	regex: RegExp;
	level: RiskLevel;
	reason: string;
}

const DANGER_PATTERNS: Pattern[] = [
	{
		regex: /\brm\s+-rf\b/,
		level: "DANGER",
		reason: "Recursive deletion detected",
	},
	{
		regex: /\bsudo\b/,
		level: "BLOCKED",
		reason: "Escalated privileges (sudo) are strictly forbidden",
	},
	{
		regex: /\bcurl.*\|.*bash\b/,
		level: "DANGER",
		reason: "Remote shell script execution",
	},
	{
		regex: /\/etc\/|\/var\/|\/usr\/bin\//,
		level: "DANGER",
		reason: "System directory modification attempted",
	},
	{
		regex: /\/\.ssh\//,
		level: "BLOCKED",
		reason: "Attempted access to sensitive SSH directory",
	},
	{
		regex: /\/>\s+\/dev\/tcp\//,
		level: "DANGER",
		reason: "Shell-level networking (reverse shell) detected",
	},
	{
		regex: /\beval\b|\bbase64\b/,
		level: "WARN",
		reason: "Potential code obfuscation",
	},
	{
		regex: /\bcurl\b|\bwget\b/,
		level: "WARN",
		reason: "External network request during setup",
	},
	{
		regex: /\bmv\s+.*\/\..*/,
		level: "WARN",
		reason: "Modification of hidden system files",
	},
];

function getHigherRisk(current: RiskLevel, next: RiskLevel): RiskLevel {
	const weights: Record<RiskLevel, number> = {
		SAFE: 0,
		WARN: 1,
		DANGER: 2,
		BLOCKED: 3,
	};
	return weights[next] > weights[current] ? next : current;
}

/**
 * Scans a command string for dangerous patterns and returns an AuditResult.
 */
export function auditCommand(cmd: string): AuditResult {
	const reasons: string[] = [];
	let maxLevel: RiskLevel = "SAFE";

	for (const pattern of DANGER_PATTERNS) {
		if (pattern.regex.test(cmd)) {
			reasons.push(pattern.reason);
			maxLevel = getHigherRisk(maxLevel, pattern.level);
		}
	}

	return {
		level: maxLevel,
		reasons: Array.from(new Set(reasons)),
	};
}
