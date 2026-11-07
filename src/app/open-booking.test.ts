import { expect, it } from "vitest";
import { openBooking } from "./open-booking";

it.each([
	[undefined, "#/book"],
	[{ packageId: "system" }, "#/book/system"],
	[{ packageId: "a/b" }, "#/book/a%2Fb"],
])("opens the booking intent for %j", (intent, expected) => {
	window.history.replaceState(null, "", "#/");
	openBooking(intent);
	expect(window.location.hash).toBe(expected);
});
