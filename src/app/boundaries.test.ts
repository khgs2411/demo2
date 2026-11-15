// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL("../", import.meta.url));

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(path) ? [path] : [];
	});
}

it("keeps SDK access and feature imports within their module boundaries", () => {
	const violations: string[] = [];
	for (const file of sourceFiles(sourceRoot)) {
		const path = relative(sourceRoot, file).split(sep).join("/");
		const feature = path.match(/^features\/([^/]+)\//)?.[1];
		const { importedFiles } = ts.preProcessFile(readFileSync(file, "utf8"), true, true);
		for (const { fileName: specifier } of importedFiles) {
			if (/^@class-kit\/react(?:\/|$)/.test(specifier) &&
				!path.startsWith("lib/") && !path.startsWith("features/booking/") && !path.startsWith("features/studio/")) {
				violations.push(`${path}: SDK import ${specifier}`);
			}
			if (!specifier.startsWith(".")) continue;
			const target = relative(sourceRoot, resolve(dirname(file), specifier))
				.split(sep).join("/").replace(/\.[cm]?[jt]sx?$/, "");
			const targetFeature = target.match(/^features\/([^/]+)(?:\/|$)/)?.[1];
			// Packages exposes the headline offers and booking selector through its public entry.
			const packagesExport = target === "features/packages" || target === "features/packages/index";
			const bookingExport = feature === "studio" && (target === "features/booking" || target === "features/booking/index");
			if (feature && targetFeature && feature !== targetFeature && !packagesExport && !bookingExport) {
				violations.push(`${path}: cross-feature import ${specifier}`);
			}
		}
	}
	expect(violations).toEqual([]);
});
