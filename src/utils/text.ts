import stringWidth from "string-width";

/**
 * Truncates a path in the middle to fit a specific width.
 */
export function truncatePath(p: string, maxWidth = 40): string {
	if (p.length <= maxWidth) return p;
	const half = Math.floor((maxWidth - 3) / 2);
	return `${p.slice(0, half)}...${p.slice(-half)}`;
}

/**
 * Aligns columns of text perfectly using an invisible grid.
 */
export function alignColumns(rows: string[][], gutters: number[]): string {
	return rows
		.map((row) => {
			return row
				.map((cell, i) => {
					const width = gutters[i] || 0;
					const cellWidth = stringWidth(cell);
					const padding = Math.max(0, width - cellWidth);
					return cell + " ".repeat(padding);
				})
				.join(" ");
		})
		.join("\n");
}
