import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredLanguage } from "./index";
import { he } from "./he";
import { en } from "./en";

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

function keys(value: object, prefix = ""): string[] {
	return Object.entries(value).flatMap(([key, entry]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof entry === "object" ? keys(entry, path) : [path];
	}).sort();
}

describe("language resources and preference", () => {
	it("has identical Hebrew and English key sets in every namespace", () => {
		expect(keys(he)).toEqual(keys(en));
	});

	it("defaults to Hebrew without a stored preference", () => {
		localStorage.clear();
		expect(readStoredLanguage()).toBe("he");
	});

	it.each(["he", "en"])("restores the supported language %s", (language) => {
		localStorage.setItem("demo2-showcase-language", language);
		expect(readStoredLanguage()).toBe(language);
	});

	it("falls back to Hebrew for an unsupported stored language", () => {
		localStorage.setItem("demo2-showcase-language", "fr");
		expect(readStoredLanguage()).toBe("he");
	});

	it("falls back to Hebrew if reading storage throws", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("Storage unavailable", "SecurityError");
		});
		expect(readStoredLanguage()).toBe("he");
	});
});
