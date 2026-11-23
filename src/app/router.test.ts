import { describe, expect, it } from "vitest";
import { parseHash } from "./router";

describe("hash routes", () => {
	it.each([
		["#/", { page: "showcase" }],
		["#/packages", { page: "packages" }],
		["#/demo", { page: "admin-sim" }],
		["#/book", { page: "booking" }],
		["#/book/system", { page: "booking", packageId: "system" }],
		["#/account", { page: "account" }],
		["#/studio", { page: "studio" }],
		["#/forgot-password", { page: "forgot-password" }],
		["#/reset-password", { page: "reset-password" }],
	])("resolves %s", (hash, route) => {
		expect(parseHash(hash)).toEqual(route);
	});

	it.each(["", "#/missing", "#/book/system/extra", "#/book/%ZZ"])(
		"falls back to home for %s",
		(hash) => expect(parseHash(hash)).toEqual({ page: "showcase" }),
	);

	it.each(["#access_token=x", "#error=access_denied", "#unclaimed"])(
		"leaves the non-route fragment %s to the SDK",
		(hash) => expect(parseHash(hash)).toBeNull(),
	);
});
