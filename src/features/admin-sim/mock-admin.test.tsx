import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MockAdmin } from "./mock-admin";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { i18n } from "../../i18n";

afterEach(cleanup);

it("prefills editable request fields and submits only local values", async () => {
	await i18n.changeLanguage("en");
	const submit = vi.fn();
	render(<MockAdmin scenario={scenario} onSubmit={submit} />);
	expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("The booking button is cut off on mobile");
	fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My button is clipped" } });
	fireEvent.change(screen.getByLabelText("Type"), { target: { value: "feature_request" } });
	expect(screen.getByRole("img", { name: i18n.t(scenario.ticket.screenshot.altKey, { ns: "admin-sim" }) })).toBeDefined();
	fireEvent.submit(screen.getByRole("form", { name: "New request" }));
	expect(submit).toHaveBeenCalledWith({ type: "feature_request", title: "My button is clipped", description: "The button on the home page goes off screen, so nobody can book." });
});
