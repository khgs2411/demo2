import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { i18n } from "../../i18n";
import { parseHash } from "../../app/router";
import { PackagesPage } from "./page";

afterEach(() => cleanup());

it.each(["he", "en"])("renders the ledger and passes the selected base package to booking in %s", async (language) => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	for (const id of ["system-basic", "system-studio", "system-partner", "site-quick", "site-landing", "site-business"]) {
		const name = i18n.t(`offers.${id}.name`, { ns: "packages" });
		fireEvent.click(screen.getByRole("button", { name: i18n.t("bookPackage", { ns: "packages", name }) }));
		expect(window.location.hash).toBe(`#/book/${id}`);
		expect(parseHash(window.location.hash)).toEqual({ page: "booking", packageId: id });
	}
	expect(screen.getByText("₪1,000")).toBeTruthy();
	expect(screen.getByText("₪150")).toBeTruthy();
	for (const price of ["₪250", "₪550", "₪490", "₪1,900"]) expect(screen.getByText(price)).toBeTruthy();
	const t = (key: string) => i18n.t(key, { ns: "packages" });
	expect(screen.getAllByRole("region").slice(0, 2).map(region => region.querySelector("h2")?.textContent))
		.toEqual([t("lines.system.name"), t("lines.site.name")]);
	expect(screen.getByText(t("liveInSevenDays")).closest("h3")?.textContent).toContain(t("offers.site-quick.name"));
	for (const id of ["system-basic", "system-partner", "site-quick", "site-business"]) {
		expect(screen.getByText(t(`offers.${id}.difference`))).toBeTruthy();
	}
	expect(screen.getByText(i18n.t("recommended", { ns: "packages" }))).toBeTruthy();
});

it.each(["he", "en"])("gives Studio the only primary package ticket in %s", async language => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	const t = (key: string) => i18n.t(key, { ns: "packages" });
	const tickets = within(screen.getByRole("main")).getAllByRole("button");
	const studio = screen.getByRole("button", { name: i18n.t("bookPackage", { ns: "packages", name: t("offers.system-studio.name") }) });
	expect(tickets.filter(ticket => !ticket.classList.contains("ticket-ghost"))).toEqual([studio]);
	expect(screen.getByText(t("recommended")).classList.contains("package-mark-recommended")).toBe(true);
	expect(screen.getByText(t("liveInSevenDays")).classList.contains("package-mark-recommended")).toBe(false);
});

it.each(["he", "en"])("compares the offers and provides named add-ons and FAQ disclosures in %s", async (language) => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	const t = (key: string) => i18n.t(key, { ns: "packages" });
	const lines = [
		{ line: "system", ids: ["system-basic", "system-studio", "system-partner"], row: "support", cells: ["1", "3", "8"] },
		{ line: "site", ids: ["site-quick", "site-landing", "site-business"], row: "revisions", cells: ["1", "2", "3"] },
	];
	expect(screen.getAllByRole("table")).toHaveLength(2);
	for (const { line, ids, row, cells } of lines) {
		const table = screen.getByRole("table", { name: t(`lines.${line}.name`) });
		expect(within(table).getAllByRole("columnheader").slice(1).map(heading => heading.textContent))
			.toEqual(ids.map(id => t(`offers.${id}.name`)));
		const rowHeader = within(table).getByRole("rowheader", { name: t(`comparison.${row}`) });
		const values = within(rowHeader.closest("tr")!).getAllByRole("cell");
		expect(values.map(cell => cell.textContent)).toEqual(ids.map((id, index) => t(`offers.${id}.name`) + cells[index]));
	}
	for (const id of ["agent-whatsapp", "agent-social", "agent-voice"]) {
		expect(screen.getByText(t(`offers.${id}.name`))).toBeTruthy();
	}
	for (const key of ["minimum", "advance", "support", "hosting", "partnerAgent"]) {
		const question = screen.getByText(t(`faq.${key}.question`));
		expect(question.tagName).toBe("SUMMARY");
		expect(question.closest("details")?.querySelector("p")?.textContent).toBe(t(`faq.${key}.answer`));
	}
	expect(screen.getAllByRole("button")).toHaveLength(6);
});
