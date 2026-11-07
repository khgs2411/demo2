import { afterEach, expect, it, vi } from "vitest";
import { loadLabelFonts } from "./labels";

const original = Object.getOwnPropertyDescriptor(document, "fonts");
afterEach(() => {
	if (original) Object.defineProperty(document, "fonts", original);
	else Reflect.deleteProperty(document, "fonts");
});

it("loads the label glyphs, including the Hebrew unicode subset, before drawing", async () => {
	const load = vi.fn(async () => []);
	Object.defineProperty(document, "fonts", { configurable: true, value: { load } });
	const labels = { studio: "סטודיו נועה", open: "פתוח", customers: "לקוחות", bookings: "פגישות", requests: "בקשות" };
	await loadLabelFonts("rtl", labels);
	expect(load).toHaveBeenCalledWith('900 64px "Frank Ruhl Libre"', labels.studio);
	expect(load).toHaveBeenCalledWith('600 64px "IBM Plex Sans Hebrew"', "פתוח לקוחות פגישות בקשות");
	expect(load).toHaveBeenCalledWith('500 64px "IBM Plex Mono"', "ClassKit");
});
