import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminSimPage } from "./page";
import { App } from "../../app/app";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { i18n } from "../../i18n";

// Fake the simulation's timeout clock; leave jsdom's focus/selection task queue real.
beforeEach(() => { vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { cleanup(); expect(vi.getTimerCount()).toBe(0); vi.useRealTimers(); vi.unstubAllGlobals(); });

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

it.each(["he", "en"])("plays all six visitor-paced beats and books system in %s without feature network calls", async (language) => {
	await i18n.changeLanguage(language);
	const t = (key: string) => i18n.t(key, { ns: "admin-sim" });
	render(<AdminSimPage />);
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(t(scenario.beats.bug.titleKey));
	expect(screen.getByText(t(scenario.disclaimerKey))).toBeDefined();
	click(t(scenario.beats.bug.nextKey));
	expect(screen.getByRole("tab", { name: t("underTab") }).getAttribute("aria-selected")).toBe("true");
	expect(screen.getByLabelText(t("titleLabel"))).toBeDefined();
	click(t(scenario.beats.ticket_drafting.nextKey));
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(t(scenario.beats.ticket_submitted.titleKey));
	click(t(scenario.beats.ticket_submitted.nextKey));
	expect(screen.getByRole("progressbar").getAttribute("value")).toBe("0");
	for (let line = 1; line < scenario.logs.agent.length; line++) act(() => { vi.advanceTimersByTime(scenario.timing.fixLineMs); });
	expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
	click(t(scenario.beats.agent_fixing.nextKey));
	expect(screen.getByRole("tab", { name: t("topTab") }).getAttribute("aria-selected")).toBe("true");
	act(() => { vi.advanceTimersByTime(scenario.timing.scanStartMs + scenario.timing.scanDurationMs); });
	click(t(scenario.beats.deploying.nextKey));
	expect(screen.getByRole("slider", { name: t("comparisonLabel") })).toBeDefined();
	const booking = screen.getByRole("link", { name: t(scenario.beats.live.nextKey) });
	expect(booking.getAttribute("href")).toBe("#/book/system");
	fireEvent.click(booking);
	expect(window.location.hash).toBe("#/book/system");
	act(() => { vi.runAllTimers(); });
	expect(fetch).not.toHaveBeenCalled();
});

it("supports back, beat skipping, keyboard tabs and restart without leaking timers", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	click("04 Agent");
	fireEvent.click(screen.getByRole("tab", { name: "Your site" }));
	expect(screen.getByRole("tab", { name: "Your site" }).getAttribute("aria-selected")).toBe("true");
	fireEvent.keyDown(screen.getByRole("tab", { name: "Your site" }), { key: "ArrowRight" });
	expect(screen.getByRole("tab", { name: "Under the site" }).getAttribute("aria-selected")).toBe("true");
	click("Back");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The request reaches me.");
	click("06 Live");
	click("Restart");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(i18n.t(scenario.beats.bug.titleKey, { ns: "admin-sim" }));
	expect(vi.getTimerCount()).toBe(0);
	click("04 Agent");
	expect(vi.getTimerCount()).toBe(1);
	click("Restart");
	expect(vi.getTimerCount()).toBe(0);
});

it("leaving and returning to the route restarts the walkthrough", async () => {
	await i18n.changeLanguage("en");
	window.history.replaceState(null, "", "#/demo");
	render(<App />);
	click("04 Agent");
	expect(vi.getTimerCount()).toBe(1);
	act(() => { window.location.hash = "#/packages"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
	// jsdom's hashchange task is not a simulation timer.
	act(() => { vi.runAllTimers(); });
	expect(vi.getTimerCount()).toBe(0);
	act(() => { window.location.hash = "#/demo"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
	act(() => { vi.runAllTimers(); });
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(i18n.t(scenario.beats.bug.titleKey, { ns: "admin-sim" }));
});

it("validates required request text and carries edited content into the local board", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	click("Open a request");
	fireEvent.change(screen.getByLabelText("Title"), { target: { value: "" } });
	click("Submit");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("One request. No phone calls.");
	fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Please repair my button" } });
	fireEvent.change(screen.getByLabelText("Type"), { target: { value: "feature_request" } });
	click("Submit");
	expect(screen.getByText("Please repair my button")).toBeDefined();
	expect(screen.getByRole("log").textContent).toContain("type: feature_request");
});

it("shows the complete fix with reduced motion and keeps Next visitor-paced", async () => {
	await i18n.changeLanguage("en");
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	render(<AdminSimPage />);
	click("04 Agent");
	expect(screen.getByText(scenario.diff.lines[1])).toBeDefined();
	expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
	expect(vi.getTimerCount()).toBe(0);
	click("Deploy the fix");
	expect(vi.getTimerCount()).toBe(0);
	click("See it on the site");
	expect(screen.getByRole("slider")).toBeDefined();
});
