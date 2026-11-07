import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MockSite } from "./mock-site";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { i18n } from "../../i18n";

afterEach(cleanup);

it.each(["he", "en"])("shows the defect and opens the request in %s", async (language) => {
	await i18n.changeLanguage(language);
	const open = vi.fn();
	render(<MockSite scenario={scenario} step="bug" onOpenTicket={open} />);
	const button = screen.getByRole("button", { name: i18n.t(scenario.bookingLabelKey, { ns: "admin-sim" }) });
	expect(button.style.transform).not.toBe("none");
	fireEvent.click(button);
	expect(open).toHaveBeenCalledOnce();
	fireEvent.click(screen.getByRole("button", { name: i18n.t(scenario.defect.descriptionKey, { ns: "admin-sim" }) }));
	expect(open).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole("slider")).toBeNull();
});

it("renders the deployed fix and lets the visitor compare the actual before/after button", async () => {
	await i18n.changeLanguage("en");
	render(<MockSite scenario={scenario} step="live" onOpenTicket={() => {}} />);
	const button = screen.getByRole("button", { name: "Book a class" });
	expect(button.style.transform).toBe("none");
	expect(button.style.clipPath).toBe("none");
	const slider = screen.getByRole("slider", { name: "Before and after comparison" });
	expect((slider as HTMLInputElement).value).toBe("100");
	fireEvent.change(slider, { target: { value: "25" } });
	expect(screen.getByTestId("comparison-before").style.clipPath).toContain("25%");
	expect(screen.getByText("Demo timing · shortened timings")).toBeDefined();
});
