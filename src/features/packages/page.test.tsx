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
	expect(screen.getByText(i18n.t("recommended", { ns: "packages" }))).toBeTruthy();
});

it.each([
	{
		language: "he", origin: "שיעורים ותורים",
		monthly: "לחודש על האתר והאפליקציה. מתחייבים ל־3 חודשים לפחות ומשלמים על החודש הראשון מראש.",
		once: "לבניית האתר, בתשלום אחד. על כתובת האתר ועל זה שהוא יישאר באוויר משלמים בנפרד כל חודש. המחיר תלוי בכתובת שבוחרים.",
		benefits: ["שעת עזרה בחודש", "3 שעות עזרה בחודש", "8 שעות עזרה בחודש", "סבב אחד של שינויים", "2 סבבי שינויים", "3 סבבי שינויים"],
	},
	{
		language: "en", origin: "classes and appointments",
		monthly: "a month for your website and app. You sign up for at least 3 months and pay for the first month up front.",
		once: "to build your website, paid once. You pay separately each month for your web address and keeping the site online. The cost depends on the address.",
		benefits: ["1 hour of help a month", "3 hours of help a month", "8 hours of help a month", "1 round of changes", "2 rounds of changes", "3 rounds of changes"],
	},
])("puts payment terms and benefits on each card in $language", async ({ language, origin, monthly, once, benefits }) => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	expect(screen.getByText(/ClassKit.*(?:שיעורים ותורים|classes and appointments)/).textContent).toContain(origin);
	const cards = screen.getAllByRole("article");
	expect(cards).toHaveLength(6);
	for (const [index, price] of ["₪150", "₪250", "₪550", "₪490", "₪1,000", "₪1,900"].entries()) {
		const card = within(cards[index]);
		expect(card.getByText(price).parentElement?.textContent).toBe(`${price} ${index < 3 ? monthly : once}`);
		expect(card.getByRole("heading").textContent).toMatch(language === "he" ? /^חבילת / : / package/);
		expect(card.getByRole("list").textContent).toContain(benefits[index]);
		expect(card.getAllByRole("button")).toHaveLength(1);
	}
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

it.each(["he", "en"])("shows named extras and only the remaining FAQ topics in %s", async (language) => {
	await i18n.changeLanguage(language);
	render(<PackagesPage />);
	const t = (key: string) => i18n.t(key, { ns: "packages" });
	expect(screen.queryByRole("table")).toBeNull();
	expect(screen.queryByText(/./, { selector: ".package-difference" })).toBeNull();
	expect(screen.getByText(t("addons.price"))).toBeTruthy();
	for (const id of ["agent-whatsapp", "agent-social", "agent-voice"]) {
		expect(screen.getByText(t(`offers.${id}.name`))).toBeTruthy();
	}
	const faq = screen.getByRole("region", { name: t("faq.title") });
	expect(faq.querySelectorAll("details")).toHaveLength(2);
	for (const key of ["support", "hosting"]) {
		const question = screen.getByText(t(`faq.${key}.question`));
		expect(question.tagName).toBe("SUMMARY");
		expect(question.closest("details")?.querySelector("p")?.textContent).toBe(t(`faq.${key}.answer`));
	}
	expect(screen.getAllByRole("button")).toHaveLength(6);
});
