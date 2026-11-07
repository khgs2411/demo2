import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { PackageStep } from "./package-step";
import { WeekGrid } from "./week-grid";
import { SummaryTicket } from "./summary-ticket";
import { weekRange } from "./calendar";

afterEach(cleanup);
beforeEach(async () => { await i18n.changeLanguage("en"); });
it("confirms package and add-on choices using ticket actions", () => {
	const change = vi.fn(), next = vi.fn();
	render(<PackageStep selection={{ packageId: "system", addonInterests: [], slotId: null }} onChange={change} onContinue={next} />);
	expect((screen.getByRole("radio", { name: /Website/ }) as HTMLInputElement).checked).toBe(true);
	fireEvent.click(screen.getByRole("checkbox", { name: "Voice AI agent" }));
	expect(change).toHaveBeenCalledWith({ packageId: "system", addonInterests: ["agent-voice"], slotId: null });
	const button = screen.getByRole("button", { name: "Continue" });
	expect(button.classList.contains("ticket")).toBe(true);
	fireEvent.click(button);
	expect(next).toHaveBeenCalledOnce();
});
it("shows only start times, backend eligibility and a visitor timezone", () => {
	const choose = vi.fn();
	const slot = { id: "s", startsAt: "2026-11-10T09:00:00Z", canRegister: true, canCancelRegistration: false, userRegistrationState: null };
	render(<WeekGrid range={weekRange(new Date(2026,10,9))} slots={[slot, { ...slot, id:"full", startsAt:"2026-11-10T11:00:00Z", canRegister:false }]} selectedId={null} timeZone="Asia/Jerusalem" onChoose={choose} onMove={vi.fn()} canGoBack={false} />);
	fireEvent.click(screen.getByRole("button", { name:/11:00/ }));
	expect(choose).toHaveBeenCalledWith("s");
	expect((screen.getByRole("button", { name:/13:00/ }) as HTMLButtonElement).disabled).toBe(true);
	expect(screen.getByText("Times are in Israel time.")).toBeDefined();
});
it("stamps the real request id and backend status", () => {
	render(<SummaryTicket selection={{ packageId:"system", addonInterests:[], slotId:null }} registration={{ id:"real-request", classId:"s", status:"approved" }} timeZone="UTC" />);
	expect(screen.getByText("№ real-request")).toBeDefined();
	expect(screen.getByText("Confirmed")).toBeDefined();
});
