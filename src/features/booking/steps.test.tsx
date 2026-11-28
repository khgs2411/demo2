import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
	render(<PackageStep selection={{ packageId: "system-studio", addonInterests: [], slotId: null }} onChange={change} onContinue={next} />);
	expect((screen.getByRole("radio", { name: /^Studio/ }) as HTMLInputElement).checked).toBe(true);
	fireEvent.click(screen.getByRole("checkbox", { name: "AI assistant that answers phone calls" }));
	expect(change).toHaveBeenCalledWith({ packageId: "system-studio", addonInterests: ["agent-voice"], slotId: null });
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
	render(<SummaryTicket selection={{ packageId:"system-studio", addonInterests:[], slotId:null }} registration={{ id:"real-request", classId:"s", status:"approved" }} timeZone="UTC" />);
	expect(screen.getByText("№ real-request")).toBeDefined();
	expect(screen.getByText("Confirmed")).toBeDefined();
});

it.each(["he", "en"])("lists the six packages under their service lines in %s", async language => {
	await i18n.changeLanguage(language);
	const change = vi.fn();
	render(<PackageStep selection={{ packageId: "system-studio", addonInterests: ["agent-voice"], slotId: "old-slot" }} onChange={change} onContinue={vi.fn()} />);
	const t = (key: string) => i18n.t(key, { ns: "packages" });
	const lines = [
		{ line: "system", ids: ["system-basic", "system-studio", "system-partner"] },
		{ line: "site", ids: ["site-quick", "site-landing", "site-business"] },
	];
	const groups = within(screen.getByRole("radiogroup")).getAllByRole("region");
	expect(groups.map(group => group.querySelector("h2")?.firstChild?.textContent)).toEqual(lines.map(({ line }) => t(`lines.${line}.name`)));
	for (const [index, { ids, line }] of lines.entries()) {
		const radios = within(groups[index]).getAllByRole<HTMLInputElement>("radio");
		expect(radios.map(radio => radio.value)).toEqual(ids);
		for (const radio of radios) {
			const name = t(`offers.${radio.value}.name`);
			expect(radio.labels?.[0].textContent).toContain(name);
			expect(radio.labels?.[0].textContent).toContain(t(`offers.${radio.value}.price`));
			expect(radio.labels?.[0].textContent).toContain(i18n.t(`pricePeriod.${line}`, { ns: "booking" }));
		}
	}
	expect(screen.getAllByRole("list")).toHaveLength(1);
	expect(screen.getByRole("list").textContent).toContain(i18n.t("benefits.system-studio.0", { ns: "booking" }));
	fireEvent.click(within(groups[1]).getAllByRole("radio")[0]);
	expect(change).toHaveBeenCalledWith({ packageId: "site-quick", addonInterests: ["agent-voice"], slotId: null });
});
