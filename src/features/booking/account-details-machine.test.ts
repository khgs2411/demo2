import { expect, it } from "vitest";
import { accountDetailsTransition, type AccountDetailsState } from "./account-details-machine";

const loading = { step: "loading" } as const;
const details = { displayName: "Maya Cohen", phoneNumber: "0501234567" };
const editing = { step: "editing", details } as const;
const saving = { step: "saving", details } as const;

it("opens the editor with the loaded contact fields", () => {
	expect(accountDetailsTransition(loading, { type: "profile_loaded", profile: { ...details, businessName: "Studio" } })).toEqual(editing);
});

it("fails the load when there is no profile", () => {
	expect(accountDetailsTransition(loading, { type: "profile_loaded", profile: null })).toEqual({ step: "failed", operation: "load" });
});

it.each(["displayName", "phoneNumber"] as const)("requires a nonblank %s before saving", field => {
	const incomplete: AccountDetailsState = { step: "editing", details: { ...details, [field]: "   " } };
	expect(accountDetailsTransition(incomplete, { type: "save_requested" })).toBe(incomplete);
});

it("locks the submitted details until the save completes", () => {
	expect(accountDetailsTransition(editing, { type: "save_requested" })).toEqual(saving);
	expect(accountDetailsTransition(saving, { type: "save_requested" })).toBe(saving);
	expect(accountDetailsTransition(saving, { type: "field_changed", field: "displayName", value: "Maya" })).toBe(saving);
	expect(accountDetailsTransition(saving, { type: "saved" })).toEqual({ step: "saved", details });
});

it("keeps the draft on failure and allows a new save", () => {
	const failed = accountDetailsTransition(saving, { type: "save_failed" });
	expect(failed).toEqual({ step: "failed", operation: "save", details });
	expect(accountDetailsTransition(failed, { type: "save_requested" })).toEqual(saving);
});

it("returns to editing after changing a saved field", () => {
	expect(accountDetailsTransition({ step: "saved", details }, { type: "field_changed", field: "displayName", value: "Maya" }))
		.toEqual({ step: "editing", details: { ...details, displayName: "Maya" } });
});
