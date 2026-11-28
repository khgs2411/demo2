import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminSimPage } from "./page";
import { App } from "../../app/app";
import { brokenBookingButton as scenario } from "./scenarios/broken-booking-button";
import { i18n } from "../../i18n";

// Fake the simulation's timeout clock; leave jsdom's focus/selection task queue real.
beforeEach(() => { vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { cleanup(); expect(vi.getTimerCount()).toBe(0); vi.useRealTimers(); vi.unstubAllGlobals(); });

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

const bugBeatMs = scenario.timing.logRevealMs + scenario.timing.beatDwellMs.bug;

function advance(ms: number) {
	act(() => { vi.advanceTimersByTime(ms); });
}

it("starts drafting within four seconds of showing the demo untouched", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	expect(screen.queryByRole("form", { name: "New request" })).toBeNull();
	advance(4000);
	expect(screen.getByRole("form", { name: "New request" })).toBeDefined();
});

it("plays to the comparison without a click and can replay from the end", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	const { beatDwellMs, characterMs, inboxLogMs, logRevealMs, fixLineMs, scanStartMs, scanDurationMs } = scenario.timing;

	advance(bugBeatMs);
	expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
	const title = screen.getByLabelText<HTMLInputElement>("Title");
	const description = screen.getByLabelText<HTMLTextAreaElement>("Description");
	advance(("Problem".length + title.value.length + description.value.length) * characterMs + beatDwellMs.ticket_drafting);
	expect(within(screen.getByRole("group", { name: "Open" })).getByText("Clipped button")).toBeDefined();
	advance(2 * inboxLogMs + logRevealMs + beatDwellMs.ticket_submitted);
	for (let line = 1; line < scenario.logs.agent.length; line++) advance(fixLineMs);
	advance(logRevealMs + beatDwellMs.agent_fixing);
	advance(scanStartMs + scanDurationMs);
	advance(beatDwellMs.deploying);
	expect(screen.getByRole("slider")).toBeDefined();
	expect(vi.getTimerCount()).toBe(0);

	click("Restart");
	advance(bugBeatMs);
	expect(screen.getByRole("form", { name: "New request" })).toBeDefined();
	expect(fetch).not.toHaveBeenCalled();
});

it("pauses on form focus and editing, then submits the visitor's draft when Play is pressed", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	advance(bugBeatMs);
	const title = screen.getByLabelText<HTMLInputElement>("Title");
	act(() => { title.focus(); });
	act(() => { vi.runOnlyPendingTimers(); });
	expect(document.activeElement).toBe(title);
	expect(screen.getByRole("button", { name: "Play" })).toBeDefined();
	fireEvent.change(title, { target: { value: "Please fix my booking button" } });

	const play = screen.getByRole("button", { name: "Play" });
	act(() => { play.focus(); });
	fireEvent.click(play);
	act(() => { vi.runOnlyPendingTimers(); });
	expect(within(screen.getByRole("group", { name: "Open" })).getByText("Please fix my booking button")).toBeDefined();
	expect(document.activeElement).toBe(play);
});

it("lets a visitor pause and play from the controls row", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	click("Pause");
	advance(bugBeatMs);
	expect(screen.queryByRole("form", { name: "New request" })).toBeNull();
	click("Play");
	advance(bugBeatMs);
	expect(screen.getByRole("form", { name: "New request" })).toBeDefined();
});

it("pauses on a tab click and resumes from the same beat", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	fireEvent.click(screen.getByRole("tab", { name: "Manage page" }));
	advance(bugBeatMs);
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Something broke: the booking button is cut off.");
	click("Play");
	advance(bugBeatMs);
	expect(screen.getByRole("form", { name: "New request" })).toBeDefined();
});


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
	expect(booking.getAttribute("href")).toBe("#/book/system-studio");
	fireEvent.click(booking);
	expect(window.location.hash).toBe("#/book/system-studio");
	act(() => { vi.runAllTimers(); });
	expect(fetch).not.toHaveBeenCalled();
});

it("supports back, beat skipping, keyboard tabs and restart without leaking timers", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	click("04 AI assistant");
	fireEvent.click(screen.getByRole("tab", { name: "The site" }));
	expect(screen.getByRole("tab", { name: "The site" }).getAttribute("aria-selected")).toBe("true");
	fireEvent.keyDown(screen.getByRole("tab", { name: "The site" }), { key: "ArrowRight" });
	expect(screen.getByRole("tab", { name: "Manage page" }).getAttribute("aria-selected")).toBe("true");
	click("Back");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("The request reaches me.");
	click("06 On the site");
	click("Restart");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(i18n.t(scenario.beats.bug.titleKey, { ns: "admin-sim" }));
	expect(vi.getTimerCount()).toBe(1);
	click("03 With me");
	expect(document.querySelector(".sim-fly")).not.toBeNull();
	click("Restart");
	expect(document.querySelector(".sim-fly")).toBeNull();
	expect(vi.getTimerCount()).toBe(0);
	click("04 AI assistant");
	expect(vi.getTimerCount()).toBe(1);
	click("Restart");
	expect(vi.getTimerCount()).toBe(0);
});

it.each(["03 With me", "04 AI assistant"])("leaving and returning during %s restarts the walkthrough", async (beat) => {
	await i18n.changeLanguage("en");
	window.history.replaceState(null, "", "#/demo");
	render(<App />);
	click(beat);
	expect(vi.getTimerCount()).toBe(1);
	act(() => { window.location.hash = "#/packages"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
	// jsdom's hashchange task is not a simulation timer.
	act(() => { vi.runAllTimers(); });
	expect(vi.getTimerCount()).toBe(0);
	expect(document.querySelector(".sim-fly")).toBeNull();
	act(() => { window.location.hash = "#/demo"; window.dispatchEvent(new HashChangeEvent("hashchange")); });
	act(() => { vi.advanceTimersByTime(scenario.timing.beatDwellMs.bug - 1); });
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(i18n.t(scenario.beats.bug.titleKey, { ns: "admin-sim" }));
});

it("validates required request text and carries edited content into the local board", async () => {
	await i18n.changeLanguage("en");
	render(<AdminSimPage />);
	click("Open a request");
	fireEvent.change(screen.getByLabelText("Title"), { target: { value: "" } });
	click("Send");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("One request. No phone calls.");
	fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Please repair my button" } });
	fireEvent.change(screen.getByLabelText("Type"), { target: { value: "feature_request" } });
	click("Send");
	act(() => { vi.advanceTimersByTime(scenario.timing.flightMs); });
	expect(screen.getByText("Please repair my button")).toBeDefined();
	expect(screen.getByRole("log").textContent).toContain("type: feature_request");
});

it("shows the complete fix with reduced motion and keeps Next visitor-paced", async () => {
	await i18n.changeLanguage("en");
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
	render(<AdminSimPage />);
	expect(screen.queryByRole("button", { name: /^(Pause|Play)$/ })).toBeNull();
	advance(bugBeatMs);
	expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(i18n.t(scenario.beats.bug.titleKey, { ns: "admin-sim" }));
	click("04 AI assistant");
	expect(screen.getByText(scenario.diff.lines[1])).toBeDefined();
	expect(screen.getByRole("progressbar").getAttribute("value")).toBe("1");
	expect(vi.getTimerCount()).toBe(0);
	click("Put it on the site");
	expect(vi.getTimerCount()).toBe(0);
	click("See it on the site");
	expect(screen.getByRole("slider")).toBeDefined();
});

it("renders the demo with the site header and footer", () => {
	window.history.replaceState(null, "", "#/demo");
	render(<App />);
	expect(within(screen.getByRole("banner")).getByRole("link", { name: i18n.t("brand") }).getAttribute("href")).toBe("#/");
	expect(within(screen.getByRole("contentinfo")).getByText(i18n.t("credit"))).toBeDefined();
});
