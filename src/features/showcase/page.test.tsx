import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { i18n } from "../../i18n";
import { getHeadlineOffers } from "../packages";
import { ShowcasePage } from "./page";

beforeEach(() => {
	vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it.each(["he", "en"])("assembles the story and catalog-backed offers in %s", async language => {
	await i18n.changeLanguage(language);
	render(<ShowcasePage />);
	expect(screen.getByRole("main").dataset.module).toBe("showcase");
	expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(i18n.t("chapters.front.lead", { ns: "showcase" }));
	const teaser = screen.getByRole("region", { name: i18n.t("title", { ns: "packages" }) });
	expect(teaser.querySelectorAll(".line")).toHaveLength(getHeadlineOffers().length);
	for (const offer of getHeadlineOffers()) {
		expect(within(teaser).getByText(i18n.t(offer.priceKey, { ns: "packages" }))).toBeDefined();
		const name = i18n.t(`offers.${offer.id}.name`, { ns: "packages" });
		const button = within(teaser).getByRole("button", { name: i18n.t("bookPackage", { ns: "packages", name }) });
		await act(async () => fireEvent.click(button));
		expect(location.hash).toBe(`#/book/${offer.id}`);
	}
});
