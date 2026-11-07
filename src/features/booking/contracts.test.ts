// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import ts from "typescript";

const root = fileURLToPath(new URL("./", import.meta.url));
it("keeps SDK imports in the adapter and uses the shared Ticket for action buttons", () => {
	const violations: string[] = [];
	for (const name of readdirSync(root).filter(name => /\.tsx?$/.test(name) && !name.includes(".test."))) {
		const source = readFileSync(`${root}/${name}`,"utf8");
		if (name !== "adapter.ts" && ts.preProcessFile(source,true,true).importedFiles.some(file => file.fileName === "@class-kit/react")) violations.push(`${name}: SDK import`);
		if (/<button\b/.test(source)) violations.push(`${name}: raw action button`);
	}
	expect(violations).toEqual([]);
});
it("uses existing color and duration tokens in the booking stylesheet", () => {
	const css = readFileSync(`${root}/booking.css`,"utf8");
	expect(css).not.toMatch(/#[\da-f]{3,8}\b|\b(?:rgb|hsl)a?\(/i);
	expect(css).not.toMatch(/\b\d*\.?\d+(?:ms|s)\b/);
});
